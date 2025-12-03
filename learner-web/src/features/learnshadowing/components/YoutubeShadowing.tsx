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
    const intervalRef = useRef<number | null>(null)

    // console.log("YouTubeShadowing - autoStop:", autoStop) // DEBUG

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

    const clearAutoStopInterval = () => {
      if (intervalRef.current !== null) {
        console.log("Clearing auto-stop interval") // DEBUG
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    const playCurrentSegment = () => {
      if (!playerRef.current || !currentSentence) return
      
      clearAutoStopInterval()
      
      const startSec = (currentSentence.audioStartMs ?? 0) / 1000
      playerRef.current.seekTo(startSec, true)
      playerRef.current.playVideo()
      
      // CHỈ start auto stop nếu autoStop = true
      if (autoStop) {
        console.log("Starting auto-stop for segment") // DEBUG
        startAutoStop()
      } else {
        console.log("Auto-stop is disabled, skipping") // DEBUG
      }
    }

    const play = () => {
      if (!playerRef.current) return
      
      clearAutoStopInterval()
      playerRef.current.playVideo()
      
      // CHỈ start auto stop nếu autoStop = true và có currentSentence
      if (autoStop && currentSentence) {
        console.log("Starting auto-stop for play") // DEBUG
        startAutoStop()
      }
    }

    const pause = () => {
      if (!playerRef.current) return
      playerRef.current.pauseVideo()
      clearAutoStopInterval()
    }

    const startAutoStop = () => {
      // KIỂM TRA KỸ điều kiện autoStop
      if (!autoStop) {
        console.log("Auto-stop is disabled, not starting") // DEBUG
        return
      }
      
      if (!currentSentence) {
        console.log("No current sentence, not starting auto-stop") // DEBUG
        return
      }
      
      if (!playerRef.current) {
        console.log("Player not ready, not starting auto-stop") // DEBUG
        return
      }

      const endSec = currentSentence.audioEndMs / 1000
      console.log("Setting up auto-stop to end at:", endSec) // DEBUG
      
      intervalRef.current = window.setInterval(() => {
        const player = playerRef.current
        if (!player || !player.getCurrentTime) return
        
        const currentTime = player.getCurrentTime()
        
        if (typeof currentTime === "number" && currentTime >= endSec) {
          console.log("Auto-stop triggered at time:", currentTime) // DEBUG
          player.pauseVideo()
          clearAutoStopInterval()
        }
      }, 100)
    }

    useImperativeHandle(
      ref,
      () => ({
        playCurrentSegment,
        play,
        pause,
      }),
      [currentSentence, autoStop] // THÊM autoStop vào dependency
    )

    // Auto play segment khi đổi câu
    useEffect(() => {
      if (!isReady || !currentSentence) return
      
      console.log("Auto-playing segment, autoStop:", autoStop) // DEBUG
      playCurrentSegment()
    }, [isReady, currentSentence?.id])

    // Cleanup khi autoStop thay đổi
    useEffect(() => {
      console.log("autoStop changed to:", autoStop) // DEBUG
      
      if (!autoStop) {
        clearAutoStopInterval()
      } else if (isReady && currentSentence && playerRef.current?.getPlayerState?.() === 1) {
        // Nếu autoStop được bật và video đang playing, start auto stop
        console.log("Auto-stop enabled while playing, starting auto-stop") // DEBUG
        startAutoStop()
      }
    }, [autoStop])

    // Cleanup khi unmount
    useEffect(() => {
      return () => {
        clearAutoStopInterval()
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