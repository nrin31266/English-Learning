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
  mediaCurrentTimeMs?: number
  sentenceStartMs?: number
  isPlayingMedia?: boolean
}

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
  const hasWords = words && Array.isArray(words) && words.length > 0

  const sortedWords = useMemo(() => {
    if (!hasWords) return []
    return [...words].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
  }, [words, hasWords])

  const timedActiveWordId = useMemo(() => {
    if (!isPlayingMedia || !mediaCurrentTimeMs || sortedWords.length === 0) {
      return null
    }

    const localTimeMs = Math.max(mediaCurrentTimeMs - sentenceStartMs, 0)
    const segmentLocalTimeMs = mediaCurrentTimeMs

    const activeWord = sortedWords.find((word) => {
      if (word.audioStartMs == null || word.audioEndMs == null) return false

      const absoluteMatch =
        mediaCurrentTimeMs >= word.audioStartMs &&
        mediaCurrentTimeMs <= word.audioEndMs
      const localMatch =
        localTimeMs >= word.audioStartMs - sentenceStartMs &&
        localTimeMs <= word.audioEndMs - sentenceStartMs
      const segmentLocalMatch =
        segmentLocalTimeMs >= word.audioStartMs - sentenceStartMs &&
        segmentLocalTimeMs <= word.audioEndMs - sentenceStartMs

      return absoluteMatch || localMatch || segmentLocalMatch
    })

    return activeWord?.id ?? null
  }, [isPlayingMedia, mediaCurrentTimeMs, sentenceStartMs, sortedWords])

  return (
    <div className={cn("flex flex-col items-center w-full", className)}>
      {!hasWords ? (
        <p className="text-[15px] sm:text-[16px] font-medium tracking-wide text-center text-muted-foreground/60 py-4">
          {fallbackText}
        </p>
      ) : (
        <div className="flex flex-wrap justify-center gap-x-1.5 sm:gap-x-2 gap-y-1.5 sm:gap-y-2 leading-tight">
          {sortedWords.map((word, index) => {
            const isPopupActive = activeWordId === word.id
            const isTimedActive = timedActiveWordId === word.id
            const isActive = isPopupActive || isTimedActive

            return (
              <button
                key={`${word.id || index}`}
                className={cn(
                  "relative rounded-md px-1 py-0.5 text-[15px] font-medium transition-all duration-75 ease-out sm:text-[17px] md:text-[20px]",
                  isActive
                    ? "scale-[1.04] bg-primary/10 text-primary underline decoration-2 underline-offset-4 shadow-sm ring-1 ring-primary/15" 
                    : "text-foreground/75 hover:scale-[1.04] hover:bg-primary/10 hover:text-primary hover:underline hover:decoration-2 hover:underline-offset-4",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" // Accessiblity tốt hơn
                )}
                onClick={(e) => {
                  if (isActive) return
                  onWordClick?.(word, e.currentTarget)
                }}
                title={`Click để xem chi tiết từ: ${word.wordText}`}
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
  // Check nhanh length trước cho đỡ tốn tài nguyên map
  if (prev.words?.length !== next.words?.length) return false
  
  const prevSignature = prev.words?.map(w => w.id).join('-') || ""
  const nextSignature = next.words?.map(w => w.id).join('-') || ""

  return (
    prevSignature === nextSignature &&
    prev.fallbackText === next.fallbackText &&
    prev.className === next.className &&
    prev.activeWordId === next.activeWordId &&
    prev.mediaCurrentTimeMs === next.mediaCurrentTimeMs &&
    prev.sentenceStartMs === next.sentenceStartMs &&
    prev.isPlayingMedia === next.isPlayingMedia
  )
})
