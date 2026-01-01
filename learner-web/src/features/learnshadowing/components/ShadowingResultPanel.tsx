import React, { useMemo } from "react"
import { cn } from "@/lib/utils"
import Alert from "@/components/Alert"
import CircularProgressWithLabel from "@/components/CircularProgressWithLabelProps"
import { Sparkles, Target } from "lucide-react"
import type { IShadowingResult, IShadowingWordCompare } from "@/types"

interface ShadowingResultPanelProps {
  result: IShadowingResult
  className?: string
}

// Helper: màu cho từng status - pure function outside component
const getWordChipClasses = (
  compare: IShadowingWordCompare,
  lastPos: number
) => {
  const attempted = compare.position <= lastPos

  if (!attempted) {
    // Chưa đọc tới
    return "border border-dashed border-muted-foreground/30 text-muted-foreground/70 bg-muted/40"
  }

  switch (compare.status) {
    case "CORRECT":
      return "bg-emerald-50 text-emerald-800 border border-emerald-200"
    case "NEAR":
      return "bg-amber-50 text-amber-800 border border-amber-200"
    case "WRONG":
      return "bg-red-50 text-red-800 border border-red-200"
    case "MISSING":
      return "bg-slate-50 text-slate-500 border border-slate-200 italic"
    case "EXTRA":
      return "bg-blue-50 text-blue-800 border border-blue-200"
    default:
      return "bg-muted text-muted-foreground border border-muted"
  }
}

// Helper: chọn variant alert theo điểm
const getAlertVariant = (score: number) => {
  if (score >= 85) return "success" as const
  if (score >= 60) return "warning" as const
  return "destructive" as const
}

const ShadowingResultPanel: React.FC<ShadowingResultPanelProps> = ({
  result,
  className,
}) => {
  const {
    weightedAccuracy,
    correctWords,
    totalWords,
    compares,
    lastRecognizedPosition,
  } = result

  // Pre-calculate all classes once and memoize
  const expectedWordsWithClasses = useMemo(
    () =>
      compares
        .filter((c) => c.expectedWord)
        .map((c) => ({
          ...c,
          chipClasses: getWordChipClasses(c, lastRecognizedPosition),
        })),
    [compares, lastRecognizedPosition]
  )

  const recognizedWordsWithClasses = useMemo(
    () =>
      compares
        .filter((c) => c.recognizedWord)
        .map((c) => ({
          ...c,
          chipClasses: getWordChipClasses(c, lastRecognizedPosition),
        })),
    [compares, lastRecognizedPosition]
  )

  const alertVariant = useMemo(
    () => getAlertVariant(weightedAccuracy),
    [weightedAccuracy]
  )

  const alertDescription = useMemo(() => {
    if (weightedAccuracy >= 85)
      return "Very natural! You're matching this sentence really well."
    if (weightedAccuracy >= 60)
      return "Good job! A few words can be improved."
    return "Keep practicing this sentence — focus on the highlighted words."
  }, [weightedAccuracy])

  return (
    <div
      className={cn(
        "mt-2 space-y-3 rounded-xl border bg-gradient-to-br from-muted/40 via-muted/20 to-primary/5 p-4 shadow-md",
        className
      )}
    >
      {/* Header with icon */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-primary/10">
          {weightedAccuracy >= 85 ? (
            <Sparkles className="h-4 w-4 text-green-600" />
          ) : (
            <Target className="h-4 w-4 text-primary" />
          )}
        </div>
        <span className="text-sm font-semibold">Pronunciation Analysis</span>
      </div>

      {/* Top: score + summary */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CircularProgressWithLabel
          value={weightedAccuracy}
          size="sm"
          label="Pronunciation score"
          helperText={`${correctWords}/${totalWords} exact · ${weightedAccuracy.toFixed(
            1
          )}% overall`}
        />

        <Alert
          variant={alertVariant}
          size="sm"
          showIcon
          description={alertDescription}
          className="sm:max-w-[320px]"
        />
      </div>

      {/* Expected vs recognized by word */}
      <div className="space-y-3 text-xs">
        <div className="p-3 rounded-lg bg-background/50">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Target className="h-3 w-3" />
            Target sentence
          </p>
          <div className="flex flex-wrap gap-1.5">
            {expectedWordsWithClasses.map((c) => (
              <span
                key={`exp-${c.position}`}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                  c.chipClasses
                )}
              >
                {c.expectedWord}
              </span>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-background/50">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            You said
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recognizedWordsWithClasses.map((c) => (
              <span
                key={`rec-${c.position}-${c.recognizedWord}`}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px]",
                  c.chipClasses
                )}
              >
                {c.recognizedWord}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(ShadowingResultPanel)
