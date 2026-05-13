// src/pages/DictationMode.tsx

import { useCallback, useRef } from "react"
import { useParams } from "react-router-dom"
import {
  fetchLessonByIdForDictation,
  resetLessonState,
  submitBatchDictationScore,
  submitDictationScore,
  updateDictationCompletion,
} from "@/store/lessonForDictationSlide"
import DictationPanel from "../components/DictationPanel"
import DictationTranscript from "../components/DictationTranscript"
import { useLessonMode } from "@/features/learnmode/hooks/useLessonMode"
import LessonModeLayout from "@/features/learnmode/components/LessonModeLayout"

const DictationMode = () => {
  const { id } = useParams<{ id: string }>()
  const tempAnswersRef = useRef<Record<number, string>>({})

  const updateCompletion = useCallback(
    (sentenceId: number) => updateDictationCompletion({ sentenceId }),
    []
  )

  const mode = useLessonMode({
    lessonId: id,
    selector: (state) => state.lessonForDictation.lesson,
    fetchAction: fetchLessonByIdForDictation,
    resetAction: resetLessonState,
    submitScore: submitDictationScore,
    submitBatchScore: submitBatchDictationScore,
    updateCompletion,
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
            onSubmit={(score) => handleCompleteSentence(currentSentence.id, score)}
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