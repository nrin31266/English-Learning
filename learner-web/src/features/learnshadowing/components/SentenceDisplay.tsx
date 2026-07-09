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

  /**
   * Current media time in milliseconds.
   * Với lesson audio hiện tại: truyền absolute ms = player.currentTime * 1000.
   */
  mediaCurrentTimeMs?: number

  /**
   * Sentence absolute start time in milliseconds.
   * Chỉ dùng để nhận diện trường hợp backend trả word time kiểu local.
   */
  sentenceStartMs?: number

  isPlayingMedia?: boolean
}

const WORD_HOLD_MS = 90

const getWordKey = (word: ILessonWordResponse, index: number) =>
  word.id != null ? String(word.id) : `word-${index}`

const normalizeId = (id: number | string | null | undefined) =>
  id == null ? null : String(id)

const SentenceDisplay = ({
  words,
  fallbackText = "No sentence available.",
  onWordClick,
  className = "",
  activeWordId = null,
  mediaCurrentTimeMs = 0,
  sentenceStartMs = 0,
  isPlayingMedia = false,
}: SentenceDisplayProps) => {
  const sortedWords = useMemo(() => {
    if (!Array.isArray(words) || words.length === 0) return []

    return [...words]
      .filter((word) => word?.wordText)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
  }, [words])

  const hasWords = sortedWords.length > 0

  const wordTimeMode = useMemo<"absolute" | "local">(() => {
    if (!hasWords) return "absolute"

    const firstTimedWord = sortedWords.find(
      (word) => word.audioStartMs != null && word.audioEndMs != null
    )

    if (!firstTimedWord?.audioStartMs || !sentenceStartMs) {
      return "absolute"
    }

    /**
     * Nếu wordStart gần sentenceStart thì backend đang trả absolute time.
     * VD data của bạn:
     * sentenceStartMs = 1867
     * firstWord.audioStartMs = 1867
     *
     * Nếu wordStart nhỏ kiểu 0, 120, 300... thì mới là local time.
     */
    return Math.abs(firstTimedWord.audioStartMs - sentenceStartMs) <= 500
      ? "absolute"
      : "local"
  }, [hasWords, sentenceStartMs, sortedWords])

  const timedActiveWordId = useMemo(() => {
    if (!isPlayingMedia || !hasWords) return null
    if (!Number.isFinite(mediaCurrentTimeMs) || mediaCurrentTimeMs <= 0) return null

    const activeWord = sortedWords.find((word, index) => {
      if (word.audioStartMs == null || word.audioEndMs == null) return false

      const startMs =
        wordTimeMode === "absolute"
          ? word.audioStartMs
          : sentenceStartMs + word.audioStartMs

      const nextWord = sortedWords[index + 1]
      const rawEndMs =
        wordTimeMode === "absolute"
          ? word.audioEndMs
          : sentenceStartMs + word.audioEndMs

      const nextStartMs =
        nextWord?.audioStartMs != null
          ? wordTimeMode === "absolute"
            ? nextWord.audioStartMs
            : sentenceStartMs + nextWord.audioStartMs
          : null

      /**
       * Không dùng <= end cứng vì sát ranh giới dễ làm 2 từ cùng cảm giác active.
       * End sẽ lấy min(end + hold, nextStart).
       * Như vậy highlight luôn đi xuôi theo thứ tự.
       */
      const endMs =
        nextStartMs != null
          ? Math.min(rawEndMs + WORD_HOLD_MS, nextStartMs)
          : rawEndMs + WORD_HOLD_MS

      return mediaCurrentTimeMs >= startMs && mediaCurrentTimeMs < endMs
    })

    return activeWord?.id ?? null
  }, [
    hasWords,
    isPlayingMedia,
    mediaCurrentTimeMs,
    sentenceStartMs,
    sortedWords,
    wordTimeMode,
  ])

  const activeId = normalizeId(activeWordId)
  const timedId = normalizeId(timedActiveWordId)

  return (
    <div className={cn("flex w-full flex-col items-center", className)}>
      {!hasWords ? (
        <p className="py-4 text-center text-[15px] font-medium tracking-wide text-muted-foreground/60 sm:text-[16px]">
          {fallbackText}
        </p>
      ) : (
        <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-1.5 leading-tight sm:gap-x-2 sm:gap-y-2">
          {sortedWords.map((word, index) => {
            const currentId = normalizeId(word.id)
            const isPopupActive = activeId === currentId
            const isTimedActive = timedId === currentId
            const isActive = isPopupActive || isTimedActive

            return (
              <button
                key={getWordKey(word, index)}
                type="button"
                className={cn(
                  "relative rounded-md px-1 py-0.5 text-[15px] font-medium transition-colors duration-100 sm:text-[17px] md:text-[20px]",
                  isActive
                    ? "bg-primary/10 text-primary underline decoration-2 underline-offset-4 ring-1 ring-primary/15"
                    : "text-foreground/75 hover:bg-primary/10 hover:text-primary hover:underline hover:decoration-2 hover:underline-offset-4",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                )}
                onClick={(event) => {
                  if (isTimedActive) return
                  onWordClick?.(word, event.currentTarget)
                }}
                title={`Click to view word details: ${word.wordText}`}
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
  if (prev.words?.length !== next.words?.length) return false

  const prevSignature =
    prev.words
      ?.map(
        (word) =>
          `${word.id}:${word.orderIndex}:${word.audioStartMs}:${word.audioEndMs}:${word.wordText}`
      )
      .join("|") || ""

  const nextSignature =
    next.words
      ?.map(
        (word) =>
          `${word.id}:${word.orderIndex}:${word.audioStartMs}:${word.audioEndMs}:${word.wordText}`
      )
      .join("|") || ""

  return (
    prevSignature === nextSignature &&
    prev.fallbackText === next.fallbackText &&
    prev.className === next.className &&
    prev.activeWordId === next.activeWordId &&
    prev.mediaCurrentTimeMs === next.mediaCurrentTimeMs &&
    prev.sentenceStartMs === next.sentenceStartMs &&
    prev.isPlayingMedia === next.isPlayingMedia &&
    prev.onWordClick === next.onWordClick
  )
})