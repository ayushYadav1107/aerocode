"use client";
import React, { useCallback } from "react";
import { useParams } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { usePlayground } from "@/features/playground/hooks/usePlayground";
import { useFileExplorer } from "@/features/playground/hooks/useFileExplorer";
import TemplateFileTree from "@/features/playground/components/template-file-tree";
import { TemplateFile, TemplateFolder } from "@/features/playground/types";

const Page = () => {
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

  return (
    <div>
      <TooltipProvider>
        <>
          <TemplateFileTree data={templateData!} />

          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />

              <div className="flex flex-1 items-center gap-2">
                <div className="flex flex-col flex-1">
                  {playgroundData?.title || "Code Playground"}
                </div>
              </div>
            </header>
          </SidebarInset>
        </>
      </TooltipProvider>
    </div>
  );
};

export default Page;
