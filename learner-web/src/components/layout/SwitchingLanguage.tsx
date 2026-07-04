"use client"

import { useState } from "react"
import i18next from "i18next"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const LANGUAGES = [
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", label: "English", flag: "🇬🇧" },
]

const SwitchingLanguage = () => {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "vi")

  const activeLang = LANGUAGES.find((item) => item.code === lang) || LANGUAGES[0]

  const handleChangeLanguage = (value: string) => {
    i18next.changeLanguage(value)
    localStorage.setItem("lang", value)
    setLang(value)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          tooltip="Language"
          className="
            h-9 text-sm font-medium transition-none
            hover:bg-transparent hover:text-foreground
            active:bg-transparent
            group-data-[collapsible=icon]:h-9
            group-data-[collapsible=icon]:w-9
            group-data-[collapsible=icon]:justify-center
            group-data-[collapsible=icon]:px-0
          "
        >
          <div className="flex size-4 shrink-0 items-center justify-center transition-all duration-200 ease-out group-hover:scale-105">
            <span className="text-sm leading-none">{activeLang.flag}</span>
          </div>

          <div className="flex min-w-0 items-center gap-2 truncate group-data-[collapsible=icon]:hidden">
            <span className="truncate">{activeLang.label}</span>
          </div>
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="right"
        sideOffset={8}
        className="z-[100] w-40 rounded-lg"
      >
        {LANGUAGES.map((item) => (
          <DropdownMenuItem
            key={item.code}
            onClick={() => handleChangeLanguage(item.code)}
            className={cn(
              "flex cursor-pointer items-center gap-2 p-2",
              lang === item.code
                ? "bg-primary/10 font-bold text-primary"
                : "text-foreground"
            )}
          >
            <span className="text-sm leading-none">{item.flag}</span>
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default SwitchingLanguage