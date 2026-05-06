// SentenceDisplay.tsx
import type { ILessonWordResponse } from "@/types"
import React, { useMemo } from "react"
import { cn } from "@/lib/utils"

interface SentenceDisplayProps {
  words?: ILessonWordResponse[]
  fallbackText?: string
  onWordClick?: (word: ILessonWordResponse, el: HTMLElement) => void
  className?: string
  activeWordId?: number | string | null
}

const SentenceDisplay = ({
  words,
  fallbackText = "No sentence available.",
  onWordClick,
  className = "",
  activeWordId = null,
}: SentenceDisplayProps) => {
  const hasWords = words && Array.isArray(words) && words.length > 0

  const sortedWords = useMemo(() => {
    if (!hasWords) return []
    return [...words].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
  }, [words, hasWords])

  return (
    <div className={cn("flex flex-col items-center w-full", className)}>
      {!hasWords ? (
        <p className="text-[15px] sm:text-[16px] font-medium tracking-wide text-center text-muted-foreground/60 py-4">
          {fallbackText}
        </p>
      ) : (
        <div className="flex flex-wrap justify-center gap-x-1.5 sm:gap-x-2 gap-y-1.5 sm:gap-y-2 leading-tight">
          {sortedWords.map((word, index) => {
            const isActive = activeWordId === word.id

            return (
              <button
                key={`${word.id || index}`}
                className={cn(
                  "relative text-[17px] sm:text-[20px] md:text-[24px] transition-all duration-200 ease-out",
                  isActive
                    ? "text-primary font-semibold scale-[1.05]" 
                    : "text-foreground/75 font-medium hover:text-primary hover:scale-[1.05]",
                  "px-0.5 rounded-md",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" // Accessiblity tốt hơn
                )}
                onClick={(e) => {
                  if (isActive) return
                  onWordClick?.(word, e.currentTarget)
                }}
                title={`Click để xem chi tiết từ: ${word.wordText}`}
                aria-pressed={isActive}
              >
                {word.wordText}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default React.memo(SentenceDisplay, (prev, next) => {
  // Check nhanh length trước cho đỡ tốn tài nguyên map
  if (prev.words?.length !== next.words?.length) return false
  
  const prevSignature = prev.words?.map(w => w.id).join('-') || ""
  const nextSignature = next.words?.map(w => w.id).join('-') || ""

  return (
    prevSignature === nextSignature &&
    prev.fallbackText === next.fallbackText &&
    prev.className === next.className &&
    prev.activeWordId === next.activeWordId
  )
})