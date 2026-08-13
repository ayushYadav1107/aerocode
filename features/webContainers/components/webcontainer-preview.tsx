"use client";
import { TemplateFolder } from "@/features/playground/libs/path-to-json";
import { WebContainer, type WebContainerProcess } from "@webcontainer/api";
import React, { useEffect, useRef, useState } from "react";

import { transformToWebContainerFormat } from "../hooks/transformer";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import TerminalComponent, { type TerminalRef } from "./terminal";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

interface WebContainerPreviewProps {
  templateData: TemplateFolder;
  playgroundId: string;
  serverUrl: string;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  forceResetup?: boolean;
}

const TOTAL_STEPS = 4;

/**
 * Setup progress lives outside React so that a remount of this component (React
 * StrictMode in dev, toggling the preview, switching tabs) reuses the container
 * that is already installing/running instead of restarting from step 0.
 */
type SetupRecord = {
  /** Which playground the container currently holds. Null before the first setup. */
  playgroundId: string | null;
  step: number;
  stepStartedAt: number;
  url: string | null;
  error: string | null;
  promise: Promise<void> | null;
  /** The running dev server, kept so it can be stopped when switching playgrounds. */
  devProcess: WebContainerProcess | null;
  /**
   * Terminal sink. Lives on the record rather than in component state because
   * runSetup outlives any single mount of this component.
   */
  write: ((text: string) => void) | null;
  listenersAttached: boolean;
  listeners: Set<() => void>;
};

/** Writes to the terminal if one is currently mounted. */
function emit(record: SetupRecord, text: string) {
  record.write?.(text);
}

// Kept on globalThis, not in module scope: HMR re-evaluates this module while the
// container keeps running, and a fresh map would re-run npm install and spawn a
// second dev server on every edit.
const RECORDS_KEY = "__aerocode_webcontainer_setup__";

const records: WeakMap<WebContainer, SetupRecord> = ((
  globalThis as Record<string, unknown>
)[RECORDS_KEY] ??= new WeakMap()) as WeakMap<WebContainer, SetupRecord>;

function getRecord(instance: WebContainer): SetupRecord {
  let record = records.get(instance);
  if (!record) {
    record = {
      playgroundId: null,
      step: 0,
      stepStartedAt: Date.now(),
      url: null,
      error: null,
      promise: null,
      devProcess: null,
      write: null,
      listenersAttached: false,
      listeners: new Set(),
    };
    records.set(instance, record);
  }
  return record;
}

function update(record: SetupRecord, patch: Partial<SetupRecord>) {
  if (patch.step !== undefined && patch.step !== record.step) {
    patch.stepStartedAt = Date.now();
  }
  Object.assign(record, patch);
  record.listeners.forEach((notify) => notify());
}


/**
 * Turns WebContainer's internal errors into something a user can act on.
 */
function explainError(message: string): string {
  if (/service worker/i.test(message)) {
    return (
      `${message}\n\n` +
      "WebContainer serves previews through a service worker, and a hard reload " +
      "(Ctrl+Shift+R) bypasses it. Reload this page normally with F5. If that does " +
      "not help, service workers are unavailable - private browsing windows disable " +
      "them, as do strict tracking-protection and cookie-blocking settings."
    );
  }

  return message;
}

async function resolveDevScript(instance: WebContainer): Promise<string> {
  let pkg: { scripts?: Record<string, string> };

  try {
    pkg = JSON.parse(await instance.fs.readFile("package.json", "utf-8"));
  } catch {
    throw new Error("No package.json found at the root of this template.");
  }

  // Templates differ: vite uses `dev`, CRA-style ones use `start`.
  const script = ["dev", "start", "serve", "preview"].find(
    (name) => pkg.scripts?.[name],
  );

  if (!script) {
    throw new Error(
      "package.json has no dev script (looked for dev, start, serve, preview).",
    );
  }

  return script;
}

/**
 * Stops the dev server started for the previous playground. Without this its port
 * stays bound, so the next playground's server either fails to start or lands on a
 * different port while the preview still points at the old one.
 */
async function stopDevServer(record: SetupRecord) {
  const running = record.devProcess;
  if (!running) return;

  record.devProcess = null;
  running.kill();

  // Don't block setup indefinitely if the process ignores the signal.
  await Promise.race([
    running.exit,
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}

/**
 * Empties the working directory. Mounting alone only overwrites the paths present
 * in the new template, so files unique to the previous one would survive and get
 * served or compiled alongside it.
 */
async function clearWorkdir(instance: WebContainer) {
  const entries = await instance.fs.readdir("/");

  await Promise.all(
    entries.map((entry) =>
      instance.fs.rm(`/${entry}`, { recursive: true, force: true }),
    ),
  );
}

async function runSetup(
  instance: WebContainer,
  templateData: TemplateFolder,
  record: SetupRecord,
) {
  // Bound to the container, not to the component: the preview can be hidden or
  // remounted while the server is still coming up, and the event must not be
  // missed.
  if (!record.listenersAttached) {
    record.listenersAttached = true;

    instance.on("server-ready", (port, url) => {
      console.log(`Server ready on port ${port} at ${url}`);
      emit(record, `\r\n🌐 Server ready at ${url}\r\n`);
      update(record, { url, step: TOTAL_STEPS, error: null });
    });

    instance.on("error", ({ message }) => {
      emit(record, `\r\n❌ ${message}\r\n`);
      update(record, { error: explainError(message) });
    });
  }

  try {
    // step 1 - transform data
    update(record, { error: null, step: 1 });
    emit(record, "\r\n🔄 Transforming template data...\r\n");
    const files = transformToWebContainerFormat(templateData);

    // step 2 - hand the container over to this playground: stop whatever the
    // previous one left running, clear its files, then mount these.
    update(record, { step: 2 });
    emit(record, "📁 Mounting files...\r\n");
    await stopDevServer(record);
    await clearWorkdir(instance);
    await instance.mount(files);
    emit(record, "✅ Files mounted\r\n");

    // step 3 - install dependencies.
    //
    // The flags matter on large templates: the audit and funding steps each make
    // their own registry round trip after the tree is built, and inside a browser
    // VM that is where a big install tends to sit doing nothing visible.
    update(record, { step: 3 });
    emit(record, "📦 Installing dependencies...\r\n");
    const installProcess = await instance.spawn("npm", [
      "install",
      "--no-audit",
      "--no-fund",
    ]);
    // This stream must be consumed even with no terminal mounted, or the process
    // stalls on backpressure.
    installProcess.output.pipeTo(
      new WritableStream({
        write: (data) => emit(record, data),
      }),
    );

    const installExitCode = await installProcess.exit;
    if (installExitCode !== 0) {
      throw new Error(
        `Failed to install dependencies. Exit code: ${installExitCode}`,
      );
    }
    emit(record, "\r\n✅ Dependencies installed\r\n");

    // step 4 - start the dev server (the server-ready listener is already attached)
    update(record, { step: 4 });
    const script = await resolveDevScript(instance);
    emit(record, `🚀 Starting dev server (npm run ${script})...\r\n`);
    const startProcess = await instance.spawn("npm", ["run", script]);
    record.devProcess = startProcess;
    startProcess.output.pipeTo(
      new WritableStream({
        write: (data) => emit(record, data),
      }),
    );

    startProcess.exit.then((code) => {
      // A process we deliberately stopped on a playground switch is not a failure.
      if (record.devProcess !== startProcess) return;

      if (!record.url) {
        update(record, {
          error: `The dev server ("npm run ${script}") exited with code ${code} before it started listening.`,
        });
      }
    });
  } catch (error) {
    console.error("Error setting up container:", error);
    const message = error instanceof Error ? error.message : String(error);
    emit(record, `\r\n❌ ${message}\r\n`);
    update(record, { step: 0, error: explainError(message) });
  }
}

const WebContainerPreview = ({
  templateData,
  playgroundId,
  error,
  instance,
  isLoading,
  forceResetup = false,
}: WebContainerPreviewProps) => {
  // A snapshot of the shared record, copied into React state so every update
  // produces a fresh object and actually re-renders the step list.
  const [view, setView] = useState<{
    step: number;
    stepStartedAt: number;
    url: string | null;
    error: string | null;
  }>({
    step: 0,
    stepStartedAt: 0,
    url: null,
    error: null,
  });

  // A clock sampled once a second. Kept as state so the elapsed time below stays a
  // pure calculation - reading Date.now() during render is impure and rejected by
  // the compiler.
  const [now, setNow] = useState(0);

  const terminalRef = useRef<TerminalRef>(null);

  // Declared before the setup effect so the sink is connected by the time setup
  // starts writing. Child refs are assigned before parent effects run, so the
  // terminal is already mounted here.
  useEffect(() => {
    if (!instance) return;
    const current = getRecord(instance);

    current.write = (text: string) => terminalRef.current?.writeToTerminal(text);

    return () => {
      current.write = null;
    };
  }, [instance]);

  useEffect(() => {
    if (!instance) return;
    const current = getRecord(instance);

    const sync = () =>
      setView({
        step: current.step,
        stepStartedAt: current.stepStartedAt,
        url: current.url,
        error: current.error,
      });

    current.listeners.add(sync);
    // Catch up on progress that happened before this mount.
    sync();

    return () => {
      current.listeners.delete(sync);
    };
  }, [instance]);

  const isSettled = Boolean(view.url) || Boolean(view.error);

  useEffect(() => {
    if (isSettled) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isSettled]);

  const elapsed =
    view.stepStartedAt > 0 && now > view.stepStartedAt
      ? Math.floor((now - view.stepStartedAt) / 1000)
      : 0;

  useEffect(() => {
    if (!instance || !templateData || !playgroundId) return;
    const current = getRecord(instance);

    // There is only one container for the whole page, so the record has to be keyed
    // by playground as well. Without this check, opening a second playground finds
    // a finished setup and keeps showing the first one's dev server.
    const isDifferentPlayground = current.playgroundId !== playgroundId;

    if (!forceResetup && !isDifferentPlayground && current.promise) return;

    update(current, {
      playgroundId,
      promise: null,
      url: null,
      error: null,
      step: 0,
    });

    const promise = runSetup(instance, templateData, current);
    update(current, { promise });
    // templateData is intentionally not re-triggering setup: edits are pushed
    // into the running container through writeFileSync instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, playgroundId, forceResetup]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-6 rounded-lg bg-gray-50 dark:bg-gray-900">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <h3 className="text-lg font-medium">Initializing WebContainer</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Setting up the environment for your project...
          </p>
        </div>
      </div>
    );
  }

  const setupError = view.error;
  const currentStep = view.step;
  const previewUrl = view.url ?? "";

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (stepIndex === currentStep) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    } else {
      return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepText = (stepIndex: number, label: string) => {
    const isActive = stepIndex === currentStep;
    const isComplete = stepIndex < currentStep;

    return (
      <span
        className={`text-sm font-medium ${
          isComplete
            ? "text-green-600"
            : isActive
              ? "text-blue-600"
              : "text-gray-500"
        }`}
      >
        {label}
        {isActive && !isSettled && (
          <span className="ml-2 text-xs font-normal text-gray-500">
            {elapsed}s
          </span>
        )}
      </span>
    );
  };

  // The terminal stays mounted across every state below. Rendering it inside the
  // branches instead would tear it down the moment the server became ready, taking
  // the whole install log with it.
  const upperPane = (() => {
    if (error || setupError) {
      return (
        <div className="h-full w-full flex items-center justify-center p-4">
          <div className="max-h-full w-full max-w-md overflow-y-auto rounded-lg bg-red-50 p-6 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="h-5 w-5 shrink-0" />
              <h3 className="font-semibold">Error</h3>
            </div>
            <p className="text-sm break-words whitespace-pre-wrap">
              {error || setupError}
            </p>
          </div>
        </div>
      );
    }

    if (previewUrl) {
      return (
        <iframe
          src={previewUrl}
          className="block h-full w-full border-none"
          title="WebContainer Preview"
        />
      );
    }

    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-800">
          <h3 className="text-lg font-medium mb-4">
            Setting up your environment
          </h3>

          <Progress
            value={(currentStep / TOTAL_STEPS) * 100}
            className="h-2 mb-6"
          />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {getStepIcon(1)}
              {getStepText(1, "Transforming template data")}
            </div>
            <div className="flex items-center gap-3">
              {getStepIcon(2)}
              {getStepText(2, "Mounting files")}
            </div>
            <div className="flex items-center gap-3">
              {getStepIcon(3)}
              {getStepText(3, "Installing dependencies")}
            </div>
            <div className="flex items-center gap-3">
              {getStepIcon(4)}
              {getStepText(4, "Starting development server")}
            </div>
          </div>
        </div>
      </div>
    );
  })();

  return (
    <ResizablePanelGroup
      orientation="vertical"
      className="h-full w-full overflow-hidden"
    >
      <ResizablePanel
        defaultSize={65}
        minSize={20}
        className="min-h-0 overflow-hidden"
      >
        {upperPane}
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* The terminal stays mounted in every state above it. Rendering it inside
          the branches would tear it down when the server becomes ready, taking the
          install log with it. */}
      <ResizablePanel
        defaultSize={35}
        minSize={10}
        className="min-h-0 overflow-hidden p-2"
      >
        <TerminalComponent
          ref={terminalRef}
          webContainerInstance={instance}
          theme="dark"
          className="h-full"
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default WebContainerPreview;
