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
import type { ShadowingPlayerRef } from "./ShadowingPlayer.types"

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

    const playCurrentSegment = () => {
      if (!playerRef.current || !currentSentence) return
      const startSec = (currentSentence.audioStartMs ?? 0) / 1000
      playerRef.current.seekTo(startSec, true)
      playerRef.current.playVideo()
    }

    const play = () => {
      if (!playerRef.current) return
      playerRef.current.playVideo()
    }

    const pause = () => {
      if (!playerRef.current) return
      playerRef.current.pauseVideo()
    }

    useImperativeHandle(
      ref,
      () => ({
        playCurrentSegment,
        play,
        pause,
      }),
      [currentSentence]
    )

    // Auto play segment khi đổi câu
    useEffect(() => {
      if (!isReady || !currentSentence) return
      playCurrentSegment()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady, currentSentence?.id])

    // Auto stop khi qua audioEndMs
    useEffect(() => {
      if (!autoStop || !isReady || !currentSentence) return
      const player = playerRef.current
      if (!player) return

      const endSec = currentSentence.audioEndMs / 1000
      const timer = window.setInterval(() => {
        const t = player.getCurrentTime?.()
        if (typeof t === "number" && t >= endSec) {
          player.pauseVideo()
          window.clearInterval(timer)
        }
      }, 200)

      return () => window.clearInterval(timer)
    }, [autoStop, isReady, currentSentence?.id])

    return (
      <div className="w-full overflow-hidden rounded-xl border bg-black">
        <YouTube videoId={videoId} opts={opts} onReady={onReady} />
      </div>
    )
  }
)

YouTubeShadowing.displayName = "YouTubeShadowing"

export default YouTubeShadowing
