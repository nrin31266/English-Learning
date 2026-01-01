/**
 * Component YouTubeShadowing.tsx
 * 
 * Mục đích:
 * - Media player cho YouTube videos (sử dụng react-youtube library)
 * - Hỗ trợ phát từng đoạn video của câu (seek to audioStartMs -> audioEndMs)
 * - Auto-stop tại audioEndMs với padding (tránh cắt đứt)
 * - Expose ref để component cha điều khiển (play/pause/seek)
 * 
 * Khác biệt so với AudioShadowing:
 * - Sử dụng YouTube IFrame API thay vì <audio> element
 * - Có PADDING_SEC để lùi/tiến một chút (100ms) cho smooth hơn
 * - Dùng setTimeout thay vì timeupdate event (hiệu quả hơn)
 * - Có option largeVideo để adjust kích thước
 * 
 * YouTube Player States:
 * - -1: unstarted
 * - 0: ended
 * - 1: playing
 * - 2: paused
 * - 3: buffering
 * - 5: video cued
 * 
 * Auto-stop Strategy:
 * - Tính remainingMs = (audioEndMs + padding - currentTime) * 1000
 * - Dùng setTimeout để pause video sau remainingMs
 * - Clear timeout khi user tương tác hoặc đổi câu
 * 
 * Critical cleanup:
 * - Destroy YouTube player instance khi unmount
 * - Clear timeout để tránh memory leak
 * - Pause khi tab bị ẩn
 */
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

/**
 * PADDING_SEC: Thời gian lùi/tiến (giây) so với audioStartMs/audioEndMs
 * Lý do: Tránh cắt đột ngột, tạo smooth transition
 * - Lùi 0.1s trước khi bắt đầu
 * - Tiến 0.1s sau khi kết thúc
 */
const PADDING_SEC = 0.1

/**
 * Props cho YouTubeShadowing component
 */
type YouTubeShadowingProps = {
  /** Lesson data chứa sourceUrl (YouTube link) */
  lesson: ILLessonDetailsDto
  /** Câu hiện tại đang practice (lấy audioStartMs/audioEndMs) */
  currentSentence?: ILLessonSentence
  /** Auto dừng video khi hết đoạn của câu */
  autoStop: boolean
  /** Kích thước video: large (420px) hoặc normal (280px) */
  largeVideo: boolean
  /** Auto play khi chuyển câu (chỉ hoạt động nếu user đã tương tác) */
  shouldAutoPlay?: boolean
  /** Callback khi user tương tác lần đầu */
  onUserInteracted?: (interacted: boolean) => void
}

/**
 * YouTubeShadowing Component - forwardRef để component cha điều khiển
 */
const YouTubeShadowing = forwardRef<ShadowingPlayerRef, YouTubeShadowingProps>(
  ({ lesson, currentSentence, autoStop, largeVideo, shouldAutoPlay = false, onUserInteracted }, ref) => {
    // ========== REFS ==========
    /** Ref tới YouTube player instance (từ react-youtube) */
    const playerRef = useRef<any>(null)
    
    /**
     * Ref cho auto-stop timeout
     * Lý do dùng timeout thay vì interval:
     * - Hiệu quả hơn (không poll liên tục)
     * - Chính xác hơn (tính toán 1 lần)
     * - Ít tốn tài nguyên hơn
     */
    const timeoutRef = useRef<number | null>(null)
    
    // ========== STATE ==========
    /** YouTube player đã ready chưa (iframe loaded) */
    const [isReady, setIsReady] = useState(false)
    /** User đã click "Bắt đầu" chưa */
    const [userInteracted, setUserInteracted] = useState(false)

    /**
     * Parse videoId từ YouTube URL
     * 
     * Hỗ trợ các format:
     * - https://www.youtube.com/watch?v=VIDEO_ID
     * - https://youtu.be/VIDEO_ID
     * - Hoặc trực tiếp VIDEO_ID
     * 
     * useMemo để tránh parse lại mỗi lần render
     */
    const videoId = useMemo(() => {
      if (!lesson.sourceUrl) return ""
      try {
        const u = new URL(lesson.sourceUrl)
        // Format: youtu.be/VIDEO_ID
        if (u.hostname.includes("youtu.be")) {
          return u.pathname.replace("/", "")
        }
        // Format: youtube.com/watch?v=VIDEO_ID
        const v = u.searchParams.get("v")
        if (v) return v
        // Fallback: có thể là VIDEO_ID trực tiếp
        return lesson.sourceUrl
      } catch {
        // Invalid URL, assume it's video ID
        return lesson.sourceUrl
      }
    }, [lesson.sourceUrl])

    /**
     * YouTube Player Options
     * 
     * playerVars:
     * - controls: 1 = hiển thị controls (play, volume, timeline)
     * - rel: 0 = không hiển thị related videos khi kết thúc
     * - modestbranding: 1 = ẩn logo YouTube (minimize branding)
     */
    const opts: YouTubeProps["opts"] = {
      width: "100%",
      height: largeVideo ? "420" : "280",  // Dynamic height theo largeVideo prop
      playerVars: {
        controls: 1,
        rel: 0,
        modestbranding: 1,
      },
    }

    /**
     * Callback khi YouTube player ready
     * - Lưu player instance vào ref
     * - Set isReady = true để enable các controls
     */
    const onReady: YouTubeProps["onReady"] = (event) => {
      playerRef.current = event.target
      setIsReady(true)
    }

    /**
     * Clear timeout của auto-stop
     * Gọi khi:
     * - User tương tác (play/pause/seek)
     * - Đổi câu
     * - Component unmount
     */
    const clearAutoStopTimeout = useCallback(() => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }, [])

    /**
     * Đặt timeout để auto-stop video tại audioEndMs
     * 
     * Strategy:
     * 1. Tính endSec = audioEndMs + PADDING_SEC (thêm 0.1s)
     * 2. Lấy currentTime (từ startFrom param hoặc getCurrentTime())
     * 3. Tính remainingMs = (endSec - currentTime) * 1000
     * 4. Set timeout sau remainingMs milliseconds
     * 5. Khi timeout trigger: pause video
     * 
     * @param startFrom - Optional: thời gian hiện tại (dùng khi vừa seek)
     *                    Nếu không truyền, sẽ gọi player.getCurrentTime()
     * 
     * Lý do có param startFrom:
     * - Sau khi seekTo(), getCurrentTime() có thể chưa update ngay
     * - Truyền startFrom để tính chính xác hơn
     * 
     * Lý do dùng timeout thay vì timeupdate:
     * - timeupdate fire rất nhiều lần (mỗi ~250ms)
     * - Timeout chỉ fire 1 lần, chính xác, ít tốn tài nguyên
     */
    const startAutoStop = useCallback((startFrom?: number) => {
      // Guard: chỉ chạy nếu autoStop được bật
      if (!autoStop) {
        return
      }

      // Guard: phải có currentSentence
      if (!currentSentence) {
        return
      }

      // Guard: player phải sẵn sàng
      const player = playerRef.current
      if (!player) {
        return
      }

      // Tính endSec với padding
      const rawEndSec = (currentSentence.audioEndMs ?? 0) / 1000
      const endSec = rawEndSec + PADDING_SEC

      // Lấy currentTime: từ param hoặc từ player
      let now = 0
      if (typeof startFrom === "number") {
        // Dùng startFrom nếu có (thường sau khi seekTo)
        now = startFrom
      } else if (typeof player.getCurrentTime === "function") {
        // Gọi getCurrentTime() nếu không có startFrom
        const t = player.getCurrentTime()
        if (typeof t === "number" && isFinite(t)) {
          now = t
        }
      }

      // Tính thời gian còn lại đến endSec (milliseconds)
      const remainingMs = Math.max((endSec - now) * 1000, 0)

      // Clear timeout cũ (nếu có)
      clearAutoStopTimeout()

      // Set timeout mới
      timeoutRef.current = window.setTimeout(() => {
        const p = playerRef.current
        if (!p) return
        p.pauseVideo()
        clearAutoStopTimeout()
      }, remainingMs)
    }, [autoStop, currentSentence, clearAutoStopTimeout])

    /**
     * Play segment của câu hiện tại từ đầu
     * 
     * Flow:
     * 1. Guard: kiểm tra player, currentSentence, userInteracted
     * 2. Clear timeout cũ (nếu có)
     * 3. Tính startSec = audioStartMs - PADDING_SEC (lùi 0.1s)
     * 4. seekTo(startSec, true) - true = allowSeekAhead
     * 5. playVideo()
     * 6. Nếu autoStop: start auto-stop timeout từ startSec
     * 
     * Lý do lùi PADDING_SEC:
     * - Tránh miss phần đầu của câu
     * - Smooth transition, không đột ngột
     */
    const playCurrentSegment = useCallback(() => {
      if (!playerRef.current || !currentSentence || !userInteracted) return

      clearAutoStopTimeout()

      const rawStartSec = (currentSentence.audioStartMs ?? 0) / 1000
      const startSec = Math.max(rawStartSec - PADDING_SEC, 0) // Không cho âm

      playerRef.current.seekTo(startSec, true)
      playerRef.current.playVideo()

      if (autoStop) {
        // Truyền startSec để tính chính xác (getCurrentTime chưa kịp update)
        startAutoStop(startSec)
      }
    }, [currentSentence, autoStop, userInteracted, clearAutoStopTimeout, startAutoStop])

    /**
     * Tiếp tục play từ vị trí hiện tại (không seek)
     * Dùng khi user click Play button
     */
    const play = useCallback(() => {
      if (!playerRef.current || !userInteracted) return

      clearAutoStopTimeout()
      playerRef.current.playVideo()

      if (autoStop && currentSentence) {
        // Không truyền startFrom, để getCurrentTime() tự lấy
        startAutoStop()
      }
    }, [autoStop, currentSentence, userInteracted, clearAutoStopTimeout, startAutoStop])

    /**
     * Pause video
     * Clear timeout để không auto-stop nữa
     */
    const pause = useCallback(() => {
      if (!playerRef.current) return
      playerRef.current.pauseVideo()
      clearAutoStopTimeout()
    }, [clearAutoStopTimeout])

    /**
     * Expose methods cho component cha thông qua ref
     * Component cha có thể gọi: playerRef.current.play(), pause(), etc.
     */
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

    /**
     * Auto play segment khi đổi câu
     * 
     * Conditions (tất cả phải true):
     * - isReady: YouTube player đã load xong
     * - currentSentence: có câu để play
     * - userInteracted: user đã click "Bắt đầu"
     * - shouldAutoPlay: flag từ component cha (false khi user click chọn câu)
     * 
     * Dependencies:
     * - currentSentence?.id: chỉ trigger khi ID thay đổi (tránh re-run khi re-render)
     */
    useEffect(() => {
      if (!isReady || !currentSentence || !userInteracted || !shouldAutoPlay) return

      playCurrentSegment()
    }, [isReady, currentSentence?.id, userInteracted, shouldAutoPlay, playCurrentSegment])

    /**
     * Effect xử lý khi autoStop toggle on/off
     * 
     * Case 1: autoStop = false
     * - Clear timeout để không auto-stop nữa
     * 
     * Case 2: autoStop = true và video đang playing
     * - Start lại auto-stop từ currentTime
     * - getPlayerState() === 1 nghĩa là đang playing
     */
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

    /**
     * CRITICAL CLEANUP - Cleanup YouTube player khi unmount
     * 
     * Vấn đề nếu không cleanup:
     * - YouTube iframe vẫn còn trong DOM (memory leak)
     * - Event listeners vẫn hoạt động
     * - Video có thể vẫn chạy ở background
     * 
     * Solution:
     * 1. Clear timeout
     * 2. Pause video
     * 3. Gọi player.destroy() để remove iframe và cleanup event listeners
     * 4. Set ref = null
     * 
     * Note: destroy() là method của YouTube IFrame API
     */
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
    
    /**
     * Force cleanup khi tab bị ẩn (user chuyển tab hoặc minimize browser)
     * 
     * Lý do:
     * - Tiết kiệm tài nguyên
     * - Tránh video chạy khi user không xem
     * - Clear timeout để không có surprise auto-stop khi quay lại
     * 
     * Event: visibilitychange
     * - document.hidden = true: tab bị ẩn
     * - document.hidden = false: tab được focus lại
     */
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Page is hidden, pause and cleanup
          if (playerRef.current) {
            try {
              playerRef.current.pauseVideo()
            } catch (e) {
              // Ignore errors (player có thể đã destroyed)
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

    // ========== RENDER ==========
    return (
      <div className="w-full overflow-hidden rounded-xl border bg-black relative shadow-lg">
        {/* YouTube player component từ react-youtube */}
        <YouTube videoId={videoId} opts={opts} onReady={onReady} />
        
        {/* Badge indicator hiển thị "YouTube" - chỉ hiện khi chưa tương tác */}
        {!userInteracted && isReady && (
          <div className="absolute top-3 right-3 z-10">
            <Badge variant="secondary" className="gap-1 text-xs bg-black/60 backdrop-blur-sm">
              <Video className="h-3 w-3" />
              YouTube
            </Badge>
          </div>
        )}
        
        {/* 
          Overlay "Bắt đầu" Button
          
          Mục đích:
          - Comply với browser autoplay policy (user phải tương tác trước)
          - User-friendly: clear call-to-action
          
          Hiển thị khi:
          - !userInteracted: user chưa click
          - isReady: player đã load xong
          
          Ẩn sau khi:
          - User click "Bắt đầu"
        */}
        {!userInteracted && isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/40 via-black/60 to-black/80 backdrop-blur-[1px]">
            <div className="text-center space-y-3">
             
              <Button
                size="lg"
                onClick={() => {
                  // 1. Set user interaction flags
                  setUserInteracted(true)
                  onUserInteracted?.(true)
                  
                  /**
                   * 2. Play ngay lập tức mà không đợi useEffect
                   * 
                   * Lý do không đợi useEffect:
                   * - UX tốt hơn (responsive ngay)
                   * - Tránh race condition với useEffect
                   * 
                   * setTimeout 100ms:
                   * - Đợi React re-render xong
                   * - Đợi userInteracted state update
                   * 
                   * Flow:
                   * 1. Clear timeout cũ
                   * 2. Tính startSec với padding
                   * 3. Seek và play
                   * 4. Sau 200ms: start auto-stop
                   *    (delay để player kịp seek và getCurrentTime chính xác)
                   */
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
                          startAutoStop() // Không truyền startFrom, để getCurrentTime() tự lấy
                        }, 200)
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
