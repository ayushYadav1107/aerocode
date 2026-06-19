import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardSidebar } from "@/features/dashboard/dashboard-sidebar";
import { getAllPlaygroundForUser } from "@/features/playground/actions";
import type React from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const playgroundData = await getAllPlaygroundForUser();

  const technologyIconMap: Record<string, string> = {
    REACT: "Zap",
    NEXTJS: "Lightbulb",
    EXPRESS: "Database",
    VUE: "Compass",
    HONO: "FlameIcon",
    ANGULAR: "Terminal",
  };

  const formattedPlaygroundData =
    playgroundData?.map((item) => ({
      id: item.id,
      name: item.title,
      starred: item.Starmark?.[0]?.isMarked || false,
      icon: technologyIconMap[item.template] || "Code2",
    })) || [];

  return (
    <SidebarProvider>
      <TooltipProvider>
        <div className="flex min-h-screen w-full overflow-x-hidden">
          <DashboardSidebar
            initialPlaygroundData={formattedPlaygroundData}
          />
          <main className="flex-1">{children}</main>
        </div>
      </TooltipProvider>
    </SidebarProvider>
  );
}