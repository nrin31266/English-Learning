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
import { Badge } from "@/components/ui/badge"
import { Play, Video } from "lucide-react"

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

    // Cleanup khi unmount - CRITICAL for memory leak
    useEffect(() => {
      return () => {
        clearAutoStopTimeout()
        // IMPORTANT: Destroy player instance completely
        if (playerRef.current) {
          try {
            playerRef.current.pauseVideo()
            // Call destroy to remove iframe and all event listeners
            if (typeof playerRef.current.destroy === 'function') {
              playerRef.current.destroy()
            }
          } catch (e) {
            console.warn('Error destroying YouTube player:', e)
          }
          playerRef.current = null
        }
      }
    }, [clearAutoStopTimeout])
    
    // Cleanup on page hide/visibility change - force cleanup
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Page is hidden, pause and cleanup
          if (playerRef.current) {
            try {
              playerRef.current.pauseVideo()
            } catch (e) {
              // ignore
            }
          }
          clearAutoStopTimeout()
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }, [clearAutoStopTimeout])

    return (
      <div className="w-full overflow-hidden rounded-xl border bg-black relative shadow-lg">
        <YouTube videoId={videoId} opts={opts} onReady={onReady} />
        
        {/* Video badge indicator */}
        {!userInteracted && isReady && (
          <div className="absolute top-3 right-3 z-10">
            <Badge variant="secondary" className="gap-1 text-xs bg-black/60 backdrop-blur-sm">
              <Video className="h-3 w-3" />
              YouTube
            </Badge>
          </div>
        )}
        
        {/* Overlay Start Button with gradient */}
        {!userInteracted && isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/40 via-black/60 to-black/80 backdrop-blur-[1px]">
            <div className="text-center space-y-3">
             
              <Button
                size="lg"
                onClick={() => {
                  setUserInteracted(true)
                  onUserInteracted?.(true)
                  
                  // Play ngay lập tức mà không đợi useEffect
                  if (playerRef.current && currentSentence) {
                    setTimeout(() => {
                      clearAutoStopTimeout()
                      
                      const rawStartSec = (currentSentence.audioStartMs ?? 0) / 1000
                      const startSec = Math.max(rawStartSec - PADDING_SEC, 0)
                      
                      playerRef.current.seekTo(startSec, true)
                      playerRef.current.playVideo()
                      
                      // Delay auto-stop để player kịp seek và lấy currentTime chính xác
                      if (autoStop) {
                        setTimeout(() => {
                          startAutoStop() // Không truyền startFrom, để nó tự lấy getCurrentTime()
                        }, 200) // Đợi player kịp seek và play
                      }
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
        )}
      </div>
    )
  }
)

YouTubeShadowing.displayName = "YouTubeShadowing"

export default YouTubeShadowing
