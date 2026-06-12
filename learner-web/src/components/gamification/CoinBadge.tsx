// src/components/gamification/CoinBadge.tsx
import { Coins } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface CoinBadgeProps {
  coins: number
  className?: string
}

const formatCompactNumber = (value: number, suffix: string) => {
  return `${Number(value.toFixed(2))}${suffix}`
}

// Mobile: làm gọn từ K trở đi
const formatMobileCoins = (value: number) => {
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

  return value.toString()
}

// Desktop: hiển thị full, chỉ làm gọn từ M trở đi
const formatDesktopCoins = (value: number) => {
  const absValue = Math.abs(value)

  if (absValue >= 1_000_000_000) {
    return formatCompactNumber(value / 1_000_000_000, "B")
  }

  if (absValue >= 1_000_000) {
    return formatCompactNumber(value / 1_000_000, "M")
  }

  return value.toLocaleString()
}

const CoinBadge = ({ coins, className }: CoinBadgeProps) => {
  const mobileCoins = formatMobileCoins(coins)
  const desktopCoins = formatDesktopCoins(coins)

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1 px-1 py-1 transition-transform duration-200 hover:scale-105",
              className
            )}
          >
            <Coins className="size-6 shrink-0 text-amber-500 dark:text-yellow-300" />

            <span className="text-sm font-black leading-none text-amber-700 dark:text-yellow-200">
              <span className="sm:hidden">{mobileCoins}</span>
              <span className="hidden sm:inline">{desktopCoins}</span>
            </span>
          </div>
        </TooltipTrigger>

        <TooltipContent side="bottom" className="z-50">
          <p>
            Balance:{" "}
            <span className="font-bold">{coins.toLocaleString()}</span> coins
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default CoinBadge