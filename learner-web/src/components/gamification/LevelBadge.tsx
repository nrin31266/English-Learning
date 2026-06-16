// src/components/gamification/LevelBadge.tsx

import { useEffect, useRef, useState } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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

const getProgressBgColor = (percent: number) => {
  if (percent >= 80) return "bg-emerald-500"
  if (percent >= 40) return "bg-amber-500"
  return "bg-sky-500"
}

const getProgressTitle = (percent: number) => {
  if (percent >= 85) return "Almost there"
  if (percent >= 40) return "Great progress"
  return "A new journey begins"
}

const formatDiff = (diff: number) => {
  if (diff >= 1000) return `+${Number((diff / 1000).toFixed(1))}k`
  return `+${diff}`
}

const LevelBadge = ({
  level,
  progressPercent,
  xpInCurrentLevel,
  xpRequiredForNextLevel,
  totalXp,
  className,
}: LevelBadgeProps) => {
  const [displayDiff, setDisplayDiff] = useState<number | null>(null)

  const accumulatedDiff = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevXpRef = useRef(totalXp)

  useEffect(() => {
    if (totalXp > prevXpRef.current) {
      const diff = totalXp - prevXpRef.current

      accumulatedDiff.current += diff
      setDisplayDiff(accumulatedDiff.current)
      prevXpRef.current = totalXp

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      timerRef.current = setTimeout(() => {
        setDisplayDiff(null)
        accumulatedDiff.current = 0
      }, 1500)
    }

    if (totalXp < prevXpRef.current) {
      prevXpRef.current = totalXp
      setDisplayDiff(null)
      accumulatedDiff.current = 0
    }
  }, [totalXp])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const percent = clampPercent(progressPercent)
  const xpToNextLevel = Math.max(0, xpRequiredForNextLevel - xpInCurrentLevel)
  const progressColorClass = getProgressColor(percent)
  const progressBgClass = getProgressBgColor(percent)

  const size = 44
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (percent / 100) * circumference

  return (
    <Popover>
      <style>{`
        @keyframes popInBounce {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.18);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-pop-bounce {
          animation: popInBounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex size-11 shrink-0 cursor-pointer items-center justify-center",
            "transition-transform duration-200 hover:scale-105 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
          )}
        >
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="absolute inset-0 size-full -rotate-90 overflow-visible"
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
                progressColorClass
              )}
            />
          </svg>

          <div className="relative z-40 flex size-8 flex-col items-center justify-center overflow-hidden rounded-full bg-background/90 shadow-sm ring-1 ring-border/50">
            {displayDiff !== null ? (
              <span
                key="diff"
                className={cn(
                  "animate-pop-bounce text-[10px] font-black leading-none tracking-tighter sm:text-[11px]",
                  progressColorClass
                )}
              >
                {formatDiff(displayDiff)}
              </span>
            ) : (
              <span
                key="level"
                className="mt-[1px] animate-pop-bounce text-base font-semibold leading-none tracking-tight text-foreground"
              >
                {level}
              </span>
            )}
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={8}
        className="z-[100] w-[220px] px-4 py-3 shadow-xl"
      >
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-sm font-bold">Level {level}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {getProgressTitle(percent)}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">{Math.round(percent)}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  progressBgClass
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/50 px-3 py-2 text-center">
              <p className="text-[11px] text-muted-foreground">Total XP</p>
              <p className="text-sm font-black">
                {totalXp.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 px-3 py-2 text-center">
              <p className="text-[11px] text-muted-foreground">Remaining</p>
              <p className="text-sm font-black">
                {xpToNextLevel.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 px-3 py-2 text-center">
            <p className="text-[11px] text-muted-foreground">Current level XP</p>
            <p className="text-sm font-semibold">
              {xpInCurrentLevel.toLocaleString()} /{" "}
              {xpRequiredForNextLevel.toLocaleString()} XP
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default LevelBadge