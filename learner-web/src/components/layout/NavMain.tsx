// src/components/layout/NavMain.tsx

import { ChevronRight, type LucideIcon } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type NavChildItem = {
  title: string
  url: string
  activeUrls?: string[]
}

export type NavItem = {
  title: string
  url: string
  activeUrls?: string[]
  icon?: LucideIcon
  items?: NavChildItem[]
}

type NavMainProps = {
  label: string
  items: NavItem[]
}

const isPathActive = (pathname: string, url: string) => {
  if (!url || url === "#") return false
  if (url === "/") return pathname === "/"

  return pathname === url || pathname.startsWith(`${url}/`)
}

const isNavItemActive = (
  pathname: string,
  url: string,
  activeUrls?: string[]
) => {
  const urls = activeUrls?.length ? activeUrls : [url]

  return urls.some((itemUrl) => isPathActive(pathname, itemUrl))
}

export function NavMain({ items, label }: NavMainProps) {
  const { pathname } = useLocation()
  const { state, isMobile } = useSidebar()

  const isCollapsed = state === "collapsed" && !isMobile

  return (
    <SidebarGroup className="px-2">
      <SidebarGroupLabel className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/65 group-data-[collapsible=icon]:hidden">
        {label}
      </SidebarGroupLabel>

      <SidebarMenu className="gap-1">
        {items.map((item) => {
          const hasChildren = !!item.items?.length
          const isChildActive =
            item.items?.some((subItem) =>
              isNavItemActive(pathname, subItem.url, subItem.activeUrls)
            ) ?? false

          const isActive =
            isNavItemActive(pathname, item.url, item.activeUrls) ||
            isChildActive

          if (hasChildren && isCollapsed) {
            return (
              <SidebarMenuItem key={item.title}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      className={cn(
                        "h-10 rounded-lg text-[14px] font-semibold",
                        "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                        "[&>svg]:size-[18px]",
                        "group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:p-0",
                        "group-data-[collapsible=icon]:[&>svg]:size-5",
                        isActive &&
                          "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                      )}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    side="right"
                    align="start"
                    sideOffset={10}
                    className="w-52 rounded-xl p-1.5"
                  >
                    <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground">
                      {item.title}
                    </div>

                    {item.items?.map((subItem) => {
                      const isSubActive = isNavItemActive(
                        pathname,
                        subItem.url,
                        subItem.activeUrls
                      )

                      return (
                        <DropdownMenuItem
                          key={subItem.title}
                          asChild
                          className={cn(
                            "cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium",
                            isSubActive && "bg-primary/10 text-primary"
                          )}
                        >
                          <Link to={subItem.url}>{subItem.title}</Link>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            )
          }

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isChildActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                {hasChildren ? (
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      className={cn(
                        "h-10 rounded-lg text-[14px] font-semibold",
                        "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                        "[&>svg]:size-[18px]",
                        isActive &&
                          "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                      )}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-150 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                ) : (
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive}
                    className={cn(
                      "h-10 rounded-lg text-[14px] font-semibold",
                      "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                      "[&>svg]:size-[18px]",
                      "group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:p-0",
                      "group-data-[collapsible=icon]:[&>svg]:size-5",
                      isActive &&
                        "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                    )}
                  >
                    <Link to={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}

                {hasChildren && (
                  <CollapsibleContent>
                    <SidebarMenuSub className="mx-0 ml-4 mt-1 border-l border-border/60 pl-3">
                      {item.items?.map((subItem) => {
                        const isSubActive = isNavItemActive(
                          pathname,
                          subItem.url,
                          subItem.activeUrls
                        )

                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubActive}
                              className={cn(
                                "h-8.5 rounded-md text-[13px] font-medium",
                                "text-muted-foreground hover:text-foreground",
                                isSubActive &&
                                  "bg-primary/10 font-semibold text-primary"
                              )}
                            >
                              <Link to={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}