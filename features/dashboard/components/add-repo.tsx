"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowDown, Loader2 } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPlaygroundFromRepo } from "@/features/playground/actions";

const AddRepo = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const router = useRouter();

  const handleImport = async () => {
    if (!url.trim() || isImporting) return;
    setIsImporting(true);

    try {
      const res = await fetch("/api/github-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not import that repository");
        return;
      }

      const playground = await createPlaygroundFromRepo({
        title: data.name,
        description: data.description ?? undefined,
        templateData: data.templateData,
      });

      toast.success(
        `Imported ${data.fileCount} files from ${data.name}` +
          (data.truncated ? " (large repo, some files skipped)" : "")
      );
      setIsOpen(false);
      setUrl("");
      router.refresh();
      router.push(`/playground/${playground.id}`);
    } catch (error) {
      console.error("Repository import failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not import that repository"
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className="group px-6 py-6 flex flex-row justify-between items-center border rounded-lg bg-muted cursor-pointer
      transition-all duration-300 ease-in-out
      hover:bg-background hover:border-[#E93F3F] hover:scale-[1.02]
      shadow-[0_2px_10px_rgba(0,0,0,0.08)]
      hover:shadow-[0_10px_30px_rgba(233,63,63,0.15)]"
      >
        <div className="flex flex-row justify-center items-start gap-4">
          <Button
            variant={"outline"}
            className="flex justify-center items-center bg-white group-hover:bg-[#fff8f8] group-hover:border-[#E93F3F] group-hover:text-[#E93F3F] transition-colors duration-300"
            size={"icon"}
          >
            <ArrowDown
              size={30}
              className="transition-transform duration-300 group-hover:translate-y-1"
            />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-[#e93f3f]">
              Open Github Repository
            </h1>
            <p className="text-sm text-muted-foreground max-w-[220px]">
              Work with your repositories in our editor
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <Image
            src={"/github.svg"}
            alt="Open GitHub repository"
            width={150}
            height={150}
            className="transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaGithub className="h-5 w-5" />
              Import a GitHub repository
            </DialogTitle>
            <DialogDescription>
              Paste a public repository URL. Its files open as a new playground.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Input
              autoFocus
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleImport()}
              disabled={isImporting}
            />
            <p className="text-xs text-muted-foreground">
              Public repositories only. Binaries, lockfiles and node_modules are
              skipped, and very large repos are truncated.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!url.trim() || isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddRepo;
