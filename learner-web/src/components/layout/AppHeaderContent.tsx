// src/components/layout/AppHeaderContent.tsx
import { SidebarTrigger } from "@/components/ui/sidebar"
import Notification from "./Notification"

const AppHeaderContent = () => {
  return (
    <div className="flex h-full w-full items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* TRÁI: Nút Hamburger mở đóng Sidebar */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-2 h-9 w-9 text-muted-foreground hover:text-foreground" />
      </div>

      {/* PHẢI: Chỉ giữ lại chuông thông báo cá nhân */}
      <div className="flex items-center gap-1 sm:gap-2">
        <Notification />
      </div>
    </div>
  )
}

export default AppHeaderContent