// src/pages/shadowing/components/RecordingControls.tsx

import { Button } from "@/components/ui/button"
import { Spinner2 } from "@/components/ui/spinner2"
import { cn } from "@/lib/utils"
import { ArrowRight, Mic, Square, Volume2, X, Snail } from "lucide-react"
import { useState, useEffect } from "react"

interface RecordingControlsProps {
  isRecording: boolean
  isUploading: boolean
  hasRecordedAudio: boolean
  isPlayingRecorded: boolean
  userInteracted: boolean
  isCompleted: boolean // 👉 Đã thêm prop này từ Cha truyền xuống
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
  isCompleted,
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
    <div className="flex flex-col items-center w-full gap-2 mt-2">
      
      {/* KHU VỰC ĐIỀU KHIỂN (SỬ DỤNG ABSOLUTE LÀM CHUẨN ĐỂ NÚT GIỮA KHÔNG BỊ LỆCH) */}
      <div className="relative flex items-center justify-center w-full max-w-md mx-auto h-20 sm:h-24">
        
        {/* BÊN TRÁI: Các công cụ bổ trợ (Slow Mode, Play Recorded) */}
        <div className="absolute inset-y-0 left-0 right-[50%] flex flex-col sm:flex-row items-end sm:items-center justify-center gap-2 pr-10 sm:pr-14">
          
          {(!isRecording && !isUploading) && (
            <Button
              variant={isSlowMode ? "default" : "outline"}
              size="sm"
              className={cn("gap-1.5 px-3 h-9 rounded-full transition-all", 
                isSlowMode ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-transparent" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={onToggleSlowMode}
              disabled={!userInteracted}
              title="Add extra time for speaking slowly"
            >
              <Snail className="h-4 w-4" />
              <span className="hidden sm:inline">{isSlowMode ? "Slowed" : "Slow"}</span>
            </Button>
          )}

          {(hasRecordedAudio && !isRecording && !isUploading) && (
            <Button
              variant={isPlayingRecorded ? "default" : "outline"}
              size="sm"
              className={cn("gap-1.5 px-3 h-9 rounded-full transition-all",
                isPlayingRecorded ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={onTogglePlayRecorded}
            >
              <Volume2 className={cn("h-4 w-4", isPlayingRecorded && "animate-pulse")} /> 
              <span className="hidden sm:inline">{isPlayingRecorded ? "Stop" : "Play"}</span>
            </Button>
          )}
        </div>

        {/* GIỮA: Nút Record (Lớp z-10, tách biệt hoàn toàn với 2 bên) */}
        <div className="relative z-10 shrink-0">
          <button
            className={cn(
              "transform-gpu relative w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-lg transition-all duration-300 ease-out",
              "flex flex-col items-center justify-center will-change-transform border-[3px] overflow-hidden",
              isRecording
                ? "bg-red-500 border-red-400 hover:bg-red-600 shadow-red-500/30"
                : "bg-primary border-primary/20 hover:bg-primary/90 active:scale-95",
              (!userInteracted || isUploading) && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
            onClick={onRecordClick}
            disabled={isUploading || !userInteracted}
            style={{ transform: isRecording ? "scale(1.08)" : "scale(1)" }}
          >
            {isUploading ? (
              <Spinner2 className="h-6 w-6 sm:h-8 sm:w-8 text-white animate-spin" />
            ) : isRecording ? (
              <div className="flex flex-col items-center justify-center gap-1.5">
                <style>{`
                  @keyframes sound-wave {
                    0% { transform: scaleY(0.3); opacity: 0.7; }
                    50% { transform: scaleY(1); opacity: 1; }
                    100% { transform: scaleY(0.3); opacity: 0.7; }
                  }
                `}</style>
                <div className="flex items-end justify-center gap-[3px] h-5 sm:h-6 mt-1">
                  <div className="w-1.5 sm:w-2 bg-white rounded-full h-full origin-bottom animate-[sound-wave_0.9s_ease-in-out_infinite]" />
                  <div className="w-1.5 sm:w-2 bg-white rounded-full h-full origin-bottom animate-[sound-wave_1.2s_ease-in-out_infinite_0.2s]" />
                  <div className="w-1.5 sm:w-2 bg-white rounded-full h-full origin-bottom animate-[sound-wave_0.8s_ease-in-out_infinite_0.4s]" />
                  <div className="w-1.5 sm:w-2 bg-white rounded-full h-full origin-bottom animate-[sound-wave_1.1s_ease-in-out_infinite_0.1s]" />
                  <div className="w-1.5 sm:w-2 bg-white rounded-full h-full origin-bottom animate-[sound-wave_1s_ease-in-out_infinite_0.5s]" />
                </div>
                <Square className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-white text-white opacity-80" />
              </div>
            ) : (
              <Mic className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            )}

            {showRecordingEffect && (
              <span className="absolute inset-0 rounded-full border-[4px] border-white/20 animate-ping pointer-events-none" style={{ animationDuration: "1.5s" }} />
            )}
          </button>
        </div>

        {/* BÊN PHẢI: Nút Skip / Next (Đã được tháo khỏi mác hasRecordedAudio) */}
        <div className="absolute inset-y-0 left-[50%] right-0 flex flex-col sm:flex-row items-start sm:items-center justify-center gap-2 pl-10 sm:pl-14">
          {(!isRecording && !isUploading) && (
            <>
              {/* Nút Skip: Hiện khi chưa qua bài và cần bỏ qua */}
              {(shouldShowSkipButton && !shouldShowNextButton) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-3 h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-full font-medium"
                  onClick={onNext}
                >
                  <span className="hidden sm:inline">Skip</span> <X className="h-4 w-4" />
                </Button>
              )}
              
              {/* 👉 Nút Next: Hiện bất chấp Audio, miễn là has completed hoặc đủ điểm */}
              {shouldShowNextButton && (
                <Button 
                  size="sm"
                  className="gap-1.5 px-4 h-9 bg-green-600 hover:bg-green-700 text-white rounded-full font-semibold shadow-sm animate-in fade-in zoom-in duration-300" 
                  onClick={onNext}
                >
                  <span className="hidden sm:inline">Next</span> <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>

      </div>

      {/* VỊ TRÍ TEXT TRẠNG THÁI & THỜI GIAN CỐ ĐỊNH */}
      <div className="h-6 flex items-center justify-center w-full mt-1">
        {/* 👉 LOGIC MỚI: Nhắc nhở người dùng nhấn Play thay vì để mờ nhạt gây tưởng nhầm là lỗi */}
        {!userInteracted ? (
           <span className="text-xs sm:text-sm text-primary uppercase font-bold flex items-center gap-1">
             ▶ Play audio to start
           </span>
        ) : recordError ? (
          <span className="text-xs text-red-500 bg-red-50/80 px-3 py-1 rounded-full border border-red-200 shadow-sm">
            ⚠️ {recordError}
          </span>
        ) : isRecording ? (
          <span className="text-sm sm:text-base font-bold text-red-500 font-mono tracking-widest flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            00:{timeLeft.toString().padStart(2, '0')}
          </span>
        ) : isUploading ? (
          <span className="text-sm text-muted-foreground animate-pulse font-medium">⏳ Analyzing your voice...</span>
        ) : hasRecordedAudio ? (
          <span className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-1">
            Tap mic to try again <span className="text-primary/70">({defaultTime}s)</span>
          </span>
        ) : (
          <span className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-1">
            Tap to record <span className="text-primary/70">({defaultTime}s)</span>
          </span>
        )}
      </div>

    </div>
  )
}

export default RecordingControls