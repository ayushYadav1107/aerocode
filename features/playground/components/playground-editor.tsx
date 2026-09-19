"use client";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { TemplateFile } from "../types";
import { findFilePath } from "../libs";
import { useFileExplorer } from "../hooks/useFileExplorer";
import {
  configureMonaco,
  defaultEditorOptions,
  getEditorLanguage,
} from "@/features/playground/libs/editor-config";
import {
  toMonacoOverrides,
  useEditorSettings,
} from "@/features/dashboard/hooks/useEditorSettings";

interface PlaygroundEditorProps {
  activeFile: TemplateFile | undefined;
  content: string;
  onContentChange: (value: string) => void;
  suggestion: string | null;
  suggestionLoading: boolean;
  suggestionPosition: { line: number; column: number } | null;
  onAcceptSuggestion: (editor: any, monaco: any) => void;
  onRejectSuggestion: (editor: any) => void;
  onTriggerSuggestion: (type: string, editor: any) => void;
}
const PlaygroundEditor = ({
  activeFile,
  content,
  onContentChange,
  suggestion,
  suggestionLoading,
  suggestionPosition,
  onAcceptSuggestion,
  onRejectSuggestion,
  onTriggerSuggestion,
}: PlaygroundEditorProps) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const inlineCompletionProviderRef = useRef<any>(null);
  const currentSuggestionRef = useRef<{
    text: string;
    position: { line: number; column: number };
    id: string;
  } | null>(null);
  const isAcceptingSuggestionRef = useRef(false);
  const suggestionAcceptedRef = useRef(false);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tabCommandRef = useRef<any>(null);
  const suggestionPositionRef = useRef(suggestionPosition);
  suggestionPositionRef.current = suggestionPosition;

  // Generate unique ID for each suggestion
  const generateSuggestionId = () =>
    `suggestion-${Date.now()}-${Math.random()}`;

  // Create inline completion provider
  const createInlineCompletionProvider = useCallback(
    (monaco: Monaco) => {
      return {
        provideInlineCompletions: async (
          model: any,
          position: any,
          context: any,
          token: any,
        ) => {
          console.log("provideInlineCompletions called", {
            hasSuggestion: !!suggestion,
            hasPosition: !!suggestionPosition,
            currentPos: `${position.lineNumber}:${position.column}`,
            suggestionPos: suggestionPosition
              ? `${suggestionPosition.line}:${suggestionPosition.column}`
              : null,
            isAccepting: isAcceptingSuggestionRef.current,
            suggestionAccepted: suggestionAcceptedRef.current,
          });

          // Don't provide completions if we're currently accepting or have already accepted
          if (
            isAcceptingSuggestionRef.current ||
            suggestionAcceptedRef.current
          ) {
            console.log("Skipping completion - already accepting or accepted");
            return { items: [] };
          }

          // Only provide suggestion if we have one
          if (!suggestion || !suggestionPosition) {
            console.log("No suggestion or position available");
            return { items: [] };
          }

          // Check if current position matches suggestion position (with some tolerance)
          const currentLine = position.lineNumber;
          const currentColumn = position.column;

          const isPositionMatch =
            currentLine === suggestionPosition.line &&
            currentColumn === suggestionPosition.column;

          if (!isPositionMatch) {
            console.log("Position mismatch", {
              current: `${currentLine}:${currentColumn}`,
              expected: `${suggestionPosition.line}:${suggestionPosition.column}`,
            });
            return { items: [] };
          }

          const suggestionId = generateSuggestionId();
          currentSuggestionRef.current = {
            text: suggestion,
            position: suggestionPosition,
            id: suggestionId,
          };

          console.log("Providing inline completion", {
            suggestionId,
            suggestion: suggestion.substring(0, 50) + "...",
          });

          // Clean the suggestion text (remove \r characters)
          const cleanSuggestion = suggestion.replace(/\r/g, "");

          return {
            items: [
              {
                insertText: cleanSuggestion,
                range: new monaco.Range(
                  suggestionPosition.line,
                  suggestionPosition.column,
                  suggestionPosition.line,
                  suggestionPosition.column,
                ),
              },
            ],
          };
        },
        freeInlineCompletions: (completions: any) => {
          console.log("freeInlineCompletions called");
        },
      };
    },
    [suggestion, suggestionPosition],
  );

  // Clear current suggestion
  const clearCurrentSuggestion = useCallback(() => {
    console.log("Clearing current suggestion");
    currentSuggestionRef.current = null;
    suggestionAcceptedRef.current = false;
    if (editorRef.current) {
      editorRef.current.trigger("ai", "editor.action.inlineSuggest.hide", null);
    }
  }, []);

  //accept current suggestion with double acceptance prevention
  const acceptCurrentSuggestion = useCallback(() => {
    console.log("acceptCurrentSuggestion called", {
      hasEditor: !!editorRef.current,
      hasMonaco: !!monacoRef.current,
      hasSuggestion: !!currentSuggestionRef.current,
      isAccepting: isAcceptingSuggestionRef.current,
      suggestionAccepted: suggestionAcceptedRef.current,
    });

    if (
      !editorRef.current ||
      !monacoRef.current ||
      !currentSuggestionRef.current
    ) {
      console.log("Cannot accept suggestion - missing refs");
      return false;
    }

    // CRITICAL: Prevent double acceptance with immediate flag setting
    if (isAcceptingSuggestionRef.current || suggestionAcceptedRef.current) {
      console.log("BLOCKED: Already accepting/accepted suggestion, skipping");
      return false;
    }

    // Set flags IMMEDIATELY to prevent any race conditions
    isAcceptingSuggestionRef.current = true;
    suggestionAcceptedRef.current = true;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const currentSuggestion = currentSuggestionRef.current;

    try {
      // Clean the suggestion text (remove \r characters)
      const cleanSuggestionText = currentSuggestion.text.replace(/\r/g, "");

      console.log(
        "ACCEPTING suggestion:",
        cleanSuggestionText.substring(0, 50) + "...",
      );

      // Get current cursor position to validate
      const currentPosition = editor.getPosition();
      const suggestionPos = currentSuggestion.position;

      // Verify we're still at the suggestion position
      if (
        currentPosition.lineNumber !== suggestionPos.line ||
        currentPosition.column < suggestionPos.column ||
        currentPosition.column > suggestionPos.column + 5
      ) {
        console.log("Position changed, cannot accept suggestion");
        return false;
      }

      // Insert the suggestion text at the correct position
      const range = new monaco.Range(
        suggestionPos.line,
        suggestionPos.column,
        suggestionPos.line,
        suggestionPos.column,
      );

      // Use executeEdits to insert the text
      const success = editor.executeEdits("ai-suggestion-accept", [
        {
          range: range,
          text: cleanSuggestionText,
          forceMoveMarkers: true,
        },
      ]);

      if (!success) {
        console.error("Failed to execute edit");
        return false;
      }

      // Calculate new cursor position
      const lines = cleanSuggestionText.split("\n");
      const endLine = suggestionPos.line + lines.length - 1;
      const endColumn =
        lines.length === 1
          ? suggestionPos.column + cleanSuggestionText.length
          : lines[lines.length - 1].length + 1;

      // Move cursor to end of inserted text
      editor.setPosition({ lineNumber: endLine, column: endColumn });

      console.log(
        "SUCCESS: Suggestion accepted, new position:",
        `${endLine}:${endColumn}`,
      );

      // Clear the suggestion
      clearCurrentSuggestion();

      // Call the parent's accept handler
      onAcceptSuggestion(editor, monaco);

      return true;
    } catch (error) {
      console.error("Error accepting suggestion:", error);
      return false;
    } finally {
      // Reset accepting flag immediately
      isAcceptingSuggestionRef.current = false;

      // Keep accepted flag for longer to prevent immediate re-acceptance
      setTimeout(() => {
        suggestionAcceptedRef.current = false;
        console.log("Reset suggestionAcceptedRef flag");
      }, 1000); // Increased delay to 1 second
    }
  }, [clearCurrentSuggestion, onAcceptSuggestion]);

  // Check if there's an active inline suggestion at current position
  const hasActiveSuggestionAtPosition = useCallback(() => {
    if (!editorRef.current || !currentSuggestionRef.current) return false;

    const position = editorRef.current.getPosition();
    const suggestion = currentSuggestionRef.current;

    return (
      position.lineNumber === suggestion.position.line &&
      position.column === suggestion.position.column
    );
  }, []);

  // Update inline completions when suggestion changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    console.log("Suggestion changed", {
      hasSuggestion: !!suggestion,
      hasPosition: !!suggestionPosition,
      isAccepting: isAcceptingSuggestionRef.current,
      suggestionAccepted: suggestionAcceptedRef.current,
    });

    // Don't update if we're in the middle of accepting a suggestion
    if (isAcceptingSuggestionRef.current || suggestionAcceptedRef.current) {
      console.log("Skipping update - currently accepting/accepted suggestion");
      return;
    }

    // Dispose previous provider
    if (inlineCompletionProviderRef.current) {
      inlineCompletionProviderRef.current.dispose();
      inlineCompletionProviderRef.current = null;
    }

    // Clear current suggestion reference
    currentSuggestionRef.current = null;

    // Register new provider if we have a suggestion
    if (suggestion && suggestionPosition) {
      console.log("Registering new inline completion provider");

      const language = getEditorLanguage(activeFile?.fileExtension || "");
      const provider = createInlineCompletionProvider(monaco);

      inlineCompletionProviderRef.current =
        monaco.languages.registerInlineCompletionsProvider(language, provider);

      // registration is synchronous, so trigger right away
      editor.trigger("ai", "editor.action.inlineSuggest.trigger", null);
    } else {
      editor.trigger("ai", "editor.action.inlineSuggest.hide", null);
    }

    return () => {
      if (inlineCompletionProviderRef.current) {
        inlineCompletionProviderRef.current.dispose();
        inlineCompletionProviderRef.current = null;
      }
    };
  }, [
    suggestion,
    suggestionPosition,
    activeFile,
    createInlineCompletionProvider,
  ]);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    console.log("Editor instance mounted:", !!editorRef.current);

    editor.updateOptions({
      ...defaultEditorOptions,
      // Enable inline suggestions but with specific settings to prevent conflicts
      inlineSuggest: {
        enabled: true,
        mode: "prefix",
        suppressSuggestions: false,
      },
      // Disable some conflicting suggest features
      suggest: {
        preview: false, // Disable preview to avoid conflicts
        showInlineDetails: false,
        insertMode: "replace",
      },
      // Quick suggestions
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      },
      // Smooth cursor
      cursorSmoothCaretAnimation: "on",
    });

    configureMonaco(monaco);

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      console.log("Ctrl+Space pressed, triggering suggestion");
      onTriggerSuggestion("completion", editor);
    });

    // CRITICAL: Override Tab key with high priority and prevent default Monaco behavior
    tabCommandRef.current = editor.addCommand(
      monaco.KeyCode.Tab,
      () => {
        console.log("TAB PRESSED", {
          hasSuggestion: !!currentSuggestionRef.current,
          hasActiveSuggestion: hasActiveSuggestionAtPosition(),
          isAccepting: isAcceptingSuggestionRef.current,
          suggestionAccepted: suggestionAcceptedRef.current,
        });

        // CRITICAL: Block if already processing
        if (isAcceptingSuggestionRef.current) {
          console.log(
            "BLOCKED: Already in the process of accepting, ignoring Tab",
          );
          return;
        }

        // CRITICAL: Block if just accepted
        if (suggestionAcceptedRef.current) {
          console.log(
            "BLOCKED: Suggestion was just accepted, using default tab",
          );
          editor.trigger("keyboard", "tab", null);
          return;
        }

        // If we have an active suggestion at the current position, try to accept it
        if (currentSuggestionRef.current && hasActiveSuggestionAtPosition()) {
          console.log("ATTEMPTING to accept suggestion with Tab");
          const accepted = acceptCurrentSuggestion();
          if (accepted) {
            console.log(
              "SUCCESS: Suggestion accepted via Tab, preventing default behavior",
            );
            return; // CRITICAL: Return here to prevent default tab behavior
          }
          console.log(
            "FAILED: Suggestion acceptance failed, falling through to default",
          );
        }

        // Default tab behavior (indentation)
        console.log("DEFAULT: Using default tab behavior");
        editor.trigger("keyboard", "tab", null);
      },
      // CRITICAL: Use specific context to override Monaco's built-in Tab handling
      "editorTextFocus && !editorReadonly && !suggestWidgetVisible",
    );

    // Escape to reject
    editor.addCommand(monaco.KeyCode.Escape, () => {
      console.log("Escape pressed");
      if (currentSuggestionRef.current) {
        onRejectSuggestion(editor);
        clearCurrentSuggestion();
      }
    });

    // Listen for cursor position changes to hide suggestions when moving away
    editor.onDidChangeCursorPosition((e: any) => {
      if (isAcceptingSuggestionRef.current) return;

      const newPosition = e.position;

      // Clear existing suggestion if cursor moved away (props via ref: this closure is from mount)
      const suggestionPos = suggestionPositionRef.current;
      if (suggestionPos && !suggestionAcceptedRef.current) {
        if (
          newPosition.lineNumber !== suggestionPos.line ||
          newPosition.column !== suggestionPos.column
        ) {
          console.log("Cursor moved away from suggestion, clearing");
          clearCurrentSuggestion();
          onRejectSuggestion(editor);
        }
      }

      // Trigger new suggestion if appropriate (simplified)
      if (!currentSuggestionRef.current && !suggestionLoading) {
        // Clear any existing timeout
        if (suggestionTimeoutRef.current) {
          clearTimeout(suggestionTimeoutRef.current);
        }

        // Trigger suggestion with a delay
        suggestionTimeoutRef.current = setTimeout(() => {
          onTriggerSuggestion("completion", editor);
        }, 300);
      }
    });

    // Listen for content changes to detect manual typing over suggestions
    editor.onDidChangeModelContent((e: any) => {
      if (isAcceptingSuggestionRef.current) return;

      // If user types while there's a suggestion, clear it (unless it's our insertion)
      if (
        currentSuggestionRef.current &&
        e.changes.length > 0 &&
        !suggestionAcceptedRef.current
      ) {
        const change = e.changes[0];

        // Check if this is our own suggestion insertion
        if (
          change.text === currentSuggestionRef.current.text ||
          change.text === currentSuggestionRef.current.text.replace(/\r/g, "")
        ) {
          console.log("Our suggestion was inserted, not clearing");
          return;
        }

        // User typed something else, clear the suggestion
        console.log("User typed while suggestion active, clearing");
        clearCurrentSuggestion();
      }

      // Trigger context-aware suggestions on certain typing patterns
      if (e.changes.length > 0 && !suggestionAcceptedRef.current) {
        const change = e.changes[0];

        // Trigger suggestions after specific characters
        if (
          change.text === "\n" || // New line
          change.text === "{" || // Opening brace
          change.text === "." || // Dot notation
          change.text === "=" || // Assignment
          change.text === "(" || // Function call
          change.text === "," || // Parameter separator
          change.text === ":" || // Object property
          change.text === ";" // Statement end
        ) {
          setTimeout(() => {
            if (
              editorRef.current &&
              !currentSuggestionRef.current &&
              !suggestionLoading
            ) {
              onTriggerSuggestion("completion", editor);
            }
          }, 100); // Small delay to let the change settle
        }
      }
    });

    updateEditorLanguage();
  };

  const updateEditorLanguage = () => {
    if (!activeFile || !monacoRef.current || !editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const language = getEditorLanguage(activeFile.fileExtension || "");
    try {
      monacoRef.current.editor.setModelLanguage(model, language);
    } catch (error) {
      console.warn("Failed to set editor language:", error);
    }
  };

  useEffect(() => {
    updateEditorLanguage();
  }, [activeFile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
      if (inlineCompletionProviderRef.current) {
        inlineCompletionProviderRef.current.dispose();
        inlineCompletionProviderRef.current = null;
      }
    };
  }, []);

  const templateData = useFileExplorer((state) => state.templateData);

  const fontSize = useEditorSettings((state) => state.fontSize);
  const tabSize = useEditorSettings((state) => state.tabSize);
  const wordWrap = useEditorSettings((state) => state.wordWrap);
  const minimap = useEditorSettings((state) => state.minimap);
  const lineNumbers = useEditorSettings((state) => state.lineNumbers);

  const editorOptions = useMemo(
    () => ({
      ...defaultEditorOptions,
      ...toMonacoOverrides({
        fontSize,
        tabSize,
        wordWrap,
        minimap,
        lineNumbers,
        autoSave: false,
      }),
    }),
    [fontSize, tabSize, wordWrap, minimap, lineNumbers],
  );

  // Monaco's TypeScript worker infers TS/TSX vs JS/JSX from the model's URI, not from
  // the editor language. Without a path every model is "inmemory://model/N", which has
  // no extension and falls back to JavaScript - so .tsx files report "Type annotations
  // can only be used in TypeScript files". Giving each file a real path fixes that.
  const modelPath = useMemo(() => {
    if (!activeFile) return undefined;

    const extensionSuffix = activeFile.fileExtension
      ? `.${activeFile.fileExtension}`
      : "";
    const filePath =
      (templateData && findFilePath(activeFile, templateData)) ||
      `${activeFile.filename}${extensionSuffix}`;

    return `file:///${filePath.replace(/^\/+/, "")}`;
  }, [activeFile, templateData]);

  return (
    <div className="h-full w-full relative overflow-hidden">
      {(suggestionLoading || suggestion) && (
        <div
          className={`absolute top-2 right-4 z-10 flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-medium shadow-sm ${
            suggestionLoading
              ? "border-red-700 bg-red-600 text-white"
              : "border-green-700 bg-green-600 text-white"
          }`}
        >
          {suggestionLoading ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              AI thinking...
            </>
          ) : (
            <>
              Press{" "}
              <kbd className="rounded bg-green-800 px-1 font-mono">Tab</kbd> to
              accept
            </>
          )}
        </div>
      )}
      <Editor
        height={"100%"}
        path={modelPath}
        value={content}
        onChange={(value) => onContentChange(value || "")}
        onMount={handleEditorDidMount}
        language={
          activeFile
            ? getEditorLanguage(activeFile.fileExtension || "")
            : "plaintext"
        }
        //@ts-ignore
        options={editorOptions}
      />
    </div>
  );
};

export default PlaygroundEditor;
