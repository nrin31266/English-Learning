// src/components/gamification/StreakBadge.tsx
import { Flame } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface StreakBadgeProps {
  streak: number
  longestStreak?: number
  className?: string
}

const getColor = (streak: number) => {
  if (streak === 0) {
    return {
      bg: "bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-300 dark:from-zinc-800 dark:via-zinc-800 dark:to-zinc-700 shadow-zinc-400/20",
      text: "text-zinc-600 dark:text-zinc-300",
      icon: "text-zinc-400",
      sparkle: "text-zinc-400",
    }
  }

  if (streak < 3) {
    return {
      bg: "bg-gradient-to-br from-teal-100 via-cyan-100 to-sky-200 dark:from-teal-900/60 dark:via-cyan-900/50 dark:to-sky-900/60 shadow-cyan-400/25",
      text: "text-teal-800 dark:text-cyan-100",
      icon: "text-cyan-500 dark:text-cyan-300",
      sparkle: "text-cyan-400",
    }
  }

  if (streak < 7) {
    return {
      bg: "bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-200 dark:from-amber-900/60 dark:via-orange-900/50 dark:to-yellow-900/60 shadow-amber-400/25",
      text: "text-amber-900 dark:text-amber-100",
      icon: "text-orange-400 dark:text-orange-300",
      sparkle: "text-yellow-400",
    }
  }

  if (streak < 14) {
    return {
      bg: "bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-200 dark:from-violet-900/60 dark:via-purple-900/50 dark:to-indigo-900/60 shadow-purple-400/25",
      text: "text-violet-900 dark:text-violet-100",
      icon: "text-purple-500 dark:text-purple-300",
      sparkle: "text-purple-400",
    }
  }

  if (streak < 30) {
    return {
      bg: "bg-gradient-to-br from-rose-300 via-red-300 to-orange-300 dark:from-rose-900/70 dark:via-red-900/60 dark:to-orange-900/70 shadow-red-400/30",
      text: "text-white",
      icon: "text-yellow-100",
      sparkle: "text-yellow-100",
    }
  }

  return {
    bg: "bg-gradient-to-br from-fuchsia-300 via-pink-400 to-amber-300 dark:from-fuchsia-800/80 dark:via-pink-800/70 dark:to-amber-700/80 shadow-fuchsia-400/35",
    text: "text-white",
    icon: "text-yellow-100",
    sparkle: "text-yellow-100",
  }
}

const StreakBadge = ({
  streak,
  longestStreak = 0,
  className,
}: StreakBadgeProps) => {
  const color = getColor(streak)
  const showSparkle = streak >= 7

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative flex items-center gap-0.5 overflow-hidden rounded-xl px-2 py-2 shadow-sm transition-all duration-300 ease-out hover:scale-105 hover:shadow-md",
              color.bg,
              className
            )}
          >
            {showSparkle && (
              <>
                <span
                  className={cn(
                    "pointer-events-none absolute right-1 top-0 text-[9px] opacity-70 animate-pulse [animation-duration:2s]",
                    color.sparkle
                  )}
                >
                  ✦
                </span>

                {streak >= 30 && (
                  <span
                    className={cn(
                      "pointer-events-none absolute bottom-0 left-1 text-[8px] opacity-60 animate-pulse [animation-duration:2.5s]",
                      color.sparkle
                    )}
                  >
                    ✨
                  </span>
                )}
              </>
            )}

            <Flame
              className={cn(
                "size-6 shrink-0 transition-transform duration-300 ease-out group-hover:scale-110",
                color.icon
              )}
            />

            <span
              className={cn(
                "text-base font-bold leading-none transition-colors duration-300",
                color.text
              )}
            >
              {streak}
            </span>
          </div>
        </TooltipTrigger>

        <TooltipContent side="bottom" className="z-50">
          <div className="space-y-1">
            {streak > 0 ? (
              <p className="font-semibold">
                {streak} day{streak !== 1 && "s"} streak
              </p>
            ) : (
              <p className="font-semibold">Start your streak today!</p>
            )}

            {longestStreak > 0 && (
              <p className="text-xs text-muted-foreground">
                Best: {longestStreak} days
              </p>
            )}

            {streak >= 30 && (
              <p className="text-xs font-semibold text-fuchsia-500">
                Legendary streak!
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default StreakBadge