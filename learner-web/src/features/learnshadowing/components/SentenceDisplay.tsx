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
    <div className={cn("flex flex-col items-center md:items-start gap-3 w-full", className)}>
      
      {!hasWords ? (
        <p className="text-xl md:text-2xl font-semibold leading-relaxed text-center md:text-left text-foreground/90">
          {fallbackText}
        </p>
      ) : (
        // 👉 FIX "DÍNH": Chuyển sang gap-x-2 (8px) cho mobile và gap-x-2.5 (10px) cho PC. Tăng gap-y lên 2.5
        <div className="flex flex-wrap justify-center md:justify-start gap-x-2 sm:gap-x-2.5 gap-y-2.5 leading-relaxed">
          {sortedWords.map((word, index) => (
            <button
              key={`${word.id || index}`}
              className={cn(
                "relative group text-xl sm:text-2xl md:text-3xl font-semibold transition-all duration-200",
                "text-foreground/90 hover:text-primary active:scale-95",
                // 👉 Thêm px-0.5 để vùng bấm rộng hơn một xíu nhưng text không bị sát mép nhau
                // 👉 Tăng underline-offset-8 để nếu có gạch chân thì nó nằm xa chữ ra, không bị rối mắt
                "px-0.5 decoration-primary/40 underline-offset-8 hover:underline hover:decoration-primary"
              )}
              onClick={(e) => onWordClick?.(word, e.currentTarget)}
              title={`Click để xem chi tiết từ: ${word.wordText}`}
            >
              {word.wordText}
            </button>
          ))}
        </div>
      )}

      {phoneticUs && (
        <p className="text-sm sm:text-base text-muted-foreground/80 mt-2 font-medium tracking-wide text-center md:text-left">
          <span className="opacity-70 font-normal mr-1">/</span>
          {phoneticUs}
          <span className="opacity-70 font-normal ml-1">/</span>
        </p>
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