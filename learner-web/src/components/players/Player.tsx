import { forwardRef, useState } from "react"
import type { ILessonDetailsResponse, ILessonSentenceDetailsResponse } from "@/types"
import type { PlayerRef } from "./types/types"
import AudioPlayer from "./AudioPlayer"
import YouTubePlayer from "./YouTubePlayer"
import PlayerControlPanel from "./PlayerControlPanel"
import { useAppDispatch } from "@/store"
import { showNotification } from "@/store/system/notificationSlice"

interface PlayerProps {
  // Core data
  lesson: ILessonDetailsResponse
  currentSentence?: ILessonSentenceDetailsResponse
  
  // Playback controls
  autoStop?: boolean
  autoPlayOnSentenceChange: boolean
  playbackRate?: number
  isPlaying: boolean
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>
  
  // User interaction
  onUserInteracted?: (interacted: boolean) => void
  
  // YouTube specific (optional)
  largeVideo?: boolean
  
  // Navigation controls (optional, nếu không có thì dùng internal)
  onPrev?: () => void
  onNext?: () => void
  onReplay?: () => void
  onPlay?: () => void
  onPause?: () => void
  
  // Navigation state (optional)
  hasPrev?: boolean
  hasNext?: boolean
  
  // Settings callbacks (optional)
  onAutoStopChange?: (checked: boolean) => void
  onLargeVideoChange?: (checked: boolean) => void
  onPlaybackRateChange?: (rate: number) => void
  onShowShortcuts?: () => void

  // Progress Bar Toggle 👈 Thêm
  showProgress?: boolean
  onToggleProgress?: () => void
}

const Player = forwardRef<PlayerRef, PlayerProps>(
  ({ 
    // Core data
    lesson, 
    currentSentence, 
    
    // Playback controls
    autoStop = true, 
    autoPlayOnSentenceChange, 
    playbackRate = 1.0, 
    isPlaying, 
    setIsPlaying,
    
    // User interaction
    onUserInteracted,
    
    // YouTube specific
    largeVideo = false,
    
    // Navigation controls
    onPrev,
    onNext,
    onReplay,
    onPlay,
    onPause,
    
    // Navigation state
    hasPrev = true,
    hasNext = true,
    
    // Settings callbacks
    onAutoStopChange,
    onLargeVideoChange,
    onPlaybackRateChange,
    onShowShortcuts,

    // Progress Bar Toggle 👈 Thêm
    showProgress,
    onToggleProgress
  }, ref) => {
    // State to track if user has interacted with the player (for auto-play logic)
    const [userInteracted, setUserInteracted] = useState(false)
    // State to force fallback to audio player if YouTube fails (optional enhancement)
    const [forceAudioFallback, setForceAudioFallback] = useState(false)
    // Xử lý playback rate change
    const handlePlaybackRateChange = (rate: number) => {
      if (onPlaybackRateChange) {
        onPlaybackRateChange(rate)
      }
      // Playback rate sẽ được áp dụng bởi AudioPlayer/YouTubePlayer thông qua props
    }
    const dispatch = useAppDispatch()
    return (
      <div className="flex border rounded-2xl flex-col shadow gap-3 w-full bg-card overflow-hidden">
        {/* Media Player - tự động chọn dựa trên sourceType */}
        {lesson.sourceType === "YOUTUBE" && !forceAudioFallback ? (
          <YouTubePlayer
            ref={ref}
            lesson={lesson}
            currentSentence={currentSentence}
            autoStop={autoStop}
            largeVideo={largeVideo}
            autoPlayOnSentenceChange={autoPlayOnSentenceChange}
            playbackRate={playbackRate}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            userInteracted={userInteracted}
            onError={() => {
              setForceAudioFallback(true)
              dispatch(showNotification({
                variant: "error",
                title: "YouTube Playback Error",
                message: "Failed to load YouTube video. Switching to audio player.",
                durationMs: 5000,
              }))
            }} 
          />
        ) : (
          <AudioPlayer
            ref={ref}
            lesson={lesson}
            currentSentence={currentSentence}
            autoStop={autoStop}
            autoPlayOnSentenceChange={autoPlayOnSentenceChange}
            
            playbackRate={playbackRate}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            userInteracted={userInteracted}
          />
        )}
        
        {/* Control Panel */}
        <PlayerControlPanel
          userInteracted={userInteracted}
          onUserInteracted={()=>{
            setUserInteracted(true)
            onUserInteracted?.(true)
          }}
          // Transport controls
          onPrev={onPrev || (() => {})}
          onNext={onNext || (() => {})}
          onReplay={onReplay || (() => {
            if (ref && typeof ref === 'object' && ref.current) {
              ref.current.playCurrentSegment()
            }
          })}
          onPlay={onPlay || (() => {
            if (ref && typeof ref === 'object' && ref.current) {
              ref.current.play()
            }
          })}
          onPause={onPause || (() => {
            if (ref && typeof ref === 'object' && ref.current) {
              ref.current.pause()
            }
          })}
          isPlaying={isPlaying}
          disabled={false}
          hasPrev={hasPrev}
          hasNext={hasNext}
          
          // Settings
          autoStop={autoStop}
          onAutoStopChange={onAutoStopChange}
          sourceType={lesson.sourceType === "YOUTUBE" ? "YOUTUBE" : "AUDIO"}
          largeVideo={largeVideo}
          onLargeVideoChange={onLargeVideoChange}
          visableLargeVideoOption={lesson.sourceType === "YOUTUBE" && !forceAudioFallback}
          
          // Playback speed
          playbackRate={playbackRate}
          onPlaybackRateChange={handlePlaybackRateChange}
          
          // Shortcuts & Progress Toggle 👈 Thêm
          onShowShortcuts={onShowShortcuts}
          showProgress={showProgress}
          onToggleProgress={onToggleProgress}
        />
      </div>
    )
  }
)

Player.displayName = "Player"

export default Player