// src/components/layout/BrandLogo.tsx
"use client"

import { Link } from "react-router-dom"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"

export function BrandLogo() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          asChild
          className="hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:p-0"
        >
          <Link to="/" className="flex items-center gap-3 select-none w-full h-full">
           
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-sm shrink-0 group-data-[collapsible=icon]:mx-auto">
              FR
            </div>
            
            
            <span className="truncate font-bold text-foreground text-base tracking-tight group-data-[collapsible=icon]:hidden">
              Fluenrin
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}