"use client";

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { WebContainer } from "@webcontainer/api";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import TerminalComponent, { type TerminalRef } from "./terminal";

interface TerminalPanelProps {
  webContainerInstance?: WebContainer | null;
  theme?: "dark" | "light";
  className?: string;
}

export interface TerminalPanelRef {
  writeToTerminal: (data: string) => void;
  clearTerminal: () => void;
  focusTerminal: () => void;
}

type Tab = { id: string; name: string };

const TerminalPanel = forwardRef<TerminalPanelRef, TerminalPanelProps>(
  ({ webContainerInstance, theme = "dark", className }, ref) => {
    const [tabs, setTabs] = useState<Tab[]>([{ id: "t1", name: "Terminal 1" }]);
    const [activeId, setActiveId] = useState("t1");
    const nextTabNumber = useRef(2);

    const handles = useRef(new Map<string, TerminalRef | null>());

    const primaryId = tabs[0]?.id;

    useImperativeHandle(
      ref,
      () => ({
        writeToTerminal: (data: string) =>
          handles.current.get(primaryId)?.writeToTerminal(data),
        clearTerminal: () => handles.current.get(primaryId)?.clearTerminal(),
        focusTerminal: () => handles.current.get(activeId)?.focusTerminal(),
      }),
      [primaryId, activeId],
    );

    const addTab = useCallback(() => {
      const number = nextTabNumber.current;
      nextTabNumber.current += 1;

      const id = `t${number}`;
      setTabs((current) => [...current, { id, name: `Terminal ${number}` }]);
      setActiveId(id);
    }, []);

    const closeTab = useCallback(
      (id: string) => {
        if (tabs.length === 1) return;

        const index = tabs.findIndex((tab) => tab.id === id);
        const remaining = tabs.filter((tab) => tab.id !== id);

        handles.current.delete(id);
        setTabs(remaining);

        if (activeId === id) {
          setActiveId(remaining[Math.min(index, remaining.length - 1)].id);
        }
      },
      [tabs, activeId],
    );

    return (
      <div className={cn("flex h-full w-full flex-col min-h-0", className)}>
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b bg-muted/40 px-1">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  setActiveId(tab.id);
                }
              }}
              className={cn(
                "group flex shrink-0 cursor-pointer items-center gap-1 rounded-t px-3 py-1.5 text-xs",
                tab.id === activeId
                  ? "bg-background font-medium"
                  : "text-muted-foreground hover:bg-background/50",
              )}
            >
              <span>{tab.name}</span>
              {tabs.length > 1 && (
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Close ${tab.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="rounded-sm p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addTab}
            aria-label="New terminal"
            className="ml-1 shrink-0 rounded-sm p-1 text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "absolute inset-0",
                tab.id === activeId ? "block" : "hidden",
              )}
            >
              <TerminalComponent
                ref={(handle) => {
                  handles.current.set(tab.id, handle);
                }}
                webContainerInstance={webContainerInstance}
                theme={theme}
                className="h-full"
              />
            </div>
          ))}
        </div>
      </div>
    );
  },
);

TerminalPanel.displayName = "TerminalPanel";

export default TerminalPanel;
