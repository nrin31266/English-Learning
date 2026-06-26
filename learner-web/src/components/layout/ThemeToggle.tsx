"use client"

import { Check, Moon, Palette, Sun } from "lucide-react"
import { useTheme, APP_THEMES } from "@/hooks/useTheme"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const ThemeToggle = () => {
  const { mode, appTheme, toggleMode, setAppTheme } = useTheme()
  const isDark = mode === "dark"

  const activeTheme = APP_THEMES.find((item) => item.value === appTheme) || APP_THEMES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          tooltip="Theme"
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
          <div className="relative flex size-4 shrink-0 items-center justify-center">
            <Palette className="size-4 text-primary" />
          </div>

          <span className="truncate group-data-[collapsible=icon]:hidden">
            {activeTheme.label}
          </span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="right"
        sideOffset={8}
        className="z-[100] w-56 rounded-xl"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Appearance
        </DropdownMenuLabel>

        <DropdownMenuItem
          onClick={toggleMode}
          className="flex cursor-pointer items-center gap-2"
        >
          <div className="flex size-5 items-center justify-center">
            {isDark ? (
              <Moon className="size-4 text-indigo-400" />
            ) : (
              <Sun className="size-4 text-amber-500" />
            )}
          </div>

          <span>{isDark ? "Dark Mode" : "Light Mode"}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Themes
        </DropdownMenuLabel>

        {APP_THEMES.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => setAppTheme(item.value)}
            className={cn(
              "flex cursor-pointer items-center gap-2",
              appTheme === item.value && "bg-primary/10 text-primary"
            )}
          >
            

            <span className="flex-1 truncate">{item.label}</span>

            {appTheme === item.value && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ThemeToggle