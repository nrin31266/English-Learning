// src/components/gamification/StreakBadge.tsx

import { Flame } from "lucide-react"
import { useState, useEffect } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface StreakBadgeProps {
  streak: number
  longestStreak?: number
  className?: string
}

// Kiểm tra thiết bị có hover không (desktop) hay mobile
const useIsHoverDevice = () => {
  const [isHover, setIsHover] = useState(true)

  useEffect(() => {
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)")
    setIsHover(mql.matches)
    
    const handler = (e: MediaQueryListEvent) => setIsHover(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  return isHover
}

// Tone màu Amber xuyên suốt, độ đậm tăng dần theo streak
const getStyles = (streak: number) => {
  if (streak === 0) {
    return {
      container: "bg-muted/40 text-muted-foreground border-muted",
      flame: "text-muted-foreground",
      flameFill: "",
      number: "text-muted-foreground",
      accent: "",
    }
  }
  
  if (streak < 3) {
    return {
      container: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50",
      flame: "text-amber-400",
      flameFill: "",
      number: "text-amber-700 dark:text-amber-300",
      accent: "",
    }
  }
  
  if (streak < 7) {
    return {
      container: "bg-amber-100/70 border-amber-300/70 dark:bg-amber-900/40 dark:border-amber-800/70",
      flame: "text-amber-500",
      flameFill: "fill-amber-500/30",
      number: "text-amber-800 dark:text-amber-200",
      accent: "",
    }
  }
  
  if (streak < 14) {
    return {
      container: "bg-amber-200/80 border-amber-400/70 dark:bg-amber-800/50 dark:border-amber-700/70",
      flame: "text-orange-500",
      flameFill: "fill-orange-500/40",
      number: "text-amber-900 dark:text-amber-100",
      accent: "ring-1 ring-amber-400/30",
    }
  }
  
  if (streak < 21) {
    return {
      container: "bg-orange-200/80 border-orange-400/80 dark:bg-orange-800/60 dark:border-orange-700/80",
      flame: "text-orange-500",
      flameFill: "fill-orange-500/50",
      number: "text-orange-900 dark:text-orange-100",
      accent: "ring-1 ring-orange-400/40",
    }
  }
  
  if (streak < 30) {
    return {
      container: "bg-orange-300/80 border-orange-500/80 dark:bg-orange-700/70 dark:border-orange-600/80",
      flame: "text-orange-600",
      flameFill: "fill-orange-600/50",
      number: "text-orange-950 dark:text-orange-50",
      accent: "ring-1 ring-orange-500/50",
    }
  }
  
  // 30+ days - Đỉnh cao
  return {
    container: "bg-gradient-to-r from-amber-400 to-orange-500 border-amber-600 dark:from-amber-600 dark:to-orange-700 dark:border-amber-500",
    flame: "text-yellow-100",
    flameFill: "fill-yellow-100/30",
    number: "text-white",
    accent: "ring-2 ring-amber-300/50 shadow-sm",
  }
}

const getStreakTitle = (streak: number) => {
  if (streak === 0) return "No streak yet"
  if (streak < 3) return "Just ignited"
  if (streak < 7) return "Getting warm"
  if (streak < 14) return "On fire"
  if (streak < 21) return "Burning bright"
  if (streak < 30) return "Inferno"
  return "Eternal flame"
}

const formatStreak = (streak: number) => streak > 999 ? "999+" : streak > 99 ? "99+" : streak.toString()

const StreakBadge = ({ streak, longestStreak = 0, className }: StreakBadgeProps) => {
  const styles = getStyles(streak)
  const displayValue = formatStreak(streak)
  const isHot = streak >= 7
  const isHoverDevice = useIsHoverDevice()

  const badgeContent = (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border px-2 py-0.5",
        "transition-all duration-300 ease-out hover:scale-105",
        "sm:gap-1.5 sm:px-2.5 sm:py-0.5",
        styles.container,
        styles.accent,
        className
      )}
    >
      <Flame 
        className={cn(
          "shrink-0 transition-transform duration-300 group-hover:scale-110",
          "size-3 sm:size-3.5",
          styles.flame,
          isHot && styles.flameFill
        )} 
      />
      <span className={cn(
        "font-black leading-none tabular-nums tracking-tight",
        "text-xs sm:text-sm",
        styles.number
      )}>
        {displayValue}
      </span>
    </div>
  )

  const infoContent = (
    <div className="space-y-0.5 text-center">
      <p className="flex items-center justify-center gap-1 font-bold text-sm">
        <Flame className="size-3.5 text-orange-500" />
        {streak.toLocaleString()} Day Streak
      </p>
      <p className="text-xs text-muted-foreground">{getStreakTitle(streak)}</p>
      {longestStreak > 0 && longestStreak !== streak && (
        <p className="text-xs text-muted-foreground">
          🏆 Best: {longestStreak.toLocaleString()} days
        </p>
      )}
    </div>
  )

  // Desktop: dùng Tooltip (hover)
  // Mobile: dùng Popover (click)
  if (isHoverDevice) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="z-50 px-3 py-2">
            {infoContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {badgeContent}
      </PopoverTrigger>
      <PopoverContent side="bottom" className="w-auto px-3 py-2">
        {infoContent}
      </PopoverContent>
    </Popover>
  )
}

export default StreakBadge