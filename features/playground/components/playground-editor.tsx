"use client"
import React, {useMemo, useRef} from 'react'
import Editor, {type Monaco} from '@monaco-editor/react'
import { TemplateFile } from '../types'
import { findFilePath } from '../libs'
import { useFileExplorer } from '../hooks/useFileExplorer'
import {configureMonaco, defaultEditorOptions, getEditorLanguage} from '@/features/playground/libs/editor-config';
import { toMonacoOverrides, useEditorSettings } from '@/features/dashboard/hooks/useEditorSettings';

interface PlaygroundEditorProps {
    activeFile:TemplateFile | undefined
    content:string
    onContentChange:(value:string)=>void
}
const PlaygroundEditor = ({
    activeFile,
    content,
    onContentChange,
}: PlaygroundEditorProps) => {
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<Monaco | null>(null);
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

    const handleEditorDidMount = (editor:any, monaco:Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        configureMonaco(monaco);
    }

    // Monaco's TypeScript worker infers TS/TSX vs JS/JSX from the model's URI, not from
    // the editor language. Without a path every model is "inmemory://model/N", which has
    // no extension and falls back to JavaScript - so .tsx files report "Type annotations
    // can only be used in TypeScript files". Giving each file a real path fixes that.
    const modelPath = useMemo(() => {
        if (!activeFile) return undefined

        const extensionSuffix = activeFile.fileExtension ? `.${activeFile.fileExtension}` : ""
        const filePath =
            (templateData && findFilePath(activeFile, templateData)) ||
            `${activeFile.filename}${extensionSuffix}`

        return `file:///${filePath.replace(/^\/+/, "")}`
    }, [activeFile, templateData])

  return (
    <div className='h-full w-full relative overflow-hidden'>
        {/* ai thinking */ }
        <Editor
        height={"100%"}
        path={modelPath}
        value={content}
        onChange={(value) => onContentChange(value || "")}
        onMount={handleEditorDidMount}
        language={activeFile ? getEditorLanguage(activeFile.fileExtension || "") : "plaintext"}
        //@ts-ignore
        options={editorOptions}
        />
    </div>
  )
}

export default PlaygroundEditor;