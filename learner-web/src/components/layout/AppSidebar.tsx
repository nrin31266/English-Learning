// src/components/layout/AppSidebar.tsx
"use client"

import * as React from "react"
import { BookMarked, Notebook } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { BrandLogo } from "./BrandLogo"
import { NavMain, type NavItem } from "./NavMain"
import { NavUser } from "./NavUser"
import ThemeToggle from "./ThemeToggle"
import SwitchingLanguage from "./SwitchingLanguage"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

import { useAuth } from "@/features/keycloak/providers/AuthProvider"
import { getIndexFromChar } from "@/utils/textUtils"

const DEFAULT_AVATARS = [
  "/defaultavatars/Cat_owl.webp",
  "/defaultavatars/Deer_dogs.webp",
  "/defaultavatars/Frog_squirrel.webp",
  "/defaultavatars/Polar_bear_dog_in_the_snow.webp",
  "/defaultavatars/Snow_leopard_caribou.webp",
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation()
  const { profile } = useAuth()

  const user = useMemo(() => {
    if (!profile) {
      return {
        name: "Guest",
        email: "",
        avatar: "",
        isGuest: true,
      }
    }

    const name = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()
    const avatarIndex = getIndexFromChar(
      profile.firstName?.[0] || "A",
      DEFAULT_AVATARS.length
    )

    return {
      name: name || profile.email || "User",
      email: profile.email || "",
      avatar: DEFAULT_AVATARS[avatarIndex],
      isGuest: false,
    }
  }, [profile])

  const learningMenu = useMemo<NavItem[]>(
    () => [
      {
        title: t("header.playlists"),
        url: "/topics",
        activeUrls: ["/topics", "/learn"],
        icon: Notebook,
      },
      {
        title: t("header.dictionary"),
        url: "/vocab/topics",
        activeUrls: ["/vocab"],
        icon: BookMarked,
      },
    ],
    [t]
  )

  /* 🔒 Chưa có页面
  const practiceSubItems = [
    { title: t("header.reviewHub"), url: "/review" },
    { title: t("header.mockTest"), url: "/mock-test" },
    { title: t("header.grammar"), url: "/grammar" },
  ].filter(Boolean)
  if (practiceSubItems.length) {
    learningMenu.push({
      title: t("header.practice"),
      url: "#",
      icon: Library,
      items: practiceSubItems,
    })
  }

  const socialMenu = [
    { title: t("header.leaderboard"), url: "/leaderboard", icon: Trophy },
    { title: t("header.discussions"), url: "/discussions", icon: MessageCircle },
    { title: t("header.blog"), url: "/blog", icon: Newspaper },
  ]
  */

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/40 shadow-sm"
      {...props}
    >
      <SidebarHeader className="h-16 justify-center border-b border-border/40 px-2">
        <BrandLogo />
      </SidebarHeader>

      <SidebarContent className="gap-0 py-2">
        <NavMain
          label={t("header.learning") || "Học tập"}
          items={learningMenu}
        />

        {/* 🔒 NavMain label={t("header.community") || "Cộng đồng"} items={socialMenu} */}

        <SidebarGroup className="mt-auto border-t border-border/40 px-2 pt-3">
          <div className="grid grid-cols-2 gap-2 group-data-[collapsible=icon]:grid-cols-1 group-data-[collapsible=icon]:place-items-center group-data-[collapsible=icon]:px-0">
            <div className="min-w-0 [&>*]:h-9 [&>*]:w-full group-data-[collapsible=icon]:[&>*]:h-9 group-data-[collapsible=icon]:[&>*]:w-9">
              <ThemeToggle />
            </div>

            <div className="min-w-0 [&>*]:h-9 [&>*]:w-full group-data-[collapsible=icon]:[&>*]:h-9 group-data-[collapsible=icon]:[&>*]:w-9">
              <SwitchingLanguage />
            </div>
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-2">
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}