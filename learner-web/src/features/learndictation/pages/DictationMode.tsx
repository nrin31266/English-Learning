// src/pages/DictationMode.tsx

import { useCallback, useRef } from "react"
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

const DictationMode = () => {
  const { id } = useParams<{ id: string }>()
  
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

  

  return (
    <LessonModeLayout
      mode={mode}
      i18nPrefix="dictation"
      panel={
        currentSentence && (
          <DictationPanel
            key="dictation-panel"
            sentence={currentSentence}
            onNext={handleNext}
            onComplete={(score) => handleCompleteSentence(currentSentence.id, score)}
            completed={completedIdsSet.has(currentSentence.id)}
            currentTemporaryAnswer={tempAnswersRef.current[currentSentence.id]}
            onTemporaryAnswerChange={(val) => {
              tempAnswersRef.current[currentSentence.id] = val
            }}
            userInteracted={userInteracted}
            onTogglePlayPause={handleTogglePlayPause}
            isPlaying={isPlaying}
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