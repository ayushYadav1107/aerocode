"use client";

import React from "react";
import {
  FilePlus,
  FolderPlus,
  FolderOpen,
  FileCode2,
  FileJson,
  FileText,
  FileType2,
  Image as ImageIcon,
  Search,
  ChevronRight,
  Sparkles,
  Rocket,
  Layers,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { TemplateFile, TemplateFolder } from "../types";

/** Brand accent used for the "link" style rows, matching the brand button. */
const ACCENT = "text-[#E93F3F] hover:text-[#E93F3F]/80";

interface FlatFile {
  file: TemplateFile;
  /** Folder path the file lives in, e.g. `src/components` ("" for root). */
  dir: string;
  name: string;
}

const flattenFiles = (
  folder: TemplateFolder | null,
  prefix = ""
): FlatFile[] => {
  if (!folder?.items) return [];

  return folder.items.flatMap((item) => {
    if ("folderName" in item) {
      return flattenFiles(item, prefix ? `${prefix}/${item.folderName}` : item.folderName);
    }
    return [
      {
        file: item,
        dir: prefix,
        name: item.fileExtension
          ? `${item.filename}.${item.fileExtension}`
          : item.filename,
      },
    ];
  });
};

const fileIconFor = (extension: string) => {
  switch (extension?.toLowerCase()) {
    case "json":
      return { Icon: FileJson, className: "text-yellow-500" };
    case "js":
    case "jsx":
    case "mjs":
      return { Icon: FileCode2, className: "text-yellow-400" };
    case "ts":
    case "tsx":
      return { Icon: FileCode2, className: "text-blue-400" };
    case "css":
    case "scss":
      return { Icon: FileType2, className: "text-sky-400" };
    case "html":
      return { Icon: FileType2, className: "text-orange-400" };
    case "md":
    case "txt":
      return { Icon: FileText, className: "text-muted-foreground" };
    case "png":
    case "jpg":
    case "jpeg":
    case "svg":
    case "gif":
      return { Icon: ImageIcon, className: "text-purple-400" };
    default:
      return { Icon: FileCode2, className: "text-muted-foreground" };
  }
};

interface StartActionProps {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}

const StartAction = ({ icon: Icon, label, onClick }: StartActionProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "group flex w-full items-center gap-2 rounded-sm px-1 py-1 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      ACCENT
    )}
  >
    <Icon className="size-4 shrink-0" />
    <span className="group-hover:underline">{label}</span>
  </button>
);

interface WalkthroughCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick?: () => void;
}

const WalkthroughCard = ({
  icon: Icon,
  title,
  description,
  onClick,
}: WalkthroughCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex w-full items-start gap-3 rounded-md border bg-card/40 p-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  >
    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-[#E93F3F]/10 text-[#E93F3F]">
      <Icon className="size-4" />
    </span>
    <span className="flex-1 min-w-0">
      <span className="flex items-center gap-1 text-sm font-medium">
        {title}
        <ChevronRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      <span className="mt-0.5 block text-xs text-muted-foreground">
        {description}
      </span>
    </span>
  </button>
);

const ShortcutRow = ({ label, keys }: { label: string; keys: string[] }) => (
  <div className="flex items-center justify-between gap-4 py-1 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <KbdGroup>
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </KbdGroup>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    {children}
  </h2>
);

interface PlaygroundWelcomeProps {
  title?: string;
  templateData: TemplateFolder | null;
  onFileSelect: (file: TemplateFile) => void;
  onNewFile?: () => void;
  onNewFolder?: () => void;
  onOpenExplorer?: () => void;
}

const PlaygroundWelcome = ({
  title,
  templateData,
  onFileSelect,
  onNewFile,
  onNewFolder,
  onOpenExplorer,
}: PlaygroundWelcomeProps) => {
  const [query, setQuery] = React.useState("");

  const files = React.useMemo(() => flattenFiles(templateData), [templateData]);

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? files.filter((f) => `${f.dir}/${f.name}`.toLowerCase().includes(q))
      : files;
    return filtered.slice(0, 8);
  }, [files, query]);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-8 py-12">
        {/* Masthead */}
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-[#E93F3F]/25 to-[#E93F3F]/5 text-[#E93F3F] ring-1 ring-[#E93F3F]/20">
              <Rocket className="size-5" />
            </span>
            <div>
              <h1 className="text-3xl font-light tracking-tight">AeroCode</h1>
              <p className="text-sm text-muted-foreground">
                Editing evolved — build and run projects right in your browser.
              </p>
            </div>
          </div>
          {title && (
            <p className="mt-4 text-sm text-muted-foreground">
              Workspace{" "}
              <span className="font-medium text-foreground">{title}</span>
              {files.length > 0 && ` • ${files.length} files`}
            </p>
          )}
        </div>

        <div className="grid flex-1 grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left column — Start + file list */}
          <div className="space-y-8">
            <section>
              <SectionTitle>Start</SectionTitle>
              <div className="space-y-1">
                <StartAction
                  icon={FilePlus}
                  label="New File..."
                  onClick={onNewFile}
                />
                <StartAction
                  icon={FolderPlus}
                  label="New Folder..."
                  onClick={onNewFolder}
                />
                <StartAction
                  icon={FolderOpen}
                  label="Open File Explorer..."
                  onClick={onOpenExplorer}
                />
              </div>
            </section>

            <section>
              <SectionTitle>Files</SectionTitle>

              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search files by name or path"
                  className="h-8 pl-8 text-sm"
                />
              </div>

              {matches.length === 0 ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  {files.length === 0
                    ? "No files in this workspace yet — create one to get started."
                    : "No files match your search."}
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {matches.map(({ file, dir, name }) => {
                    const { Icon, className } = fileIconFor(file.fileExtension);
                    return (
                      <li key={`${dir}/${name}`}>
                        <button
                          type="button"
                          onClick={() => onFileSelect(file)}
                          className="group flex w-full items-center gap-2 rounded-sm px-1 py-1 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <Icon className={cn("size-4 shrink-0", className)} />
                          <span className="truncate text-sm text-[#E93F3F] group-hover:underline">
                            {name}
                          </span>
                          {dir && (
                            <span className="truncate text-xs text-muted-foreground">
                              {dir}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {!query && files.length > matches.length && (
                <p className="mt-2 px-1 text-xs text-muted-foreground">
                  {files.length - matches.length} more file(s) — search above or
                  use the explorer.
                </p>
              )}
            </section>
          </div>

          {/* Right column — walkthroughs + shortcuts */}
          <div className="space-y-8">
            <section>
              <SectionTitle>Walkthroughs</SectionTitle>
              <div className="space-y-2">
                <WalkthroughCard
                  icon={Layers}
                  title="Get started with your workspace"
                  description="Browse the file tree, open files in tabs and edit them side by side."
                  onClick={onOpenExplorer}
                />
                <WalkthroughCard
                  icon={FilePlus}
                  title="Create your first file"
                  description="Add a file to the project root and start writing code immediately."
                  onClick={onNewFile}
                />
                <WalkthroughCard
                  icon={Sparkles}
                  title="Customize the editor"
                  description="Toggle the preview pane and manage open files from the settings menu."
                />
              </div>
            </section>

            <section>
              <SectionTitle>Keyboard shortcuts</SectionTitle>
              <div className="divide-y divide-border/60">
                <ShortcutRow label="Toggle file explorer" keys={["Ctrl", "B"]} />
                <ShortcutRow label="Save file" keys={["Ctrl", "S"]} />
                <ShortcutRow
                  label="Save all files"
                  keys={["Ctrl", "Shift", "S"]}
                />
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t pt-4 text-xs text-muted-foreground">
          Tip: press <Kbd>Ctrl</Kbd> <Kbd>B</Kbd> to toggle the file explorer, or
          pick a file above to start editing.
        </div>
      </div>
    </div>
  );
};

export default PlaygroundWelcome;
