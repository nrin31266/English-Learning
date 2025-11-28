// src/components/LanguageLevelBadge.tsx
import React from "react"
import { cefrLevelOptions } from "@/types"

export type LanguageLevel = typeof cefrLevelOptions[number]

type LanguageLevelBadgeProps = {
  level: LanguageLevel
  className?: string,
  hasBg?: boolean
}

const levelStyles: Record<LanguageLevel, string> = {
  A1: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  A2: "border-lime-500/40 bg-lime-500/10 text-lime-700",
  B1: "border-sky-500/40 bg-sky-500/10 text-sky-700",
  B2: "border-blue-500/40 bg-blue-500/10 text-blue-700",
  C1: "border-violet-500/40 bg-violet-500/10 text-violet-700",
  C2: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-700",
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
        "inline-flex h-6 min-w-[2rem] items-center justify-center",
        "rounded-md border px-2 text-xs font-semibold uppercase tracking-wide",
        colorClass,
        className,
        `${!hasBg ? "" : "bg-white/80"}`,
      ].join(" ")}
    
    >
      {level}
    </span>
  )
}

export default LanguageLevelBadge
