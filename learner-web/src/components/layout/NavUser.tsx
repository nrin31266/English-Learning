// src/components/layout/NavUser.tsx
"use client"

import {
  ChevronsUpDown,
  LogOut,
  LogIn,
  User,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import KeycloakClient from "@/features/keycloak/keycloak"
import { useAppDispatch } from "@/store"
import { openAuthDialog } from "@/store/uiSlice"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
    isGuest?: boolean
  }
}) {
  const { isMobile } = useSidebar()
  const dispatch = useAppDispatch()
  const kcClient = KeycloakClient.getInstance()

  if (user.isGuest) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() => dispatch(openAuthDialog())}
            className="
              h-12 overflow-hidden rounded-xl border border-primary/25
              bg-primary/10 px-2.5 text-primary
              shadow-sm shadow-primary/10
              transition-colors
              hover:border-primary/40 hover:bg-primary/15 hover:text-primary
              active:bg-primary/20

              group-data-[collapsible=icon]:mx-auto
              group-data-[collapsible=icon]:size-10
              group-data-[collapsible=icon]:justify-center
              group-data-[collapsible=icon]:rounded-lg
              group-data-[collapsible=icon]:border-primary/25
              group-data-[collapsible=icon]:bg-primary/10
              group-data-[collapsible=icon]:p-0
              group-data-[collapsible=icon]:text-primary
              group-data-[collapsible=icon]:shadow-none
              group-data-[collapsible=icon]:hover:bg-primary/15
            "
          >
            <div
              className="
                flex size-8 shrink-0 items-center justify-center rounded-lg
                bg-primary text-primary-foreground
                group-data-[collapsible=icon]:size-8
                group-data-[collapsible=icon]:rounded-lg
                group-data-[collapsible=icon]:bg-primary
                group-data-[collapsible=icon]:text-primary-foreground
              "
            >
              <LogIn className="size-4" />
            </div>

            <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-semibold">
                Đăng nhập
              </span>
              <span className="truncate text-xs text-muted-foreground">
                Lưu tiến trình học
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="
                h-12 rounded-xl px-2.5 transition-colors
                hover:bg-sidebar-accent/70
                data-[state=open]:bg-sidebar-accent
                data-[state=open]:text-sidebar-accent-foreground

                group-data-[collapsible=icon]:mx-auto
                group-data-[collapsible=icon]:size-10
                group-data-[collapsible=icon]:justify-center
                group-data-[collapsible=icon]:rounded-lg
                group-data-[collapsible=icon]:p-0
              "
            >
              <Avatar className="size-8 rounded-lg ring-1 ring-border/60 group-data-[collapsible=icon]:size-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>

              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={6}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-2 py-2 text-left text-sm">
                <Avatar className="size-9 rounded-lg ring-1 ring-border/60">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2">
                <User className="size-4" />
                Tài khoản
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => kcClient.logout()}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}