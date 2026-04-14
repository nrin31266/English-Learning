import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react-dom"
import { useEffect, useRef, useState } from "react"
import { X, Volume2, Volume1 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ILessonDetailsResponse } from "@/types"

type WordData = {
  word: string
  pos: string
  phonetics: {
    uk: string
    ukAudioUrl: string
    us: string
    usAudioUrl: string
  }
  definitions: Array<{
    definition: string
    meaningVi: string
    example: string
  }>
  summaryVi: string
  cefrLevel: string
  status: string
}

type LessonWord =
  ILessonDetailsResponse["sentences"][number]["lessonWords"][number]

interface WordPopupProps {
  word: LessonWord | null
  wordData?: WordData | null
  anchorEl: HTMLElement | null
  onClose: () => void
  isLoading?: boolean
}

const WordPopup = ({
  word,
  wordData,
  anchorEl,
  onClose,
  isLoading = false
}: WordPopupProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeAudio, setActiveAudio] = useState<"uk" | "us">("uk")

  const popupRef = useRef<HTMLDivElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { x, y, refs, strategy } = useFloating({
    placement: "top",
    middleware: [offset(8), flip(), shift()],
    whileElementsMounted: autoUpdate
  })

  // mount animation
  useEffect(() => {
    if (word && anchorEl) {
      setIsVisible(true)
      setIsExiting(false)
    }
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [word, anchorEl])

  // set anchor
  useEffect(() => {
    if (anchorEl) refs.setReference(anchorEl)
  }, [anchorEl, refs])

  // click outside + esc
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        handleClose()
      }
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEsc)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEsc)
    }
  }, [anchorEl])

  const handleClose = () => {
    setIsExiting(true)
    setIsVisible(false)

    closeTimeoutRef.current = setTimeout(() => {
      onClose()
      setIsExiting(false)
    }, 120)
  }

  // audio
  const handlePlayAudio = (type: "uk" | "us") => {
    const url =
      type === "uk"
        ? wordData?.phonetics.ukAudioUrl
        : wordData?.phonetics.usAudioUrl

    if (!url) return

    if (audioRef.current) audioRef.current.pause()

    const audio = new Audio(url)
    audioRef.current = audio

    setIsPlaying(true)
    setActiveAudio(type)

    audio.play()
    audio.onended = () => {
      setIsPlaying(false)
      setActiveAudio("uk")
    }
  }

  if (!word || !anchorEl) return null

  return (
    <div
      ref={(node) => {
        refs.setFloating(node)
        popupRef.current = node
      }}
      style={{
        position: strategy,
        top: y ?? 0,
        left: x ?? 0,
        zIndex: 50
      }}
      className={cn(
        "w-80 rounded-lg border bg-background shadow-lg p-4",
        "transition-opacity transition-transform duration-150 ease-out",
        isVisible && !isExiting
          ? "opacity-100 scale-100"
          : "opacity-0 scale-95 pointer-events-none"
      )}
    >
      {/* header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-lg font-semibold">
            {wordData?.word || word.wordText}
          </p>
          {wordData?.pos && (
            <span className="text-xs text-muted-foreground">
              {wordData.pos}
            </span>
          )}
        </div>

        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {/* phonetics */}
      {wordData?.phonetics && (
        <div className="mb-3 text-sm space-y-1">
          <div>UK: {wordData.phonetics.uk}</div>
          <div>US: {wordData.phonetics.us}</div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handlePlayAudio("uk")}
              className="p-2 rounded hover:bg-muted"
            >
              <Volume2 size={16} />
            </button>

            <button
              onClick={() => handlePlayAudio("us")}
              className="p-2 rounded hover:bg-muted"
            >
              <Volume1 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* definitions */}
      {wordData?.definitions?.length ? (
        <div className="space-y-2 text-sm">
          {wordData.definitions.map((def, i) => (
            <div key={i}>
              <p className="font-medium">{def.definition}</p>
              <p className="text-muted-foreground">{def.meaningVi}</p>
              {def.example && (
                <p className="italic text-muted-foreground">
                  "{def.example}"
                </p>
              )}
            </div>
          ))}
        </div>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No data available
        </p>
      )}
    </div>
  )
}

export default WordPopup