import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react-dom"
import { useEffect, useRef, useState, useCallback } from "react"
import { X, Volume2, ExternalLink, Loader2, AlertCircle, CheckCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ILessonWordResponse } from "@/types"
import LanguageLevelBadge from "./LanguageLevel"
import type { IWordData } from "@/types/dictionary"



interface WordPopupProps {
  word: ILessonWordResponse | null
  wordData?: IWordData | null
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
  const [isPlayingUk, setIsPlayingUk] = useState(false)
  const [isPlayingUs, setIsPlayingUs] = useState(false)

  const popupRef = useRef<HTMLDivElement | null>(null)
  const audioUkRef = useRef<HTMLAudioElement | null>(null)
  const audioUsRef = useRef<HTMLAudioElement | null>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastClickRef = useRef(0) // 🔥 debounce

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

  // 🔥 FIX: Audio handlers - dùng ref có sẵn, pause cả 2 trước khi play
  const handlePlayUk = useCallback(() => {
    // Debounce
    const now = Date.now()
    if (now - lastClickRef.current < 300) return
    lastClickRef.current = now

    if (!audioUkRef.current) return

    // Pause the other one
    if (audioUsRef.current && !audioUsRef.current.paused) {
      audioUsRef.current.pause()
      audioUsRef.current.currentTime = 0
      setIsPlayingUs(false)
    }

    const audio = audioUkRef.current
    audio.currentTime = 0
    setIsPlayingUk(true)

    audio.play().catch(() => {
      setIsPlayingUk(false)
    })

    audio.onended = () => setIsPlayingUk(false)
    audio.onerror = () => setIsPlayingUk(false)
  }, [])

  const handlePlayUs = useCallback(() => {
    // Debounce
    const now = Date.now()
    if (now - lastClickRef.current < 300) return
    lastClickRef.current = now

    if (!audioUsRef.current) return

    // Pause the other one
    if (audioUkRef.current && !audioUkRef.current.paused) {
      audioUkRef.current.pause()
      audioUkRef.current.currentTime = 0
      setIsPlayingUk(false)
    }

    const audio = audioUsRef.current
    audio.currentTime = 0
    setIsPlayingUs(true)

    audio.play().catch(() => {
      setIsPlayingUs(false)
    })

    audio.onended = () => setIsPlayingUs(false)
    audio.onerror = () => setIsPlayingUs(false)
  }, [])

  // Helper để lấy flag emoji theo quốc gia
  const getFlagEmoji = (country: "uk" | "us") => {
    return country === "uk" ? "🇬🇧" : "🇺🇸"
  }

  // Helper để lấy status UI
  const getStatusUI = () => {
    if (isLoading) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        text: "Loading...",
        className: "text-blue-600 bg-blue-50",
        isBanner: true
      }
    }

    switch (wordData?.status) {
      case "READY":
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          text: "Ready",
          className: "text-green-600 bg-green-50",
          isBanner: false
        }
      case "FALLBACK":
        // 🔥 FALLBACK: không hiển thị banner vàng, chỉ hiển thị note nhỏ
        return {
          icon: null,
          text: null,
          className: null,
          isBanner: false,
          note: wordData?.message || "High-quality data will be available soon."
        }
      case "PROCESSING":
        return {
          icon: <Clock className="h-4 w-4" />,
          text: wordData?.message || "Word is being processed...",
          className: "text-orange-600 bg-orange-50",
          isBanner: true
        }
      case "FAILED":
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: wordData?.message || "Failed to load word data",
          className: "text-red-600 bg-red-50",
          isBanner: true
        }
      default:
        return null
    }
  }

  const statusUI = getStatusUI()
  // 🔥 READY hoặc FALLBACK đều show content
  const isReadyOrFallback = wordData?.status === "READY" || wordData?.status === "FALLBACK"
  const showContent = isReadyOrFallback && !isLoading

  // Cambridge dictionary link - luôn hiển thị nếu có word
  const cambridgeLink = wordData?.word || word?.wordText
    ? `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent((wordData?.word || word?.wordText || "").toLowerCase())}`
    : null



  useEffect(() => {
    if (!wordData || !anchorEl) return

    // chỉ auto play khi có data usable
    if (wordData.status !== "READY" && wordData.status !== "FALLBACK") return

    // phải có audio US
    if (!wordData.phonetics?.usAudioUrl) return

    const timer = setTimeout(() => {
      handlePlayUs()
    }, 200) // 👈 delay nhẹ để popup open xong

    return () => clearTimeout(timer)
  }, [wordData, anchorEl, handlePlayUs])
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
        "w-96 rounded-lg border bg-background shadow-lg",
        "transition-transform duration-150 ease-out z-50",
        isVisible && !isExiting
          ? "opacity-100 scale-100"
          : "opacity-0 scale-95 pointer-events-none"
      )}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-lg font-semibold text-primary">
                {wordData?.word || word.wordText}
              </p>
              {wordData?.pos && (
                <span className="uppercase text-xs text-muted-foreground">
                  {wordData.pos}
                </span>
              )}
              {wordData?.cefrLevel && (
                <LanguageLevelBadge level={wordData.cefrLevel as "A1" | "A2" | "B1" | "B2" | "C1" | "C2"} hasBg />
              )}
            </div>
          </div>

          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status Banner - chỉ hiển thị cho PROCESSING, FAILED, READY (tùy chọn) */}
        {statusUI?.isBanner && statusUI.text && (
          <div className={cn(
            "mb-3 p-2 rounded-md flex items-center gap-2 text-xs",
            statusUI.className
          )}>
            {statusUI.icon}
            <span>{statusUI.text}</span>
          </div>
        )}

        {/* 🔥 FALLBACK note nhẹ nhàng */}
        {wordData?.status === "FALLBACK" && statusUI?.note && showContent && (
          <div className="mb-3 text-xs text-muted-foreground flex items-start gap-1">
            <Clock className="h-3 w-3" />
            <span>{statusUI.note}</span>
          </div>
        )}

        {/* Phonetics with flags and audio buttons */}
        {showContent && (
          <div className="mb-3 space-y-2">
             <div className="flex items-center gap-2">
                <span className="text-base">{getFlagEmoji("uk")}</span>
                <span className="text-sm font-mono">{wordData.phonetics.uk}</span>
                <button
                  onClick={handlePlayUk}
                  disabled={isPlayingUk || !wordData.phonetics.ukAudioUrl}
                  className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPlayingUk ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
              </div>

           <div className="flex items-center gap-2">
                <span className="text-base">{getFlagEmoji("us")}</span>
                <span className="text-sm font-mono">{wordData.phonetics.us}</span>
                <button
                  onClick={handlePlayUs}
                  disabled={isPlayingUs || !wordData.phonetics.usAudioUrl}
                  className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPlayingUs ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
              </div>
          </div>
        )}

        {/* Summary Vietnamese */}
        {wordData?.summaryVi && showContent && (
          <div className="mb-3 p-2 bg-muted/50 rounded-md">
            <p className="text-sm">{wordData.summaryVi}</p>
          </div>
        )}

        {/* Definitions with scroll - loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            <div className="animate-pulse h-4 bg-muted rounded w-3/4" />
            <div className="animate-pulse h-3 bg-muted rounded w-1/2" />
            <div className="animate-pulse h-4 bg-muted rounded w-full" />
            <div className="animate-pulse h-3 bg-muted rounded w-2/3" />
          </div>
        )}

        {/* Definitions content */}
        {showContent && !isLoading && wordData?.definitions && wordData.definitions.length > 0 && (
          <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
            {wordData.definitions.map((def, i) => (
              <div key={i} className="border-l-2 border-primary/30 pl-3">
                <p className="text-sm font-medium">{def.definition}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {def.meaningVi}
                </p>
                {def.example && (
                  <p className="text-xs italic text-muted-foreground mt-1">
                    "{def.example}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}



        {/* Footer with Cambridge link - LUÔN HIỂN THỊ nếu có word */}
        {cambridgeLink && (
          <div className="mt-4 pt-3 border-t">
            <a
              href={cambridgeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Tra từ điển Cambridge
            </a>
          </div>
        )}
      </div>

      {/* Audio elements - dùng ref, không tạo mới mỗi lần */}
      <audio
        ref={audioUkRef}
        src={wordData?.phonetics?.ukAudioUrl}
        preload="none"
      />
      <audio
        ref={audioUsRef}
        src={wordData?.phonetics?.usAudioUrl}
        preload="none"
      />
    </div>
  )
}

export default WordPopup