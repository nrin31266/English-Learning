import React, {
  forwardRef, useCallback, useEffect,
  useImperativeHandle, useRef, useState,
} from "react"
import type { ILessonDetailsResponse, ILessonSentenceDetailsResponse } from "@/types"
import type { PlayerRef } from "./types/types"
import { Music2 } from "lucide-react"
import { cn } from "@/lib/utils"

type AudioPlayerProps = {
  lesson: ILessonDetailsResponse
  currentSentence?: ILessonSentenceDetailsResponse
  autoStop: boolean
  autoPlayOnSentenceChange: boolean
  playbackRate?: number
  isPlaying: boolean
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>
  userInteracted: boolean
}

const formatTime = (secs: number) => {
  if (!secs || !isFinite(secs)) return "0:00"
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

const START_PADDING = 0.1
const END_PADDING = 0.05

const AudioPlayer = forwardRef<PlayerRef, AudioPlayerProps>(
  ({ lesson, currentSentence, autoStop, autoPlayOnSentenceChange,
    playbackRate, isPlaying, setIsPlaying, userInteracted }, ref) => {
    
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const isPlayingRef = useRef(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const src = lesson.audioUrl || currentSentence?.audioSegmentUrl || ""

    // --- GIỮ NGUYÊN LOGIC ---
    useEffect(() => {
      const audio = audioRef.current
      if (!audio) return
      const onLoaded = () => { if (!isNaN(audio.duration)) setDuration(audio.duration) }
      const onTimeUpdate = () => {
        setCurrentTime(audio.currentTime)
        if (autoStop && currentSentence && audio.currentTime >= currentSentence.audioEndMs / 1000 + END_PADDING) {
          audio.pause()
          setIsPlaying(false)
        }
      }
      const onPlay = () => { isPlayingRef.current = true; setIsPlaying(true) }
      const onPause = () => { isPlayingRef.current = false; setIsPlaying(false) }
      const onEnded = () => { isPlayingRef.current = false; setIsPlaying(false) }
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
    }, [currentSentence, autoStop])

    const playCurrentSegment = useCallback(async () => {
      const audio = audioRef.current
      if (!audio || !currentSentence || !userInteracted) return
      if (!autoStop && !isPlayingRef.current) {
        play().catch(console.error)
        return
      }
      try {
        if (stopTimeoutRef.current) {
          clearTimeout(stopTimeoutRef.current)
          stopTimeoutRef.current = null
        }
        audio.pause()
        if (audio.readyState < 2) {
          await new Promise((resolve) => {
            const onLoadedData = () => {
              audio.removeEventListener("loadeddata", onLoadedData)
              resolve(true)
            }
            audio.addEventListener("loadeddata", onLoadedData)
            audio.load()
          })
        }
        const start = Math.max(currentSentence.audioStartMs / 1000 - START_PADDING, 0)
        const end = currentSentence.audioEndMs / 1000 + END_PADDING
        audio.currentTime = start
        audio.playbackRate = playbackRate || 1
        await new Promise(resolve => setTimeout(resolve, 30))
        await audio.play()
        setIsPlaying(true)
        const duration = (end - start) / (playbackRate || 1)
        stopTimeoutRef.current = setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = end
            audioRef.current.pause()
            setIsPlaying(false)
          }
        }, duration * 1000)
      } catch (error) {
        console.error("Play failed:", error)
      }
    }, [currentSentence, playbackRate, userInteracted, autoStop])

    const play = useCallback(async () => {
      const audio = audioRef.current
      if (!audio || isPlayingRef.current || !userInteracted) return
      try {
        isPlayingRef.current = true
        audio.playbackRate = playbackRate || 1
        if (autoStop && currentSentence) {
          const end = currentSentence.audioEndMs / 1000 + END_PADDING
          if (audio.currentTime >= end) {
            isPlayingRef.current = false
            return playCurrentSegment()
          }
          if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current)
            stopTimeoutRef.current = null
          }
          const remaining = (end - audio.currentTime) / (playbackRate || 1)
          stopTimeoutRef.current = setTimeout(() => {
            const audio = audioRef.current
            if (!audio) return
            audio.pause()
            audio.currentTime = end
            setIsPlaying(false)
            isPlayingRef.current = false
          }, remaining * 1000)
        }
        await audio.play()
        setIsPlaying(true)
      } catch (error) {
        console.error("Play failed:", error)
        isPlayingRef.current = false
      }
    }, [userInteracted, currentSentence, playbackRate, playCurrentSegment, autoStop])

    const pause = useCallback(() => {
      const audio = audioRef.current
      if (!audio) return
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current)
        stopTimeoutRef.current = null
      }
      audio.pause()
      isPlayingRef.current = false
      setIsPlaying(false)
    }, [])

    useImperativeHandle(ref, () => ({
      playCurrentSegment, play, pause,
      getUserInteracted: () => userInteracted,
    }), [playCurrentSegment, play, pause, userInteracted])

    useEffect(() => {
      if (!currentSentence || !userInteracted || !autoPlayOnSentenceChange) return
      playCurrentSegment().catch(console.error)
    }, [currentSentence?.id, userInteracted, autoPlayOnSentenceChange])

    useEffect(() => {
      return () => {
        const audio = audioRef.current
        if (audio) {
          audio.pause()
          audio.removeAttribute("src")
          audio.load()
        }
        if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current)
      }
    }, [])

    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.hidden && audioRef.current) {
          audioRef.current.pause()
          isPlayingRef.current = false
          setIsPlaying(false)
        }
      }
      document.addEventListener("visibilitychange", handleVisibilityChange)
      return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
    }, [])

    // --- UI REFACTORED: SIÊU GỌN ---
    const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current
      if (!audio || !duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      audio.currentTime = duration * Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    }

    return (
      <div className="w-full rounded-xl bg-card border p-3">
        <audio ref={audioRef} src={src} preload="metadata" />

        {/* Header: Chỉ icon và Title */}
        <div className="flex items-center gap-1.5 mb-2.5 opacity-80">
          <Music2 className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Audio Track
          </span>
        </div>

        {/* Main Row: Time + Progress Bar */}
        <div className="flex items-center gap-3">
          {/* Số giây */}
          <div className="min-w-[75px] text-[11px] font-bold tabular-nums text-foreground/90">
            {formatTime(currentTime)} <span className="text-muted-foreground/50 mx-0.5">/</span> {formatTime(duration)}
          </div>

          {/* Thanh Tiến trình */}
          <div className="relative flex-1 h-1.5">
            <div
              className="relative w-full h-full cursor-pointer rounded-full bg-muted/60 hover:bg-muted transition-colors"
              onClick={handleSeek}
            >
              {/* Fill Progress */}
              <div
                className={cn(
                  "h-full rounded-full bg-primary transition-all duration-100 ease-linear",
                  isPlaying && "shadow-[0_0_8px_rgba(var(--primary),0.4)]"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Lock Overlay khi chưa tương tác */}
            {!userInteracted && (
              <div className="absolute inset-0 bg-background/40 backdrop-blur-[0.5px] rounded-full" />
            )}
          </div>
        </div>
      </div>
    )
  }
)

AudioPlayer.displayName = "AudioShadowing"
export default AudioPlayer