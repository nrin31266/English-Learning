// src/components/layout/Page.tsx

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Outlet } from "react-router-dom"
import AppFooterContent from "./AppFooterContent"
import AppHeaderContent from "./AppHeaderContent"
import { AppSidebar } from "./AppSidebar"
import { useGamificationSocket } from "@/hooks/useGamificationSocket"
import AuthDialog from "@/components/auth/AuthDialog"


export default function Page() {
  useGamificationSocket()

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />

      <SidebarInset className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-48 h-16 border-b border-border/40 bg-background/70 shadow-sm backdrop-blur">
          <AppHeaderContent />
        </header>

        <main className="flex flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="border-t border-ring bg-foreground text-background">
          <AppFooterContent />
        </footer>
      </SidebarInset>

      <AuthDialog />
    </SidebarProvider>
  )
}