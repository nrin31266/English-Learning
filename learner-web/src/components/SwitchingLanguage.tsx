"use client"

import { useState } from 'react'
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
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
]

const SwitchingLanguage = () => {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'vi')
  
  const activeLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  const handleChangeLanguage = (value: string) => {
    i18next.changeLanguage(value)
    localStorage.setItem('lang', value)
    setLang(value)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton 
          tooltip="Language"
          className="font-medium text-sm transition-none h-10 hover:bg-transparent hover:text-foreground active:bg-transparent"
        >
          {/* Container chứa cờ có hiệu ứng scale khi thay đổi */}
          <div className="flex items-center justify-center size-5 shrink-0 transition-all duration-300 ease-out transform group-hover:scale-110">
            <span className="text-xl leading-none">{activeLang.flag}</span>
          </div>
          
          <div className="flex items-center gap-2 truncate group-data-[collapsible=icon]:hidden">
            <span>{activeLang.label}</span>
          </div>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" side="right" sideOffset={8} className="w-40 z-[100] rounded-lg">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => handleChangeLanguage(l.code)}
            className={cn(
              "cursor-pointer flex items-center gap-2 p-2",
              lang === l.code ? "bg-primary/10 text-primary font-bold" : "text-foreground"
            )}
          >
            <span className="text-base">{l.flag}</span>
            <span>{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default SwitchingLanguage;