"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type EditorSettings = {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
};

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  lineNumbers: true,
  autoSave: false,
};

type EditorSettingsStore = EditorSettings & {
  setSetting: <K extends keyof EditorSettings>(
    key: K,
    value: EditorSettings[K],
  ) => void;
  reset: () => void;
};

export const useEditorSettings = create<EditorSettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_EDITOR_SETTINGS,
      setSetting: (key, value) => set({ [key]: value } as Partial<EditorSettings>),
      reset: () => set({ ...DEFAULT_EDITOR_SETTINGS }),
    }),
    { name: "aerocode-editor-settings" },
  ),
);

export function toMonacoOverrides(settings: EditorSettings) {
  return {
    fontSize: settings.fontSize,
    tabSize: settings.tabSize,
    wordWrap: settings.wordWrap ? ("on" as const) : ("off" as const),
    minimap: { enabled: settings.minimap },
    lineNumbers: settings.lineNumbers ? ("on" as const) : ("off" as const),
  };
}
