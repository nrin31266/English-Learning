import { cn } from "@/lib/utils"
import type { ILessonWordResponse } from "@/types"
import { hasPunctuation, normalizeWordLower } from "@/utils/textUtils"
import React, { useMemo } from "react"

const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length

  const matrix: number[][] = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null))

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

const MASK_CHAR = "_"

export type WordChipStatus = "untyped" | "wrong" | "near" | "correct_typed"

type WordChipProps = {
  word: ILessonWordResponse
  index: number
  typedToken: string
  isRevealed?: boolean
  userInteracted: boolean
  onReveal?: (wordId: number, wordText: string, wordIndex: number) => void
  onClickWord?: (word: ILessonWordResponse, el: HTMLElement) => void
}

const WordChip = ({
  word,
  index,
  typedToken,
  isRevealed = false,
  userInteracted,
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
        masked += hasPunctuation(targetDisplay[i]) ? targetDisplay[i] : MASK_CHAR
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
        maskedText += MASK_CHAR
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
      base: "border-emerald-300/40 bg-emerald-50/40 dark:bg-emerald-950/20",
      text: "text-emerald-600/80 dark:text-emerald-400/80",
    },
    near: {
      base: "border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/20",
      text: "text-amber-600/80 dark:text-amber-400/80",
    },
    wrong: {
      base: "border-rose-300/40 bg-rose-50/40 dark:bg-rose-950/20",
      text: "text-rose-600/80 dark:text-rose-400/80",
    },
    untyped: {
      base: "dark:border-slate-200/50 border-gray-500/30 bg-slate-50/30 dark:bg-slate-900/20 hover:border-primary/30",
      text: "text-slate-400/70 dark:text-slate-500/70",
    },
  }

  const current = config[status]

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!userInteracted) return

    if (isRevealable) {
      onReveal?.(word.id, getWordDisplay(word), index)
    } else if (isClickable && onClickWord) {
      onClickWord(word, e.currentTarget)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group relative inline-flex items-center justify-center shrink-0",
        "h-max rounded-md border text-sm sm:text-base px-2 py-1",
        "transition-all duration-200 ease-out",
        current.base,
        (isClickable || isRevealable) && "cursor-pointer active:scale-95",
        isClickable && "hover:bg-primary/5",
        isRevealed && "border-sky-400/60 bg-sky-50/40 dark:bg-sky-950/20"
      )}
    >
      <span
        className={cn(
          "font-normal tracking-wide whitespace-nowrap",
          current.text,
          status === "untyped" && "tracking-widest opacity-80"
        )}
      >
        {finalDisplayText}
      </span>

      <span className="absolute inset-0 rounded-md ring-primary/20 transition-all group-focus-visible:ring-2 pointer-events-none" />
    </button>
  )
}

export default React.memo(WordChip, (prevProps, nextProps) => {
  return (
    prevProps.typedToken === nextProps.typedToken &&
    prevProps.isRevealed === nextProps.isRevealed &&
    prevProps.word.id === nextProps.word.id &&
    prevProps.userInteracted === nextProps.userInteracted
  )
})