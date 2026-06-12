// src/components/layout/Page.tsx

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Outlet } from "react-router-dom"
import AppFooterContent from "./AppFooterContent"
import AppHeaderContent from "./AppHeaderContent"
import { AppSidebar } from "./AppSidebar" // 👉 IMPORT SIDEBAR MỚI

export default function Page() {
  return (
    <SidebarProvider>

      <AppSidebar />

      <SidebarInset className="flex flex-col min-h-screen bg-background">
        {/* HEADER */}
        <header className="sticky top-0 h-16 border-b border-border/40 bg-background/70 backdrop-blur 
        shadow-sm z-48">
          <AppHeaderContent />
        </header>

        {/* NỘI DUNG CHÍNH (CONTENT AREA) */}
        <div className="flex flex-col mt-4 mb-4 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>

        {/* FOOTER */}
        <footer className="bg-foreground text-background border-t border-ring">
          <AppFooterContent />
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}