import handleAPI from "@/apis/handleAPI"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner2 } from "@/components/ui/spinner2"
import type { ILessonDetailsResponse, ITranscriptionResponse } from "@/types"
import { ArrowRight, Mic, Square, Volume2, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import SentenceDisplay from "./SentenceDisplay"
import ShadowingResultPanel from "./ShadowingResultPanel"
import WordPopup from "@/components/WordPopup"
import { useWordPopup } from "@/hooks/UseWordPopupReturn"
import { cn } from "@/lib/utils"

interface ActiveSentencePanelProps {
  lesson: ILessonDetailsResponse
  activeIndex: number
  handlePause: () => void
  onNext: () => void
  userInteracted?: boolean
  onComplete?: (sentenceId: number) => void
}

export const SHADOWING_THRESHOLD = {
  NEXT: 80,
  GOOD_SOUND: 80,
}

const ActiveSentencePanel = ({
  onNext,
  activeIndex,
  lesson,
  userInteracted = false,
  handlePause,
  onComplete
}: ActiveSentencePanelProps) => {
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false)
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [recordError, setRecordError] = useState<string | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [transcription, setTranscription] = useState<ITranscriptionResponse | null>(null)
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("default")
  const [isPressStart, setIsPressStart] = useState(false)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const cancelRecordingRef = useRef(false)
  
  // 👈 THÊM: ref để tránh gọi complete nhiều lần cho cùng 1 câu
  const hasCalledCompleteRef = useRef<number | null>(null)
  
  // 👈 THÊM: snapshot sentenceId tại thời điểm record
  const sentenceIdRef = useRef<number>(0)

  const currentSentence = useMemo(
    () => lesson.sentences[activeIndex],
    [lesson.sentences, activeIndex]
  )

  const {
    activeWord,
    anchorEl,
    wordData,
    loadingWordData,
    handleWordClick,
    closePopup,
  } = useWordPopup()

  const shouldShowNextButton = useMemo(
    () => (transcription?.shadowingResult?.weightedAccuracy ?? 0) >= SHADOWING_THRESHOLD.NEXT,
    [transcription]
  )

  const shouldShowSkipButton = useMemo(
    () => !hasRecordedAudio || !shouldShowNextButton,
    [hasRecordedAudio, shouldShowNextButton]
  )

  const successAudioRef = useRef<HTMLAudioElement | null>(null)
  const failAudioRef = useRef<HTMLAudioElement | null>(null)
  const lastTranscriptionRef = useRef<string | null>(null)

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }, [])

  const revokeRecordedUrl = useCallback((url: string | null) => {
    if (url) {
      URL.revokeObjectURL(url)
    }
  }, [])

  const resetRecordingUi = useCallback(() => {
    setIsRecording(false)
    setHasRecordedAudio(false)
    setIsPlayingRecorded(false)
    setIsUploading(false)
    setRecordError(null)
    setRecordedUrl((old) => {
      revokeRecordedUrl(old)
      return null
    })
    setTranscription(null)
    lastTranscriptionRef.current = null
  }, [revokeRecordedUrl])

  useEffect(() => {
    if (!successAudioRef.current) {
      successAudioRef.current = new Audio("/sounds/correct.wav")
      successAudioRef.current.preload = "auto"
    }
    if (!failAudioRef.current) {
      failAudioRef.current = new Audio("/sounds/not_correct.ogg")
      failAudioRef.current.preload = "auto"
    }

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

  useEffect(() => {
    if (!transcription?.id) return

    const transcriptionKey = transcription.id.toString()
    if (lastTranscriptionRef.current === transcriptionKey) return
    lastTranscriptionRef.current = transcriptionKey

    const score = transcription.shadowingResult?.weightedAccuracy
    if (score == null) return

    playFeedbackSound(score >= SHADOWING_THRESHOLD.GOOD_SOUND)
  }, [transcription?.id])

  const loadAudioInputDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const inputs = devices.filter((d) => d.kind === "audioinput")
      setAudioInputDevices(inputs)

      setSelectedDeviceId((current) => {
        if (inputs.length === 0) return "default"
        const selectedExists = inputs.some((d) => d.deviceId === current)
        return selectedExists ? current : inputs[0].deviceId
      })
    } catch (error) {
      console.warn("Cannot enumerate audio input devices", error)
    }
  }, [])

  useEffect(() => {
    void loadAudioInputDevices()

    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices?.addEventListener) return

    const handleDeviceChange = () => {
      void loadAudioInputDevices()
    }

    mediaDevices.addEventListener("devicechange", handleDeviceChange)
    return () => {
      mediaDevices.removeEventListener("devicechange", handleDeviceChange)
    }
  }, [loadAudioInputDevices])

  // 👉 SỬA: reset UI và update snapshot khi đổi câu
  useEffect(() => {
    resetRecordingUi()
    hasCalledCompleteRef.current = null
    sentenceIdRef.current = currentSentence.id
  }, [currentSentence.id, resetRecordingUi])

  // 👉 SỬA: useEffect gọi onComplete - dùng sentenceIdRef thay vì currentSentence.id
  useEffect(() => {
    const score = transcription?.shadowingResult?.weightedAccuracy
    const sentenceId = sentenceIdRef.current

    if (score !== undefined &&
        score >= SHADOWING_THRESHOLD.NEXT &&
        onComplete &&
        hasCalledCompleteRef.current !== sentenceId) {
      hasCalledCompleteRef.current = sentenceId
      onComplete(sentenceId)
    }
  }, [transcription?.shadowingResult?.weightedAccuracy, onComplete])

  const startRecording = useCallback(async () => {
    setRecordError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordError("Trình duyệt không hỗ trợ ghi âm.")
      return
    }

    try {
      // 👉 THÊM: snapshot sentenceId tại thời điểm bắt đầu record
      sentenceIdRef.current = currentSentence.id

      const audioConstraints: MediaTrackConstraints | boolean =
        selectedDeviceId && selectedDeviceId !== "default"
          ? { deviceId: { exact: selectedDeviceId } }
          : true
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
      streamRef.current = stream
      void loadAudioInputDevices()

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      cancelRecordingRef.current = false
      setHasRecordedAudio(false)
      setRecordedUrl((old) => {
        revokeRecordedUrl(old)
        return null
      })
      setTranscription(null)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }

        setIsRecording(false)

        const wasCancelled = cancelRecordingRef.current
        cancelRecordingRef.current = false

        if (wasCancelled) {
          chunksRef.current = []
          setHasRecordedAudio(false)
          setRecordedUrl((old) => {
            revokeRecordedUrl(old)
            return null
          })
          return
        }

        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(blob)
        setRecordedUrl((old) => {
          revokeRecordedUrl(old)
          return url
        })
        setHasRecordedAudio(true)

        chunksRef.current = []

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
  }, [currentSentence, loadAudioInputDevices, revokeRecordedUrl, selectedDeviceId])

  const stopRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder) return

    cancelRecordingRef.current = false
    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop()
    }
  }, [])

  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder) return

    cancelRecordingRef.current = true
    chunksRef.current = []
    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop()
    }
  }, [])

  const handlePointerDown = useCallback(() => {
    if (isUploading || !userInteracted) return

    clearPressTimer()
    pressTimerRef.current = setTimeout(() => {
      setIsPressStart(true)
      handlePause()
      void startRecording()
    }, 200)
  }, [clearPressTimer, handlePause, isUploading, startRecording, userInteracted])

  const handlePointerUp = useCallback(() => {
    clearPressTimer()

    if (isPressStart && isRecording) {
      stopRecording()
    }

    setIsPressStart(false)
  }, [clearPressTimer, isPressStart, isRecording, stopRecording])

  const handlePointerLeave = useCallback(() => {
    if (isPressStart) {
      cancelRecording()

      setIsPressStart(false)
      clearPressTimer()
    }
  }, [cancelRecording, clearPressTimer, isPressStart])

  useEffect(() => {
    return () => {
      clearPressTimer()
    }
  }, [clearPressTimer])


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

  useEffect(() => {
    const player = audioPlayerRef.current
    if (!player) return
    const onEnded = () => setIsPlayingRecorded(false)
    player.addEventListener("ended", onEnded)
    return () => {
      player.removeEventListener("ended", onEnded)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop()
          }
          mediaRecorderRef.current.ondataavailable = null
          mediaRecorderRef.current.onstop = null
          mediaRecorderRef.current.onerror = null
        } catch (e) {
          console.warn('MediaRecorder cleanup error:', e)
        }
        mediaRecorderRef.current = null
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop()
          track.enabled = false
        })
        streamRef.current = null
      }

      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
        audioPlayerRef.current.removeAttribute('src')
        audioPlayerRef.current.load()
        audioPlayerRef.current.src = ""
        audioPlayerRef.current = null
      }

      chunksRef.current = []
      cancelRecordingRef.current = false
    }
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isRecording) {
          cancelRecording()
        }
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

  useEffect(() => {
    return () => {
      revokeRecordedUrl(recordedUrl)
    }
  }, [recordedUrl, revokeRecordedUrl])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop()
      }
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioPlayerRef.current?.pause()
      revokeRecordedUrl(recordedUrl)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [recordedUrl, revokeRecordedUrl])

  const shadowing = useMemo(
    () => transcription?.shadowingResult,
    [transcription]
  )

  return (
    <ScrollArea className="min-h-0 flex-1 rounded-xl border bg-card">
      <div className="flex flex-col items-center gap-4 px-4 py-4">
        <div className="flex w-full max-w-xs items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Microphone
          </span>

          <Select
            value={selectedDeviceId}
            onValueChange={(value) => setSelectedDeviceId(value)}
            disabled={isRecording || isUploading || audioInputDevices.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select microphone" />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                {audioInputDevices.length === 0 && (
                  <SelectItem value="default">Default microphone</SelectItem>
                )}

                {audioInputDevices.map((device, index) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${index + 1}`}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col items-center w-full">

          {/* Record Section */}
          <div className="flex flex-col items-center w-full gap-2">
            {/* Nút ghi âm hình tròn */}
            <button
              className={cn(
                "touch-none relative w-24 h-24 rounded-full shadow-lg transition-all duration-150",
                "flex items-center justify-center",
                isRecording
                  ? "bg-red-500 hover:bg-red-600 scale-110"
                  : "bg-primary hover:bg-primary/90",
                (!userInteracted || isUploading) && "opacity-50 cursor-not-allowed"
              )}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              onPointerCancel={handlePointerLeave}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                WebkitTouchCallout: "none",
                WebkitUserSelect: "none",
                userSelect: "none",
              }}
              disabled={isUploading || !userInteracted}
            >
              {isUploading ? (
                <Spinner2 className="h-8 w-8 text-white" />
              ) : isRecording ? (
                <Square className="h-6 w-6 text-white fill-white" />
              ) : (
                <Mic className="h-8 w-8 text-white" />
              )}

              {/* Ripple effect khi đang ghi âm */}
              {isRecording && (
                <>
                  <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-75" />
                  <span className="absolute inset-0 rounded-full animate-pulse bg-red-500 opacity-50" />
                </>
              )}
            </button>

            {/* Status text */}
            <div className="text-center">
              {isRecording ? (
                <p className="text-sm font-medium text-red-500 animate-pulse">
                  🔴 Recording... Release to stop
                </p>
              ) : isUploading ? (
                <p className="text-sm text-muted-foreground">
                  ⏳ Analyzing your pronunciation...
                </p>
              ) : hasRecordedAudio ? (
                <p className="text-sm text-green-600">
                  ✅ Recording completed!
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  🎤 Press and hold to record, release to submit
                </p>
              )}
            </div>

            {/* Playback & Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {/* Play recorded audio button */}
              {hasRecordedAudio && (
                <Button
                  size="sm"
                  variant={isPlayingRecorded ? "default" : "outline"}
                  disabled={isRecording || !userInteracted}
                  className="gap-2"
                  onClick={handleTogglePlayRecorded}
                >
                  <Volume2 className="h-4 w-4" />
                  {isPlayingRecorded ? "Playing..." : "Play Recording"}
                </Button>
              )}

              {/* Skip button - only show when no recording or after fail */}
              {hasRecordedAudio && !isRecording && shouldShowSkipButton && (
                <Button
                  variant="secondary"
                  className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                  onClick={() => onNext()}
                  size="sm"
                >
                  <X className="h-4 w-4" />
                  Skip
                </Button>
              )}

              {/* Next button - only show when score is good */}
              {hasRecordedAudio && shouldShowNextButton && !isRecording && (
                <Button
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => onNext()}
                  size="sm"
                >
                  Next sentence
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Error message */}
            {recordError && (
              <div className="text-center text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-full">
                ⚠️ {recordError}
              </div>
            )}
          </div>

        </div>

        <div className="space-y-2 text-center w-full">
          <SentenceDisplay
            words={currentSentence?.lessonWords}
            fallbackText={
              currentSentence?.textDisplay || "No sentence available."
            }
            onWordClick={(word, el) => {
              handleWordClick(word, el, currentSentence.textDisplay || "");
            }}
            className="items-center"
          />
          {lesson.sentences.length > 0 && currentSentence.phoneticUs && (
            <p className="text-base italic text-muted-foreground">
              {currentSentence.phoneticUs}
            </p>
          )}
        </div>

        {shadowing && <ShadowingResultPanel result={shadowing} />}
      </div>
      <audio ref={audioPlayerRef} src={recordedUrl ?? undefined} />

      <WordPopup
        word={activeWord}
        anchorEl={anchorEl}
        onClose={closePopup}
        wordData={wordData}
        isLoading={loadingWordData}
      />
    </ScrollArea>
  )
}

export default ActiveSentencePanel