// src/pages/ShadowingMode.tsx

import { useCallback } from "react"
import { useParams } from "react-router-dom"
import {
  fetchLessonById,
  resetLessonState,
  submitBatchLessonScore,
  submitLessonScore,
  updateLocalProgress,
} from "@/store/activeLessonSlice"

import ActiveSentencePanel from "../components/ActiveSentencePanel"
import ShadowingTranscript from "../components/ShadowingTranscript"
import { useLessonMode } from "@/features/learnmode/hooks/useLessonMode"
import LessonModeLayout from "@/features/learnmode/components/LessonModeLayout"

const ShadowingMode = () => {
  const { id } = useParams<{ id: string }>()

  /**
   * Khởi tạo Custom Hook quản lý trạng thái bài học Shadowing.
   * Liên kết trực tiếp các Action tương ứng từ activeLessonSlice.
   */
  const mode = useLessonMode({
    lessonId: id,
    selector: (state) => state.activeLesson.lesson,
    fetchAction: fetchLessonById,
    resetAction: resetLessonState,
    submitScore: submitLessonScore,
    submitBatchScore: submitBatchLessonScore,
    updateLocalProgress: updateLocalProgress,
    progressKey: "shadowing",
    modeName: "SHADOWING",
  })

  const {
    lesson,
    currentSentence,
    activeIndex,
    sentences,
    completedIdsSet,
    handlePause,
    handleNext,
    userInteracted,
    handleCompleteSentence,
    handleSelectSentence,
    effectiveShowTranscript,
  } = mode

  /**
   * Adapter bọc hàm xử lý tiến độ để Component con gọi dễ dàng.
   */
  const handleComplete = useCallback(
    (sentenceId: number, score: number) => handleCompleteSentence(sentenceId, score),
    [handleCompleteSentence]
  )

  return (
    <LessonModeLayout
      mode={mode}
      i18nPrefix="shadowing"
      panel={
        lesson &&
        currentSentence && (
          <ActiveSentencePanel
            lesson={lesson}
            activeIndex={activeIndex}
            handlePause={handlePause}
            onNext={handleNext}
            userInteracted={userInteracted}
            onComplete={handleComplete}
          />
        )
      }
      transcript={
        <ShadowingTranscript
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

export default ShadowingMode