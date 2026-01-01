import handleAPI from "@/apis/handleAPI"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner2 } from "@/components/ui/spinner2"
import type {
  ILLessonDetailsDto,
  ITranscriptionResponse
} from "@/types"
import {
  Mic,
  Pause,
  Play,
  RotateCcw,
  Square,
  StepBack,
  StepForward,
  Volume2, // icon stop (lưu)
  X, // icon cancel (hủy)
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import SentenceDisplay from "./SentenceDisplay"
import ShadowingResultPanel from "./ShadowingResultPanel"

interface ActiveSentencePanelProps {
  lesson: ILLessonDetailsDto
  activeIndex: number
  onPrev: () => void
  onNext: () => void
  onReplay: () => void
  onPlay: () => void
  onPause: () => void
  userInteracted?: boolean
}

const ActiveSentencePanel = ({
  onPrev,
  onNext,
  onReplay,
  activeIndex,
  onPlay,
  onPause,
  lesson,
  userInteracted = false,
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
  
  // Memoize current sentence to prevent unnecessary re-renders
  const currentSentence = useMemo(
    () => lesson.sentences[activeIndex],
    [lesson.sentences, activeIndex]
  )
  
  // Memoize derived states
  const shouldShowNextButton = useMemo(
    () => transcription && transcription?.shadowingResult?.weightedAccuracy >= 85,
    [transcription]
  )
  const shouldShowSkipButton = useMemo(
    () => transcription && !shouldShowNextButton,
    [transcription, shouldShowNextButton]
  )

  // Feedback audio dùng ref, không dính đến re-render
  const successAudioRef = useRef<HTMLAudioElement | null>(null)
  const failAudioRef = useRef<HTMLAudioElement | null>(null)
  const lastTranscriptionRef = useRef<string | null>(null)
  useEffect(() => {
    // init 1 lần
    if (!successAudioRef.current) {
      successAudioRef.current = new Audio("/sounds/correct.wav")
      successAudioRef.current.preload = "auto"
    }
    if (!failAudioRef.current) {
      failAudioRef.current = new Audio("/sounds/not_correct.ogg")
      failAudioRef.current.preload = "auto"
    }

    // Cleanup khi unmount
    return () => {
      if (successAudioRef.current) {
        successAudioRef.current.pause()
        successAudioRef.current.src = ""
        successAudioRef.current = null
      }
      if (failAudioRef.current) {
        failAudioRef.current.pause()
        failAudioRef.current.src = ""
        failAudioRef.current = null
      }
    }
  }, [])

  const playFeedbackSound = (isGoodScore: boolean) => {
    const audioEl = isGoodScore ? successAudioRef.current : failAudioRef.current
    if (!audioEl) return
    audioEl.currentTime = 0
    void audioEl.play().catch((e) => {
      console.warn("Feedback sound play error", e)
    })
  }
  
  // Chỉ listen theo transcription ID - chỉ play khi có kết quả MỚI
  useEffect(() => {
    if (!transcription?.id) return
    
    const transcriptionKey = transcription.id.toString()
    if (lastTranscriptionRef.current === transcriptionKey) return // Tránh play lại
    lastTranscriptionRef.current = transcriptionKey

    const score = transcription.shadowingResult?.weightedAccuracy
    if (score == null) return

    const isGoodScore = score >= 85
    playFeedbackSound(isGoodScore)
  }, [transcription?.id])

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
        if (old) {
          URL.revokeObjectURL(old)
        }
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
        
        // CRITICAL: Clear chunks immediately to free memory
        chunksRef.current = []

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

  // Cleanup khi unmount - CRITICAL
  useEffect(() => {
    return () => {
      // Stop và cleanup MediaRecorder AGGRESSIVELY
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop()
          }
          // Remove event handlers to prevent memory leaks
          mediaRecorderRef.current.ondataavailable = null
          mediaRecorderRef.current.onstop = null
          mediaRecorderRef.current.onerror = null
        } catch (e) {
          console.warn('MediaRecorder cleanup error:', e)
        }
        mediaRecorderRef.current = null
      }

      // Stop ALL stream tracks forcefully
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop()
          track.enabled = false
        })
        streamRef.current = null
      }

      // Stop và cleanup audio player completely
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
        audioPlayerRef.current.removeAttribute('src')
        audioPlayerRef.current.load()
        audioPlayerRef.current.src = ""
        audioPlayerRef.current = null
      }

      // Force clear ALL chunks
      chunksRef.current = []
      cancelRecordingRef.current = false
    }
  }, [])
  
  // Force cleanup on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Stop recording if in progress
        if (isRecording) {
          cancelRecording()
        }
        // Pause recorded audio if playing
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause()
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isRecording, cancelRecording])
  
  // Cleanup recordedUrl separately để revoke đúng
  useEffect(() => {
    return () => {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl)
      }
    }
  }, [recordedUrl])
  
  // CRITICAL: Force cleanup on page unload/F5
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Force stop everything
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop()
      }
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioPlayerRef.current?.pause()
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl)
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [recordedUrl])

  const shadowing = useMemo(
    () => transcription?.shadowingResult,
    [transcription]
  )

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
              disabled={activeIndex === 0 || !userInteracted}
              onClick={onPrev}
            >
              <StepBack className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="outline" 
              onClick={onReplay}
              disabled={!userInteracted}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              className="shadow" 
              onClick={onPlay}
              disabled={!userInteracted}
            >
              <Play className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="outline" 
              onClick={onPause}
              disabled={!userInteracted}
            >
              <Pause className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              disabled={activeIndex === lesson.sentences.length - 1 || !userInteracted}
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
              disabled={!hasRecordedAudio || isRecording || !userInteracted}
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
              disabled={isUploading || !userInteracted}
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

        {/* Shadowing result UI - memoized */}
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
