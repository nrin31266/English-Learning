import { useEffect, useState } from "react"

export type ThemeMode = "light" | "dark"

export type AppTheme =
  | "monochrome-beach"
  | "soft-sand"
  | "indigo-ai"
  | "mint-focus"
  | "sunset-classroom"
  | "rose-paper"

const MODE_KEY = "theme-mode"
const APP_THEME_KEY = "app-theme"

const DEFAULT_MODE: ThemeMode = "light"
const DEFAULT_APP_THEME: AppTheme = "monochrome-beach"

export const APP_THEMES: {
  value: AppTheme
  label: string
  
}[] = [
  {
    value: "monochrome-beach",
    label: "Monochrome Beach"
    
  },
  {
    value: "soft-sand",
    label: "Soft Sand"
  },
  {
    value: "indigo-ai",
    label: "Indigo AI"
  },
  {
    value: "mint-focus",
    label: "Mint Focus"
  },
  {
    value: "sunset-classroom",
    label: "Sunset Classroom"
  },
  {
    value: "rose-paper",
    label: "Rose Paper"
  },
]

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem(MODE_KEY) as ThemeMode) || DEFAULT_MODE
  })

  const [appTheme, setAppThemeState] = useState<AppTheme>(() => {
    return (localStorage.getItem(APP_THEME_KEY) as AppTheme) || DEFAULT_APP_THEME
  })

  useEffect(() => {
    const root = document.documentElement

    root.classList.toggle("dark", mode === "dark")
    root.dataset.theme = appTheme

    localStorage.setItem(MODE_KEY, mode)
    localStorage.setItem(APP_THEME_KEY, appTheme)
  }, [mode, appTheme])

  const setTheme = (value: ThemeMode) => {
    setModeState(value)
  }

  const toggleMode = () => {
    setModeState((prev) => (prev === "dark" ? "light" : "dark"))
  }

  const setAppTheme = (value: AppTheme) => {
    setAppThemeState(value)
  }

  return {
    theme: mode,
    mode,
    appTheme,
    setTheme,
    setMode: setTheme,
    toggleMode,
    setAppTheme,
  }
}