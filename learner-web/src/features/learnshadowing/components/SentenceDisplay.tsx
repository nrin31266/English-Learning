// components/SentenceDisplay.tsx
import type { ILLessonWord } from "@/types"
import React from "react"

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

  if (!hasWords) {
    return (
      <p className={`text-lg font-semibold leading-relaxed text-center ${className}`}>
        {fallbackText}
      </p>
    )
  }

  // Tạo bản copy của array để sort, không sort trực tiếp props
  const sortedWords = [...words].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
  )

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

export default SentenceDisplay