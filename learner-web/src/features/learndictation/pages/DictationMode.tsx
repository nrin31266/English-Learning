// src/pages/DictationMode.tsx

import { useCallback, useMemo, useRef } from "react"
import { useParams } from "react-router-dom"
import {
  fetchLessonById,
  resetLessonState,
  submitBatchLessonScore,
  submitLessonScore,
  updateLocalProgress,
} from "@/store/activeLessonSlice"

import DictationPanel from "../components/DictationPanel"
import DictationTranscript from "../components/DictationTranscript"
import { useLessonMode } from "@/features/learnmode/hooks/useLessonMode"
import LessonModeLayout from "@/features/learnmode/components/LessonModeLayout"
import type { LearningMode } from "@/types/lessonProgress"
import { useTranslation } from "react-i18next"

const DictationMode = () => {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  
  // Bộ nhớ đệm lưu trữ dữ liệu text đang gõ dở dang của từng câu
  const tempAnswersRef = useRef<Record<number, string>>({})
  
  const handleUpdateCompletion = useCallback(
    (args: { sentenceId: number; score: number; mode: LearningMode }) => 
        updateLocalProgress(args),
    []
  )
  
  /**
   * Khởi tạo Custom Hook quản lý trạng thái bài học Dictation.
   * Cấu hình captureKeysInEditable = true để bật tính năng điều hướng khi gõ văn bản.
   */
  const mode = useLessonMode({
    lessonId: id,
    selector: (state) => state.activeLesson.lesson,
    fetchAction: fetchLessonById,
    resetAction: resetLessonState,
    submitScore: submitLessonScore,
    submitBatchScore: submitBatchLessonScore,
    updateLocalProgress: handleUpdateCompletion,
    progressKey: "dictation",
    modeName: "DICTATION",
    captureKeysInEditable: true,
  })

  const {
    lesson,
    currentSentence,
    activeIndex,
    sentences,
    completedIdsSet,
    handleNext,
    userInteracted,
    handleCompleteSentence,
    handleSelectSentence,
    effectiveShowTranscript,
    handleTogglePlayPause,
    isPlaying
  } = mode

  // TÍNH TOÁN ĐIỂM KỶ LỤC CỦA CÂU HIỆN TẠI TỪ REDUX STORE
  const highestScore = useMemo(() => {
    return lesson?.progressOverview?.dictation?.progressItems?.[currentSentence?.id]?.bestScore ?? 0
  }, [lesson?.progressOverview?.dictation?.progressItems, currentSentence?.id])

  // ĐỒNG BỘ: Tạo wrapper function chuẩn như bên Shadowing
  const handleComplete = useCallback(
    (sentenceId: number, score: number) => handleCompleteSentence(sentenceId, score),
    [handleCompleteSentence]
  )

  return (
    <LessonModeLayout
      mode={mode}
      i18nPrefix="dictation"
      contentLayout="sideBySide"
      completionDetails={
        <div className="border-y border-border/70 py-5 text-center">
          <div className="flex items-baseline justify-center gap-1 text-foreground">
            <span className="text-4xl font-semibold tracking-tight text-primary">{Math.round(lesson?.progressOverview?.dictation?.lessonScore ?? 0)}</span>
            <span className="text-sm font-medium text-muted-foreground">/100</span>
          </div>
          <div className="mt-1.5 text-center text-xs font-medium tracking-wide text-muted-foreground">
            {t("modals.bestAverage")}
          </div>
        </div>
      }
      panel={
        currentSentence && (
          <DictationPanel
            key="dictation-panel"
            sentence={currentSentence}
            onNext={handleNext}
            onComplete={handleComplete} 
            completed={completedIdsSet.has(currentSentence.id)}
            currentTemporaryAnswer={tempAnswersRef.current[currentSentence.id]}
            onTemporaryAnswerChange={(val) => {
              tempAnswersRef.current[currentSentence.id] = val
            }}
            userInteracted={userInteracted}
            onTogglePlayPause={handleTogglePlayPause}
            isPlaying={isPlaying}
            highestScore={highestScore} 
          />
        )
      }
      transcript={
        <DictationTranscript
          sentences={sentences}
          activeIndex={activeIndex}
          onSelectSentence={handleSelectSentence}
          visible={effectiveShowTranscript}
          completedIds={completedIdsSet}
        />
      }
    />
  )
}

export default DictationMode
