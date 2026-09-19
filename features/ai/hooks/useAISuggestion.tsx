import { useState, useCallback, useRef } from "react";

interface AISuggestionsState {
  suggestion: string | null;
  isLoading: boolean;
  position: { line: number; column: number } | null;
  decoration: string[];
  isEnabled: boolean;
}

interface UseAISuggestionsReturn extends AISuggestionsState {
  toggleEnabled: () => void;
  fetchSuggestion: (type: string, editor: any) => Promise<void>;
  acceptSuggestion: (editor: any, monaco: any) => void;
  rejectSuggestion: (editor: any) => void;
  clearSuggestion: (editor: any) => void;
}

export const useAISuggestions = (): UseAISuggestionsReturn => {
  const [state, setState] = useState<AISuggestionsState>({
    suggestion: null,
    isLoading: false,
    position: null,
    decoration: [],
    isEnabled: true,
  });
  // read latest state inside stable callbacks without side effects in setState
  const stateRef = useRef(state);
  stateRef.current = state;

  const toggleEnabled = useCallback(() => {
    // turning off also drops any pending/visible suggestion and loading state
    setState((prev) => ({
      ...prev,
      isEnabled: !prev.isEnabled,
      ...(prev.isEnabled && { suggestion: null, position: null, isLoading: false }),
    }));
  }, []);

  const fetchSuggestion = useCallback(async (type: string, editor: any) => {
    if (!stateRef.current.isEnabled) return;
    if (!editor) {
      console.warn("Editor instance is not available");
      return;
    }

    const model = editor.getModel();
    const cursorPosition = editor.getPosition();
    if (!model || !cursorPosition) {
      console.warn("Editor model or cursor position is not available.");
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));
    const versionId = model.getVersionId();

    try {
      const response = await fetch("/api/code-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileContent: model.getValue(),
          cursorLine: cursorPosition.lineNumber - 1,
          cursorColumn: cursorPosition.column - 1,
          suggestionType: type,
        }),
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();

      const nowPos = editor.getPosition();
      const stale =
        !stateRef.current.isEnabled ||
        model.getVersionId() !== versionId ||
        nowPos?.lineNumber !== cursorPosition.lineNumber ||
        nowPos?.column !== cursorPosition.column;

      if (stale) {
        // user typed/moved while we waited; ghost text would never render
        setState((prev) => ({ ...prev, isLoading: false }));
      } else if (data.suggestion) {
        setState((prev) => ({
          ...prev,
          suggestion: data.suggestion.trim(),
          position: {
            line: cursorPosition.lineNumber,
            column: cursorPosition.column,
          },
          isLoading: false,
        }));
      } else {
        console.warn("No suggestion received from the API.");
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      console.error("Error fetching AI suggestion:", err);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const clearSuggestion = useCallback((editor: any) => {
    const { decoration } = stateRef.current;
    if (editor && decoration.length > 0) {
      editor.deltaDecorations(decoration, []);
    }
    setState((prev) => ({
      ...prev,
      suggestion: null,
      position: null,
      decoration: [],
    }));
  }, []);

  const acceptSuggestion = useCallback(
    (editor: any, monaco: any) => {
      const { suggestion, position } = stateRef.current;
      if (!suggestion || !position || !editor || !monaco) return;

      const { line, column } = position;
      editor.executeEdits("", [
        {
          range: new monaco.Range(line, column, line, column),
          text: suggestion.replace(/^\d+:\s*/gm, ""),
          forceMoveMarkers: true,
        },
      ]);
      clearSuggestion(editor);
    },
    [clearSuggestion],
  );

  return {
    ...state,
    toggleEnabled,
    fetchSuggestion,
    acceptSuggestion,
    rejectSuggestion: clearSuggestion,
    clearSuggestion,
  };
};
