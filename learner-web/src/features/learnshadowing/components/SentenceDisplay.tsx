/**
 * Component SentenceDisplay.tsx
 * 
 * Mục đích:
 * - Hiển thị câu văn dưới dạng các từ riêng biệt có thể click
 * - Cho phép user click vào từng từ để xem chi tiết (ý nghĩa, phiên âm, ví dụ...)
 * - Sắp xếp các từ theo thứ tự đúng (orderIndex)
 * 
 * Kỹ thuật:
 * - Sử dụng React.memo để tránh re-render không cần thiết
 * - Sử dụng useMemo để cache danh sách từ đã sort
 * - Mỗi từ là một button để có thể click và có accessibility tốt
 * 
 * Sử dụng trong:
 * - ActiveSentencePanel: hiển thị câu đang practice
 */
import type { ILLessonWord } from "@/types"
import React, { useMemo } from "react"

/**
 * Props cho component SentenceDisplay
 */
interface SentenceDisplayProps {
  /** Danh sách các từ trong câu (có orderIndex để sắp xếp) */
  words?: ILLessonWord[]
  /** Text hiển thị khi không có words (fallback) */
  fallbackText?: string
  /** Callback khi user click vào một từ - dùng để show modal chi tiết từ */
  onWordClick?: (word: ILLessonWord) => void
  /** Class CSS thêm vào cho container */
  className?: string
}

/**
 * Component chính để hiển thị câu văn
 */
const SentenceDisplay = ({
  words,
  fallbackText = "No sentence available.",
  onWordClick,
  className = ""
}: SentenceDisplayProps) => {
  // Kiểm tra xem có dữ liệu words hợp lệ không
  const hasWords = words && Array.isArray(words) && words.length > 0

  /**
   * Memoize sorted words để tránh sort lại mỗi lần render
   * Lý do:
   * - Sort là operation tốn tài nguyên
   * - Words thường không thay đổi trong lúc practice một câu
   * - Chỉ re-sort khi words hoặc hasWords thay đổi
   */
  const sortedWords = useMemo(() => {
    if (!hasWords) return []
    // Tạo shallow copy trước khi sort để không mutate mảng gốc
    return [...words].sort(
      (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
    )
  }, [words, hasWords])

  // Nếu không có words, hiển thị text fallback
  if (!hasWords) {
    return (
      <p className={`text-lg font-semibold leading-relaxed text-center ${className}`}>
        {fallbackText}
      </p>
    )
  }

  /**
   * Render danh sách các từ
   * - Mỗi từ là một button để có thể click
   * - Có underline để user biết có thể tương tác
   * - Hover effect để feedback tốt hơn
   */
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