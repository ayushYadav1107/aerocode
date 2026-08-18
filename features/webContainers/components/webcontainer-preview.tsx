"use client";
import { TemplateFolder } from "@/features/playground/libs/path-to-json";
import { WebContainer, type WebContainerProcess } from "@webcontainer/api";
import React, { useEffect, useRef, useState } from "react";

import { transformToWebContainerFormat } from "../hooks/transformer";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import TerminalPanel, { type TerminalPanelRef } from "./terminal-panel";
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

type SetupRecord = {
  playgroundId: string | null;
  step: number;
  stepStartedAt: number;
  url: string | null;
  error: string | null;
  promise: Promise<void> | null;
  devProcess: WebContainerProcess | null;
  write: ((text: string) => void) | null;
  listenersAttached: boolean;
  listeners: Set<() => void>;
};

function emit(record: SetupRecord, text: string) {
  record.write?.(text);
}

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

async function stopDevServer(record: SetupRecord) {
  const running = record.devProcess;
  if (!running) return;

  record.devProcess = null;
  running.kill();

  await Promise.race([
    running.exit,
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}

async function removeEntry(
  instance: WebContainer,
  path: string,
  attempt = 0,
): Promise<void> {
  try {
    await instance.fs.rm(path, { recursive: true, force: true });
  } catch (error) {
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return removeEntry(instance, path, attempt + 1);
    }
    console.warn(`Could not remove ${path}:`, error);
  }
}

async function clearWorkdir(instance: WebContainer) {
  const entries = await instance.fs.readdir("/");

  for (const entry of entries) {
    await removeEntry(instance, `/${entry}`);
  }
}

async function runSetup(
  instance: WebContainer,
  templateData: TemplateFolder,
  record: SetupRecord,
) {
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
    update(record, { error: null, step: 1 });
    emit(record, "\r\n🔄 Transforming template data...\r\n");
    const files = transformToWebContainerFormat(templateData);

    update(record, { step: 2 });
    emit(record, "📁 Mounting files...\r\n");
    await stopDevServer(record);
    await clearWorkdir(instance);
    await instance.mount(files);
    emit(record, "✅ Files mounted\r\n");

    update(record, { step: 3 });
    emit(record, "📦 Installing dependencies...\r\n");
    const installProcess = await instance.spawn("npm", [
      "install",
      "--no-audit",
      "--no-fund",
    ]);
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

  const [now, setNow] = useState(0);

  const terminalRef = useRef<TerminalPanelRef>(null);

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

      <ResizablePanel
        defaultSize={35}
        minSize={10}
        className="min-h-0 overflow-hidden p-2"
      >
        <TerminalPanel
          ref={terminalRef}
          webContainerInstance={instance}
          theme="dark"
          className="h-full rounded-lg border bg-background overflow-hidden"
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default WebContainerPreview;
