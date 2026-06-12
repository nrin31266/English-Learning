// src/components/gamification/LevelBadge.tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface LevelBadgeProps {
  level: number
  progressPercent: number
  xpInCurrentLevel: number
  xpRequiredForNextLevel: number
  totalXp: number
  className?: string
}

const clampPercent = (value: number) => Math.min(100, Math.max(0, value))

const getProgressColor = (percent: number) => {
  if (percent >= 80) return "text-emerald-500"
  if (percent >= 40) return "text-amber-500"
  return "text-sky-500"
}

const LevelBadge = ({
  level,
  progressPercent,
  xpInCurrentLevel,
  xpRequiredForNextLevel,
  totalXp,
  className,
}: LevelBadgeProps) => {
  const percent = clampPercent(progressPercent)
  const xpToNextLevel = Math.max(0, xpRequiredForNextLevel - xpInCurrentLevel)

  const size = 44
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (percent / 100) * circumference

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative flex items-center justify-center size-11 shrink-0 cursor-pointer transition-transform duration-200 hover:scale-105",
              className
            )}
          >
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="absolute inset-0 size-full -rotate-90"
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/30"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className={cn(
                  "transition-[stroke-dashoffset,color] duration-1000 ease-out",
                  getProgressColor(percent)
                )}
              />
            </svg>

            <div className="relative flex size-8 flex-col items-center justify-center rounded-full bg-background/90 shadow-sm ring-1 ring-border/50">
              <span className="text-base font-semibold leading-none text-foreground mt-[1px] tracking-tight">
                {level}
              </span>
            </div>
          </div>
        </TooltipTrigger>

        <TooltipContent side="bottom" className="z-[100] px-4 py-3 shadow-lg">
          <div className="flex flex-col items-center text-center gap-2">
            <p className="text-xs font-semibold">
              {percent >= 85
                ? "Almost there! 🚀"
                : percent >= 40
                ? "Great progress! 💪"
                : "A new journey begins! ✨"}
            </p>
            <div className="h-px w-full bg-border/50" />
            <div className="space-y-1 w-full text-left">
              <div className="flex justify-between gap-4 text-xs">
                <span>Total XP:</span>
                <span>{totalXp.toLocaleString()} XP</span>
              </div>
              <div className="flex justify-between gap-4 text-xs">
                <span>Progress:</span>
                <span>
                  {xpInCurrentLevel.toLocaleString()} / {xpRequiredForNextLevel.toLocaleString()} XP
                </span>
              </div>
              <div className="flex justify-between gap-4 text-xs">
                <span>Remaining:</span>
                <span>{xpToNextLevel.toLocaleString()} XP</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default LevelBadge