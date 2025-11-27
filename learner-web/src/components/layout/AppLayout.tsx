
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar"
import { Outlet } from "react-router-dom"
import AppFooterContent from "./AppFooterContent"
import AppHeaderContent from "./AppHeaderContent"


export default function Page() {
  return (
    <SidebarProvider>
      <SidebarInset className="">
        <header className="sticky top-0 z-50 h-16
            border-b border-border/40
            bg-background/70 backdrop-blur shadow-sm">
          <AppHeaderContent />
        </header>

        <div className="container mx-auto flex flex-col min-h-[calc(100vh-20rem)] mt-4 mb-4">
          <Outlet />

        </div>
        <footer className="bg-foreground text-background border-t border-ring">
          <AppFooterContent />
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
