import React, { useMemo } from "react"
import { cn } from "@/lib/utils"
import Alert from "@/components/Alert"
import { Sparkles, Target, Mic, BookOpen } from "lucide-react"
import type { IShadowingResult, IShadowingWordCompare } from "@/types"

interface ShadowingResultPanelProps {
  result: IShadowingResult
  className?: string
}

const getWordChipClasses = (compare: IShadowingWordCompare, lastPos: number) => {
  const attempted = compare.position <= lastPos

  if (!attempted) {
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
        "rounded-xl border bg-gradient-to-br from-muted/40 via-muted/20 to-primary/5 shadow-sm w-full",
        className
      )}
    >
      {/* Header - đồng bộ text-xs với PlayerControlPanel */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-primary/10">
            {weightedAccuracy >= 85 ? (
              <Sparkles className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Target className="h-3.5 w-3.5 text-primary" />
            )}
          </div>
          <span className="font-medium text-muted-foreground">
            Pronunciation Analysis
          </span>
        </div>
        
        {/* Score - đồng bộ text-xs */}
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold leading-none">
            {weightedAccuracy.toFixed(0)}
          </span>
          <span className="text-[10px] text-muted-foreground">%</span>
          <span className="text-[10px] text-muted-foreground mx-0.5">•</span>
          <span className="text-[10px] text-muted-foreground">
            {correctWords}/{totalWords}
          </span>
        </div>
      </div>

      {/* Alert feedback - text-xs */}
      <div className="px-3 pt-2">
        <Alert
          variant={alertVariant}
          size="md"
          showIcon
          description={alertDescription}
          className="py-1.5"
        />
      </div>

      {/* Word chips - text-[10px] như trong PlayerControlPanel */}
      <div className="grid grid-cols-2 gap-3 p-3">
        {/* Target sentence */}
        <div className="rounded-lg bg-background/50 p-2">
          <p className="mb-1.5 text-[13px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            Target
          </p>
          <div className="flex flex-wrap gap-1">
            {expectedWordsWithClasses.map((c) => (
              <span
                key={`exp-${c.position}`}
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium leading-relaxed",
                  c.chipClasses
                )}
              >
                {c.expectedWord}
              </span>
            ))}
          </div>
        </div>

        {/* You said */}
        <div className="rounded-lg bg-background/50 p-2">
          <p className="mb-1.5 text-[13px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Mic className="h-3 w-3" />
            Said
          </p>
          <div className="flex flex-wrap gap-1">
            {recognizedWordsWithClasses.map((c) => (
              <span
                key={`rec-${c.position}-${c.recognizedWord}`}
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[12px] leading-relaxed",
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