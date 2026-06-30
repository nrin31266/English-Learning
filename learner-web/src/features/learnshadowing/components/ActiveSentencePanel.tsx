// src/pages/shadowing/components/ActiveSentencePanel.tsx

import handleAPI from "@/apis/handleAPI"
import CompletedBadge from "@/components/CompletedBadge"
import { ScrollArea } from "@/components/ui/scroll-area"
import WordPopup from "@/components/WordPopup"
import { useWordPopup } from "@/hooks/UseWordPopupReturn"
import type { ILessonDetailsResponse, ILessonWordResponse, ITranscriptionResponse } from "@/types"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { successSound } from "../../../utils/sound"
import MicrophoneSelector from "./MicrophoneSelector"
import RecordingControls from "./RecordingControls"
import SentenceDisplay from "./SentenceDisplay"
import ShadowingResultPanel from "./ShadowingResultPanel"

interface ActiveSentencePanelProps {
  lesson: ILessonDetailsResponse
  activeIndex: number
  handlePause: () => void
  onNext: () => void
  userInteracted?: boolean
  onComplete?: (sentenceId: number, weightedAccuracy: number) => void
}

/**
 * Ngưỡng điểm đánh giá Shadowing.
 * Đọc linh hoạt từ biến môi trường để phục vụ nhiều cấu hình môi trường khác nhau.
 */
export const SHADOWING_THRESHOLD = {
  NEXT: Number(import.meta.env.VITE_SHADOWING_PASS_THRESHOLD) || 80,
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

  // --- States quản lý UI & Audio ---
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

  // --- Refs quản lý vòng đời Component và Media ---
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  
  const cancelRecordingRef = useRef(false)
  const canStopRecordingRef = useRef(true)
  const minRecordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sentenceIdRef = useRef<number>(0)
  const completedSentenceIdRef = useRef<number | null>(null)
  
  // Ref kiểm soát việc nộp bài, lưu ID của file audio gần nhất đã xử lý
  const processedTranscriptionIdRef = useRef<number | string | null>(null)
  const lastTranscriptionRef = useRef<string | null>(null)
  const lastPlayRef = useRef(0)

  // --- Derived Data (Memoized) ---
  const currentSentence = useMemo(
    () => lesson.sentences[activeIndex],
    [lesson.sentences, activeIndex]
  )

  /**
   * Truy xuất điểm số cao nhất của câu hỏi hiện tại từ Redux Store.
   * Dùng làm mốc so sánh cho cơ chế Smart API Call.
   */
  const highestScore = useMemo(() => {
    return lesson.progressOverview?.shadowing?.progressItems?.[currentSentence.id]?.bestScore ?? 0
  }, [lesson.progressOverview?.shadowing?.progressItems, currentSentence.id])

  const currentSentenceWords = useMemo(() => {
    return currentSentence?.lessonWords
  }, [currentSentence?.id])

  const currentSentenceTextDisplay = currentSentence?.textDisplay || ""

  const isCompleted = useMemo(() => {
    return Boolean(lesson.progressOverview?.shadowing?.progressItems?.[currentSentence.id])
  }, [lesson.progressOverview, currentSentence.id]) 

  /**
   * Đánh giá điều kiện hiển thị nút Next.
   * Ưu tiên 1: Đã pass trong lịch sử (isCompleted).
   * Ưu tiên 2: Vừa đạt điểm pass trong phiên hiện tại.
   */
  const shouldShowNextButton = useMemo(
    () => isCompleted || (transcription?.shadowingResult?.weightedAccuracy ?? 0) >= SHADOWING_THRESHOLD.NEXT,
    [isCompleted, transcription]
  )

  const shouldShowSkipButton = useMemo(
    () => !isCompleted && hasRecordedAudio && !shouldShowNextButton,
    [isCompleted, hasRecordedAudio, shouldShowNextButton]
  )

  // --- Hooks Popup Từ vựng ---
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

  // --- Utilities ---
  const revokeRecordedUrl = useCallback((url: string | null) => {
    if (url) {
      URL.revokeObjectURL(url)
    }
  }, [])

  /**
   * Dọn dẹp giao diện ghi âm. 
   * Tuyệt đối không reset các Tracking Refs (như processedTranscriptionIdRef) tại đây 
   * để tránh Race Condition (Submit oan) khi React chưa kịp clear state bất đồng bộ.
   */
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
    setTimeLeft(0)
  }, [revokeRecordedUrl])

  const playFeedbackSound = useCallback((isGoodScore: boolean) => {
    const now = Date.now()
    if (now - lastPlayRef.current < 400) return
    lastPlayRef.current = now

    if (!isGoodScore) return;
    successSound.play()
  }, [])

  /**
   * Effect: Xử lý âm thanh phản hồi khi có kết quả từ AI
   */
  useEffect(() => {
    if (!transcription?.id) return

    const transcriptionKey = transcription.id.toString()
    if (lastTranscriptionRef.current === transcriptionKey) return
    lastTranscriptionRef.current = transcriptionKey

    const score = Math.round(transcription.shadowingResult?.weightedAccuracy ?? 0)
    const shouldPlayGood = score >= SHADOWING_THRESHOLD.GOOD_SOUND
    playFeedbackSound(shouldPlayGood)
  }, [transcription?.id, playFeedbackSound])

  // --- Hardware Device Management ---
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

  /**
   * Effect: Reset trạng thái môi trường khi chuyển sang câu học mới
   */
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

  /**
   * Mỗi kết quả hợp lệ đều được gửi để backend cập nhật latestScore/attemptCount.
   */
  useEffect(() => {
    const shadowingResult = transcription?.shadowingResult
    const currentSentenceId = sentenceIdRef.current

    // Guard Clause: Chặn render dư thừa hoặc file đã được xử lý
    if (!shadowingResult || !transcription?.id) return
    if (processedTranscriptionIdRef.current === transcription.id) return

    const weightedAccuracy = shadowingResult.weightedAccuracy ?? 0
    const finalScore = Math.round(weightedAccuracy)

    // Khóa ID của file âm thanh hiện tại để không thực thi lại logic này
    processedTranscriptionIdRef.current = transcription.id

    onComplete?.(currentSentenceId, finalScore)

    // Xác thực điều kiện qua bài (độc lập với tiến trình API)
    completedSentenceIdRef.current = currentSentenceId
  }, [transcription, onComplete, highestScore])

  // --- Recording Actions ---
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
          
          // Chốt cứng ID câu đang thu âm để phòng ngừa người dùng chuyển bài quá nhanh
          const recordingSentenceId = currentSentence.id

          const data = await handleAPI<ITranscriptionResponse>({
            endpoint: "/lp/speech-to-text/transcribe",
            method: "POST",
            body: formData,
            isAuth: true,
            contentType: "multipart/form-data",
          })

          // Hủy kết quả nếu user đã navigate sang câu tiếp theo trong lúc chờ API
          if (sentenceIdRef.current !== recordingSentenceId) {
            return
          }
          setTranscription(data)
        } catch (error) {
          setRecordError("Something went wrong while uploading or processing the recording.")
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

  // Khóa event Spacebar để nhường quyền cho phím tắt trigger ghi âm
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      const target = e.target as HTMLElement | null
      if (target?.tagName === "BUTTON" || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return
      e.preventDefault()
      handleRecordClick()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleRecordClick])

  // Dọn dẹp tài nguyên phần cứng & timer khi Component bị unmount
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

        {isCompleted && <CompletedBadge />}

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
            onWordClick={handleSentenceWordClick}
            className="items-center"
            activeWordId={activeWord?.id}
          />
        </div>

        <MemoShadowingResultPanel 
          result={shadowing} 
          isLoading={isUploading} 
          expectedPhonetic={currentSentence?.phoneticUs} 
          highestScore={highestScore} // Truyền điểm cao nhất vào Component kết quả
        />
      </div>
      <audio ref={audioPlayerRef} src={recordedUrl ?? undefined} onEnded={() => setIsPlayingRecorded(false)} />
      <WordPopup word={activeWord} anchorEl={anchorEl} onClose={closePopup} wordData={wordData} isLoading={loadingWordData} />
    </ScrollArea>
  )
}

export default ActiveSentencePanel
