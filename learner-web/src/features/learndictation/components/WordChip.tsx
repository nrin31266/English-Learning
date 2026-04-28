import { cn } from "@/lib/utils"
import type { ILessonWordResponse } from "@/types"
import { hasPunctuation, normalizeWordLower } from "@/utils/textUtils"
import { Eye } from "lucide-react"
import React, { useMemo } from "react"

export type WordChipStatus = "untyped" | "wrong" | "near" | "correct_typed"

type WordChipProps = {
  word: ILessonWordResponse
  index: number
  typedToken: string
  isRevealed?: boolean
  onReveal?: (wordId: number, wordText: string, wordIndex: number) => void
  onClickWord?: (word: ILessonWordResponse, el: HTMLElement) => void
}

const levenshteinDistance = (a: string, b: string): number => {
    if (a === b) return 0
    if (!a) return b.length
    if (!b) return a.length
    const matrix: number[][] = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null))
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + (a[j - 1] === b[i - 1] ? 0 : 1)
            )
        }
    }
    return matrix[b.length][a.length]
}

const getWordDisplay = (w: ILessonWordResponse): string =>
    w.wordText || w.wordNormalized ||  ""

const WordChip = ({
  word,
  index,
  typedToken,
  isRevealed = false,
  onReveal,
  onClickWord
}: WordChipProps) => {
  
  // 👉 status: chỉ phụ thuộc vào typedToken (bài làm của user)
  const { status, displayText } = useMemo(() => {
    const targetDisplay = getWordDisplay(word)
    const targetNorm = normalizeWordLower(targetDisplay) || ""
    const typedNorm = normalizeWordLower(typedToken) || ""

    // Chưa gõ gì
    if (!typedToken) {
      // Tạo masked text giữ dấu câu
      let masked = ""
      for (let i = 0; i < targetDisplay.length; i++) {
        const char = targetDisplay[i]
        if (hasPunctuation(char)) {
          masked += char
        } else {
          masked += "*"
        }
      }
      return { status: "untyped" as WordChipStatus, displayText: masked }
    }

    // Gõ đúng
    if (typedNorm === targetNorm) {
      return { status: "correct_typed" as WordChipStatus, displayText: targetDisplay }
    }

    // Tính masked text giữ dấu câu
    let maskedText = ""
    for (let i = 0; i < targetDisplay.length; i++) {
      const char = targetDisplay[i]
      const typedChar = typedToken[i]
      if (hasPunctuation(char)) {
        maskedText += char
      } else if (typedChar && typedChar.toLowerCase() === char.toLowerCase()) {
        maskedText += char
      } else {
        maskedText += "*"
      }
    }

    const distance = levenshteinDistance(typedNorm, targetNorm)
    if (distance <= 1 && Math.max(targetNorm.length, typedNorm.length) >= 2) {
      return { status: "near" as WordChipStatus, displayText: maskedText }
    }

    return { status: "wrong" as WordChipStatus, displayText: maskedText }
  }, [word, typedToken])  // 👈 KHÔNG có isRevealed trong dependency

  // 👉 Khi reveal: hiển thị text đúng, nhưng status (màu) vẫn theo bài làm
  const finalDisplayText = isRevealed ? getWordDisplay(word) : displayText
  const finalStatus = status  // status không đổi

  const isRevealable = (status === "untyped" || status === "wrong" || status === "near") && !isRevealed
  const isClickable = status === "correct_typed"

  const config = {
    correct_typed: {
        border: "border-emerald-500/40 bg-emerald-500/10",
        text: "text-emerald-700 dark:text-emerald-400",
    },
    near: {
        border: "border-amber-500/40 bg-amber-500/10",
        text: "text-amber-700 dark:text-amber-400",
    },
    wrong: {
        border: "border-rose-500/40 bg-rose-500/10",
        text: "text-rose-600 dark:text-rose-400",
    },
    untyped: {
        border: "border-border bg-muted/30 hover:border-primary/40 hover:bg-primary/5",
        text: "text-muted-foreground",
    },
  }

  const current = config[finalStatus]

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isRevealable) {
      onReveal?.(word.id, getWordDisplay(word), index)
    } else if (isClickable && onClickWord) {
      onClickWord(word, e.currentTarget)
    }
  }
  console.log("Rendering WordChip", { word: getWordDisplay(word), typedToken, status, isRevealed })
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group relative inline-flex flex-col items-center justify-center h-max",
        "rounded-md border px-2 py-1 text-center",
        "transition-all duration-200",
        current.border,
        isClickable && "cursor-pointer hover:bg-primary/10 hover:shadow-sm",
        isRevealable && "cursor-pointer hover:shadow-sm"
      )}
    >
      {isRevealed && (
        <span className="absolute bg-background rounded-full -top-2 -right-2 opacity-90 group-hover:opacity-100 transition-opacity">
          <Eye className="h-3.5 w-3.5 text-sky-500" />
        </span>
      )}
      <span className={cn("font-mono text-base font-bold tracking-wider", current.text)}>
        {finalDisplayText}
      </span>
    </button>
  )
}

// 👈 React.memo với custom compare
export default React.memo(WordChip, (prevProps, nextProps) => {
  return (
    prevProps.typedToken === nextProps.typedToken &&
    prevProps.isRevealed === nextProps.isRevealed &&
    prevProps.word.id === nextProps.word.id
  )
})