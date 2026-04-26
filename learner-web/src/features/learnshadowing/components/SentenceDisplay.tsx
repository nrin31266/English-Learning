import type { ILessonWordResponse } from "@/types"
import React, { useMemo } from "react"

/**
 * Props cho component SentenceDisplay
 */
interface SentenceDisplayProps {
  /** Danh sách các từ trong câu (có orderIndex để sắp xếp) */
  words?: ILessonWordResponse[]
  /** Text hiển thị khi không có words (fallback) */
  fallbackText?: string
  /** Callback khi user click vào một từ - dùng để show modal chi tiết từ */
  onWordClick?: (word: ILessonWordResponse, el: HTMLElement) => void
  /** Class CSS thêm vào cho container */
  className?: string
  /** Phiên âm IPA của cả câu */
  phoneticUs?: string | null
}

/**
 * Component chính để hiển thị câu văn
 */
const SentenceDisplay = ({
  words,
  fallbackText = "No sentence available.",
  onWordClick,
  className = "",
  phoneticUs
}: SentenceDisplayProps) => {
  // Kiểm tra xem có dữ liệu words hợp lệ không
  const hasWords = words && Array.isArray(words) && words.length > 0

  /**
   * Memoize sorted words để tránh sort lại mỗi lần render
   */
  const sortedWords = useMemo(() => {
    if (!hasWords) return []
    // Tạo shallow copy trước khi sort để không mutate mảng gốc
    return [...words].sort(
      (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
    )
  }, [words, hasWords])

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      
      {/* 1. HIỂN THỊ TEXT / TỪ VỰNG */}
      {!hasWords ? (
        <p className="text-lg font-semibold leading-relaxed text-center">
          {fallbackText}
        </p>
      ) : (
        <div className="flex flex-wrap justify-center gap-2 leading-relaxed">
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
              onClick={(e) => onWordClick?.(word, e.currentTarget)}
              title={`Click để xem chi tiết từ: ${word.wordText}`}
            >
              {word.wordText}
            </button>
          ))}
        </div>
      )}

      {/* 2. HIỂN THỊ PHIÊN ÂM IPA */}
      {phoneticUs && (
        <p className="text-base text-muted-foreground mt-1">
          <span className="font-semibold">Sample IPA: </span> &#160;{phoneticUs}
        </p>
      )}

    </div>
  )
}

export default React.memo(SentenceDisplay, (prev, next) => {
  return (
    (prev.words?.[0]?.id ?? null) === (next.words?.[0]?.id ?? null) &&
    prev.fallbackText === next.fallbackText &&
    prev.className === next.className &&
    prev.phoneticUs === next.phoneticUs // Nhớ thêm check prop này
  )
})