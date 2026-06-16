// src/components/gamification/StreakBadge.tsx

import { Flame } from "lucide-react"
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

type StreakTier = {
  title: string
  subtitle: string
  nextMilestone: number | null
  container: string
  flame: string
  flameFill: string
  number: string
  accent: string
  glow: string
  progress: string
}

const getTier = (streak: number): StreakTier => {
  if (streak === 0) {
    return {
      title: "No streak yet",
      subtitle: "Start today to light the flame",
      nextMilestone: 1,
      container: "bg-muted/40 text-muted-foreground border-muted",
      flame: "text-muted-foreground",
      flameFill: "",
      number: "text-muted-foreground",
      accent: "",
      glow: "",
      progress: "bg-muted-foreground/40",
    }
  }

  if (streak < 3) {
    return {
      title: "First spark",
      subtitle: "The habit has just started",
      nextMilestone: 3,
      container:
        "bg-amber-50/90 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50",
      flame: "text-amber-400",
      flameFill: "",
      number: "text-amber-700 dark:text-amber-300",
      accent: "shadow-sm",
      glow: "bg-amber-400/20",
      progress: "bg-amber-400",
    }
  }

  if (streak < 6) {
    return {
      title: "Getting warm",
      subtitle: "Your rhythm is forming",
      nextMilestone: 6,
      container:
        "bg-amber-100/80 border-amber-300/70 dark:bg-amber-900/40 dark:border-amber-800/70",
      flame: "text-amber-500",
      flameFill: "fill-amber-500/30",
      number: "text-amber-800 dark:text-amber-200",
      accent: "shadow-sm",
      glow: "bg-amber-500/25",
      progress: "bg-amber-500",
    }
  }

  if (streak < 10) {
    return {
      title: "On fire",
      subtitle: "Consistency is starting to show",
      nextMilestone: 10,
      container:
        "bg-orange-100/85 border-orange-300/80 dark:bg-orange-900/40 dark:border-orange-800/70",
      flame: "text-orange-500",
      flameFill: "fill-orange-500/40",
      number: "text-orange-800 dark:text-orange-200",
      accent: "ring-1 ring-orange-400/25 shadow-sm",
      glow: "bg-orange-500/25",
      progress: "bg-orange-500",
    }
  }

  if (streak < 15) {
    return {
      title: "Burning bright",
      subtitle: "A strong learner streak",
      nextMilestone: 15,
      container:
        "bg-gradient-to-r from-amber-300 to-orange-400 border-orange-400 dark:from-amber-700 dark:to-orange-800 dark:border-orange-600",
      flame: "text-yellow-100",
      flameFill: "fill-yellow-100/40",
      number: "text-white",
      accent: "ring-2 ring-orange-300/40 shadow-[0_0_12px_rgba(249,115,22,0.28)]",
      glow: "bg-yellow-200/35",
      progress: "bg-yellow-300",
    }
  }

  if (streak < 21) {
    return {
      title: "Crimson flame",
      subtitle: "You are keeping real momentum",
      nextMilestone: 21,
      container:
        "bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 border-red-500 dark:from-orange-600 dark:via-red-700 dark:to-rose-800",
      flame: "text-yellow-100",
      flameFill: "fill-yellow-100/45",
      number: "text-white",
      accent: "ring-2 ring-red-400/50 shadow-[0_0_14px_rgba(239,68,68,0.32)]",
      glow: "bg-red-300/35",
      progress: "bg-red-300",
    }
  }

  if (streak < 28) {
    return {
      title: "Purple fire",
      subtitle: "Rare consistency unlocked",
      nextMilestone: 28,
      container:
        "bg-gradient-to-r from-fuchsia-500 via-purple-600 to-violet-700 border-purple-500 dark:from-fuchsia-700 dark:via-purple-800 dark:to-violet-900",
      flame: "text-fuchsia-100",
      flameFill: "fill-fuchsia-100/45",
      number: "text-white",
      accent: "ring-2 ring-fuchsia-400/50 shadow-[0_0_16px_rgba(217,70,239,0.34)]",
      glow: "bg-fuchsia-300/35",
      progress: "bg-fuchsia-300",
    }
  }

  return {
    title: "Blue soul flame",
    subtitle: "Elite 31-day learning momentum",
    nextMilestone: null,
    container:
      "bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 border-cyan-400 dark:from-cyan-600 dark:via-sky-700 dark:to-indigo-800",
    flame: "text-cyan-50",
    flameFill: "fill-cyan-100/50",
    number: "text-white",
    accent: "ring-2 ring-cyan-300/60 shadow-[0_0_18px_rgba(34,211,238,0.38)]",
    glow: "bg-cyan-200/35",
    progress: "bg-cyan-300",
  }
}

const formatStreak = (streak: number) => {
  if (streak > 999) return "999+"
  if (streak > 99) return "99+"
  return streak.toString()
}

const getMilestoneProgress = (streak: number, nextMilestone: number | null) => {
  if (!nextMilestone) return 100

  const previousMilestones = [0, 1, 3, 6, 10, 15, 21, 28]
  const previous =
    [...previousMilestones].reverse().find((milestone) => streak >= milestone) ?? 0

  const range = nextMilestone - previous
  const current = streak - previous

  if (range <= 0) return 100
  return Math.min(100, Math.max(0, (current / range) * 100))
}

const StreakBadge = ({
  streak,
  longestStreak = 0,
  className,
}: StreakBadgeProps) => {
  const tier = getTier(streak)
  const displayValue = formatStreak(streak)
  const isHot = streak >= 4
  const milestoneProgress = getMilestoneProgress(streak, tier.nextMilestone)
  const daysToNext = tier.nextMilestone
    ? Math.max(0, tier.nextMilestone - streak)
    : 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group relative isolate flex items-center overflow-hidden rounded-full border",
            "gap-1 px-2 py-0.5",
            "sm:gap-1.5 sm:px-2.5 sm:py-0.5",
            "lg:gap-2 lg:px-3.5 lg:py-1.5",
            "transition-all duration-300 ease-out hover:scale-105 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            tier.container,
            tier.accent,
            className
          )}
        >
          {streak > 0 && (
            <span
              className={cn(
                "pointer-events-none absolute -left-2 top-1/2 -z-10 size-8 -translate-y-1/2 rounded-full blur-xl transition-opacity duration-300",
                "opacity-60 group-hover:opacity-80",
                "lg:size-10",
                tier.glow
              )}
            />
          )}

          <Flame
            className={cn(
              "size-3 shrink-0 transition-opacity duration-300 sm:size-3.5 lg:size-[18px]",
              tier.flame,
              isHot && tier.flameFill
            )}
          />

          <span
            className={cn(
              "font-black leading-none tabular-nums tracking-tight",
              "text-xs sm:text-sm lg:text-base",
              tier.number
            )}
          >
            {displayValue}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={10}
        className="z-[100] w-[230px] overflow-hidden border-border/70 p-0 shadow-xl lg:w-[260px]"
      >
        <div className={cn("relative px-4 py-3 text-center", tier.container)}>
          <div
            className={cn(
              "pointer-events-none absolute left-1/2 top-0 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl opacity-70",
              tier.glow
            )}
          />

          <div className="relative flex flex-col items-center">
            <p className={cn("text-sm font-black lg:text-base", tier.number)}>
              {streak.toLocaleString()} Day Streak
            </p>

            <p className={cn("mt-0.5 text-xs font-medium lg:text-sm", tier.number)}>
              {tier.title}
            </p>
          </div>
        </div>

        <div className="space-y-3 bg-popover px-4 py-3">
          <p className="text-center text-xs text-muted-foreground">
            {tier.subtitle}
          </p>

          {tier.nextMilestone ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Next milestone</span>
                <span className="font-semibold">
                  {daysToNext} {daysToNext === 1 ? "day" : "days"} left
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    tier.progress
                  )}
                  style={{ width: `${milestoneProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-full bg-muted/60 px-3 py-2 text-center text-xs font-semibold">
              Max visual tier unlocked
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/50 px-3 py-2 text-center">
              <p className="text-[11px] text-muted-foreground">Current</p>
              <p className="text-sm font-black">{streak.toLocaleString()}</p>
            </div>

            <div className="rounded-xl bg-muted/50 px-3 py-2 text-center">
              <p className="text-[11px] text-muted-foreground">Best</p>
              <p className="text-sm font-black">
                {Math.max(streak, longestStreak).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default StreakBadge