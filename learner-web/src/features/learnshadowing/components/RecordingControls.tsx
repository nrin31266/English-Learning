import { Button } from "@/components/ui/button"
import { Spinner2 } from "@/components/ui/spinner2"
import { cn } from "@/lib/utils"
import { ArrowRight, Mic, Square, Volume2, X } from "lucide-react"
import { useState, useEffect } from "react"

interface RecordingControlsProps {
  isRecording: boolean
  isUploading: boolean
  hasRecordedAudio: boolean
  isPlayingRecorded: boolean
  userInteracted: boolean
  shouldShowSkipButton: boolean
  shouldShowNextButton: boolean
  recordError: string | null
  onPointerDown: () => void
  onPointerUp: () => void
  onPointerLeave: () => void
  onTogglePlayRecorded: () => void
  onNext: () => void
}

const RecordingControls = ({
  isRecording,
  isUploading,
  hasRecordedAudio,
  isPlayingRecorded,
  userInteracted,
  shouldShowSkipButton,
  shouldShowNextButton,
  recordError,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onTogglePlayRecorded,
  onNext,
}: RecordingControlsProps) => {
  // 👉 Dùng state để debounce animation
  const [showRecordingEffect, setShowRecordingEffect] = useState(false)

  useEffect(() => {
    if (isRecording) {
      const timer = setTimeout(() => setShowRecordingEffect(true), 50)
      return () => clearTimeout(timer)
    } else {
      setShowRecordingEffect(false)
    }
  }, [isRecording])

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex-col items-center w-full gap-2">
        <button
          className={cn(
            "touch-none transform-gpu relative w-16 h-16 rounded-full shadow-md transition-all duration-150 ease-out",
            "flex items-center justify-center will-change-transform",
            isRecording
              ? "bg-red-500 active:bg-red-600"
              : "bg-primary hover:bg-primary/90 active:scale-95",
            (!userInteracted || isUploading) && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
          onPointerCancel={onPointerLeave}
          onContextMenu={(e) => e.preventDefault()}
          disabled={isUploading || !userInteracted}
          style={{
            transform: isRecording ? "scale(1.02)" : "scale(1)",
            transition: "transform 0.1s cubic-bezier(0.2, 0.9, 0.4, 1.1)"
          }}
        >
          {isUploading ? (
            <Spinner2 className="h-5 w-5 text-white animate-spin" />
          ) : isRecording ? (
            <Square className="h-4 w-4 text-white fill-white" />
          ) : (
            <Mic className="h-5 w-5 text-white" />
          )}

          {/* 👇 Chỉ dùng 1 hiệu ứng nhẹ, không dùng ping */}
          {showRecordingEffect && (
            <span className="absolute inset-0 rounded-full bg-red-400/30 animate-pulse" style={{ animationDuration: "1s" }} />
          )}
        </button>

        <div className="text-center min-h-10">
          {isRecording ? (
            <p className="text-sm font-medium text-red-500">🔴 Recording...</p>
          ) : isUploading ? (
            <p className="text-sm text-muted-foreground">⏳ Analyzing...</p>
          ) : hasRecordedAudio ? (
            <p className="text-sm text-green-600">✅ Completed!</p>
          ) : (
            <p className="text-sm text-muted-foreground">🎤 Press and hold to record</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {hasRecordedAudio && (
            <Button
              size="sm"
              variant={isPlayingRecorded ? "default" : "outline"}
              disabled={isRecording || !userInteracted}
              className="gap-1.5 h-8 px-3"
              onClick={onTogglePlayRecorded}
            >
              <Volume2 className="h-3.5 w-3.5" />
              {isPlayingRecorded ? "Playing" : "Play"}
            </Button>
          )}

          {hasRecordedAudio && !isRecording && shouldShowSkipButton && (
            <Button
              variant="ghost"
              className="gap-1.5 h-8 px-3 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              onClick={onNext}
              size="sm"
            >
              <X className="h-3.5 w-3.5" />
              Skip
            </Button>
          )}

          {hasRecordedAudio && shouldShowNextButton && !isRecording && (
            <Button 
              className="gap-1.5 h-8 px-3 bg-green-600 hover:bg-green-700 text-white" 
              onClick={onNext} 
              size="sm"
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {recordError && (
          <div className="text-center text-xs text-red-500 bg-red-50/80 px-3 py-1 rounded-full">
            ⚠️ {recordError}
          </div>
        )}
      </div>
    </div>
  )
}

export default RecordingControls