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

  return (
    <div className={`flex flex-wrap justify-center gap-2 leading-relaxed ${className}`}>
      {words.map((word, index) => (
        <button
          key={index}
          className="
           underline  
            text-lg
            font-semibold
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