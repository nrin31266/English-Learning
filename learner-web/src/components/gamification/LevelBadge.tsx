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

const clampPercent = (value: number) => {
  return Math.min(100, Math.max(0, value))
}

const getProgressBg = (percent: number) => {
  if (percent >= 85) return "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
  if (percent >= 40) return "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]"
  return "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
}

const getMotivationText = (percent: number) => {
  if (percent >= 85) return "Almost there! Level up soon! 🚀"
  if (percent >= 40) return "Making great progress! Keep going! 💪"
  return "Every journey begins! You got this! ✨"
}

const LevelBadge = ({
  level,
  progressPercent,
  xpInCurrentLevel,
  xpRequiredForNextLevel,
  className,
}: LevelBadgeProps) => {
  const percent = clampPercent(progressPercent)
  const xpToNextLevel = Math.max(0, xpRequiredForNextLevel - xpInCurrentLevel)

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "group flex flex-col justify-center cursor-pointer transition-transform duration-200 hover:scale-105 px-1 sm:px-2",
              className
            )}
          >
            {/* LV nhỏ + số level to màu primary */}
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-[11px] font-semibold text-muted-foreground/80 tracking-wide">
                LV
              </span>
              <span className="text-base sm:text-lg font-black text-primary tracking-tight leading-none">
                {level}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full min-w-[60px] rounded-full bg-muted/60 overflow-hidden shadow-inner relative">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-out",
                  getProgressBg(percent)
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>

        {/* Tooltip với màu sáng rõ và nội dung đầy đủ */}
        <TooltipContent 
          side="bottom" 
          className="z-[100] px-4 py-3  border shadow-lg border-border"
        >
          <div className="flex flex-col items-center text-center gap-2">
           
            
            <p className="text-xs font-medium ">
              {getMotivationText(percent)}
            </p>

            <div className="h-px w-full bg-border/50" />
            
            <div className="space-y-1">
              <p className="text-xs ">
                {xpInCurrentLevel.toLocaleString()} / {xpRequiredForNextLevel.toLocaleString()} XP
              </p>
              <p className="text-xs font-semibold text-primary">
                Need {xpToNextLevel.toLocaleString()} XP to level up
              </p>
            </div>

            
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default LevelBadge