// src/pages/ShadowingMode.tsx

import { useCallback } from "react"
import { useParams } from "react-router-dom"
import {
  fetchLessonByIdForShadowing,
  resetLessonState,
  submitBatchShadowingScore,
  submitShadowingScore,
  updateSentenceCompletion,
} from "@/store/lessonForShadowingSlide"
import ActiveSentencePanel from "../components/ActiveSentencePanel"
import ShadowingTranscript from "../components/ShadowingTranscript"
import { useLessonMode } from "@/features/learnmode/hooks/useLessonMode"
import LessonModeLayout from "@/features/learnmode/components/LessonModeLayout"

const ShadowingMode = () => {
  const { id } = useParams<{ id: string }>()

  const updateCompletion = useCallback(
    (sentenceId: number) => updateSentenceCompletion({ sentenceId, completed: true }),
    []
  )

  const mode = useLessonMode({
    lessonId: id,
    selector: (state) => state.lessonForShadowing.lesson,
    fetchAction: fetchLessonByIdForShadowing,
    resetAction: resetLessonState,
    submitScore: submitShadowingScore,
    submitBatchScore: submitBatchShadowingScore,
    updateCompletion,
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

  const handleComplete = useCallback(
    (sentenceId: number, _fluency: number, score: number) => handleCompleteSentence(sentenceId, score),
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
