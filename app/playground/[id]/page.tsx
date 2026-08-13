"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { usePlayground } from "@/features/playground/hooks/usePlayground";
import { useFileExplorer } from "@/features/playground/hooks/useFileExplorer";
import TemplateFileTree, {
  NewFileDialog,
  NewFolderDialog,
} from "@/features/playground/components/template-file-tree";
import PlaygroundWelcome from "@/features/playground/components/playground-welcome";
import { TemplateFile, TemplateFolder } from "@/features/playground/types";
import { toast } from "sonner";
import {
  FolderOpen,
  AlertCircle,
  Save,
  X,
  Settings,
  Bot,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import PlaygroundEditor from "@/features/playground/components/playground-editor";
import { useWebContainer } from "@/features/webContainers/hooks/useWebContainer";
import WebContainerPreview from "@/features/webContainers/components/webcontainer-preview";
import LoadingStep from "@/components/ui/loader";

const Page = () => {
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const { id } = useParams<{ id: string }>();
  const { playgroundData, templateData, isLoading, error, saveTemplateData } =
    usePlayground(id);
  const {
    activeFileId,
    closeAllFiles,
    openFile,
    closeFile,
    editorContent,
    updateFileContent,
    handleAddFile,
    handleAddFolder,
    handleDeleteFile,
    handleDeleteFolder,
    handleRenameFile,
    handleRenameFolder,
    openFiles,
    setTemplateData,
    setActiveFileId,
    setPlaygroundId,
    setOpenFiles,
  } = useFileExplorer();

  const {
    serverUrl,
    isLoading: containerLoading,
    error: containerError,
    instance,
    writeFileSync,
  } = useWebContainer();

  // Keep the file explorer store in sync with the loaded playground
  useEffect(() => {
    setPlaygroundId(id);
  }, [id, setPlaygroundId]);

  useEffect(() => {
    if (templateData) setTemplateData(templateData);
  }, [templateData, setTemplateData]);

  const { setOpen: setSidebarOpen } = useSidebar();
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);

  const activeFile = openFiles.find((file) => file.id === activeFileId);
  const hasUnsavedChanges = openFiles.some((file) => file.hasUnsavedChanges);

  const handleCreateFile = useCallback(
    async (filename: string, extension: string) => {
      setIsNewFileDialogOpen(false);
      await handleAddFile(
        { filename, fileExtension: extension, content: "" },
        "",
        writeFileSync,
        null,
        saveTemplateData,
      );
    },
    [handleAddFile, writeFileSync, saveTemplateData],
  );

  const handleCreateFolder = useCallback(
    async (folderName: string) => {
      setIsNewFolderDialogOpen(false);
      await handleAddFolder(
        { folderName, items: [] },
        "",
        null,
        saveTemplateData,
      );
    },
    [handleAddFolder, saveTemplateData],
  );

  const handleFileSelect = (file: TemplateFile) => {
    console.log("HandlePath", file);
    openFile(file);
  };

  if(error){
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4"/>
        <h2 className="text-xl font-semibold text-red-600 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="destructive">
          Try again
        </Button>
      </div>
    )
  };

  if(isLoading){
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-6 text-center">
            Loading Playground
          </h2>
          <div className="mb-8">
            <LoadingStep 
              currentStep={1}
              step={1}
              label="Loading playground data"
            />
            <LoadingStep 
            currentStep={2}
            step={2}
            label="Setting up environment"
            />
            <LoadingStep currentStep={3} step={3} label="Ready to code" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <>
        <TemplateFileTree
          data={templateData!}
          onFileSelect={handleFileSelect}
          selectedFile={activeFile}
        />

        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            <div className="flex flex-1 items-center gap-2">
              <div className="flex flex-col flex-1">
                <h1 className="text-sm font-medium">
                  {playgroundData?.title || "Code Playground"}
                </h1>

                <p className="text-xs text-muted-foreground">
                  {openFiles.length} File(s) open
                  {hasUnsavedChanges && " • Unsaved changes"}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size={"sm"}
                      variant={"outline"}
                      onClick={() => {}}
                      disabled={!activeFile || !activeFile.hasUnsavedChanges}
                    >
                      <Save className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save (Ctrl + S)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size={"sm"}
                      variant={"outline"}
                      onClick={() => {}}
                      disabled={!activeFile || !activeFile.hasUnsavedChanges}
                    >
                      <Save className="size-4" /> All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save All (Ctrl+Shift+S)</TooltipContent>
                </Tooltip>

                {/* Todo  AI thinking*/}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size={"sm"}
                      variant={"outline"}
                      onClick={() => {}}
                      disabled={!activeFile || !activeFile.hasUnsavedChanges}
                    >
                      <Bot className="size-4" /> AI
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle AI</TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size={"sm"} variant={"outline"}>
                      <Settings className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                    >
                      {isPreviewVisible ? "Hide" : "Show"} Preview
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={closeAllFiles}>
                      Close All Files
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div className="h-[calc(100vh-4rem)]">
            {openFiles.length > 0 ? (
              <div className="flex flex-col h-full">
                <div className="border-b bg-muted/30">
                  <Tabs
                    value={activeFileId || ""}
                    onValueChange={setActiveFileId}
                  >
                    <div className="flex items-center justify-between px-4 py-2">
                      <TabsList className="h-8 bg-transparent p-0">
                        {openFiles.map((file) => (
                          <TabsTrigger
                            key={file.id}
                            value={file.id}
                            className="h-8 px-3 relative data-[state=active]:bg-background data-[state=active]:shadow-sm group"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="size-3" />
                              <span>
                                {file.filename}.{file.fileExtension}
                              </span>
                              {file.hasUnsavedChanges && (
                                <span className="h-2 w-2 rounded-full bg-orange-500" />
                              )}
                              <span
                                className="ml-2 h-4 w-4 hover:bg-destructive hover:text-destructive-foreground rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeFile(file.id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </span>
                            </div>
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {openFiles.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={closeAllFiles}
                          className="h-6 px-2 text-xs"
                        >
                          Close All
                        </Button>
                      )}
                    </div>
                  </Tabs>
                </div>

                <div className="flex-1 min-h-0">
                  <ResizablePanelGroup
                    className="h-full"
                    orientation="horizontal"
                  >
                    {/* min-w-0 matters: panels are flex children, and the default
                        min-width:auto lets the editor and terminal force the group
                        wider than the viewport, which is what caused the sideways
                        scrolling. */}
                    <ResizablePanel
                      defaultSize={50}
                      minSize={20}
                      className="h-full min-w-0 overflow-hidden"
                    >
                      <PlaygroundEditor
                        activeFile={activeFile}
                        content={activeFile?.content || ""}
                        onContentChange={(value) =>
                          activeFileId && updateFileContent(activeFileId, value)
                        }
                      />
                    </ResizablePanel>

                    {isPreviewVisible && (
                      <>
                        <ResizableHandle withHandle />
                        <ResizablePanel
                          defaultSize={50}
                          minSize={20}
                          className="h-full min-w-0 overflow-hidden"
                        >
                          <WebContainerPreview
                            templateData={templateData!}
                            playgroundId={id}
                            instance={instance}
                            writeFileSync={writeFileSync}
                            isLoading={containerLoading}
                            error={containerError}
                            serverUrl={serverUrl!}
                            forceResetup={false}
                          />
                        </ResizablePanel>
                      </>
                    )}
                  </ResizablePanelGroup>
                </div>
              </div>
            ) : (
              <PlaygroundWelcome
                title={playgroundData?.title}
                templateData={templateData}
                onFileSelect={openFile}
                onNewFile={() => setIsNewFileDialogOpen(true)}
                onNewFolder={() => setIsNewFolderDialogOpen(true)}
                onOpenExplorer={() => setSidebarOpen(true)}
              />
            )}
          </div>
        </SidebarInset>

        <NewFileDialog
          isOpen={isNewFileDialogOpen}
          onClose={() => setIsNewFileDialogOpen(false)}
          onCreateFile={handleCreateFile}
        />
        <NewFolderDialog
          isOpen={isNewFolderDialogOpen}
          onClose={() => setIsNewFolderDialogOpen(false)}
          onCreateFolder={handleCreateFolder}
        />
      </>
    </TooltipProvider>
  );
};

export default Page;
