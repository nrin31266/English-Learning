"use client"

import { useTheme } from "@/hooks/useTheme";
import { Moon, Sun } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <SidebarMenuButton
      tooltip={isDark ? "Dark Mode" : "Light Mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="font-medium text-sm h-10 hover:bg-transparent hover:text-foreground active:bg-transparent group-data-[collapsible=icon]:p-0"
    >
      <div className="relative flex items-center justify-center h-5 w-5 shrink-0 group-data-[collapsible=icon]:w-full">
        <Sun className="size-5 text-amber-500 transition-all duration-300 scale-100 rotate-0 dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute size-5 text-indigo-400 transition-all duration-300 scale-0 rotate-90 dark:scale-100 dark:rotate-0" />
      </div>
      
      <span className="truncate group-data-[collapsible=icon]:hidden">
        {isDark ? "Dark Mode" : "Light Mode"}
      </span>
    </SidebarMenuButton>
  );
};

export default ThemeToggle;