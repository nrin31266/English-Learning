import React from "react"
import { cefrLevelOptions } from "@/types"

export type LanguageLevel = typeof cefrLevelOptions[number]

type LanguageLevelBadgeProps = {
  level: LanguageLevel
  className?: string
  hasBg?: boolean
}

// Giữ nguyên màu sắc đã tối ưu cho Light/Dark mode
const levelStyles: Record<LanguageLevel, string> = {
  A1: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/10",
  A2: "border-lime-500/30 bg-lime-500/15 text-lime-700 dark:text-lime-400 dark:bg-lime-500/10",
  B1: "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-400 dark:bg-sky-500/10",
  B2: "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-400 dark:bg-blue-500/10",
  C1: "border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-400 dark:bg-violet-500/10",
  C2: "border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400 dark:bg-fuchsia-500/10",
}

const LanguageLevelBadge: React.FC<LanguageLevelBadgeProps> = ({
  level,
  className = "",
  hasBg = false,
}) => {
  const colorClass = levelStyles[level]

  return (
    <span
      className={[
        "inline-flex h-7 min-w-[2.5rem] items-center justify-center", // h-7 to hơn nhẹ
        "rounded-md border px-2.5 text-[13px] font-bold uppercase tracking-wider shadow-sm transition-all", // Đậm và rõ ràng
        colorClass,
        className,
        hasBg ? "bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {level}
    </span>
  )
}

export default LanguageLevelBadge