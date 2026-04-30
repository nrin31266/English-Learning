import { cn } from "@/lib/utils"
import type { ILessonWordResponse } from "@/types"
import { hasPunctuation, normalizeWordLower } from "@/utils/textUtils"
import { Eye } from "lucide-react"
import React, { useMemo } from "react"

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  w.wordText || w.wordNormalized || ""

export type WordChipStatus = "untyped" | "wrong" | "near" | "correct_typed"

type WordChipProps = {
  word: ILessonWordResponse
  index: number
  typedToken: string
  isRevealed?: boolean
  userInteracted: boolean // 👉 Thêm prop này
  onReveal?: (wordId: number, wordText: string, wordIndex: number) => void
  onClickWord?: (word: ILessonWordResponse, el: HTMLElement) => void
}

const WordChip = ({
  word,
  index,
  typedToken,
  isRevealed = false,
  userInteracted, // 👉 Nhận prop
  onReveal,
  onClickWord
}: WordChipProps) => {

  const { status, displayText } = useMemo(() => {
    const targetDisplay = getWordDisplay(word)
    const targetNorm = normalizeWordLower(targetDisplay) || ""
    const typedNorm = normalizeWordLower(typedToken) || ""

    if (!typedToken) {
      let masked = ""
      for (let i = 0; i < targetDisplay.length; i++) {
        masked += hasPunctuation(targetDisplay[i]) ? targetDisplay[i] : "*"
      }
      return { status: "untyped" as WordChipStatus, displayText: masked }
    }

    if (typedNorm === targetNorm) {
      return { status: "correct_typed" as WordChipStatus, displayText: targetDisplay }
    }

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
    const isNear = distance <= 1 && Math.max(targetNorm.length, typedNorm.length) >= 2

    return {
      status: (isNear ? "near" : "wrong") as WordChipStatus,
      displayText: maskedText
    }
  }, [word, typedToken])

  const finalDisplayText = isRevealed ? getWordDisplay(word) : displayText
  const isRevealable = status !== "correct_typed" && !isRevealed
  const isClickable = status === "correct_typed"

  const config = {
    correct_typed: {
      border: "border-emerald-500/40 bg-emerald-500/5",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    near: {
      border: "border-amber-500/40 bg-amber-500/5",
      text: "text-amber-600 dark:text-amber-400",
    },
    wrong: {
      border: "border-rose-500/40 bg-rose-500/5",
      text: "text-rose-600 dark:text-rose-400",
    },
    untyped: {
      border: "border-border/60 bg-muted/20 hover:border-primary/40",
      text: "text-muted-foreground/60",
    },
  }

  const current = config[status]

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // 👉 Chặn click ngay tại đây nếu chưa tương tác
    if (!userInteracted) return;

    if (isRevealable) {
      onReveal?.(word.id, getWordDisplay(word), index)
    } else if (isClickable && onClickWord) {
      onClickWord(word, e.currentTarget)
    }
  }


  // console.log(`Render WordChip #${index + 1} - Status: ${status} - Revealed: ${isRevealed}`);
  
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group relative inline-flex items-center justify-center shrink-0 transition-all duration-200",
        "h-8 px-2.5 rounded-md border text-sm sm:text-base",
        current.border,
        (isClickable || isRevealable) && "cursor-pointer active:scale-95",
        isClickable && "hover:bg-primary/5",
        isRevealed && "border-sky-500/40"
      )}
    >
      {isRevealed && (
        <div className="absolute -top-1.5 -right-1.5 bg-card rounded-full p-0.5 border border-sky-500/40 shadow-sm z-20 pointer-events-none">
          <Eye className="h-2.5 w-2.5 text-sky-500" />
        </div>
      )}

      <span className={cn(
        "font-bold tracking-wide text-sm sm:text-base whitespace-nowrap",
        "font-mono",
        current.text
      )}>
        {finalDisplayText}
      </span>

      <span className="absolute inset-0 rounded-md ring-primary/20 transition-all group-focus-visible:ring-2 pointer-events-none" />
    </button>
  )
}

// 👉 React.memo ĐỈNH CAO: Chỉ cần check đúng 4 cái này, vứt việc check hàm đi!
export default React.memo(WordChip, (prevProps, nextProps) => {
  return (
    prevProps.typedToken === nextProps.typedToken &&
    prevProps.isRevealed === nextProps.isRevealed &&
    prevProps.word.id === nextProps.word.id &&
    prevProps.userInteracted === nextProps.userInteracted // Đảm bảo tự render lại đúng 1 lần khi ấn Play
  )
})