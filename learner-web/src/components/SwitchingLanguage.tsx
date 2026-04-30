import { useState } from 'react'
import i18next from "i18next"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const LANGUAGES = [
  { code: 'vi', label: 'Vietnamese', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
]

const SwitchingLanguage = () => {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'vi')

  const handleChangeLanguage = (value: string) => {
    i18next.changeLanguage(value)
    localStorage.setItem('lang', value)
    setLang(value)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full shrink-0 text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary/50 data-[state=open]:bg-muted data-[state=open]:text-foreground"
        >
          <Globe className="h-5 w-5" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-40 z-[100]">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => handleChangeLanguage(l.code)}
            className={cn(
              "cursor-pointer transition-colors flex items-center gap-2",
              lang === l.code ? "bg-primary/10 text-primary font-medium focus:bg-primary/15 focus:text-primary" : "text-foreground"
            )}
          >
            <span className="text-base leading-none">{l.flag}</span>
            <span>{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default SwitchingLanguage