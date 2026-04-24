import { Button } from "@/components/ui/button"
import { Spinner2 } from "@/components/ui/spinner2"
import { cn } from "@/lib/utils"
import { ArrowRight, Mic, Square, Volume2, X } from "lucide-react"

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
  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex-col items-center w-full gap-2">
   <button
  className={cn(
    "touch-none relative w-16 h-16 rounded-full shadow-md transition-all duration-200",
    "flex items-center justify-center",
    isRecording
      ? "bg-red-500 hover:bg-red-600 scale-105"
      : "bg-primary hover:bg-primary/90",
    (!userInteracted || isUploading) && "opacity-50 cursor-not-allowed"
  )}
  onPointerDown={onPointerDown}
  onPointerUp={onPointerUp}
  onPointerLeave={onPointerLeave}
  onPointerCancel={onPointerLeave}
  onContextMenu={(e) => e.preventDefault()}
  disabled={isUploading || !userInteracted}
>
  {isUploading ? (
    <Spinner2 className="h-5 w-5 text-white" />
  ) : isRecording ? (
    <Square className="h-4 w-4 text-white fill-white" />
  ) : (
    <Mic className="h-5 w-5 text-white" />
  )}

  {/* 👇 pulse nhẹ - mềm mại hơn */}
  {isRecording && (
    <span className="absolute inset-0 rounded-full bg-red-400 opacity-20 animate-ping" style={{ animationDuration: "1.5s" }} />
  )}

  {/* 👇 ring mờ - nhịp chậm */}
  {isRecording && (
    <span className="absolute inset-0 rounded-full border border-red-300/50 opacity-0 animate-[pulseRing_1.5s_ease-in-out_infinite]" />
  )}
</button>

        <div className="text-center">
          {isRecording ? (
            <p className="text-sm font-medium text-red-500 animate-pulse">🔴 Recording... Release to stop</p>
          ) : isUploading ? (
            <p className="text-sm text-muted-foreground">⏳ Analyzing your pronunciation...</p>
          ) : hasRecordedAudio ? (
            <p className="text-sm text-green-600">✅ Recording completed!</p>
          ) : (
            <p className="text-sm text-muted-foreground">🎤 Press and hold to record, release to submit</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {hasRecordedAudio && (
            <Button
              size="sm"
              variant={isPlayingRecorded ? "default" : "outline"}
              disabled={isRecording || !userInteracted}
              className="gap-2"
              onClick={onTogglePlayRecorded}
            >
              <Volume2 className="h-4 w-4" />
              {isPlayingRecorded ? "Playing..." : "Play Recording"}
            </Button>
          )}

          {hasRecordedAudio && !isRecording && shouldShowSkipButton && (
            <Button
              variant="secondary"
              className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
              onClick={onNext}
              size="sm"
            >
              <X className="h-4 w-4" />
              Skip
            </Button>
          )}

          {hasRecordedAudio && shouldShowNextButton && !isRecording && (
            <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={onNext} size="sm">
              Next sentence
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {recordError && (
          <div className="text-center text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-full">⚠️ {recordError}</div>
        )}
      </div>
    </div>
  )
}

export default RecordingControls
