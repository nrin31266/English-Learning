import React, {
  forwardRef, useCallback, useEffect,
  useImperativeHandle, useMemo, useRef, useState,
} from "react"
import YouTube, { type YouTubeProps } from "react-youtube"
import type { ILessonDetailsResponse, ILessonSentenceDetailsResponse } from "@/types"
import type { ShadowingPlayerRef } from "../types/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Video } from "lucide-react"


const PADDING_SEC = 0

type YouTubeShadowingProps = {
  lesson: ILessonDetailsResponse
  currentSentence?: ILessonSentenceDetailsResponse
  autoStop: boolean
  largeVideo: boolean
  shouldAutoPlay?: boolean
  onUserInteracted?: (interacted: boolean) => void
}

const YouTubeShadowing = forwardRef<ShadowingPlayerRef, YouTubeShadowingProps>(
  ({ lesson, currentSentence, autoStop, largeVideo, shouldAutoPlay = false, onUserInteracted }, ref) => {
    const playerRef = useRef<any>(null)
    // Dùng interval thay vì timeout để tránh race condition với seekTo
    const intervalRef = useRef<number | null>(null)
    const [isReady, setIsReady] = useState(false)
    const [userInteracted, setUserInteracted] = useState(false)

    // Parse videoId từ youtube.com/watch?v=ID hoặc youtu.be/ID
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

    const onReady: YouTubeProps["onReady"] = (event) => {
      playerRef.current = event.target
      setIsReady(true)
    }

    const clearAutoStop = useCallback(() => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }, [])

    // Poll mỗi 100ms, dừng khi currentTime >= endSec
    // Fix: tránh hoàn toàn việc tính remainingMs từ getCurrentTime (dễ sai sau seekTo)
    const startAutoStop = useCallback(() => {
      if (!autoStop || !currentSentence || !playerRef.current) return
      clearAutoStop()

      const endSec = (currentSentence.audioEndMs ?? 0) / 1000 + PADDING_SEC

      intervalRef.current = window.setInterval(() => {
        const player = playerRef.current
        if (!player) return clearAutoStop()
        const now = player.getCurrentTime?.() ?? 0
        if (now >= endSec) {
          player.pauseVideo()
          clearAutoStop()
        }
      }, 100)
    }, [autoStop, currentSentence, clearAutoStop])

    // Seek về đầu câu rồi play
    const playCurrentSegment = useCallback(() => {
      if (!playerRef.current || !currentSentence || !userInteracted) return
      clearAutoStop()
      const startSec = Math.max((currentSentence.audioStartMs ?? 0) / 1000 - PADDING_SEC, 0)
      playerRef.current.seekTo(startSec, true)
      playerRef.current.playVideo()
      if (autoStop) startAutoStop()
    }, [currentSentence, autoStop, userInteracted, clearAutoStop, startAutoStop])

    // Tiếp tục play từ vị trí hiện tại
    const play = useCallback(() => {
      if (!playerRef.current || !userInteracted) return
      clearAutoStop()
      playerRef.current.playVideo()
      if (autoStop && currentSentence) startAutoStop()
    }, [autoStop, currentSentence, userInteracted, clearAutoStop, startAutoStop])

    const pause = useCallback(() => {
      if (!playerRef.current) return
      playerRef.current.pauseVideo()
      clearAutoStop()
    }, [clearAutoStop])

    useImperativeHandle(ref, () => ({
      playCurrentSegment, play, pause,
      getUserInteracted: () => userInteracted,
    }), [playCurrentSegment, play, pause, userInteracted])

    // Auto play khi đổi câu (chỉ khi shouldAutoPlay = true)
    useEffect(() => {
      if (!isReady || !currentSentence || !userInteracted || !shouldAutoPlay) return
      playCurrentSegment()
    }, [isReady, currentSentence?.id, userInteracted, shouldAutoPlay, playCurrentSegment])

    // Xử lý toggle autoStop on/off
    useEffect(() => {
      if (!autoStop) {
        clearAutoStop()
      } else if (isReady && currentSentence && playerRef.current?.getPlayerState?.() === 1) {
        startAutoStop()
      }
    }, [autoStop, isReady, currentSentence, clearAutoStop, startAutoStop])

    // Cleanup khi unmount
    useEffect(() => {
      return () => {
        clearAutoStop()
        if (playerRef.current) {
          try {
            playerRef.current.pauseVideo()
            playerRef.current.destroy?.()
          } catch (e) {
            console.warn("Error destroying YouTube player:", e)
          }
          playerRef.current = null
        }
      }
    }, [clearAutoStop])

    // Pause khi tab ẩn
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          try { playerRef.current?.pauseVideo() } catch {}
          clearAutoStop()
        }
      }
      document.addEventListener("visibilitychange", handleVisibilityChange)
      return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
    }, [clearAutoStop])

    return (
      <div className="w-full overflow-hidden rounded-xl border bg-black relative shadow-lg">
        <YouTube videoId={videoId} opts={opts} onReady={onReady} />

        {!userInteracted && isReady && (
          <>
            <div className="absolute top-3 right-3 z-10">
              <Badge variant="secondary" className="gap-1 text-xs bg-black/60 backdrop-blur-sm">
                <Video className="h-3 w-3" />
                YouTube
              </Badge>
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/40 via-black/60 to-black/80 backdrop-blur-[1px]">
              <div className="text-center space-y-3">
                <Button
                  size="lg"
                  onClick={() => {
                    setUserInteracted(true)
                    onUserInteracted?.(true)
                    if (playerRef.current && currentSentence) {
                      // Dùng setTimeout 100ms để đợi state flush trước khi seek
                      setTimeout(() => {
                        const startSec = Math.max(
                          (currentSentence.audioStartMs ?? 0) / 1000 - PADDING_SEC, 0
                        )
                        playerRef.current.seekTo(startSec, true)
                        playerRef.current.playVideo()
                        // startAutoStop dùng interval nên không cần delay thêm
                        if (autoStop) startAutoStop()
                      }, 100)
                    }
                  }}
                  className="gap-2 text-lg shadow-2xl px-8"
                >
                  <Play className="h-5 w-5" />
                  Bắt đầu
                </Button>
                <p className="text-xs text-white/70 mt-2">Click để bắt đầu học shadowing</p>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }
)

YouTubeShadowing.displayName = "YouTubeShadowing"
export default YouTubeShadowing