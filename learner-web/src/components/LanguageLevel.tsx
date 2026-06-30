import React from "react"
import { cefrLevelOptions } from "@/types"

export type LanguageLevel = typeof cefrLevelOptions[number]

type LanguageLevelBadgeProps = {
  level: LanguageLevel
  className?: string
  hasBg?: boolean
}

const levelStyles: Record<LanguageLevel, string> = {
  A1: "border-emerald-600/35 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-950 dark:text-emerald-300",
  A2: "border-amber-600/35 bg-amber-100 text-amber-800 dark:border-amber-400/40 dark:bg-amber-950 dark:text-amber-300",
  B1: "border-cyan-600/35 bg-cyan-100 text-cyan-800 dark:border-cyan-400/40 dark:bg-cyan-950 dark:text-cyan-300",
  B2: "border-blue-600/35 bg-blue-100 text-blue-800 dark:border-blue-400/40 dark:bg-blue-950 dark:text-blue-300",
  C1: "border-violet-600/35 bg-violet-100 text-violet-800 dark:border-violet-400/40 dark:bg-violet-950 dark:text-violet-300",
  C2: "border-rose-600/35 bg-rose-100 text-rose-800 dark:border-rose-400/40 dark:bg-rose-950 dark:text-rose-300",
}

const levelLabels: Record<LanguageLevel, string> = {
  A1: "A1",
  A2: "A2",
  B1: "B1",
  B2: "B2",
  C1: "C1",
  C2: "C2",
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
        "inline-flex h-5 min-w-8 shrink-0 items-center justify-center",
        "rounded border px-1.5 text-[11px] font-bold leading-none tracking-[0.04em]",
        colorClass,
        className,
        hasBg ? "shadow-sm backdrop-blur-sm" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {levelLabels[level]}
    </span>
  )
}

export default LanguageLevelBadge
