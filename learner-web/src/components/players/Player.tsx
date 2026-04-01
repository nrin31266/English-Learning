// src/components/players/Player.tsx
import { forwardRef } from "react"
import type { ILessonDetailsResponse, ILessonSentenceDetailsResponse } from "@/types"
import type { PlayerRef } from "./types/types"
import AudioPlayer from "./AudioPlayer"
import YouTubePlayer from "./YouTubePlayer"
import PlayerControlPanel from "./PlayerControlPanel"

interface PlayerProps {
  // Core data
  lesson: ILessonDetailsResponse
  currentSentence?: ILessonSentenceDetailsResponse
  
  // Playback controls
  autoStop?: boolean
  shouldAutoPlay?: boolean
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
}

const Player = forwardRef<PlayerRef, PlayerProps>(
  ({ 
    // Core data
    lesson, 
    currentSentence, 
    
    // Playback controls
    autoStop = true, 
    shouldAutoPlay = false, 
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
  }, ref) => {
    
    // Xử lý playback rate change
    const handlePlaybackRateChange = (rate: number) => {
      if (onPlaybackRateChange) {
        onPlaybackRateChange(rate)
      }
      // Playback rate sẽ được áp dụng bởi AudioPlayer/YouTubePlayer thông qua props
    }
    
    return (
      <div className="flex border rounded-2xl flex-col shadow gap-3 w-full">
        {/* Media Player - tự động chọn dựa trên sourceType */}
        {lesson.sourceType === "YOUTUBE" ? (
          <YouTubePlayer
            ref={ref}
            lesson={lesson}
            currentSentence={currentSentence}
            autoStop={autoStop}
            largeVideo={largeVideo}
            shouldAutoPlay={shouldAutoPlay}
            onUserInteracted={onUserInteracted}
            playbackRate={playbackRate}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
          />
        ) : (
          <AudioPlayer
            ref={ref}
            lesson={lesson}
            currentSentence={currentSentence}
            autoStop={autoStop}
            shouldAutoPlay={shouldAutoPlay}
            onUserInteracted={onUserInteracted}
            playbackRate={playbackRate}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
          />
        )}
        
        {/* Control Panel */}
        <PlayerControlPanel
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
          
          // Playback speed
          playbackRate={playbackRate}
          onPlaybackRateChange={handlePlaybackRateChange}
          
          // Shortcuts
          onShowShortcuts={onShowShortcuts}
        />
      </div>
    )
  }
)

Player.displayName = "Player"

export default Player