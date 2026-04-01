import React, {
  forwardRef, useCallback, useEffect,
  useImperativeHandle, useRef, useState,
} from "react"
import type { ILessonDetailsResponse, ILessonSentenceDetailsResponse } from "@/types"
import type { ShadowingPlayerRef } from "../types/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Music2 } from "lucide-react"

type AudioShadowingProps = {
  lesson: ILessonDetailsResponse
  currentSentence?: ILessonSentenceDetailsResponse
  autoStop: boolean
  shouldAutoPlay?: boolean
  onUserInteracted?: (interacted: boolean) => void,
   playbackRate?: number
}

const formatTime = (secs: number) => {
  if (!secs || !isFinite(secs)) return "0:00"
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}
const START_PADDING = 0.1
const END_PADDING = 0.05
const AudioShadowing = forwardRef<ShadowingPlayerRef, AudioShadowingProps>(
  ({ lesson, currentSentence, autoStop, shouldAutoPlay = false, onUserInteracted, playbackRate }, ref) => {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const isPlayingRef = useRef(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [userInteracted, setUserInteracted] = useState(false)
    
    // Ưu tiên audioUrl của lesson, fallback về audioSegmentUrl của câu
    const src = lesson.audioUrl || currentSentence?.audioSegmentUrl || ""

    // Setup audio event listeners + auto-stop khi đến audioEndMs
    useEffect(() => {
      const audio = audioRef.current
      if (!audio) return

      const onLoaded = () => { if (!isNaN(audio.duration)) setDuration(audio.duration) }

      const onTimeUpdate = () => {
        setCurrentTime(audio.currentTime)
        if (autoStop && currentSentence && audio.currentTime >= currentSentence.audioEndMs / 1000  + END_PADDING) {
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
    }, [autoStop, currentSentence])

    // Browser policy: phải có user gesture trước khi play
    const handleFirstInteraction = () => {
      if (!userInteracted) {
        setUserInteracted(true)
        onUserInteracted?.(true)
        audioRef.current?.load()
      }
    }

    // Seek về audioStartMs rồi play, đợi readyState nếu chưa load xong
    const playCurrentSegment = useCallback(async () => {
      const audio = audioRef.current
      if (!audio || !currentSentence || !userInteracted) return
      try {
        if (audio.readyState < 2) {
          await new Promise((resolve) => {
            const onLoadedData = () => { audio.removeEventListener("loadeddata", onLoadedData); resolve(true) }
            audio.addEventListener("loadeddata", onLoadedData)
            audio.load()
          })
        }
        audio.currentTime = Math.max(currentSentence.audioStartMs / 1000 - START_PADDING, 0)

        audio.playbackRate = playbackRate || 1
     

        await new Promise(resolve => setTimeout(resolve, 50)) // nhường buffer
        await audio.play()
        setIsPlaying(true)
      } catch (error) {
        console.error("Play failed:", error)
      }
    }, [currentSentence, userInteracted, playbackRate])

    // Play tiếp từ vị trí hiện tại
    const play = useCallback(async () => {
      const audio = audioRef.current
      if (!audio || isPlayingRef.current || !userInteracted) return
      try {
        isPlayingRef.current = true
        audio.playbackRate = playbackRate || 1
        await audio.play()
        setIsPlaying(true)
      } catch (error) {
        console.error("Play failed:", error)
        isPlayingRef.current = false
      }
    }, [userInteracted])

    const pause = useCallback(() => {
      const audio = audioRef.current
      if (!audio) return
      audio.pause()
      isPlayingRef.current = false
      setIsPlaying(false)
    }, [])

    const togglePlay = async () => {
      handleFirstInteraction()
      if (!audioRef.current) return
      try {
        if (isPlaying) pause()
        else if (currentSentence) await playCurrentSegment()
        else await play()
      } catch (error) {
        console.error("Toggle play failed:", error)
      }
    }

    useImperativeHandle(ref, () => ({
      playCurrentSegment, play, pause,
      getUserInteracted: () => userInteracted,
    }), [playCurrentSegment, play, pause, userInteracted])

    // Auto play khi đổi câu (chỉ khi userInteracted + shouldAutoPlay)
    useEffect(() => {
      if (!currentSentence || !userInteracted || !shouldAutoPlay) return
      playCurrentSegment().catch(console.error)
    }, [currentSentence?.id, userInteracted, shouldAutoPlay, playCurrentSegment])

    // Cleanup khi unmount: pause + clear source
    useEffect(() => {
      return () => {
        const audio = audioRef.current
        if (audio) {
          audio.pause()
          audio.onloadedmetadata = null
          audio.ontimeupdate = null
          audio.onplay = null
          audio.onpause = null
          audio.onended = null
          audio.onerror = null
          audio.removeAttribute("src")
          audio.load()
          audio.src = ""
        }
        isPlayingRef.current = false
      }
    }, [])

    // Pause khi tab ẩn
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

    // Pause khi F5 / navigate
    useEffect(() => {
      const handleBeforeUnload = () => {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = "" }
      }
      window.addEventListener("beforeunload", handleBeforeUnload)
      return () => window.removeEventListener("beforeunload", handleBeforeUnload)
    }, [])

    const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
      handleFirstInteraction()
      const audio = audioRef.current
      if (!audio || !duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      audio.currentTime = duration * Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    }

    return (
      <div className="w-full rounded-xl border bg-gradient-to-br from-card via-card to-primary/5 px-4 py-3 relative shadow-sm">
        <audio ref={audioRef} src={src} preload="metadata" />

        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Music2 className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Audio Player</span>
          {isPlaying && (
            <Badge variant="secondary" className="ml-auto text-[10px] animate-pulse">● Playing</Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="w-max text-right tabular-nums font-semibold">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div
            className="relative flex-1 cursor-pointer rounded-full bg-muted/70 hover:bg-muted transition-colors"
            onClick={handleSeek}
          >
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all shadow-sm"
              style={{ width: `${progress}%` }}
            />
            {isPlaying && (
              <div
                className="absolute top-0 h-1.5 rounded-full bg-primary/30 animate-pulse"
                style={{ width: `${progress}%` }}
              />
            )}
          </div>

          <Button size="icon" variant="ghost" className="ml-1" type="button" onClick={togglePlay} disabled={!src}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>

        {!userInteracted && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[0.8px] rounded-xl">
            <Button
              size="default"
              onClick={async () => {
                handleFirstInteraction()
                if (currentSentence) {
                  const audio = audioRef.current
                  if (audio) {
                    audio.load()
                    // Đợi canplay trước khi seek (tránh seek vào lúc chưa có data)
                    await new Promise((resolve) => {
                      if (audio.readyState >= 2) return resolve(true)
                      const onCanPlay = () => { audio.removeEventListener("canplay", onCanPlay); resolve(true) }
                      audio.addEventListener("canplay", onCanPlay)
                    })
                  }
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