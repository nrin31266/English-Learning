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
import { Volume2, Play, Pause } from "lucide-react"

type AudioShadowingProps = {
  lesson: ILLessonDetailsDto
  currentSentence?: ILLessonSentence
  autoStop: boolean
  shouldAutoPlay?: boolean
  onUserInteracted?: (interacted: boolean) => void
}

const formatTime = (secs: number) => {
  if (!secs || !isFinite(secs)) return "0:00"
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

const AudioShadowing = forwardRef<ShadowingPlayerRef, AudioShadowingProps>(
  ({ lesson, currentSentence, autoStop, shouldAutoPlay = false, onUserInteracted }, ref) => {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [userInteracted, setUserInteracted] = useState(false)

    const src =
      lesson.audioUrl ||
      currentSentence?.audioSegmentUrl ||
      ""

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
        if (
          autoStop &&
          currentSentence &&
          audio.currentTime >= currentSentence.audioEndMs / 1000
        ) {
          audio.pause()
          setIsPlaying(false)
        }
      }

      const onPlay = () => setIsPlaying(true)
      const onPause = () => setIsPlaying(false)
      const onEnded = () => setIsPlaying(false)

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

    // Hàm để user tương tác lần đầu
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

    const playCurrentSegment = useCallback(async () => {
      const audio = audioRef.current
      if (!audio || !currentSentence) return

      try {
        const startSec = currentSentence.audioStartMs / 1000
        audio.currentTime = startSec
        
        // Chỉ play nếu user đã tương tác
        if (userInteracted) {
          await audio.play()
          setIsPlaying(true)
        }
      } catch (error) {
        console.error("Play failed:", error)
      }
    }, [currentSentence, userInteracted])

    const play = useCallback(async () => {
      const audio = audioRef.current
      if (!audio) return

      try {
        if (userInteracted) {
          await audio.play()
          setIsPlaying(true)
        }
      } catch (error) {
        console.error("Play failed:", error)
      }
    }, [userInteracted])

    const pause = useCallback(() => {
      const audio = audioRef.current
      if (!audio) return
      audio.pause()
      setIsPlaying(false)
    }, [])

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

    // Auto play khi đổi câu - CHỈ KHI USER ĐÃ TƯƠNG TÁC VÀ shouldAutoPlay = true
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

    // Cleanup audio khi unmount
    useEffect(() => {
      return () => {
        const audio = audioRef.current
        if (audio) {
          audio.pause()
          audio.src = ""
        }
      }
    }, [])

    const progress =
      duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
      handleFirstInteraction()
      
      const audio = audioRef.current
      if (!audio || !duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = (e.clientX - rect.left) / rect.width
      const nextTime = duration * Math.min(Math.max(ratio, 0), 1)
      audio.currentTime = nextTime
    }

    return (
      <div className="w-full rounded-xl border bg-card px-4 py-3 relative">
        {/* hidden native audio */}
        <audio ref={audioRef} src={src} preload="metadata" />

        <div className="flex items-center gap-3 text-xs">
          <span className="w-[70px] text-right tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* progress bar */}
          <div
            className="relative flex-1 cursor-pointer rounded-full bg-muted/70"
            onClick={handleSeek}
          >
            <div
              className="h-1.5 rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

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

        {/* Overlay Start Button - Nhẹ nhàng hơn, không che thông tin */}
        {!userInteracted && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[0.8px]  rounded-xl">
            <Button
              size="default"
              onClick={() => {
                handleFirstInteraction()
                // Auto play first segment
                if (currentSentence) {
                  setTimeout(() => {
                    void playCurrentSegment()
                  }, 100)
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