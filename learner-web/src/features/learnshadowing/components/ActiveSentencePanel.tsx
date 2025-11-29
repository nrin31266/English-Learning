import React, { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Play,
  Pause,
  StepBack,
  StepForward,
  RotateCcw,
  Mic,
  Volume2,
  Square, // icon stop (lưu)
  X,      // icon cancel (hủy)
} from "lucide-react"
import handleAPI from "@/apis/handleAPI"
import type {
  ILLessonDetailsDto,
  ITranscriptionResponse,
  IShadowingWordCompare,
} from "@/types"
import SentenceDisplay from "./SentenceDisplay"
import { Spinner2 } from "@/components/ui/spinner2"
import Alert from "@/components/Alert"
import { cn } from "@/lib/utils"
import CircularProgressWithLabel from "@/components/CircularProgressWithLabelProps"
import ShadowingResultPanel from "./ShadowingResultPanel"

interface ActiveSentencePanelProps {
  lesson: ILLessonDetailsDto
  activeIndex: number
  onPrev: () => void
  onNext: () => void
  onReplay: () => void
  onPlay: () => void
  onPause: () => void
}

const ActiveSentencePanel = ({
  onPrev,
  onNext,
  onReplay,
  activeIndex,
  onPlay,
  onPause,
  lesson,
}: ActiveSentencePanelProps) => {
  // ─────────────── Recorder state ───────────────
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false)
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [recordError, setRecordError] = useState<string | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const cancelRecordingRef = useRef(false)

  const [transcription, setTranscription] =
    useState<ITranscriptionResponse | null>(null)
  // Check thẳng trên transcription
  const shouldShowNextButton = transcription && transcription?.shadowingResult?.weightedAccuracy >= 85
  const shouldShowSkipButton = transcription && !shouldShowNextButton
  const currentSentence = lesson.sentences[activeIndex]

  // Helper: màu cho từng status
  const getWordChipClasses = (
    compare: IShadowingWordCompare,
    lastRecognizedPosition: number
  ) => {
    const attempted = compare.position <= lastRecognizedPosition

    if (!attempted) {
      // Chưa đọc tới
      return "border border-dashed border-muted-foreground/30 text-muted-foreground/70 bg-muted/40"
    }

    switch (compare.status) {
      case "CORRECT":
        return "bg-emerald-50 text-emerald-800 border border-emerald-200"
      case "NEAR":
        return "bg-amber-50 text-amber-800 border border-amber-200"
      case "WRONG":
        return "bg-red-50 text-red-800 border border-red-200"
      case "MISSING":
        return "bg-slate-50 text-slate-500 border border-slate-200 italic"
      case "EXTRA":
        return "bg-blue-50 text-blue-800 border border-blue-200"
      default:
        return "bg-muted text-muted-foreground border border-muted"
    }
  }

  // Helper: chọn variant alert theo điểm
  const getAlertVariant = (score: number) => {
    if (score >= 85) return "success" as const
    if (score >= 60) return "warning" as const
    return "destructive" as const
  }

  useEffect(() => {
    // Reset khi đổi câu
    setIsRecording(false)
    setHasRecordedAudio(false)
    setIsPlayingRecorded(false)
    setIsUploading(false)
    setRecordError(null)
    setRecordedUrl((old) => {
      if (old) URL.revokeObjectURL(old)
      return null
    })
    setTranscription(null)
  }, [activeIndex]);

  // Bắt đầu ghi
  const startRecording = useCallback(async () => {
    setRecordError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordError("Trình duyệt không hỗ trợ ghi âm.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      cancelRecordingRef.current = false
      setHasRecordedAudio(false)
      setRecordedUrl((old) => {
        if (old) URL.revokeObjectURL(old)
        return null
      })
      // mỗi lần ghi mới => clear kết quả cũ để UI đỡ rối
      setTranscription(null)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // dừng stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }

        setIsRecording(false)

        const wasCancelled = cancelRecordingRef.current
        cancelRecordingRef.current = false

        // Nếu user bấm Cancel → không tạo blob, không upload, không giữ audio
        if (wasCancelled) {
          chunksRef.current = []
          setHasRecordedAudio(false)
          setRecordedUrl((old) => {
            if (old) URL.revokeObjectURL(old)
            return null
          })
          return
        }

        // ghép chunk -> blob
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(blob)
        setRecordedUrl((old) => {
          if (old) URL.revokeObjectURL(old)
          return url
        })
        setHasRecordedAudio(true)

        // Upload lên server
        try {
          setIsUploading(true)
          const expectedWords = currentSentence.lessonWords.map((w) => ({
            id: w.id,
            wordText: w.wordText,
            wordLower: w.wordLower,
            wordNormalized: w.wordNormalized,
            wordSlug: w.wordSlug,
            orderIndex: w.orderIndex,
          }))
          expectedWords.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))

          const formData = new FormData()
          formData.append("file", blob, "recording.webm")
          formData.append("expectedWords", JSON.stringify(expectedWords))
          formData.append("sentenceId", String(currentSentence.id))

          const data = await handleAPI<ITranscriptionResponse>({
            endpoint: "/lp/speech-to-text/transcribe",
            method: "POST",
            body: formData,
            isAuth: true,
            contentType: "multipart/form-data",
          })

          setTranscription(data)
        } catch (error) {
          console.log(error)
          setRecordError("Upload hoặc chuyển đổi audio thất bại.")
        } finally {
          setIsUploading(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error(error)
      setRecordError("Không thể truy cập micro. Vui lòng kiểm tra quyền.")
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      setIsRecording(false)
    }
  }, [currentSentence])

  // Dừng ghi (lưu & upload)
  const stopRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder) return

    cancelRecordingRef.current = false
    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop()
    }
  }, [])

  // Hủy ghi (dừng & KHÔNG lưu, KHÔNG upload)
  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder) return

    cancelRecordingRef.current = true
    chunksRef.current = []
    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop()
    }
  }, [])

  // Toggle record (start / stop-save)
  const handleToggleRecord = () => {
    if (!isRecording) {
      // Pause audio gốc nếu đang phát
      onPause()
      void startRecording()
    } else {
      stopRecording()
    }
  }

  // Nghe lại bản ghi
  const handleTogglePlayRecorded = () => {
    if (!hasRecordedAudio || !recordedUrl) return
    const player = audioPlayerRef.current
    if (!player) return

    if (!isPlayingRecorded) {
      player
        .play()
        .then(() => setIsPlayingRecorded(true))
        .catch((e) => {
          console.error("Play recorded audio error:", e)
          setRecordError("Không thể phát audio đã ghi.")
        })
    } else {
      player.pause()
      player.currentTime = 0
      setIsPlayingRecorded(false)
    }
  }

  // Khi audio recorded play xong → reset state
  useEffect(() => {
    const player = audioPlayerRef.current
    if (!player) return
    const onEnded = () => setIsPlayingRecorded(false)
    player.addEventListener("ended", onEnded)
    return () => {
      player.removeEventListener("ended", onEnded)
    }
  }, [])

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shadowing = transcription?.shadowingResult

  return (
    <ScrollArea className="min-h-0 flex-1 rounded-xl border bg-card">
      <div className="flex min-h-[260px] flex-col items-center justify-between gap-4 px-4 py-4">
        {/* Sentence text */}
        <div className="space-y-2 text-center w-full">
          <SentenceDisplay
            words={currentSentence?.lessonWords}
            fallbackText={
              currentSentence?.textDisplay || "No sentence available."
            }
            onWordClick={(word) => {
              console.log("Word clicked:", word)
            }}
            className="items-center"
          />
          {lesson.sentences.length > 0 && currentSentence.phoneticUk && (
            <p className="text-sm italic text-muted-foreground">
              {currentSentence.phoneticUk}
            </p>
          )}
        </div>

        {/* Transport controls */}
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              disabled={activeIndex === 0}
              onClick={onPrev}
            >
              <StepBack className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={onReplay}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button size="icon" className="shadow" onClick={onPlay}>
              <Play className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={onPause}>
              <Pause className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              disabled={activeIndex === lesson.sentences.length - 1}
              onClick={onNext}
            >
              <StepForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Record & playback recorded audio */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={isPlayingRecorded ? "default" : "outline"}
              disabled={!hasRecordedAudio || isRecording}
              className="gap-2"
              onClick={handleTogglePlayRecorded}
            >
              <Volume2 className="h-4 w-4" />
              {isPlayingRecorded
                ? "Stop recorded audio"
                : hasRecordedAudio
                  ? "Play recorded audio"
                  : "No recorded audio"}
            </Button>

            <Button
              size="sm"
              variant={isRecording ? "destructive" : "default"}
              className="gap-2"
              onClick={handleToggleRecord}
              disabled={isUploading}
            >
              {isUploading && <Spinner2 className="h-4 w-4" />}
              {isRecording ? (
                <>
                  <Square className="h-4 w-4" />
                  Stop & Save
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  {
                    transcription
                      ? "Re-record"
                      : "Start Recording"
                  }
                </>
              )}
            </Button>

            {/* Skip/Next buttons - chỉ hiện khi có kết quả */}
            {shouldShowSkipButton && (
              <Button
                variant="secondary"
                className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 "
                onClick={() => {
                  void onNext()
                }}
                size={"sm"}
              >
                <X />
                Skip this sentence
              </Button>
            )}

            {shouldShowNextButton && (
              <Button
                className="gap-2 bg-green-600 hover:bg-green-700 text-white "
                onClick={() => {
                  void onNext()
                }}
                size={"sm"}
              >
                <StepForward />
                Next sentence
              </Button>
            )}


            {/* Nút CANCEL: chỉ hiện khi đang thu */}
            {isRecording && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={cancelRecording}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>

          {/* Status text */}
          <div className="min-h-[1rem] text-center text-xs text-muted-foreground">
            {isRecording && "Recording..."}
            {!isRecording && isPlayingRecorded && "Playing recorded audio..."}
            {!isRecording &&
              !isPlayingRecorded &&
              hasRecordedAudio &&
              !isUploading &&
              "Recorded audio ready to play."}
            {isUploading && " Uploading & analyzing your recording..."}
            {recordError && (
              <div className="mt-1 text-xs text-destructive">
                {recordError}
              </div>
            )}
          </div>
        </div>

        {/* Shadowing result UI */}
        <div className="w-full">
         {shadowing && <ShadowingResultPanel result={shadowing} />}
        </div>

        {/* Hidden audio element để play bản ghi */}
        <audio ref={audioPlayerRef} src={recordedUrl ?? undefined} />
      </div>
    </ScrollArea>
  )
}

export default ActiveSentencePanel
