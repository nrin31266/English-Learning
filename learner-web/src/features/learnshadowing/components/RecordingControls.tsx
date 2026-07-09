// src/pages/shadowing/components/RecordingControls.tsx

import { Button } from "@/components/ui/button"
import { Spinner2 } from "@/components/ui/spinner2"
import { cn } from "@/lib/utils"
import { ArrowRight, Mic, Volume2, X, Snail } from "lucide-react"

interface RecordingControlsProps {
  isRecording: boolean
  isUploading: boolean
  hasRecordedAudio: boolean
  isPlayingRecorded: boolean
  userInteracted: boolean
  shouldShowSkipButton: boolean
  shouldShowNextButton: boolean
  recordError: string | null
  timeLeft: number
  defaultTime: number
  isSlowMode: boolean
  onToggleSlowMode: () => void
  onRecordClick: () => void
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
  timeLeft,
  defaultTime,
  isSlowMode,
  onToggleSlowMode,
  onRecordClick,
  onTogglePlayRecorded,
  onNext,
}: RecordingControlsProps) => {

  return (
    <div className="flex flex-col items-center w-full mt-2">
      
      {/* Định nghĩa CSS cho sóng âm */}
      <style>{`
        @keyframes sound-wave {
          0% { transform: scaleY(0.3); opacity: 0.7; }
          50% { transform: scaleY(1); opacity: 1; }
          100% { transform: scaleY(0.3); opacity: 0.7; }
        }
      `}</style>

      {/* KHU VỰC TOOLBAR: CHIA 3 KHỐI ĐỂ KHOÁ TÂM TUYỆT ĐỐI */}
      <div className="flex w-full items-center justify-between">
        
        {/* KHỐI TRÁI: Các nút phụ */}
        <div className="flex-1 flex justify-end items-center gap-1.5 sm:gap-2">
          {(!isRecording && !isUploading) && (
            <>
              <Button
                variant={isSlowMode ? "default" : "outline"}
                size="sm"
                className={cn("gap-1.5 px-2 sm:px-3 h-8 sm:h-9 transition-all font-medium", 
                  isSlowMode ? "bg-blue-600 hover:bg-blue-700 text-white border-transparent" : "text-muted-foreground hover:text-foreground border-border/60"
                )}
                onClick={onToggleSlowMode}
                disabled={!userInteracted}
                title="Add extra time for speaking slowly"
              >
                <Snail className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-[13px]">{isSlowMode ? "Slowed" : "Slow"}</span>
              </Button>

              {(hasRecordedAudio) && (
                <Button
                  variant={isPlayingRecorded ? "default" : "outline"}
                  size="sm"
                  className={cn("gap-1.5 px-2 sm:px-3 h-8 sm:h-9 transition-all font-medium",
                    isPlayingRecorded ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground border-border/60"
                  )}
                  onClick={onTogglePlayRecorded}
                >
                  <Volume2 className={cn("h-3.5 w-3.5", isPlayingRecorded && "animate-pulse")} /> 
                  <span className="hidden sm:inline text-[13px]">{isPlayingRecorded ? "Stop" : "Play"}</span>
                </Button>
              )}
            </>
          )}
        </div>

        {/* KHỐI GIỮA: NÚT RECORD */}
        <div className="shrink-0 mx-2 sm:mx-3">
          <Button
            onClick={onRecordClick}
            disabled={isUploading || (!userInteracted && !isRecording)}
            title="Tap or press Space to record"
            className={cn(
              "relative flex items-center justify-center transition-all duration-300 ease-in-out shadow-sm",
              "w-[140px] sm:w-[160px]",
              isRecording
                ? "bg-red-500 hover:bg-red-600 text-white" 
                : "bg-primary hover:bg-primary/90 text-primary-foreground",
              (!userInteracted || isUploading) && "opacity-50 grayscale cursor-not-allowed"
            )}
          >
            {!userInteracted ? (
              // 👉 Đã bỏ animate-pulse ở đây
              <span className="text-[13px] sm:text-[14px] font-bold tracking-wide">
                ▶ Play to start
              </span>
            ) : isUploading ? (
              <div className="flex items-center gap-2">
                <Spinner2 className="h-4 w-4 animate-spin drop-shadow-sm" />
                <span className="text-[13px] sm:text-[15px] font-semibold tracking-wide">Analyzing...</span>
              </div>
            ) : isRecording ? (
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="flex items-end justify-center gap-[3px] h-4">
                  <div className="w-[3px] bg-white rounded-full h-full origin-bottom animate-[sound-wave_0.9s_ease-in-out_infinite]" />
                  <div className="w-[3px] bg-white rounded-full h-full origin-bottom animate-[sound-wave_1.2s_ease-in-out_infinite_0.2s]" />
                  <div className="w-[3px] bg-white rounded-full h-full origin-bottom animate-[sound-wave_0.8s_ease-in-out_infinite_0.4s]" />
                  <div className="w-[3px] bg-white rounded-full h-full origin-bottom animate-[sound-wave_1.1s_ease-in-out_infinite_0.1s]" />
                </div>
                {/* 👉 Đã tăng font-extrabold và size lên một chút để thời gian siêu nổi bật */}
                <span className="font-mono font-extrabold tracking-widest text-[15px] sm:text-[17px]">
                  00:{timeLeft.toString().padStart(2, '0')}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 ">
                <Mic className="h-4 w-4 drop-shadow-sm shrink-0" />
                <span className="text-[13px] sm:text-[15px] font-semibold tracking-wide whitespace-nowrap">
                  {hasRecordedAudio ? "Try Again" : "Record"} 
                  <span className="font-bold ml-1">({defaultTime}s)</span>
                </span>
              </div>
            )}
          </Button>
        </div>

        {/* KHỐI PHẢI: Các nút điều hướng */}
        <div className="flex-1 flex justify-start items-center gap-1.5 sm:gap-2">
          {(!isRecording && !isUploading) && (
            <>
              {(shouldShowSkipButton && !shouldShowNextButton) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2 sm:px-3 h-8 sm:h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-semibold tracking-wide"
                  onClick={onNext}
                >
                  <span className="hidden sm:inline text-[13px]">Skip</span> <X className="h-3.5 w-3.5" />
                </Button>
              )}
              
              {shouldShowNextButton && (
                <Button 
                  size="sm"
                  className="gap-1.5 px-3 sm:px-4 h-8 sm:h-9 bg-green-600 text-white font-bold shadow-sm hover:bg-green-700 hover:shadow-md animate-in fade-in zoom-in duration-300 tracking-wide" 
                  onClick={onNext}
                >
                  <span className="hidden sm:inline text-[13px]">Next sentence</span> <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                </Button>
              )}
            </>
          )}
        </div>

      </div>

      {/* CHỈ HIỂN THỊ KHI CÓ LỖI */}
      {recordError && (
        <div className="flex items-center justify-center w-full mt-2 animate-in fade-in slide-in-from-bottom-1">
          <span className="text-[12px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-1 rounded-md border border-red-200 dark:border-red-900 shadow-sm font-medium tracking-wide">
            ⚠️ {recordError}
          </span>
        </div>
      )}

    </div>
  )
}

export default RecordingControls
