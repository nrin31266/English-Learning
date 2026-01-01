import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import YouTube, { type YouTubeProps } from "react-youtube"
import type { ILLessonDetailsDto, ILLessonSentence } from "@/types"
import type { ShadowingPlayerRef } from "../types/types"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"

const PADDING_SEC = 0.1 // 100ms mỗi bên

type YouTubeShadowingProps = {
  lesson: ILLessonDetailsDto
  currentSentence?: ILLessonSentence
  autoStop: boolean
  largeVideo: boolean
  shouldAutoPlay?: boolean
  onUserInteracted?: (interacted: boolean) => void
}

const YouTubeShadowing = forwardRef<ShadowingPlayerRef, YouTubeShadowingProps>(
  ({ lesson, currentSentence, autoStop, largeVideo, shouldAutoPlay = false, onUserInteracted }, ref) => {
    const playerRef = useRef<any>(null)
    const [isReady, setIsReady] = useState(false)
    const [userInteracted, setUserInteracted] = useState(false)

    // Dùng timeout thay vì interval để tránh spam getCurrentTime
    const timeoutRef = useRef<number | null>(null)

    const videoId = useMemo(() => {
      if (!lesson.sourceUrl) return ""
      try {
        const u = new URL(lesson.sourceUrl)
        if (u.hostname.includes("youtu.be")) {
          return u.pathname.replace("/", "")
        }
        const v = u.searchParams.get("v")
        if (v) return v
        return lesson.sourceUrl
      } catch {
        return lesson.sourceUrl
      }
    }, [lesson.sourceUrl])

    const opts: YouTubeProps["opts"] = {
      width: "100%",
      height: largeVideo ? "420" : "280",
      playerVars: {
        controls: 1,
        rel: 0,
        modestbranding: 1,
      },
    }

    const onReady: YouTubeProps["onReady"] = (event) => {
      playerRef.current = event.target
      setIsReady(true)
    }

    const clearAutoStopTimeout = useCallback(() => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }, [])

    /**
     * Đặt hẹn giờ để dừng video tại endSec (có padding).
     * - Nếu truyền startFrom: giả định currentTime chính là startFrom.
     * - Nếu không, sẽ hỏi player.getCurrentTime() 1 lần.
     */
    const startAutoStop = useCallback((startFrom?: number) => {
      if (!autoStop) {
        return
      }

      if (!currentSentence) {
        return
      }

      const player = playerRef.current
      if (!player) {
        return
      }

      const rawEndSec = (currentSentence.audioEndMs ?? 0) / 1000
      const endSec = rawEndSec + PADDING_SEC

      let now = 0
      if (typeof startFrom === "number") {
        now = startFrom
      } else if (typeof player.getCurrentTime === "function") {
        const t = player.getCurrentTime()
        if (typeof t === "number" && isFinite(t)) {
          now = t
        }
      }

      const remainingMs = Math.max((endSec - now) * 1000, 0)

      clearAutoStopTimeout()

      timeoutRef.current = window.setTimeout(() => {
        const p = playerRef.current
        if (!p) return
        p.pauseVideo()
        clearAutoStopTimeout()
      }, remainingMs)
    }, [autoStop, currentSentence, clearAutoStopTimeout])

    const playCurrentSegment = useCallback(() => {
      if (!playerRef.current || !currentSentence || !userInteracted) return

      clearAutoStopTimeout()

      const rawStartSec = (currentSentence.audioStartMs ?? 0) / 1000
      const startSec = Math.max(rawStartSec - PADDING_SEC, 0) // lùi lại 0.3s, không cho âm

      playerRef.current.seekTo(startSec, true)
      playerRef.current.playVideo()

      if (autoStop) {
        startAutoStop(startSec)
      }
    }, [currentSentence, autoStop, userInteracted, clearAutoStopTimeout, startAutoStop])

    const play = useCallback(() => {
      if (!playerRef.current || !userInteracted) return

      clearAutoStopTimeout()
      playerRef.current.playVideo()

      if (autoStop && currentSentence) {
        startAutoStop() // dùng currentTime hiện tại
      }
    }, [autoStop, currentSentence, userInteracted, clearAutoStopTimeout, startAutoStop])

    const pause = useCallback(() => {
      if (!playerRef.current) return
      playerRef.current.pauseVideo()
      clearAutoStopTimeout()
    }, [clearAutoStopTimeout])

    useImperativeHandle(
      ref,
      () => ({
        playCurrentSegment,
        play,
        pause,
        getUserInteracted: () => userInteracted,
      }),
      [playCurrentSegment, play, pause, userInteracted]
    )

    // Auto play segment khi đổi câu - CHỈ KHI USER ĐÃ TƯƠNG TÁC VÀ shouldAutoPlay = true
    useEffect(() => {
      if (!isReady || !currentSentence || !userInteracted || !shouldAutoPlay) return

      playCurrentSegment()
    }, [isReady, currentSentence?.id, userInteracted, shouldAutoPlay, playCurrentSegment])

    // Cleanup khi autoStop thay đổi
    useEffect(() => {
      if (!autoStop) {
        clearAutoStopTimeout()
      } else if (
        isReady &&
        currentSentence &&
        playerRef.current?.getPlayerState?.() === 1
      ) {
        // Nếu autoStop được bật và video đang playing, đặt lại auto-stop từ currentTime
        startAutoStop()
      }
    }, [autoStop, isReady, currentSentence, clearAutoStopTimeout, startAutoStop])

    // Cleanup khi unmount
    useEffect(() => {
      return () => {
        clearAutoStopTimeout()
      }
    }, [clearAutoStopTimeout])

    return (
      <div className="w-full overflow-hidden rounded-xl border bg-black relative">
        <YouTube videoId={videoId} opts={opts} onReady={onReady} />
        
        {/* Overlay Start Button */}
        {!userInteracted && isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Button
              size="lg"
              onClick={() => {
                setUserInteracted(true)
                onUserInteracted?.(true)
              }}
              className="gap-2 text-lg shadow-2xl"
            >
              <Play className="h-6 w-6" />
              Bắt đầu
            </Button>
          </div>
        )}
      </div>
    )
  }
)

YouTubeShadowing.displayName = "YouTubeShadowing"

export default YouTubeShadowing
