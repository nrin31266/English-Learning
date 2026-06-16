// src/components/gamification/ResourceBadge.tsx

import type { LucideIcon } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber"

interface ResourceBadgeProps {
  value: number
  label: string
  unitLabel: string
  Icon: LucideIcon
  textClassName: string
  iconClassName: string
  diffClassName: string
  tooltipValueClassName: string
  className?: string
}

const formatCompactNumber = (value: number, suffix: string) => {
  return `${Number(value.toFixed(2))}${suffix}`
}

const formatMobileValue = (value: number) => {
  const absValue = Math.abs(value)

  if (absValue >= 1_000_000_000) {
    return formatCompactNumber(value / 1_000_000_000, "B")
  }

  if (absValue >= 1_000_000) {
    return formatCompactNumber(value / 1_000_000, "M")
  }

  if (absValue >= 1_000) {
    return formatCompactNumber(value / 1_000, "K")
  }

  return value.toLocaleString()
}

const formatDesktopValue = (value: number) => {
  const absValue = Math.abs(value)

  if (absValue >= 1_000_000_000) {
    return formatCompactNumber(value / 1_000_000_000, "B")
  }

  return value.toLocaleString()
}

const ResourceBadge = ({
  value,
  label,
  unitLabel,
  Icon,
  textClassName,
  iconClassName,
  diffClassName,
  tooltipValueClassName,
  className,
}: ResourceBadgeProps) => {
  const { displayValue, diffQueue } = useAnimatedNumber(value)

  const mobileValue = formatMobileValue(displayValue)
  const desktopValue = formatDesktopValue(displayValue)

  return (
    <Popover>
      <style>{`
        @keyframes resourceFloatUp {
          0% {
            opacity: 0;
            transform: translate(-50%, 0) scale(0.5);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -15px) scale(1.2);
          }
          80% {
            opacity: 1;
            transform: translate(-50%, -35px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -45px) scale(0.8);
          }
        }

        .animate-resource-float {
          animation: resourceFloatUp 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex items-center gap-1 rounded-full px-1 py-0.5 transition-transform duration-200 hover:scale-105 active:scale-95 sm:gap-1.5 sm:py-1",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
          )}
        >
          <span
            className={cn(
              "text-xs font-black leading-none tabular-nums tracking-tight sm:text-sm",
              textClassName
            )}
          >
            <span className="sm:hidden">{mobileValue}</span>
            <span className="hidden sm:inline">{desktopValue}</span>
          </span>

          <div className="relative flex items-center justify-center">
            <Icon className={cn("size-4 shrink-0 sm:size-5", iconClassName)} />

            {diffQueue.map((item) => (
              <span
                key={item.id}
                className={cn(
                  "pointer-events-none absolute left-1/2 top-4 z-50 text-xs font-black sm:text-sm",
                  "animate-resource-float",
                  diffClassName
                )}
                style={{ willChange: "transform, opacity" }}
              >
                +{item.diff}
              </span>
            ))}
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={8}
        className="z-[100] w-auto min-w-[150px] px-3 py-2"
      >
        <div className="text-center text-sm">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 font-semibold">
            <span className={cn("font-black", tooltipValueClassName)}>
              {value.toLocaleString()}
            </span>{" "}
            {unitLabel}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default ResourceBadge