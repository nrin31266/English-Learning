import React, {
  forwardRef, useCallback, useEffect,
  useImperativeHandle, useMemo, useRef, useState,
} from "react"
import YouTube, { type YouTubeProps } from "react-youtube"
import type { ILessonDetailsResponse, ILessonSentenceDetailsResponse } from "@/types"
import type { ShadowingPlayerRef } from "../types/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Video } from "lucide-react"

const START_PADDING = 0.1
const END_PADDING = 0.05

type YouTubeShadowingProps = {
  lesson: ILessonDetailsResponse
  currentSentence?: ILessonSentenceDetailsResponse
  autoStop: boolean
  largeVideo: boolean
  shouldAutoPlay?: boolean
  onUserInteracted?: (interacted: boolean) => void
  playbackRate?: number
  isPlaying: boolean
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>
}

const YouTubeShadowing = forwardRef<ShadowingPlayerRef, YouTubeShadowingProps>(
  ({ lesson, currentSentence, autoStop, largeVideo, shouldAutoPlay = false, onUserInteracted, playbackRate, isPlaying, setIsPlaying }, ref) => {

    const playerRef = useRef<any>(null)
    const animationFrameRef = useRef<number | null>(null)
    const currentSegmentRef = useRef<{ start: number; end: number } | null>(null)
    const [userInteracted, setUserInteracted] = useState(false)
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
      playerVars: { controls: 1, rel: 0, modestbranding: 1 },
    }

    // Hàm dừng kiểm tra animation frame
    const stopMonitoring = useCallback(() => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }, [])

    // Hàm bắt đầu kiểm tra thời gian để dừng video
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
        
        // Nếu đã qua end time, dừng video
        if (currentTime >= currentSegmentData.end) {
          currentPlayer.pauseVideo()
          setIsPlaying(false)
          stopMonitoring()
          return
        }
        
        // Tiếp tục kiểm tra
        animationFrameRef.current = requestAnimationFrame(checkAndStop)
      }
      
      stopMonitoring() // Clear cái cũ trước
      animationFrameRef.current = requestAnimationFrame(checkAndStop)
    }, [autoStop, stopMonitoring])

    const onReady: YouTubeProps["onReady"] = (event) => {
      playerRef.current = event.target
      setIsReady(true)
    }

    const onStateChange: YouTubeProps["onStateChange"] = (e) => {
      const state = e.data
      
      if (state === 1) { // Playing
        setIsPlaying(true)
        // Khi video bắt đầu play, bắt đầu kiểm tra nếu autoStop đang bật
        if (autoStop && currentSegmentRef.current) {
          startMonitoring()
        }
      } else if (state === 2 || state === 0) { // Paused or ended
        setIsPlaying(false)
        // Khi pause, dừng kiểm tra (sẽ resume khi play lại)
        stopMonitoring()
      }
    }

    const playCurrentSegment = useCallback(() => {
      const player = playerRef.current
      if (!player || !currentSentence || !userInteracted) return

      const start = Math.max(currentSentence.audioStartMs / 1000 - START_PADDING, 0)
      const end = currentSentence.audioEndMs / 1000 + END_PADDING
      
      // Lưu segment hiện tại
      currentSegmentRef.current = { start, end }
      
      // Seek và play
      player.seekTo(start, true)
      player.setPlaybackRate(playbackRate || 1)
      player.playVideo()
    }, [currentSentence, userInteracted, playbackRate])

    const play = useCallback(() => {
      const player = playerRef.current
      if (!player || !userInteracted) return
      
      // Nếu đã có segment (đang trong segment mode)
      if (currentSegmentRef.current) {
        const now = player.getCurrentTime()
        
        // Nếu đã qua end, replay từ đầu
        if (now >= currentSegmentRef.current.end - END_PADDING && autoStop) {
          console.log("ahshd")
          playCurrentSegment()
          return
        }
        
        // Resume với segment hiện tại
        player.playVideo()
        // startMonitoring sẽ được gọi trong onStateChange
      } else {
        // Play bình thường (không segment)
        player.playVideo()
      }
    }, [userInteracted, playCurrentSegment, autoStop])

    const pause = useCallback(() => {
      const player = playerRef.current
      if (!player) return
      player.pauseVideo()
      // stopMonitoring sẽ được gọi trong onStateChange
    }, [])

    useImperativeHandle(ref, () => ({
      playCurrentSegment, play, pause,
      getUserInteracted: () => userInteracted,
    }), [playCurrentSegment, play, pause, userInteracted])

    // Theo dõi thay đổi của autoStop
    useEffect(() => {
      const player = playerRef.current
      if (!player || !autoStop) return
      
      // Nếu autoStop được bật và đang play segment, bắt đầu monitor
      if (isPlaying && currentSegmentRef.current) {
        startMonitoring()
      }
    }, [autoStop, isPlaying, startMonitoring])

    // Theo dõi thay đổi của currentSentence - dừng ngay khi chuyển câu
    useEffect(() => {
      const player = playerRef.current
      if (!player) return
      
      // Reset segment khi đổi câu
      currentSegmentRef.current = null
      stopMonitoring()
      
      // Dừng video ngay lập tức
      if (isPlaying) {
        player.pauseVideo()
        setIsPlaying(false)
      }
    }, [currentSentence?.id])

    // Auto play khi đổi câu
    useEffect(() => {
      if (!isReady || !currentSentence || !userInteracted || !shouldAutoPlay) return
      
      const timer = setTimeout(() => {
        playCurrentSegment()
      }, 100)
      
      return () => clearTimeout(timer)
    }, [currentSentence?.id, isReady, userInteracted, shouldAutoPlay, playCurrentSegment])

    // Cleanup
    useEffect(() => {
      return () => {
        stopMonitoring()
        if (playerRef.current) {
          try {
            playerRef.current.pauseVideo()
          } catch {}
        }
      }
    }, [stopMonitoring])

    const togglePlay = () => {
      if (!userInteracted) {
        setUserInteracted(true)
        onUserInteracted?.(true)
        if (currentSentence) {
          playCurrentSegment()
        }
        return
      }
      
      if (isPlaying) {
        pause()
      } else {
        if (currentSentence) {
          play()
        } else {
          play()
        }
      }
    }

    return (
      <div className="w-full rounded-xl border bg-black relative shadow-lg overflow-hidden">
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onStateChange={onStateChange}
        />

        {!userInteracted && isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <Button onClick={togglePlay} className="gap-2">
              <Play className="h-5 w-5" />
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