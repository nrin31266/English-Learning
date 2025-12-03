import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import YouTube, { type YouTubeProps } from "react-youtube"
import type { ILLessonDetailsDto, ILLessonSentence } from "@/types"
import type { ShadowingPlayerRef } from "../types/types"

const PADDING_SEC = 0.3 // 300ms mỗi bên

type YouTubeShadowingProps = {
  lesson: ILLessonDetailsDto
  currentSentence?: ILLessonSentence
  autoStop: boolean
  largeVideo: boolean
}

const YouTubeShadowing = forwardRef<ShadowingPlayerRef, YouTubeShadowingProps>(
  ({ lesson, currentSentence, autoStop, largeVideo }, ref) => {
    const playerRef = useRef<any>(null)
    const [isReady, setIsReady] = useState(false)

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

    const clearAutoStopTimeout = () => {
      if (timeoutRef.current !== null) {
        // console.log("Clearing auto-stop timeout")
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    /**
     * Đặt hẹn giờ để dừng video tại endSec (có padding).
     * - Nếu truyền startFrom: giả định currentTime chính là startFrom.
     * - Nếu không, sẽ hỏi player.getCurrentTime() 1 lần.
     */
    const startAutoStop = (startFrom?: number) => {
      if (!autoStop) {
        // console.log("Auto-stop is disabled, not starting")
        return
      }

      if (!currentSentence) {
        // console.log("No current sentence, not starting auto-stop")
        return
      }

      const player = playerRef.current
      if (!player) {
        // console.log("Player not ready, not starting auto-stop")
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
      // console.log("Setting up auto-stop timeout after", remainingMs, "ms")

      clearAutoStopTimeout()

      timeoutRef.current = window.setTimeout(() => {
        const p = playerRef.current
        if (!p) return
        // console.log("Auto-stop timeout fired")
        p.pauseVideo()
        clearAutoStopTimeout()
      }, remainingMs)
    }

    const playCurrentSegment = () => {
      if (!playerRef.current || !currentSentence) return

      clearAutoStopTimeout()

      const rawStartSec = (currentSentence.audioStartMs ?? 0) / 1000
      const startSec = Math.max(rawStartSec - PADDING_SEC, 0) // lùi lại 0.3s, không cho âm

      playerRef.current.seekTo(startSec, true)
      playerRef.current.playVideo()

      if (autoStop) {
        // console.log("Starting auto-stop for segment")
        startAutoStop(startSec)
      } else {
        // console.log("Auto-stop is disabled, skipping")
      }
    }

    const play = () => {
      if (!playerRef.current) return

      clearAutoStopTimeout()
      playerRef.current.playVideo()

      if (autoStop && currentSentence) {
        // console.log("Starting auto-stop for play")
        startAutoStop() // dùng currentTime hiện tại
      }
    }

    const pause = () => {
      if (!playerRef.current) return
      playerRef.current.pauseVideo()
      clearAutoStopTimeout()
    }

    useImperativeHandle(
      ref,
      () => ({
        playCurrentSegment,
        play,
        pause,
      }),
      [currentSentence, autoStop]
    )

    // Auto play segment khi đổi câu
    useEffect(() => {
      if (!isReady || !currentSentence) return

      // console.log("Auto-playing segment, autoStop:", autoStop)
      playCurrentSegment()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady, currentSentence?.id])

    // Cleanup khi autoStop thay đổi
    useEffect(() => {
      // console.log("autoStop changed to:", autoStop)

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoStop])

    // Cleanup khi unmount
    useEffect(() => {
      return () => {
        clearAutoStopTimeout()
      }
    }, [])

    return (
      <div className="w-full overflow-hidden rounded-xl border bg-black">
        <YouTube videoId={videoId} opts={opts} onReady={onReady} />
      </div>
    )
  }
)

YouTubeShadowing.displayName = "YouTubeShadowing"

export default YouTubeShadowing
