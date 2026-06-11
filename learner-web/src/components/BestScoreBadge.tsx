// src/components/BestScoreBadge.tsx

import { Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import React from "react"

interface BestScoreBadgeProps {
  score: number
  className?: string
}

const BestScoreBadge: React.FC<BestScoreBadgeProps> = ({ score, className }) => {
  // Xác định theme màu dựa trên điểm số (Gamification System)
  let colorClass = ""
  let iconClass = ""
  let borderClass = ""
  let bgClass = ""

  if (score === 0) {
    bgClass = "bg-slate-50 dark:bg-slate-800/50"
    borderClass = "border-slate-200 dark:border-slate-700"
    colorClass = "text-slate-500 dark:text-slate-400"
    iconClass = "text-slate-400"
  } else if (score < 80) {
    bgClass = "bg-blue-50 dark:bg-blue-900/20"
    borderClass = "border-blue-200 dark:border-blue-800/50"
    colorClass = "text-blue-600 dark:text-blue-400"
    iconClass = "text-blue-500"
  } else if (score < 95) {
    bgClass = "bg-emerald-50 dark:bg-emerald-900/20"
    borderClass = "border-emerald-200 dark:border-emerald-800/50"
    colorClass = "text-emerald-600 dark:text-emerald-400"
    iconClass = "text-emerald-500"
  } else {
    // Điểm xuất sắc (>= 95)
    bgClass = "bg-amber-50 dark:bg-amber-500/10"
    borderClass = "border-amber-200/60 dark:border-amber-500/20"
    colorClass = "text-amber-600 dark:text-amber-500"
    iconClass = "text-amber-500"
  }

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border shadow-sm transition-all shrink-0",
      bgClass,
      borderClass,
      className
    )}>
      <Trophy className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", iconClass)} />
      <div className="flex flex-col justify-center">
        <span className={cn(
          "text-[8px] sm:text-[9px] font-bold uppercase leading-none tracking-widest mb-[3px] opacity-80",
          colorClass
        )}>
          {/* Responsive Text: Màn to hiện "Best Score", Màn nhỏ chỉ hiện "Best" */}
          <span className="hidden sm:inline">Best Score</span>
          <span className="inline sm:hidden">Best</span>
        </span>
        <span className={cn("text-xs sm:text-[13px] font-bold leading-none", colorClass)}>
          {score}
        </span>
      </div>
    </div>
  )
}

export default React.memo(BestScoreBadge)