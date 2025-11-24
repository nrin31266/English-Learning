import * as React from "react"
import { Blocks, BookMarked, Calendar, CircleUserRound, Home, Inbox, PlaneTakeoff, Settings, CaseSensitive } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, 
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar"

import { useTranslation } from "react-i18next"
import LogoName from "../LogoName"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation()
  const location = useLocation()

  const data = [
    {
      children: [
        { title: t("appMenu.dashboard"), url: "/", icon: Home }
      ]
    },
    {
      title: t("appMenu.learningContent"),
      children: [
        { title: t("appMenu.topics"), url: "/topics", icon: Blocks },
        { title: t("appMenu.allLessons"), url: "/all-lessons", icon: BookMarked },
        { title: t("appMenu.generateLessons"), url: "/generate-lessons", icon: PlaneTakeoff }
      ]
    },
    {
      title: t("appMenu.vocabulary"),
      children: [
        { title: t("appMenu.allWords"), url: "/all-words", icon: CaseSensitive }
      ]
    },
    {
      title: t("appMenu.system"),
      children: [
        { title: t("appMenu.healthCheck"), url: "/system/health", icon: Settings },
        { title: t("appMenu.queueMonitor"), url: "/system/queues", icon: Inbox },
        { title: t("appMenu.aiJobs"), url: "/system/ai-jobs", icon: Calendar },
        { title: t("appMenu.logs"), url: "/system/logs", icon: BookMarked }
      ]
    }
  ]

  const footerItems = [
    { title: t("appMenu.profile"), url: "/profile", icon: CircleUserRound },
    { title: t("appMenu.settings"), url: "/settings", icon: Settings }
  ]

  return (
    <Sidebar {...props}>
      <SidebarHeader className="flex flex-col items-center justify-center border-b h-16">
        <LogoName fontSize="1.5rem" />
      </SidebarHeader>

      <SidebarContent>
        {data.map((item, i) => (
          <SidebarGroup key={i}>
            {item.title && <SidebarGroupLabel>{item.title}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {item.children.map((child) => (
                  <SidebarMenuItem key={child.url}>
                    <SidebarMenuButton asChild isActive={location.pathname === child.url}>
                      <Link to={child.url}>
                        <child.icon />
                        <span>{child.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {footerItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
