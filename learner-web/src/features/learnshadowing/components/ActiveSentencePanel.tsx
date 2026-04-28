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
import {  successSound } from "../../../utils/sound"

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

  // 👉 THÊM: State quản lý thời gian đếm ngược & Slow mode
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
  
  // 👉 THÊM 2 DÒNG NÀY (CHỐNG SPAM):
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
    
    // Bạn có thể giảm debounce xuống 300ms - 500ms để nó phản hồi nhanh hơn,
    // vì giờ ta không sợ crack âm thanh nữa.
    if (now - lastPlayRef.current < 400) {
      return
    }
    lastPlayRef.current = now

    if(!isGoodScore) return;
    const sound = successSound
    
    // BỎ HOÀN TOÀN sound.stop()
    // Gọi thẳng play(), Howler sẽ tự layer các âm thanh đè lên nhau cực mượt
    sound.play()
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

  useEffect(() => {
    resetRecordingUi()
    sentenceIdRef.current = currentSentence.id
    completedSentenceIdRef.current = null
    // setIsSlowMode(false) // Tùy chọn: reset về tốc độ thường khi sang câu mới

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

    const attemptForThisSentence = lesson.progress?.sentenceAttempts?.find(
      a => a.sentenceId === currentSentenceId
    )
    const currentBestScore = attemptForThisSentence?.bestScore ?? 0

    if (score !== undefined &&
      score >= SHADOWING_THRESHOLD.NEXT &&
      onComplete &&
      score > currentBestScore) {

      completedSentenceIdRef.current = currentSentenceId

      if (completeTimerRef.current) {
        clearTimeout(completeTimerRef.current)
      }

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

  // 👉 HÀM TÍNH TOÁN THỜI LƯỢNG GHI ÂM (Tối ưu độ chính xác & Khắc nghiệt hơn)
  const calculateRecordingTime = useCallback(() => {
    if (!currentSentenceWords || currentSentenceWords.length === 0) return 5;

    const firstWord = currentSentenceWords[0];
    const lastWord = currentSentenceWords[currentSentenceWords.length - 1];

    const startMs = firstWord.audioStartMs ?? 0;
    const endMs = lastWord.audioEndMs ?? (startMs + 2000);

    // Lấy số giây thực tế (VD: 3.4 giây)
    const exactSeconds = (endMs - startMs) / 1000;

    // Buffer siêu khắt khe cho Normal Mode (Chỉ dư ra để lấy hơi và nhấn nút ngắt)
    let normalBuffer = 1.5;
    if (exactSeconds >= 3 && exactSeconds < 7) normalBuffer = 2;
    if (exactSeconds >= 7) normalBuffer = 2.5;

    // Nếu bật Slow: Cho thêm 50% thời gian gốc + 2s an toàn
    const extraSlowTime = isSlowMode ? (exactSeconds * 0.5 + 2) : 0;

    // Tính tổng và làm tròn lên thành số nguyên
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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

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
            wordNormalized: w.wordNormalized,
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

      const calculatedTime = calculateRecordingTime();
      setTimeLeft(calculatedTime);

      mediaRecorder.start()
      setIsRecording(true)

      // 👉 THÊM ĐOẠN NÀY ĐỂ CHỐNG SPAM (Khóa nút dừng trong 1 giây đầu)
      canStopRecordingRef.current = false;
      if (minRecordTimerRef.current) clearTimeout(minRecordTimerRef.current);
      minRecordTimerRef.current = setTimeout(() => {
        canStopRecordingRef.current = true;
      }, 1000); // Yêu cầu ghi âm tối thiểu 1000ms (1 giây)
      // 👉 Bắt đầu đếm ngược tự động dừng
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(recordingTimerRef.current!);
            if (mediaRecorderRef.current?.state !== "inactive") {
              mediaRecorderRef.current?.stop();
            }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

    } catch (error) {
      console.error(error)
      setRecordError("Không thể truy cập micro. Vui lòng kiểm tra quyền.")
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      setIsRecording(false)
    }
  }, [currentSentence, loadAudioInputDevices, revokeRecordedUrl, selectedDeviceId, calculateRecordingTime])

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

  // 👉 HÀM XỬ LÝ CLICK RECORD (Tap để Thu / Tap để Dừng sớm)
  const handleRecordClick = useCallback(() => {
    if (isUploading || !userInteracted) return

    if (isRecording) {
      // 👉 THÊM DÒNG NÀY: Nếu chưa đủ 1 giây thì return luôn, không cho Stop
      if (!canStopRecordingRef.current) return; 

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      stopRecording()
    } else {
      handlePause()
      void startRecording()
    }
  }, [isRecording, isUploading, userInteracted, handlePause, startRecording, stopRecording])

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
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (minRecordTimerRef.current) clearTimeout(minRecordTimerRef.current)
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
            phoneticUs={currentSentence?.phoneticUs} // Truyền prop vào đây
            onWordClick={handleSentenceWordClick}
            className="items-center"
          />
        </div>

        <MemoShadowingResultPanel result={shadowing} isLoading={isUploading} />
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