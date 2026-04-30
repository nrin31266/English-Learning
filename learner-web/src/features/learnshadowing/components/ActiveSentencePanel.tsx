// src/pages/shadowing/components/ActiveSentencePanel.tsx

import handleAPI from "@/apis/handleAPI"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ILessonDetailsResponse, ILessonWordResponse, ITranscriptionResponse } from "@/types"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import SentenceDisplay from "./SentenceDisplay"
import ShadowingResultPanel from "./ShadowingResultPanel"
import MicrophoneSelector from "./MicrophoneSelector"
import RecordingControls from "./RecordingControls"
import WordPopup from "@/components/WordPopup"
import { useWordPopup } from "@/hooks/UseWordPopupReturn"
import { useAppDispatch } from "@/store"
import { updateSentenceCompletion } from "@/store/lessonForShadowingSlide"
import { successSound } from "../../../utils/sound"
import { CheckCircle2 } from "lucide-react"

interface ActiveSentencePanelProps {
  lesson: ILessonDetailsResponse
  activeIndex: number
  handlePause: () => void
  onNext: () => void
  userInteracted?: boolean
  onComplete?: (sentenceId: number, fluencyScore: number, weightedAccuracy: number) => void
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

  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isSlowMode, setIsSlowMode] = useState<boolean>(false)

  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dispatch = useAppDispatch()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const cancelRecordingRef = useRef(false)

  const canStopRecordingRef = useRef(true)
  const minRecordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sentenceIdRef = useRef<number>(0)
  const completedSentenceIdRef = useRef<number | null>(null)

  const currentSentence = useMemo(
    () => lesson.sentences[activeIndex],
    [lesson.sentences, activeIndex]
  )

  const currentSentenceWords = useMemo(() => {
    return currentSentence?.lessonWords
  }, [currentSentence?.id])

  const currentSentenceTextDisplay = currentSentence?.textDisplay || ""

  const isCompleted = useMemo(() => {
    return lesson.progressOverview?.shadowing?.completedSentenceIds?.includes(currentSentence.id)
  }, [lesson.progressOverview, currentSentence.id])

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

  // 👉 LOGIC MỚI: Nếu đã completed thì show NEXT luôn, khỏi cần xét điểm hiện tại
  const shouldShowNextButton = useMemo(
    () => isCompleted || (transcription?.shadowingResult?.weightedAccuracy ?? 0) >= SHADOWING_THRESHOLD.NEXT,
    [isCompleted, transcription]
  )

  // 👉 LOGIC MỚI: Skip chỉ hiện khi KHÔNG completed và (chưa có điểm pass)
  const shouldShowSkipButton = useMemo(
    () => !isCompleted && hasRecordedAudio && !shouldShowNextButton,
    [isCompleted, hasRecordedAudio, shouldShowNextButton]
  )

  const lastTranscriptionRef = useRef<string | null>(null)
  const lastPlayRef = useRef(0)

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
    setTimeLeft(0)
  }, [revokeRecordedUrl])

  const playFeedbackSound = useCallback((isGoodScore: boolean) => {
    const now = Date.now()
    if (now - lastPlayRef.current < 400) {
      return
    }
    lastPlayRef.current = now

    if (!isGoodScore) return;
    successSound.play()
  }, [])

  useEffect(() => {
    if (!transcription?.id) return

    const transcriptionKey = transcription.id.toString()
    if (lastTranscriptionRef.current === transcriptionKey) {
      return
    }
    lastTranscriptionRef.current = transcriptionKey

    const score = transcription.shadowingResult?.weightedAccuracy
    if (score == null) return

    const shouldPlayGood = score >= SHADOWING_THRESHOLD.GOOD_SOUND
    playFeedbackSound(shouldPlayGood)
  }, [transcription?.id, playFeedbackSound])

  const loadAudioInputDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      let inputs = devices.filter((d) => d.kind === "audioinput" && d.deviceId !== "default" && d.deviceId !== "communications")
      if (inputs.length === 0) {
        inputs = devices.filter((d) => d.kind === "audioinput")
      }

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
        if (inputs.length === 1) return getAudioInputValue(inputs[0].deviceId, 0)
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

  useEffect(() => {
    resetRecordingUi()
    sentenceIdRef.current = currentSentence.id
    completedSentenceIdRef.current = null

    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current)
      completeTimerRef.current = null
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }, [currentSentence.id, resetRecordingUi])

  useEffect(() => {
    const score = transcription?.shadowingResult?.weightedAccuracy
    const currentSentenceId = sentenceIdRef.current

    if (completedSentenceIdRef.current === currentSentenceId) {
      return
    }

    const isPassed = score !== undefined && Math.round(score) >= SHADOWING_THRESHOLD.NEXT;

    if (isPassed) {
      completedSentenceIdRef.current = currentSentenceId
      if (onComplete) {
        onComplete(currentSentenceId, transcription?.shadowingResult?.fluencyScore ?? 0, score!)
      }
    }
  }, [transcription, onComplete, dispatch])

  const calculateRecordingTime = useCallback(() => {
    if (!currentSentenceWords || currentSentenceWords.length === 0) return 5;
    const firstWord = currentSentenceWords[0];
    const lastWord = currentSentenceWords[currentSentenceWords.length - 1];
    const startMs = firstWord.audioStartMs ?? 0;
    const endMs = lastWord.audioEndMs ?? (startMs + 2000);
    const exactSeconds = (endMs - startMs) / 1000;

    let normalBuffer = 1.5;
    if (exactSeconds >= 3 && exactSeconds < 7) normalBuffer = 2;
    if (exactSeconds >= 7) normalBuffer = 2.5;

    const extraSlowTime = isSlowMode ? (exactSeconds * 0.5 + 2) : 0;
    return Math.ceil(exactSeconds + normalBuffer + extraSlowTime);
  }, [currentSentenceWords, isSlowMode]);

  const defaultTime = calculateRecordingTime();

  const startRecording = useCallback(async () => {
    setRecordError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordError("Trình duyệt không hỗ trợ ghi âm.")
      return
    }

    try {
      sentenceIdRef.current = currentSentence.id
      const audioConstraints: MediaTrackConstraints | boolean = selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
      streamRef.current = stream
      void loadAudioInputDevices()

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      cancelRecordingRef.current = false
      setHasRecordedAudio(false)
      setRecordedUrl(null)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }
        setIsRecording(false)

        if (cancelRecordingRef.current) {
          cancelRecordingRef.current = false
          return
        }

        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(blob)
        setRecordedUrl(url)
        setHasRecordedAudio(true)

        try {
          setIsUploading(true)
          const expectedWords = currentSentence.lessonWords.map((w) => ({
            id: w.id, wordText: w.wordText, wordNormalized: w.wordNormalized, orderIndex: w.orderIndex,
          })).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))

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
          setRecordError("Upload hoặc chuyển đổi audio thất bại.")
        } finally {
          setIsUploading(false)
        }
      }

      setTimeLeft(calculateRecordingTime());
      mediaRecorder.start()
      setIsRecording(true)

      canStopRecordingRef.current = false;
      if (minRecordTimerRef.current) clearTimeout(minRecordTimerRef.current);
      minRecordTimerRef.current = setTimeout(() => { canStopRecordingRef.current = true; }, 1000);
      
      recordingTimerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(recordingTimerRef.current!);
            if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

    } catch (error) {
      setRecordError("Không thể truy cập micro.")
      setIsRecording(false)
    }
  }, [currentSentence, loadAudioInputDevices, selectedDeviceId, calculateRecordingTime])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop()
  }, [])

  const cancelRecording = useCallback(() => {
    cancelRecordingRef.current = true
    chunksRef.current = []
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop()
  }, [])

  const handleRecordClick = useCallback(() => {
    if (isUploading || !userInteracted) return
    if (isRecording) {
      if (!canStopRecordingRef.current) return;
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      stopRecording()
    } else {
      handlePause()
      void startRecording()
    }
  }, [isRecording, isUploading, userInteracted, handlePause, startRecording, stopRecording])

  const handleTogglePlayRecorded = () => {
    if (!hasRecordedAudio || !recordedUrl || !audioPlayerRef.current) return
    if (!isPlayingRecorded) {
      audioPlayerRef.current.play().then(() => setIsPlayingRecorded(true))
    } else {
      audioPlayerRef.current.pause()
      audioPlayerRef.current.currentTime = 0
      setIsPlayingRecorded(false)
    }
  }

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (minRecordTimerRef.current) clearTimeout(minRecordTimerRef.current)
    }
  }, [])

  const shadowing = useMemo(() => transcription?.shadowingResult || null, [transcription])

  return (
    <ScrollArea className="min-h-0 flex-1 rounded-xl border bg-card">
      <div className="flex flex-col items-center gap-4 px-4 py-4 relative">
        
        {isCompleted && (
          <div className="absolute right-4 top-4 flex items-center gap-1.5 text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
          </div>
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
          isCompleted={isCompleted} // 👉 Truyền biến isCompleted xuống
          shouldShowSkipButton={shouldShowSkipButton}
          shouldShowNextButton={shouldShowNextButton}
          recordError={recordError}
          timeLeft={timeLeft}
          defaultTime={defaultTime}
          isSlowMode={isSlowMode}
          onToggleSlowMode={() => setIsSlowMode(prev => !prev)}
          onRecordClick={handleRecordClick}
          onTogglePlayRecorded={handleTogglePlayRecorded}
          onNext={onNext}
        />

        <div className="w-full">
          <MemoSentenceDisplay
            words={currentSentenceWords}
            fallbackText={currentSentence?.textDisplay || "No sentence available."}
            phoneticUs={currentSentence?.phoneticUs}
            onWordClick={handleSentenceWordClick}
            className="items-center"
          />
        </div>

        <MemoShadowingResultPanel result={shadowing} isLoading={isUploading} />
      </div>
      <audio ref={audioPlayerRef} src={recordedUrl ?? undefined} onEnded={() => setIsPlayingRecorded(false)} />
      <WordPopup word={activeWord} anchorEl={anchorEl} onClose={closePopup} wordData={wordData} isLoading={loadingWordData} />
    </ScrollArea>
  )
}

export default ActiveSentencePanel