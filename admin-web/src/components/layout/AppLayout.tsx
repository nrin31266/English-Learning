
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar"
import { Outlet } from "react-router-dom"
import AppFooter from "./AppFooter"
import AppHeader from "./AppHeader"
import { AppSidebar } from "./AppSidebar"

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader/>
        <div className="min-h-[56vh] px-2 py-2">
          <Outlet/>
        </div>
        <AppFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}
