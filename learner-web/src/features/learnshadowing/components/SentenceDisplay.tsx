// components/SentenceDisplay.tsx
import type { ILLessonWord } from "@/types"
import React, { useMemo } from "react"

interface SentenceDisplayProps {
  words?: ILLessonWord[]
  fallbackText?: string
  onWordClick?: (word: ILLessonWord) => void
  className?: string
}

const SentenceDisplay = ({
  words,
  fallbackText = "No sentence available.",
  onWordClick,
  className = ""
}: SentenceDisplayProps) => {
  const hasWords = words && Array.isArray(words) && words.length > 0

  // Memoize sorted words để tránh sort lại mỗi lần render
  const sortedWords = useMemo(() => {
    if (!hasWords) return []
    return [...words].sort(
      (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
    )
  }, [words, hasWords])

  if (!hasWords) {
    return (
      <p className={`text-lg font-semibold leading-relaxed text-center ${className}`}>
        {fallbackText}
      </p>
    )
  }

  return (
    <div className={`flex flex-wrap justify-center gap-2 leading-relaxed ${className}`}>
      {sortedWords.map((word, index) => (
        <button
          key={index}
          className="
           underline  
            text-lg
            font-semibold
            hover:text-primary
            transition-colors
            duration-200
          "
          onClick={() => onWordClick?.(word)}
          title={`Click để xem chi tiết từ: ${word.wordText}`}
        >
          {word.wordText}
        </button>
      ))}
    </div>
  )
}

export default React.memo(SentenceDisplay)