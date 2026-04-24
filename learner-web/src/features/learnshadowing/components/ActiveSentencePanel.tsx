import handleAPI from "@/apis/handleAPI"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ILessonDetailsResponse, ILessonWordResponse, ITranscriptionResponse } from "@/types"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import SentenceDisplay from "./SentenceDisplay"
import ShadowingResultPanel from "./ShadowingResultPanel"
import BestScoreBadge from "./BestScoreBadge"
import MicrophoneSelector from "./MicrophoneSelector"
import RecordingControls from "./RecordingControls"
import WordPopup from "@/components/WordPopup"
import { useWordPopup } from "@/hooks/UseWordPopupReturn"
import { useAppDispatch } from "@/store"
import { updateSentenceCompletion } from "@/store/lessonForShadowingSlide"
import { failSound, successSound } from "../../../utils/sound"

interface ActiveSentencePanelProps {
  lesson: ILessonDetailsResponse
  activeIndex: number
  handlePause: () => void
  onNext: () => void
  userInteracted?: boolean
  onComplete?: (sentenceId: number, fluencyScore: number, weightedAccuracy: number) => void  // 👈 
}

export const SHADOWING_THRESHOLD = {
  NEXT: 80,
  GOOD_SOUND: 80,
}

const getAudioInputValue = (deviceId: string, index: number) => {
  const trimmedDeviceId = deviceId.trim()
  return trimmedDeviceId.length > 0 ? trimmedDeviceId : `microphone_${index}`
}

const MemoSentenceDisplay = memo(SentenceDisplay)
const MemoShadowingResultPanel = memo(ShadowingResultPanel)

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
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("")
  const [isPressStart, setIsPressStart] = useState(false)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dispatch = useAppDispatch()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const cancelRecordingRef = useRef(false)



  // 👈 THÊM: snapshot sentenceId tại thời điểm record
  const sentenceIdRef = useRef<number>(0)
  // 👈 TRACK: đã complete sentence nào rồi để tránh gọi onComplete nhiều lần
  const completedSentenceIdRef = useRef<number | null>(null)

  const currentSentence = useMemo(
    () => lesson.sentences[activeIndex],
    [lesson.sentences, activeIndex]
  )
  // Trong ActiveSentencePanel.tsx
  const currentSentenceWords = useMemo(() => {
    return currentSentence?.lessonWords
  }, [currentSentence?.id])  // 👈 THÊM DÒNG NÀY
  const currentSentenceTextDisplay = currentSentence?.textDisplay || ""

  // Trong ActiveSentencePanel, thêm useMemo để lấy attempt của câu hiện tại
  const currentAttempt = useMemo(() => {
    const progress = lesson.progress;
    if (!progress?.sentenceAttempts) return null;
    return progress.sentenceAttempts.find(a => a.sentenceId === currentSentence.id);
  }, [lesson.progress, currentSentence.id]);

  const {
    activeWord,
    anchorEl,
    wordData,
    loadingWordData,
    handleWordClick,
    closePopup,
  } = useWordPopup()

  const handleSentenceWordClick = useCallback((word: ILessonWordResponse, el: HTMLElement) => {
    handleWordClick(word, el, currentSentenceTextDisplay)
  }, [currentSentenceTextDisplay, handleWordClick])

  const shouldShowNextButton = useMemo(
    () => (transcription?.shadowingResult?.weightedAccuracy ?? 0) >= SHADOWING_THRESHOLD.NEXT,
    [transcription]
  )

  const shouldShowSkipButton = useMemo(
    () => !hasRecordedAudio || !shouldShowNextButton,
    [hasRecordedAudio, shouldShowNextButton]
  )



  const lastTranscriptionRef = useRef<string | null>(null)
  const lastPlayRef = useRef(0)

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
  const playFeedbackSound = useCallback((isGoodScore: boolean) => {
    const now = Date.now()
    if (now - lastPlayRef.current < 800) {
      return
    }
    lastPlayRef.current = now

    const sound = isGoodScore ? successSound : failSound
    if (sound.playing()) {
      sound.stop()
    }
    sound.play()
  }, [])

  // Sửa useEffect play feedback sound - không phát nếu đã complete
  useEffect(() => {
    if (!transcription?.id) return

    const transcriptionKey = transcription.id.toString()
    if (lastTranscriptionRef.current === transcriptionKey) {
      return
    }
    lastTranscriptionRef.current = transcriptionKey

    const score = transcription.shadowingResult?.weightedAccuracy
    if (score == null) return

    // 👉 KIỂM TRA: nếu đã gọi complete rồi thì không phát âm thanh nữa
    // if (currentAttempt?.completed) {
    //   return
    // }    

    const shouldPlayGood = score >= SHADOWING_THRESHOLD.GOOD_SOUND
    playFeedbackSound(shouldPlayGood)
  }, [transcription?.id, playFeedbackSound])

  const loadAudioInputDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const inputs = devices.filter((d) => d.kind === "audioinput")
      setAudioInputDevices((current) => {
        const sameLength = current.length === inputs.length
        const sameItems = sameLength && current.every((device, index) => {
          const next = inputs[index]
          return next && device.deviceId === next.deviceId && device.label === next.label
        })
        return sameItems ? current : inputs
      })

      setSelectedDeviceId((current) => {
        if (inputs.length === 0) return ""

        const selectedExists = inputs.some(
          (device, index) => getAudioInputValue(device.deviceId, index) === current
        )

        return selectedExists ? current : getAudioInputValue(inputs[0].deviceId, 0)
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
    sentenceIdRef.current = currentSentence.id
    completedSentenceIdRef.current = null  // 👈 RESET: đánh dấu chưa complete câu mới

    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current)
      completeTimerRef.current = null
    }
  }, [currentSentence.id, resetRecordingUi])
  useEffect(() => {
    const score = transcription?.shadowingResult?.weightedAccuracy
    const currentSentenceId = sentenceIdRef.current

    // 👈 TRÁNH: gọi onComplete nhiều lần cho cùng một sentence (vòng lặp khi parent re-render)
    if (completedSentenceIdRef.current === currentSentenceId) {
      return
    }

    // 👉 Lấy bestScore từ attempt của câu ĐANG ĐƯỢC TRANSCRIPT (không dùng currentAttempt từ UI)
    const attemptForThisSentence = lesson.progress?.sentenceAttempts?.find(
      a => a.sentenceId === currentSentenceId
    )
    const currentBestScore = attemptForThisSentence?.bestScore ?? 0

    // 👉 Chỉ xử lý khi có transcription mới và chưa gọi complete cho câu này
    if (score !== undefined &&
      score >= SHADOWING_THRESHOLD.NEXT &&
      onComplete &&
      score > currentBestScore) {
      // 👈 MARK: đã complete sentence này rồi
      completedSentenceIdRef.current = currentSentenceId

      if (completeTimerRef.current) {
        clearTimeout(completeTimerRef.current)
      }

      // Optimistic update
      dispatch(updateSentenceCompletion({
        sentenceId: currentSentenceId,
        completed: true,
        score: score
      }))

      completeTimerRef.current = setTimeout(() => {
        onComplete(currentSentenceId, transcription?.shadowingResult?.fluencyScore ?? 0, score)
      }, 500)
    }
  }, [transcription?.shadowingResult?.weightedAccuracy, transcription?.shadowingResult?.fluencyScore, onComplete, lesson.progress?.sentenceAttempts])
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
        selectedDeviceId
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

      if (completeTimerRef.current) {
        clearTimeout(completeTimerRef.current)
        completeTimerRef.current = null
      }
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
    () => transcription?.shadowingResult || null,
    [transcription]
  )

  return (
    <ScrollArea className="min-h-0 flex-1 rounded-xl border bg-card">
      <div className="flex flex-col items-center gap-4 px-4 py-4">


        {currentAttempt && currentAttempt.bestScore !== null && (
          <BestScoreBadge bestScore={currentAttempt.bestScore} />
        )}

        <MicrophoneSelector
          selectedDeviceId={selectedDeviceId}
          audioInputDevices={audioInputDevices}
          disabled={isRecording || isUploading || audioInputDevices.length === 0}
          getAudioInputValue={getAudioInputValue}
          onChange={setSelectedDeviceId}
        />

        <RecordingControls
          isRecording={isRecording}
          isUploading={isUploading}
          hasRecordedAudio={hasRecordedAudio}
          isPlayingRecorded={isPlayingRecorded}
          userInteracted={userInteracted}
          shouldShowSkipButton={shouldShowSkipButton}
          shouldShowNextButton={shouldShowNextButton}
          recordError={recordError}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onTogglePlayRecorded={handleTogglePlayRecorded}
          onNext={onNext}
        />

        <div className="space-y-2 text-center w-full">
          <MemoSentenceDisplay
            words={currentSentenceWords}
            fallbackText={
              currentSentence?.textDisplay || "No sentence available."
            }
            onWordClick={handleSentenceWordClick}
            className="items-center"
          />
          {lesson.sentences.length > 0 && currentSentence.phoneticUs && (
            <p className="text-base italic text-muted-foreground">
              {currentSentence.phoneticUs}
            </p>
          )}
        </div>

         <MemoShadowingResultPanel result={shadowing}  isLoading={isUploading}/>
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