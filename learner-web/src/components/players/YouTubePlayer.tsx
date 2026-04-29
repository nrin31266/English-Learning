import React, {
  forwardRef, useCallback, useEffect,
  useImperativeHandle, useMemo, useRef, useState,
} from "react"
import YouTube, { type YouTubeProps } from "react-youtube"
import type { ILessonDetailsResponse, ILessonSentenceDetailsResponse } from "@/types"
import type { PlayerRef } from "./types/types"
import { Play } from "lucide-react"

const START_PADDING = 0.1
const END_PADDING = 0.05

type YouTubePlayerProps = {
  lesson: ILessonDetailsResponse
  currentSentence?: ILessonSentenceDetailsResponse
  autoStop: boolean
  largeVideo: boolean
  autoPlayOnSentenceChange?: boolean

  playbackRate?: number
  isPlaying: boolean
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>
  userInteracted: boolean,
  onError?: () => void
}

const YouTubePlayer = forwardRef<PlayerRef, YouTubePlayerProps>(
  ({ lesson, currentSentence, autoStop, largeVideo, autoPlayOnSentenceChange,
    userInteracted, playbackRate, isPlaying, setIsPlaying, onError }, ref) => {

    const playerRef = useRef<any>(null)
    const animationFrameRef = useRef<number | null>(null)
    const currentSegmentRef = useRef<{ start: number; end: number } | null>(null)
    const [isReady, setIsReady] = useState(false)

    const videoId = useMemo(() => {
      if (!lesson.sourceUrl) return ""
      try {
        const u = new URL(lesson.sourceUrl)
        if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "")
        return u.searchParams.get("v") ?? lesson.sourceUrl
      } catch {
        return lesson.sourceUrl
      }
    }, [lesson.sourceUrl])

    const opts: YouTubeProps["opts"] = {
      width: "100%",
      height: largeVideo ? "420" : "200",
      playerVars: {
        controls: 1,
        rel: 0,
        modestbranding: 1,
        origin: typeof window !== "undefined" ? window.location.origin : "", 
      },
    }

    const stopMonitoring = useCallback(() => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }, [])

    const onErrorHandler: YouTubeProps["onError"] = (e) => {
      const code = e.data
      console.error("YouTube Error:", code)

      if ([2, 5, 100, 101, 150].includes(code)) {
        onError?.()
      }
    }

    const startMonitoring = useCallback(() => {
      const player = playerRef.current
      const segment = currentSegmentRef.current

      if (!player || !autoStop || !segment) return

      const checkAndStop = () => {
        const currentPlayer = playerRef.current
        const currentSegmentData = currentSegmentRef.current

        if (!currentPlayer || !currentSegmentData) {
          stopMonitoring()
          return
        }

        const currentTime = currentPlayer.getCurrentTime()

        if (currentTime >= currentSegmentData.end) {
          currentPlayer.pauseVideo()
          setIsPlaying(false)
          stopMonitoring()
          return
        }

        animationFrameRef.current = requestAnimationFrame(checkAndStop)
      }

      stopMonitoring() 
      animationFrameRef.current = requestAnimationFrame(checkAndStop)
    }, [autoStop, stopMonitoring])

    const onReady: YouTubeProps["onReady"] = (event) => {
      playerRef.current = event.target
      setIsReady(true)
    }

    const onStateChange: YouTubeProps["onStateChange"] = (e) => {
      const state = e.data

      if (state === 1) { 
        setIsPlaying(true)
        if (autoStop && currentSegmentRef.current) {
          startMonitoring()
        }
      } else if (state === 2 || state === 0) { 
        setIsPlaying(false)
        stopMonitoring()
      }
    }

    const playCurrentSegment = useCallback(() => {
      const player = playerRef.current
      if (!player || !currentSentence || !userInteracted) return

      const start = Math.max(currentSentence.audioStartMs / 1000 - START_PADDING, 0)
      const end = currentSentence.audioEndMs / 1000 + END_PADDING

      currentSegmentRef.current = { start, end }

      player.seekTo(start, true)
      player.setPlaybackRate(playbackRate || 1)
      player.playVideo()
    }, [currentSentence, userInteracted, playbackRate])

    const play = useCallback(() => {
      const player = playerRef.current
      if (!player || !userInteracted) return

      if (currentSegmentRef.current) {
        const now = player.getCurrentTime()
        if (now >= currentSegmentRef.current.end - END_PADDING && autoStop) {
          playCurrentSegment()
          return
        }
        player.playVideo()
      } else {
        player.playVideo()
      }
    }, [userInteracted, playCurrentSegment, autoStop])

    const pause = useCallback(() => {
      const player = playerRef.current
      if (!player) return
      player.pauseVideo()
    }, [])

    useImperativeHandle(ref, () => ({
      playCurrentSegment, play, pause,
      getUserInteracted: () => userInteracted,
    }), [playCurrentSegment, play, pause, userInteracted])

    useEffect(() => {
      const player = playerRef.current
      if (!player || !autoStop) return
      if (isPlaying && currentSegmentRef.current) {
        startMonitoring()
      }
    }, [autoStop, isPlaying, startMonitoring])

    useEffect(() => {
      const player = playerRef.current
      if (!player) return

      currentSegmentRef.current = null
      stopMonitoring()

      if (isPlaying) {
        player.pauseVideo()
        setIsPlaying(false)
      }
    }, [currentSentence?.id])

    useEffect(() => {
      if (!isReady || !currentSentence || !userInteracted || !autoPlayOnSentenceChange) return

      const timer = setTimeout(() => {
        playCurrentSegment()
      }, 100)

      return () => clearTimeout(timer)
    }, [currentSentence?.id, isReady, userInteracted, autoPlayOnSentenceChange, playCurrentSegment])

    useEffect(() => {
      return () => {
        stopMonitoring()
        if (playerRef.current) {
          try {
            playerRef.current.pauseVideo()
          } catch { }
        }
      }
    }, [stopMonitoring])

    // --- UI ĐÃ ĐƯỢC LÀM SẠCH VÀ TỐI GIẢN ---
    return (
      <div 
        className={`w-full border bg-black relative shadow-sm overflow-hidden ${largeVideo ? "rounded-xl" : "rounded-t-xl"}`}
      >
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onStateChange={onStateChange}
          onError={onErrorHandler}
        />

        {/* Lớp phủ siêu gọn, chỉ hiện nút Play khi chưa tương tác */}
        {!userInteracted && isReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"/>
        )}
      </div>
    )
  }
)

YouTubePlayer.displayName = "YouTubeShadowing"
export default YouTubePlayer