// src/utils/lessonContentUtils.ts
import type { ILessonDetailsDto } from "@/types"

type ProcessingStep = ILessonDetailsDto["processingStep"]

const orderedSteps: ProcessingStep[] = [
  "NONE",
  "PROCESSING_STARTED",
  "SOURCE_FETCHED",
  "TRANSCRIBED",
  "NLP_ANALYZED",
  "COMPLETED",
]

const getStepLabel = (step: ProcessingStep): string => {
  switch (step) {
    case "NONE":
      return "Not started"
    case "PROCESSING_STARTED":
      return "Processing started"
    case "SOURCE_FETCHED":
      return "Source fetched"
    case "TRANSCRIBED":
      return "Transcribed"
    case "NLP_ANALYZED":
      return "NLP analyzed"
    case "COMPLETED":
      return "Completed"
    case "FAILED":
      return "Failed"
    default:
      return step
  }
}

/**
 * Meta cho thanh progress chính (header):
 * - label: mô tả step hiện tại / cuối cùng
 * - progress: % dựa trên step cuối cùng đã đạt tới
 */
const getProcessingMeta = (step: ProcessingStep) => {
  if (step === "FAILED") {
    return { label: "Failed", progress: 100 }
  }

  if (step === "NONE") {
    return { label: "Not started", progress: 0 }
  }

  const idx = orderedSteps.indexOf(step)
  const maxIndex = orderedSteps.length - 1 // COMPLETED index

  const safeIdx = idx < 0 ? 0 : idx
  const progress = Math.round((safeIdx / maxIndex) * 100)

  return {
    label: getStepLabel(step),
    progress,
  }
}

export { getProcessingMeta, getStepLabel, orderedSteps }
