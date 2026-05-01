import type { ILessonWordResponse } from "@/types"
import React, { useMemo } from "react"
import { cn } from "@/lib/utils"

interface SentenceDisplayProps {
  words?: ILessonWordResponse[]
  fallbackText?: string
  onWordClick?: (word: ILessonWordResponse, el: HTMLElement) => void
  className?: string
  phoneticUs?: string | null
}

const SentenceDisplay = ({
  words,
  fallbackText = "No sentence available.",
  onWordClick,
  className = "",
  phoneticUs
}: SentenceDisplayProps) => {
  const hasWords = words && Array.isArray(words) && words.length > 0

  const sortedWords = useMemo(() => {
    if (!hasWords) return []
    return [...words].sort(
      (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
    )
  }, [words, hasWords])

  return (
    <div className={cn("flex flex-col items-center md:items-start gap-4 w-full", className)}>
      
      {!hasWords ? (
        <p className="text-xl md:text-2xl font-semibold leading-relaxed text-center md:text-left text-foreground/80">
          {fallbackText}
        </p>
      ) : (
        <div className="flex flex-wrap justify-center md:justify-start gap-x-2 sm:gap-x-3 gap-y-3 leading-relaxed">
          {sortedWords.map((word, index) => (
            <button
              key={`${word.id || index}`}
              className={cn(
                "relative group text-xl sm:text-2xl md:text-3xl font-medium transition-all duration-200",
                "text-foreground/85 hover:text-primary hover:scale-105 active:scale-95",
                "px-0.5 rounded-md",
                "focus:outline-none focus:ring-2 focus:ring-primary/20"
              )}
              onClick={(e) => onWordClick?.(word, e.currentTarget)}
              title={`Click để xem chi tiết từ: ${word.wordText}`}
            >
              {word.wordText}
            </button>
          ))}
        </div>
      )}

      {/* Phonetic - Dịu mắt, thưa, dễ đọc */}
      {phoneticUs && (
        <div className="pt-2 border-t border-border/30 w-full">
          <div className="flex items-center justify-center md:justify-start gap-2 text-sm sm:text-base">
            <span className="h-3 w-px bg-border/30" />
            <p className="font-mono text-base sm:text-lg text-muted-foreground/70 tracking-wide">
              {phoneticUs}
            </p>
          </div>
        </div>
      )}

    </div>
  )
}

export default React.memo(SentenceDisplay, (prev, next) => {
  const prevSignature = prev.words?.map(w => w.id).join('-') || ""
  const nextSignature = next.words?.map(w => w.id).join('-') || ""

  return (
    prevSignature === nextSignature &&
    prev.fallbackText === next.fallbackText &&
    prev.className === next.className &&
    prev.phoneticUs === next.phoneticUs
  )
})