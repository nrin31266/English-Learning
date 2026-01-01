/**
 * Component ActiveSentencePanel.tsx
 * 
 * Mục đích:
 * - Panel chính hiển thị câu đang practice và tất cả controls
 * - Quản lý recording logic (ghi âm microphone)
 * - Upload và hiển thị kết quả phân tích pronunciation
 * - Transport controls (Prev, Next, Replay, Play, Pause)
 * 
 * Tính năng chính:
 * 1. Hiển thị câu hiện tại (SentenceDisplay component)
 * 2. Transport controls: điều hướng và phát audio
 * 3. Recording controls:
 *    - Start Recording: bắt đầu ghi âm
 *    - Stop & Save: dừng và upload lên server
 *    - Cancel: hủy bỏ ghi âm
 *    - Play recorded audio: nghe lại bản ghi
 * 4. Hiển thị kết quả (ShadowingResultPanel)
 * 5. Smart buttons:
 *    - "Next sentence" (xanh) nếu điểm >= 85
 *    - "Skip this sentence" (vàng) nếu điểm < 85
 * 6. Feedback âm thanh:
 *    - success.wav: điểm >= 85
 *    - not_correct.ogg: điểm < 85
 * 
 * Recording Flow:
 * ```
 * User click "Start Recording"
 *   ↓
 * getUserMedia() -> MediaRecorder.start()
 *   ↓
 * User đọc theo câu
 *   ↓
 * User click "Stop & Save"
 *   ↓
 * MediaRecorder.stop() -> ondataavailable -> onstop
 *   ↓
 * Tạo Blob từ chunks
 *   ↓
 * Upload FormData lên /lp/speech-to-text/transcribe
 *   ↓
 * Nhận ITranscriptionResponse
 *   ↓
 * Hiển thị ShadowingResultPanel + Play feedback sound
 * ```
 * 
 * Cancel Flow:
 * ```
 * User click "Cancel" (chỉ hiện khi đang recording)
 *   ↓
 * Set cancelRecordingRef.current = true
 *   ↓
 * MediaRecorder.stop() trigger onstop
 *   ↓
 * onstop check cancelRecordingRef
 *   ↓
 * Không tạo Blob, không upload, clear chunks
 * ```
 * 
 * State Management:
 * - isRecording: Đang ghi âm
 * - hasRecordedAudio: Có audio đã ghi sẵn
 * - isPlayingRecorded: Đang phát lại audio đã ghi
 * - isUploading: Đang upload lên server
 * - recordError: Lỗi khi ghi/upload
 * - recordedUrl: Object URL của audio blob (để play)
 * - transcription: Kết quả từ server
 * 
 * Critical Cleanup:
 * - Stop MediaRecorder khi unmount
 * - Stop tất cả media tracks (microphone)
 * - Pause và cleanup audio players
 * - Revoke object URLs
 * - Cleanup khi tab hidden
 * - Cleanup khi F5/navigate
 */
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

/**
 * Props cho ActiveSentencePanel
 */
interface ActiveSentencePanelProps {
  /** Lesson data chứa sentences */
  lesson: ILLessonDetailsDto
  /** Index của câu đang active */
  activeIndex: number
  /** Callback khi click Prev button */
  onPrev: () => void
  /** Callback khi click Next button */
  onNext: () => void
  /** Callback khi click Replay button */
  onReplay: () => void
  /** Callback khi click Play button */
  onPlay: () => void
  /** Callback khi click Pause button */
  onPause: () => void
  /** User đã tương tác với media player chưa */
  userInteracted?: boolean
}

/**
 * Component chính - ActiveSentencePanel
 */
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
  // ========== RECORDING STATE ==========
  /** Đang ghi âm */
  const [isRecording, setIsRecording] = useState(false)
  /** Đã có audio ghi sẵn (chưa upload hoặc đã upload) */
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false)
  /** Đang phát lại audio đã ghi */
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false)
  /** Đang upload lên server */
  const [isUploading, setIsUploading] = useState(false)
  /** Lỗi khi ghi âm hoặc upload */
  const [recordError, setRecordError] = useState<string | null>(null)
  /** Object URL của audio blob (để play lại) */
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)

  // ========== RECORDING REFS ==========
  /** Ref tới MediaRecorder instance */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  /** Mảng chunks audio data từ MediaRecorder */
  const chunksRef = useRef<Blob[]>([])
  /** Ref tới MediaStream (microphone stream) */
  const streamRef = useRef<MediaStream | null>(null)
  /** Ref tới audio element để play recorded audio */
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  /** Flag để đánh dấu user đã cancel recording */
  const cancelRecordingRef = useRef(false)

  // ========== TRANSCRIPTION STATE ==========
  /** Kết quả phân tích từ server */
  const [transcription, setTranscription] =
    useState<ITranscriptionResponse | null>(null)
  
  /**
   * Memoize currentSentence để tránh re-render không cần thiết
   * Chỉ recalculate khi lesson.sentences hoặc activeIndex thay đổi
   */
  const currentSentence = useMemo(
    () => lesson.sentences[activeIndex],
    [lesson.sentences, activeIndex]
  )
  
  /**
   * Memoize derived states - conditions để hiện buttons
   * shouldShowNextButton: điểm >= 85 -> hiện "Next sentence" (xanh)
   * shouldShowSkipButton: có kết quả nhưng điểm < 85 -> hiện "Skip" (vàng)
   */
  const shouldShowNextButton = useMemo(
    () => transcription && transcription?.shadowingResult?.weightedAccuracy >= 85,
    [transcription]
  )
  const shouldShowSkipButton = useMemo(
    () => transcription && !shouldShowNextButton,
    [transcription, shouldShowNextButton]
  )

  // ========== FEEDBACK AUDIO REFS ==========
  /**
   * Feedback audio players (không trigger re-render)
   * - successAudioRef: phát khi điểm >= 85
   * - failAudioRef: phát khi điểm < 85
   * - lastTranscriptionRef: track transcription đã play để tránh play lại
   */
  const successAudioRef = useRef<HTMLAudioElement | null>(null)
  const failAudioRef = useRef<HTMLAudioElement | null>(null)
  const lastTranscriptionRef = useRef<string | null>(null)
  
  /**
   * Effect: Setup feedback audio players (1 lần khi mount)
   * 
   * Preload audio files để phát ngay khi cần
   * Cleanup khi unmount để tránh memory leak
   */
  useEffect(() => {
    // Init 1 lần
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

  /**
   * Helper function: Play feedback sound
   * @param isGoodScore - true nếu điểm >= 85 (play success), false (play fail)
   */
  const playFeedbackSound = (isGoodScore: boolean) => {
    const audioEl = isGoodScore ? successAudioRef.current : failAudioRef.current
    if (!audioEl) return
    audioEl.currentTime = 0  // Reset về đầu
    void audioEl.play().catch((e) => {
      console.warn("Feedback sound play error", e)
    })
  }
  
  /**
   * Effect: Play feedback sound khi có transcription MỚI
   * 
   * Logic:
   * - Chỉ play khi transcription.id thay đổi
   * - Track bằng lastTranscriptionRef để tránh play lại
   * - Điểm >= 85: success sound
   * - Điểm < 85: fail sound
   * 
   * Dependencies: [transcription?.id]
   * - Chỉ listen theo ID, không theo toàn bộ object
   * - Tránh trigger khi transcription object re-create nhưng data giống nhau
   */
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

  /**
   * Effect: Reset state khi đổi câu
   * 
   * Reset:
   * - Recording states
   * - Recorded audio
   * - Upload state
   * - Errors
   * - Transcription
   * 
   * Revoke object URL để free memory
   */
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

  /**
   * Function: Bắt đầu ghi âm
   * 
   * Flow:
   * 1. Request microphone permission: getUserMedia({ audio: true })
   * 2. Tạo MediaRecorder instance từ stream
   * 3. Setup event handlers:
   *    - ondataavailable: lưu chunks vào chunksRef
   *    - onstop: xử lý khi dừng (tạo blob, upload)
   * 4. Start recording
   * 
   * Error handling:
   * - Browser không support: setRecordError
   * - Permission denied: setRecordError
   * - Other errors: setRecordError + cleanup stream
   * 
   * Cancel logic:
   * - cancelRecordingRef = false (mặc định là save)
   * - Nếu user click Cancel, set = true
   * - onstop check ref này để quyết định save hay discard
   */
  // Bắt đầu ghi
  const startRecording = useCallback(async () => {
    setRecordError(null)

    // Check browser support
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
