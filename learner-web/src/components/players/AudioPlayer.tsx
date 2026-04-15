import React, {
  forwardRef, useCallback, useEffect,
  useImperativeHandle, useRef, useState,
} from "react"
import type { ILessonDetailsResponse, ILessonSentenceDetailsResponse } from "@/types"
import type { PlayerRef } from "./types/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Music2 } from "lucide-react"

type AudioPlayerProps = {
  lesson: ILessonDetailsResponse
  currentSentence?: ILessonSentenceDetailsResponse
  autoStop: boolean
  autoPlayOnSentenceChange: boolean

  playbackRate?: number
  isPlaying: boolean
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>

  userInteracted: boolean                // 👈 thêm

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

    // Ưu tiên audioUrl của lesson, fallback về audioSegmentUrl của câu
    const src = lesson.audioUrl || currentSentence?.audioSegmentUrl || ""




    // Setup audio event listeners + auto-stop khi đến audioEndMs
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

    // // Browser policy: phải có user gesture trước khi play
    // const handleFirstInteraction = () => {
    //   if (!userInteracted) {
    //     setUserInteracted(true)
    //     onUserInteracted?.(true)
    //     audioRef.current?.load()
    //   }
    // }

    // Seek về audioStartMs rồi play, đợi readyState nếu chưa load xong
    const playCurrentSegment = useCallback(async () => {
      const audio = audioRef.current

      // 🔥 Thêm log để debug
      console.log("playCurrentSegment called:", {
        userInteracted, hasAudio: !!audio, hasSentence: !!currentSentence,
        autoStop, autoPlayOnSentenceChange
      })

      if (!audio || !currentSentence || !userInteracted) return

      if (!autoStop && !isPlayingRef.current) {
        console.log("Auto-stop disabled, playing without segment control")
        play().catch(console.error)
        return
      }
      try {
        // 🔥 clear timeout cũ
        if (stopTimeoutRef.current) {
          clearTimeout(stopTimeoutRef.current)
          stopTimeoutRef.current = null
        }

        // 🔥 luôn pause trước để tránh bug "nhích"
        audio.pause()

        // 🔥 đảm bảo audio đã load
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

        // 🔥 set time + speed
        audio.currentTime = start
        audio.playbackRate = playbackRate || 1

        await new Promise(resolve => setTimeout(resolve, 30)) // nhẹ thôi 

        await audio.play()
        setIsPlaying(true)

        // 🔥 tính duration CHUẨN theo speed
        const duration = (end - start) / (playbackRate || 1)

        stopTimeoutRef.current = setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = end // clamp
            audioRef.current.pause()
            setIsPlaying(false)
          }
        }, duration * 1000)

      } catch (error) {
        console.error("Play failed:", error)
      }
    }, [currentSentence, playbackRate, userInteracted, autoStop,])

    // Play tiếp từ vị trí hiện tại
    const play = useCallback(async () => {
      const audio = audioRef.current
      if (!audio || isPlayingRef.current || !userInteracted) return

      try {
        isPlayingRef.current = true
        audio.playbackRate = playbackRate || 1

        if (autoStop && currentSentence) {

          const end = currentSentence.audioEndMs / 1000 + END_PADDING

          // nếu đã qua end → replay
          if (audio.currentTime >= end) {
            isPlayingRef.current = false
            return playCurrentSegment()
          }

          // Clear timeout cũ
          if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current)
            stopTimeoutRef.current = null
          }

          // tính thời gian còn lại
          const remaining = (end - audio.currentTime) / (playbackRate || 1)

          stopTimeoutRef.current = setTimeout(() => {
            const audio = audioRef.current
            if (!audio) return

            audio.pause()
            audio.currentTime = end // clamp

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

    useEffect(() => {
      if (!autoStop && stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current)
        stopTimeoutRef.current = null
      }
    }, [autoStop])

    const pause = useCallback(() => {
      const audio = audioRef.current
      if (!audio) return

      // 🔥 Clear timeout khi pause để tránh auto-stop sau khi đã dừng
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current)
        stopTimeoutRef.current = null
      }

      audio.pause()
      isPlayingRef.current = false
      setIsPlaying(false)
    }, [])

    // const togglePlay = async () => {
    //   if (!audioRef.current) return
    //   try {
    //     if (isPlaying) pause()
    //     else await play()
    //   } catch (error) {
    //     console.error("Toggle play failed:", error)
    //   }
    // }

    useImperativeHandle(ref, () => ({
      playCurrentSegment, play, pause,
      getUserInteracted: () => userInteracted,
    }), [playCurrentSegment, play, pause, userInteracted])

    // Auto play khi đổi câu (chỉ khi userInteracted + shouldAutoPlay)
    useEffect(() => {
      console.log("CurrentS Id:", currentSentence?.id, "User Interacted:", userInteracted,
        "AutoPlayOnSentenceChange:", autoPlayOnSentenceChange)
      if (!currentSentence || !userInteracted || !autoPlayOnSentenceChange) return
      playCurrentSegment().catch(console.error)
    }, [currentSentence?.id, userInteracted, autoPlayOnSentenceChange])

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
        if (stopTimeoutRef.current) {
          clearTimeout(stopTimeoutRef.current)
        }
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
      // handleFirstInteraction()
      const audio = audioRef.current
      if (!audio || !duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      audio.currentTime = duration * Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    }

    return (
      <div className="w-full rounded-xl bg-gradient-to-br from-card via-card to-primary/5 px-4 py-3 relative ">
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

        <div className="flex flex-nowrap gap-3 text-xs items-center">
          <p className="w-max text-nowrap text-left tabular-nums font-semibold">
            {formatTime(currentTime)} / {formatTime(duration)}
          </p>

          <div className="flex items-center text-xs w-full relative">
            <div
              className="relative flex-1 border cursor-pointer rounded-full bg-muted/70 hover:bg-muted transition-colors"
              onClick={handleSeek}
            >
              <div
                className="h-1.5 rounded-full  bg-gradient-to-r from-primary to-primary/60 transition-all shadow-sm"
                style={{ width: `${progress}%` }}
              />
              {isPlaying && (
                <div
                  className="absolute top-0 h-1.5 rounded-full bg-primary/30 animate-pulse"
                  style={{ width: `${progress}%` }}
                />
              )}
            </div>

  
            {!userInteracted && <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[0.8px] rounded-xl" />}
          </div>
        </div>

      </div>
    )
  }
)

AudioPlayer.displayName = "AudioShadowing"
export default AudioPlayer