import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import AppHeader from "./AppHeader"
import { Outlet } from "react-router-dom"
import AppFooter from "./AppFooter"

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
