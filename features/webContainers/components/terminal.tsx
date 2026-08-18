"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { SearchAddon } from "xterm-addon-search";
import "xterm/css/xterm.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Copy, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface TerminalProps {
  webcontainerUrl?: string;
  className?: string;
  theme?: "dark" | "light";
  webContainerInstance?: WebContainer | null;
}

// Define the methods that will be exposed through the ref
export interface TerminalRef {
  writeToTerminal: (data: string) => void;
  clearTerminal: () => void;
  focusTerminal: () => void;
}

const terminalThemes = {
  dark: {
    background: "#09090B",
    foreground: "#FAFAFA",
    cursor: "#FAFAFA",
    cursorAccent: "#09090B",
    selection: "#27272A",
    black: "#18181B",
    red: "#EF4444",
    green: "#22C55E",
    yellow: "#EAB308",
    blue: "#3B82F6",
    magenta: "#A855F7",
    cyan: "#06B6D4",
    white: "#F4F4F5",
    brightBlack: "#3F3F46",
    brightRed: "#F87171",
    brightGreen: "#4ADE80",
    brightYellow: "#FDE047",
    brightBlue: "#60A5FA",
    brightMagenta: "#C084FC",
    brightCyan: "#22D3EE",
    brightWhite: "#FFFFFF",
  },
  light: {
    background: "#FFFFFF",
    foreground: "#18181B",
    cursor: "#18181B",
    cursorAccent: "#FFFFFF",
    selection: "#E4E4E7",
    black: "#18181B",
    red: "#DC2626",
    green: "#16A34A",
    yellow: "#CA8A04",
    blue: "#2563EB",
    magenta: "#9333EA",
    cyan: "#0891B2",
    white: "#F4F4F5",
    brightBlack: "#71717A",
    brightRed: "#EF4444",
    brightGreen: "#22C55E",
    brightYellow: "#EAB308",
    brightBlue: "#3B82F6",
    brightMagenta: "#A855F7",
    brightCyan: "#06B6D4",
    brightWhite: "#FAFAFA",
  },
};

const TerminalComponent = forwardRef<TerminalRef, TerminalProps>(
  (
    { webcontainerUrl, className, theme = "dark", webContainerInstance },
    ref,
  ) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const term = useRef<Terminal | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);
    const searchAddon = useRef<SearchAddon | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showSearch, setShowSearch] = useState(false);

    // Command line state
    const currentLine = useRef<string>("");
    const cursorPosition = useRef<number>(0);
    const commandHistory = useRef<string[]>([]);
    const historyIndex = useRef<number>(-1);
    const currentProcess = useRef<WebContainerProcess | null>(null);
    const shellProcess = useRef<WebContainerProcess | null>(null);

    const cwd = useRef<string>("/");

    const promptPath = useCallback(() => {
      return cwd.current === "/" ? "~" : `~${cwd.current}`;
    }, []);

    const writePrompt = useCallback(() => {
      if (term.current) {
        term.current.write(`\r\n\x1b[36m${promptPath()}\x1b[0m $ `);
        currentLine.current = "";
        cursorPosition.current = 0;
      }
    }, [promptPath]);

    const redrawLine = useCallback(
      (text: string) => {
        if (!term.current) return;
        term.current.write(
          `\x1b[2K\r\x1b[36m${promptPath()}\x1b[0m $ ${text}`,
        );
        currentLine.current = text;
        cursorPosition.current = text.length;
      },
      [promptPath],
    );

    const resolvePath = useCallback((target: string): string => {
      const base = target.startsWith("/")
        ? []
        : cwd.current.split("/").filter(Boolean);

      const segments = target.replace(/^~\/?/, "/").split("/").filter(Boolean);

      for (const segment of segments) {
        if (segment === ".") continue;
        if (segment === "..") base.pop();
        else base.push(segment);
      }

      return `/${base.join("/")}`.replace(/\/+/g, "/");
    }, []);

    // Expose methods through ref
    useImperativeHandle(ref, () => ({
      writeToTerminal: (data: string) => {
        if (!term.current) return;
        try {
          term.current.write(data);
        } catch (error) {
          console.warn("Dropped terminal output:", error);
        }
      },
      clearTerminal: () => {
        clearTerminal();
      },
      focusTerminal: () => {
        if (term.current) {
          term.current.focus();
        }
      },
    }));

    const executeCommand = useCallback(
      async (command: string) => {
        if (!webContainerInstance || !term.current) return;

        // Add to history
        if (
          command.trim() &&
          commandHistory.current[commandHistory.current.length - 1] !== command
        ) {
          commandHistory.current.push(command);
        }
        historyIndex.current = -1;

        try {
          const trimmed = command.trim();

          if (trimmed === "") {
            writePrompt();
            return;
          }

          // Parse command
          const parts = trimmed.split(/\s+/);
          const cmd = parts[0];
          const args = parts.slice(1);

          if (cmd === "clear" || cmd === "cls") {
            term.current.clear();
            writePrompt();
            return;
          }

          if (cmd === "history") {
            term.current.writeln("");
            commandHistory.current.forEach((entry, index) => {
              term.current!.writeln(`  ${index + 1}  ${entry}`);
            });
            writePrompt();
            return;
          }

          if (cmd === "help") {
            term.current.writeln("");
            term.current.writeln("Built-in commands:");
            term.current.writeln("  cd <dir>    change directory");
            term.current.writeln("  pwd         print working directory");
            term.current.writeln("  clear, cls  clear the screen");
            term.current.writeln("  history     list previous commands");
            term.current.writeln("  help        this message");
            term.current.writeln("");
            term.current.writeln(
              "Anything else runs in the container, e.g. ls, cat, npm, node.",
            );
            writePrompt();
            return;
          }

          if (cmd === "pwd") {
            term.current.writeln("");
            term.current.writeln(cwd.current);
            writePrompt();
            return;
          }

          if (cmd === "cd") {
            const target = args[0] ?? "/";
            const next = resolvePath(target);

            term.current.writeln("");
            try {
              await webContainerInstance.fs.readdir(next);
              cwd.current = next;
            } catch {
              term.current.writeln(`cd: no such directory: ${target}`);
            }
            writePrompt();
            return;
          }

          // Execute in WebContainer
          term.current.writeln("");
          const process = await webContainerInstance.spawn(cmd, args, {
            cwd: cwd.current,
            terminal: {
              cols: term.current.cols,
              rows: term.current.rows,
            },
          });

          currentProcess.current = process;

          // Handle process output
          process.output.pipeTo(
            new WritableStream({
              write(data) {
                if (term.current) {
                  term.current.write(data);
                }
              },
            }),
          );

          // Wait for process to complete
          await process.exit;
          currentProcess.current = null;

          // Show new prompt
          writePrompt();
        } catch {
          if (term.current) {
            term.current.writeln(`Command not found: ${command}`);
            writePrompt();
          }
          currentProcess.current = null;
        }
      },
      [webContainerInstance, writePrompt, resolvePath],
    );

    const handleTerminalInput = useCallback(
      (data: string) => {
        if (!term.current) return;

        // Handle special characters
        switch (data) {
          case "\r": // Enter
            executeCommand(currentLine.current);
            break;

          case "\u007F": // Backspace
            if (cursorPosition.current > 0) {
              currentLine.current =
                currentLine.current.slice(0, cursorPosition.current - 1) +
                currentLine.current.slice(cursorPosition.current);
              cursorPosition.current--;

              // Update terminal display
              term.current.write("\b \b");
            }
            break;

          case "\u0003": // Ctrl+C
            if (currentProcess.current) {
              currentProcess.current.kill();
              currentProcess.current = null;
            }
            term.current.writeln("^C");
            writePrompt();
            break;

          case "\u001b[A": // Up arrow
            if (commandHistory.current.length > 0) {
              if (historyIndex.current === -1) {
                historyIndex.current = commandHistory.current.length - 1;
              } else if (historyIndex.current > 0) {
                historyIndex.current--;
              }

              redrawLine(commandHistory.current[historyIndex.current]);
            }
            break;

          case "\u001b[B": // Down arrow
            if (historyIndex.current !== -1) {
              if (historyIndex.current < commandHistory.current.length - 1) {
                historyIndex.current++;
                redrawLine(commandHistory.current[historyIndex.current]);
              } else {
                historyIndex.current = -1;
                redrawLine("");
              }
            }
            break;

          default:
            // Regular character input
            if (data >= " " || data === "\t") {
              currentLine.current =
                currentLine.current.slice(0, cursorPosition.current) +
                data +
                currentLine.current.slice(cursorPosition.current);
              cursorPosition.current++;
              term.current.write(data);
            }
            break;
        }
      },
      [executeCommand, writePrompt, redrawLine],
    );

    const inputHandler = useRef(handleTerminalInput);
    useEffect(() => {
      inputHandler.current = handleTerminalInput;
    }, [handleTerminalInput]);

    const safeFit = useCallback(() => {
      const host = terminalRef.current;
      if (!term.current || !fitAddon.current || !host) return;
      if (host.offsetWidth === 0 || host.offsetHeight === 0) return;

      try {
        fitAddon.current.fit();
      } catch (error) {
        console.warn("Terminal fit skipped:", error);
      }
    }, []);

    const initializeTerminal = useCallback(() => {
      if (!terminalRef.current || term.current) return;

      const terminal = new Terminal({
        cursorBlink: true,
        fontFamily: '"Fira Code", "JetBrains Mono", "Consolas", monospace',
        fontSize: 14,
        lineHeight: 1.2,
        letterSpacing: 0,
        theme: terminalThemes[theme],
        allowTransparency: false,
        convertEol: true,
        scrollback: 1000,
        tabStopWidth: 4,
      });

      // Add addons
      const fitAddonInstance = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const searchAddonInstance = new SearchAddon();

      terminal.loadAddon(fitAddonInstance);
      terminal.loadAddon(webLinksAddon);
      terminal.loadAddon(searchAddonInstance);

      terminal.open(terminalRef.current);

      fitAddon.current = fitAddonInstance;
      searchAddon.current = searchAddonInstance;
      term.current = terminal;

      terminal.onData((data) => inputHandler.current(data));

      requestAnimationFrame(() => safeFit());

      // Welcome message
      terminal.writeln("🚀 WebContainer Terminal");
      terminal.writeln("Type 'help' for available commands");
      writePrompt();

      return terminal;
    }, [theme, writePrompt, safeFit]);

    const connectToWebContainer = useCallback(async () => {
      if (!webContainerInstance || !term.current) return;

      try {
        setIsConnected(true);
        term.current.writeln("✅ Connected to WebContainer");
        term.current.writeln("Ready to execute commands");
        writePrompt();
      } catch (error) {
        setIsConnected(false);
        term.current.writeln("❌ Failed to connect to WebContainer");
        console.error("WebContainer connection error:", error);
      }
    }, [webContainerInstance, writePrompt]);

    const clearTerminal = useCallback(() => {
      if (term.current) {
        term.current.clear();
        term.current.writeln("🚀 WebContainer Terminal");
        writePrompt();
      }
    }, [writePrompt]);

    const copyTerminalContent = useCallback(async () => {
      if (term.current) {
        const content = term.current.getSelection();
        if (content) {
          try {
            await navigator.clipboard.writeText(content);
          } catch (error) {
            console.error("Failed to copy to clipboard:", error);
          }
        }
      }
    }, []);

    const downloadTerminalLog = useCallback(() => {
      if (term.current) {
        const buffer = term.current.buffer.active;
        let content = "";

        for (let i = 0; i < buffer.length; i++) {
          const line = buffer.getLine(i);
          if (line) {
            content += line.translateToString(true) + "\n";
          }
        }

        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `terminal-log-${new Date().toISOString().slice(0, 19)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, []);

    const searchInTerminal = useCallback((term: string) => {
      if (searchAddon.current && term) {
        searchAddon.current.findNext(term);
      }
    }, []);

    useEffect(() => {
      initializeTerminal();

      let pendingFit = 0;
      const resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(pendingFit);
        pendingFit = requestAnimationFrame(() => safeFit());
      });

      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
      }

      const killedProcess = currentProcess;
      const killedShell = shellProcess;

      return () => {
        cancelAnimationFrame(pendingFit);
        resizeObserver.disconnect();
        if (killedProcess.current) {
          killedProcess.current.kill();
          killedProcess.current = null;
        }
        if (killedShell.current) {
          killedShell.current.kill();
          killedShell.current = null;
        }
        if (term.current) {
          term.current.dispose();
          term.current = null;
        }
        fitAddon.current = null;
        searchAddon.current = null;
      };
    }, [initializeTerminal, safeFit]);

    useEffect(() => {
      if (webContainerInstance && term.current && !isConnected) {
        connectToWebContainer();
      }
    }, [webContainerInstance, connectToWebContainer, isConnected]);

    return (
      <div
        className={cn(
          "flex flex-col h-full bg-background border rounded-lg overflow-hidden",
          className,
        )}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <span className="text-sm font-medium">WebContainer Terminal</span>
            {isConnected && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-muted-foreground">Connected</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {showSearch && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    searchInTerminal(e.target.value);
                  }}
                  className="h-6 w-32 text-xs"
                />
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
              className="h-6 w-6 p-0"
            >
              <Search className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={copyTerminalContent}
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={downloadTerminalLog}
              className="h-6 w-6 p-0"
            >
              <Download className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={clearTerminal}
              className="h-6 w-6 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Terminal Content.
            No padding on the host element: FitAddon measures it to derive rows and
            columns, and padding makes that measurement disagree with the area xterm
            actually paints - which is what left blank strips and clipped text. */}
        <div
          className="flex-1 relative min-h-0 min-w-0"
          style={{ background: terminalThemes[theme].background }}
        >
          <div ref={terminalRef} className="absolute inset-0 overflow-hidden" />
        </div>
      </div>
    );
  },
);

TerminalComponent.displayName = "TerminalComponent";

export default TerminalComponent;
