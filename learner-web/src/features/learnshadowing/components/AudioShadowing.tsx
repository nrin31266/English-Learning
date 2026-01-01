/**
 * Component AudioShadowing.tsx
 * 
 * Mục đích:
 * - Media player cho audio files (không phải YouTube)
 * - Hỗ trợ phát từng đoạn audio của câu (audio segment)
 * - Auto-stop khi hết đoạn audio của câu hiện tại
 * - Expose ref để component cha điều khiển (play/pause/seek)
 * 
 * Tính năng chính:
 * - Play/Pause audio
 * - Seek to specific time (click vào progress bar)
 * - Auto-play khi chuyển câu (nếu user đã tương tác)
 * - Auto-stop tại audioEndMs của câu (nếu autoStop = true)
 * - Progress bar với animation
 * - Time display (current / duration)
 * - Overlay "Bắt đầu" để user tương tác lần đầu (yêu cầu của browser)
 * 
 * Browser Autoplay Policy:
 * - Browser không cho phép auto-play audio/video cho đến khi user tương tác
 * - Component này yêu cầu user click "Bắt đầu" trước
 * - Sau đó mới có thể auto-play khi chuyển câu
 * 
 * Ref Interface (ShadowingPlayerRef):
 * - playCurrentSegment(): seek về đầu câu và play
 * - play(): tiếp tục play từ vị trí hiện tại
 * - pause(): pause audio
 * - getUserInteracted(): kiểm tra user đã click "Bắt đầu" chưa
 * 
 * Critical cleanup:
 * - Cleanup audio element khi unmount để tránh memory leak
 * - Pause khi tab bị ẩn (visibilitychange)
 * - Cleanup khi F5 hoặc navigate (beforeunload)
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import type { ILLessonDetailsDto, ILLessonSentence } from "@/types"
import type { ShadowingPlayerRef } from "../types/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Volume2, Play, Pause, Music2 } from "lucide-react"

/**
 * Props cho AudioShadowing component
 */
type AudioShadowingProps = {
  /** Lesson data chứa audioUrl và sentences */
  lesson: ILLessonDetailsDto
  /** Câu hiện tại đang practice (dùng để lấy audioStartMs/audioEndMs) */
  currentSentence?: ILLessonSentence
  /** Auto dừng khi hết đoạn audio của câu hiện tại */
  autoStop: boolean
  /** Auto play khi chuyển câu (chỉ hoạt động nếu user đã tương tác) */
  shouldAutoPlay?: boolean
  /** Callback khi user tương tác lần đầu */
  onUserInteracted?: (interacted: boolean) => void
}

/**
 * Helper function: Format giây thành MM:SS
 * @param secs - Số giây
 * @returns Chuỗi định dạng MM:SS
 */
const formatTime = (secs: number) => {
  if (!secs || !isFinite(secs)) return "0:00"
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

/**
 * AudioShadowing Component - forwardRef để component cha có thể điều khiển
 */
const AudioShadowing = forwardRef<ShadowingPlayerRef, AudioShadowingProps>(
  ({ lesson, currentSentence, autoStop, shouldAutoPlay = false, onUserInteracted }, ref) => {
    // ========== REFS ==========
    const audioRef = useRef<HTMLAudioElement | null>(null)  // Ref tới audio element
    const isPlayingRef = useRef(false)  // Track playing state (không trigger re-render)
    
    // ========== STATE ==========
    const [currentTime, setCurrentTime] = useState(0)    // Thời gian hiện tại của audio
    const [duration, setDuration] = useState(0)          // Tổng thời lượng audio
    const [isPlaying, setIsPlaying] = useState(false)    // Trạng thái đang play (cho UI)
    const [userInteracted, setUserInteracted] = useState(false)  // User đã click "Bắt đầu"

    /**
     * Xác định audio source:
     * - Ưu tiên lesson.audioUrl (file audio chính của lesson)
     * - Fallback: currentSentence.audioSegmentUrl (audio riêng của câu)
     */
    const src =
      lesson.audioUrl ||
      currentSentence?.audioSegmentUrl ||
      ""

    /**
     * Setup audio event listeners
     * 
     * Các events quan trọng:
     * - loadedmetadata: Khi audio load xong metadata (duration, etc.)
     * - timeupdate: Mỗi khi currentTime thay đổi (dùng để update progress bar)
     * - play/pause/ended: Track trạng thái playing
     * 
     * Auto-stop logic:
     * - Nếu autoStop = true và có currentSentence
     * - Kiểm tra currentTime có >= audioEndMs chưa
     * - Nếu có thì pause audio
     */
    useEffect(() => {
      const audio = audioRef.current
      if (!audio) return

      const onLoaded = () => {
        if (!isNaN(audio.duration)) {
          setDuration(audio.duration)
        }
      }

      const onTimeUpdate = () => {
        setCurrentTime(audio.currentTime)
        // Auto-stop khi đến audioEndMs của câu
        if (
          autoStop &&
          currentSentence &&
          audio.currentTime >= currentSentence.audioEndMs / 1000
        ) {
          audio.pause()
          setIsPlaying(false)
        }
      }

      const onPlay = () => {
        isPlayingRef.current = true
        setIsPlaying(true)
      }
      const onPause = () => {
        isPlayingRef.current = false
        setIsPlaying(false)
      }
      const onEnded = () => {
        isPlayingRef.current = false
        setIsPlaying(false)
      }

      audio.addEventListener("loadedmetadata", onLoaded)
      audio.addEventListener("timeupdate", onTimeUpdate)
      audio.addEventListener("play", onPlay)
      audio.addEventListener("pause", onPause)
      audio.addEventListener("ended", onEnded)

      return () => {
        audio.removeEventListener("loadedmetadata", onLoaded)
        audio.removeEventListener("timeupdate", onTimeUpdate)
        audio.removeEventListener("play", onPlay)
        audio.removeEventListener("pause", onPause)
        audio.removeEventListener("ended", onEnded)
      }
    }, [autoStop, currentSentence])

    /**
     * Handler cho user interaction lần đầu
     * 
     * Browser policy yêu cầu:
     * - User phải tương tác (click, tap) trước khi play audio/video
     * - Function này set flag userInteracted = true
     * - Trigger callback onUserInteracted để component cha biết
     * - Preload audio để sẵn sàng phát
     */
    const handleFirstInteraction = () => {
      if (!userInteracted) {
        setUserInteracted(true)
        onUserInteracted?.(true)
        // Có thể preload hoặc chuẩn bị audio ở đây
        const audio = audioRef.current
        if (audio) {
          audio.load()
        }
      }
    }

    /**
     * Play segment audio của câu hiện tại
     * 
     * Flow:
     * 1. Kiểm tra audio element và currentSentence có tồn tại
     * 2. Chỉ play nếu user đã tương tác (userInteracted = true)
     * 3. Đợi audio load metadata nếu chưa sẵn sàng (readyState < 2)
     * 4. Seek về audioStartMs của câu
     * 5. Delay 50ms để buffer kịp chuẩn bị
     * 6. Play audio
     * 
     * @throws Error nếu play failed (catch và log)
     */
    const playCurrentSegment = useCallback(async () => {
      const audio = audioRef.current
      if (!audio || !currentSentence) return

      try {
        const startSec = currentSentence.audioStartMs / 1000
        
        // Chỉ play nếu user đã tương tác
        if (userInteracted) {
          // Đợi audio load metadata trước khi seek
          if (audio.readyState < 2) {
            await new Promise((resolve) => {
              const onLoadedData = () => {
                audio.removeEventListener('loadeddata', onLoadedData)
                resolve(true)
              }
              audio.addEventListener('loadeddata', onLoadedData)
              audio.load()
            })
          }
          
          audio.currentTime = startSec
          // Delay ngắn để buffer kịp chuẩn bị
          await new Promise(resolve => setTimeout(resolve, 50))
          await audio.play()
          setIsPlaying(true)
        }
      } catch (error) {
        console.error("Play failed:", error)
      }
    }, [currentSentence, userInteracted])

    /**
     * Tiếp tục play từ vị trí hiện tại (không seek)
     */
    const play = useCallback(async () => {
      const audio = audioRef.current
      if (!audio || isPlayingRef.current) return

      try {
        if (userInteracted) {
          isPlayingRef.current = true
          await audio.play()
          setIsPlaying(true)
        }
      } catch (error) {
        console.error("Play failed:", error)
        isPlayingRef.current = false
      }
    }, [userInteracted])

    /**
     * Pause audio
     */
    const pause = useCallback(() => {
      const audio = audioRef.current
      if (!audio) return
      audio.pause()
      isPlayingRef.current = false
      setIsPlaying(false)
    }, [])

    /**
     * Toggle play/pause
     * Nếu có currentSentence thì play từ segment, không thì play bình thường
     */
    const togglePlay = async () => {
      handleFirstInteraction()
      
      const audio = audioRef.current
      if (!audio) return

      try {
        if (isPlaying) {
          pause()
        } else {
          // Nếu đang có currentSentence, play từ segment đó
          if (currentSentence) {
            await playCurrentSegment()
          } else {
            await play()
          }
        }
      } catch (error) {
        console.error("Toggle play failed:", error)
      }
    }

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
     * Auto play khi đổi câu - CHỈ KHI USER ĐÃ TƯƠNG TÁC VÀ shouldAutoPlay = true
     * 
     * Dependencies:
     * - currentSentence?.id: chỉ chạy khi ID câu thay đổi (tránh trigger khi re-render)
     * - userInteracted: phải đã tương tác mới được auto-play
     * - shouldAutoPlay: flag từ component cha (thường false khi user click chọn câu)
     */
    useEffect(() => {
      if (!currentSentence || !userInteracted || !shouldAutoPlay) return
      
      const autoPlaySegment = async () => {
        try {
          await playCurrentSegment()
        } catch (error) {
          console.error("Auto-play failed:", error)
        }
      }

      autoPlaySegment()
    }, [currentSentence?.id, userInteracted, shouldAutoPlay, playCurrentSegment])

    /**
     * CRITICAL CLEANUP - Cleanup audio khi unmount
     * 
     * Vấn đề nếu không cleanup:
     * - Audio element vẫn còn trong memory (memory leak)
     * - Event listeners vẫn hoạt động (waste resources)
     * - Audio có thể vẫn chạy sau khi component unmount
     * 
     * Solution:
     * - Pause audio
     * - Remove tất cả event listeners (set null)
     * - Clear audio source completely
     * - Reset audio element bằng load()
     */
    useEffect(() => {
      return () => {
        const audio = audioRef.current
        if (audio) {
          audio.pause()
          // Remove all event listeners
          audio.onloadedmetadata = null
          audio.ontimeupdate = null
          audio.onplay = null
          audio.onpause = null
          audio.onended = null
          audio.onerror = null
          // Clear source completely
          audio.removeAttribute('src')
          audio.load() // Reset audio element
          audio.src = ""
        }
        isPlayingRef.current = false
      }
    }, [])
    
    /**
     * Force cleanup khi tab bị ẩn (user chuyển tab hoặc minimize browser)
     * Lý do: tiết kiệm tài nguyên, tránh audio chạy ở background
     */
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.hidden && audioRef.current) {
          audioRef.current.pause()
          isPlayingRef.current = false
          setIsPlaying(false)
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }, [])
    
    /**
     * CRITICAL: Force cleanup khi F5 hoặc navigate
     * Lý do: browser có thể giữ audio element sau khi unload page
     */
    useEffect(() => {
      const handleBeforeUnload = () => {
        const audio = audioRef.current
        if (audio) {
          audio.pause()
          audio.src = ""
        }
      }
      
      window.addEventListener('beforeunload', handleBeforeUnload)
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }, [])

    /**
     * Tính progress % cho progress bar
     */
    const progress =
      duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

    /**
     * Handle click vào progress bar để seek
     * 
     * Flow:
     * 1. Trigger first interaction nếu chưa
     * 2. Tính ratio dựa trên vị trí click
     * 3. Set currentTime của audio
     */
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
      handleFirstInteraction()
      
      const audio = audioRef.current
      if (!audio || !duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = (e.clientX - rect.left) / rect.width
      const nextTime = duration * Math.min(Math.max(ratio, 0), 1)
      audio.currentTime = nextTime
    }

    // ========== RENDER ==========
    return (
      <div className="w-full rounded-xl border bg-gradient-to-br from-card via-card to-primary/5 px-4 py-3 relative shadow-sm">
        {/* Hidden native audio element */}
        <audio ref={audioRef} src={src} preload="metadata" />

        {/* Header với icon */}
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Music2 className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Audio Player</span>
          {/* Badge "Playing" với animation pulse khi đang phát */}
          {isPlaying && (
            <Badge variant="secondary" className="ml-auto text-[10px] animate-pulse">
              ● Playing
            </Badge>
          )}
        </div>

        {/* Controls: Time + Progress bar + Play button */}
        <div className="flex items-center gap-3 text-xs">
          {/* Time display (current / total) */}
          <span className="w-max text-right tabular-nums font-semibold ">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Progress bar với glow effect khi playing */}
          <div
            className="relative flex-1 cursor-pointer rounded-full bg-muted/70 hover:bg-muted transition-colors"
            onClick={handleSeek}
          >
            {/* Main progress bar */}
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all shadow-sm"
              style={{ width: `${progress}%` }}
            />
            {/* Animated glow khi playing */}
            {isPlaying && (
              <div
                className="absolute top-0 h-1.5 rounded-full bg-primary/30 animate-pulse"
                style={{ width: `${progress}%` }}
              />
            )}
          </div>

          {/* Play/Pause button */}
          <Button
            size="icon"
            variant="ghost"
            className="ml-1"
            type="button"
            onClick={togglePlay}
            disabled={!src}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Overlay "Bắt đầu" Button - Hiển thị khi user chưa tương tác */}
        {!userInteracted && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[0.8px]  rounded-xl">
            <Button
              size="default"
              onClick={async () => {
                handleFirstInteraction()
                // Đợi audio load và buffer trước khi play
                if (currentSentence) {
                  const audio = audioRef.current
                  if (audio) {
                    // Preload audio
                    audio.load()
                    // Đợi metadata load
                    await new Promise((resolve) => {
                      if (audio.readyState >= 2) {
                        resolve(true)
                      } else {
                        const onCanPlay = () => {
                          audio.removeEventListener('canplay', onCanPlay)
                          resolve(true)
                        }
                        audio.addEventListener('canplay', onCanPlay)
                      }
                    })
                  }
                  // Delay ngắn để đảm bảo buffer sẵn sàng
                  await new Promise(resolve => setTimeout(resolve, 150))
                  void playCurrentSegment()
                }
              }}
              className="gap-2 shadow-lg"
            >
              <Play className="h-5 w-5" />
              Bắt đầu
            </Button>
          </div>
        )}
      </div>
    )
  }
)

AudioShadowing.displayName = "AudioShadowing"

export default AudioShadowing