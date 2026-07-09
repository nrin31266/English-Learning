// src/pages/shadowing/components/ShadowingResultPanel.tsx

import React, { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Target, BookA, Activity } from "lucide-react"
import type { IShadowingResult, IDiffToken } from "@/types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SHADOWING_THRESHOLD } from "./ActiveSentencePanel"
import SkeletonBlock from "@/components/SkeletonBlock"

interface Props {
  result: IShadowingResult | null
  className?: string
  isLoading: boolean
  expectedPhonetic?: string | null
  highestScore?: number
}

const NOISE_PHONEMES = ["", " ", "ː", "ˑ", "None"]

const IPA_TYPOGRAPHY =
  "font-sans text-[16px] sm:text-[18px] font-medium tracking-[0.035em]"

const WORD_TYPOGRAPHY =
  "text-[15px] sm:text-[17px] md:text-[19px] font-medium leading-tight"

const ERROR_TYPOGRAPHY =
  "text-[11px] sm:text-[12px] font-medium tracking-wide"

const getWordClass = (status: string, attempted: boolean) => {
  if (!attempted) return "text-muted-foreground/30"

  switch (status) {
    case "CORRECT":
      return "text-emerald-600 font-medium"
    case "NEAR":
      return "text-blue-500 font-medium underline decoration-blue-300 underline-offset-4"
    case "WRONG":
      return "text-red-500 font-medium underline decoration-red-300 underline-offset-4"
    case "MISSING":
      return "text-muted-foreground/45 font-medium border-b border-dashed border-muted-foreground/30"
    default:
      return "text-foreground"
  }
}

const getTokenColorClass = (token: IDiffToken, showExtra: boolean): string => {
  switch (token.type) {
    case "MATCH":
      return "text-emerald-600"
    case "MISMATCH":
      return "text-red-500 font-medium"
    case "MISSING":
      return "text-muted-foreground/45"
    case "EXTRA":
      return showExtra ? "text-amber-500 opacity-80 text-[0.9em]" : "hidden"
    case "STRESS_MATCH":
      return "text-emerald-600 font-bold"
    case "STRESS_WRONG":
      return "text-red-600 font-bold"
    case "PUNCT":
      return "text-muted-foreground/35"
    default:
      return "text-muted-foreground"
  }
}

const getTokenDisplayText = (token: IDiffToken): string => {
  const exp = token.expected_ipa || token.expected || ""
  const act = token.actual_ipa || token.actual || ""

  if (exp && exp !== "None") return exp
  if (act && act !== "None") return act
  return ""
}

const IpaRenderer = React.memo(
  ({
    compares,
    lastRecognizedPosition = 0,
    expectedPhonetic,
    showOriginal,
    showExtra,
  }: {
    compares?: IShadowingResult["compares"]
    lastRecognizedPosition?: number
    expectedPhonetic?: string | null
    showOriginal: boolean
    showExtra: boolean
  }) => {
    const wordGroupClass =
      "underline decoration-muted-foreground/35 underline-offset-[5px] decoration-1"

    const spaceElement = (
      <span className="select-none inline-block w-2.5 sm:w-3.5" />
    )

    if (!compares || compares.length === 0 || showOriginal) {
      if (!expectedPhonetic) {
        return (
          <span className="text-sm text-muted-foreground/50 italic">
            No phonetic data
          </span>
        )
      }

      const originalWords = expectedPhonetic
        .split(/\s+/)
        .filter((w) => w.trim() !== "")

      return (
        <div
          className={cn(
            "w-full wrap-break-word text-center leading-loose",
            IPA_TYPOGRAPHY
          )}
        >
          <span className="text-muted-foreground/50 select-none mr-1.5">/</span>

          {originalWords.map((word, idx) => (
            <React.Fragment key={`orig-${idx}`}>
              {idx > 0 && spaceElement}
              <span
                className={cn(
                  "inline-block text-foreground/80",
                  wordGroupClass
                )}
              >
                {word}
              </span>
            </React.Fragment>
          ))}

          <span className="text-muted-foreground/50 select-none ml-1.5">/</span>
        </div>
      )
    }

    const filteredCompares = showExtra
      ? compares
      : compares.filter((c) => c.status !== "EXTRA")

    return (
      <div
        className={cn(
          "w-full wrap-break-word text-center leading-loose",
          IPA_TYPOGRAPHY
        )}
      >
        <span className="text-muted-foreground/50 select-none mr-1.5">/</span>

        {filteredCompares.map((c, idx) => {
          const attempted = c.position <= lastRecognizedPosition

          if (c.status === "EXTRA" && showExtra) {
            const extraText =
              c.phonemeDiff?.actual_ipa || c.recognizedWord || ""

            if (!extraText || extraText === "None") return null

            return (
              <React.Fragment key={`ipa-${idx}`}>
                {idx > 0 && spaceElement}
                <span
                  className={cn(
                    "inline-block text-amber-500 opacity-80 text-[0.9em]",
                    wordGroupClass
                  )}
                >
                  {extraText}
                </span>
              </React.Fragment>
            )
          }

          if (c.status === "EXTRA" && !showExtra) return null

          if (!attempted) {
            const ipaText = c.phonemeDiff?.expected_ipa || c.expectedWord || ""

            return (
              <React.Fragment key={`ipa-${idx}`}>
                {idx > 0 && spaceElement}
                <span
                  className={cn(
                    "inline-block text-muted-foreground/35",
                    wordGroupClass
                  )}
                >
                  {ipaText}
                </span>
              </React.Fragment>
            )
          }

          const diffTokens = c.phonemeDiff?.diff_tokens

          if (!diffTokens || diffTokens.length === 0) {
            const ipaText = c.phonemeDiff?.expected_ipa || c.expectedWord || ""

            let colorClass = "text-emerald-600"

            if (c.status === "MISSING") {
              colorClass = "text-muted-foreground/45"
            } else if (c.status === "NEAR" || c.status === "WRONG") {
              colorClass = "text-red-500"
            }

            return (
              <React.Fragment key={`ipa-${idx}`}>
                {idx > 0 && spaceElement}
                <span className={cn("inline-block", colorClass, wordGroupClass)}>
                  {ipaText}
                </span>
              </React.Fragment>
            )
          }

          const displayTokens = showExtra
            ? diffTokens
            : diffTokens.filter((t) => t.type !== "EXTRA")

          return (
            <React.Fragment key={`ipa-${idx}`}>
              {idx > 0 && spaceElement}
              <span className={cn("inline-block", wordGroupClass)}>
                {displayTokens.map((token, tokenIdx) => {
                  const displayText = getTokenDisplayText(token as IDiffToken)

                  if (!displayText || NOISE_PHONEMES.includes(displayText)) {
                    return null
                  }

                  return (
                    <span
                      key={`token-${idx}-${tokenIdx}`}
                      className={getTokenColorClass(
                        token as IDiffToken,
                        showExtra
                      )}
                    >
                      {displayText}
                    </span>
                  )
                })}
              </span>
            </React.Fragment>
          )
        })}

        <span className="text-muted-foreground/50 select-none ml-1.5">/</span>
      </div>
    )
  }
)

IpaRenderer.displayName = "IpaRenderer"

const WordItem = React.memo(({ c, attempted }: { c: any; attempted: boolean }) => {
  const [isOpen, setIsOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isExtra = c.status === "EXTRA"
  const hasError =
    !isExtra && c.status !== "CORRECT" && attempted && c.recognizedWord

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsOpen(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 120)
  }, [])

  if (isExtra) {
    return (
      <div className="flex flex-col items-center px-0.5 opacity-80">
        <div className="min-h-4 flex items-end justify-center mb-0.5">
          <span className={cn("text-amber-500 leading-none", ERROR_TYPOGRAPHY)}>
            {c.recognizedWord}
          </span>
        </div>

        <span className="text-amber-500 text-[13px] sm:text-[15px] leading-none font-medium">
          +
        </span>
      </div>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex flex-col items-center">
        <PopoverTrigger asChild>
          <div
            className="flex flex-col items-center cursor-pointer group hover:bg-muted/30 rounded px-0.5 transition-colors"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="min-h-4 flex items-end justify-center mb-0.5 whitespace-nowrap">
              {hasError ? (
                <span
                  className={cn(
                    "text-red-400/75 leading-none",
                    ERROR_TYPOGRAPHY
                  )}
                >
                  {c.recognizedWord}
                </span>
              ) : null}
            </div>

            <span
              className={cn(
                WORD_TYPOGRAPHY,
                "leading-none",
                getWordClass(c.status, attempted)
              )}
            >
              {c.expectedWord || "_"}
            </span>
          </div>
        </PopoverTrigger>
      </div>

      <PopoverContent
        className="w-auto min-w-40 p-3 rounded-lg border-border/60 shadow-md"
        sideOffset={6}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2">
            <span
              className={cn(
                "text-[15px] font-bold tracking-wide",
                getWordClass(c.status, attempted)
              )}
            >
              {c.expectedWord || c.recognizedWord}
            </span>

            {c.phonemeDiff?.score !== undefined && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {Math.max(0, c.phonemeDiff.score * 100).toFixed(0)}%
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-1">
            <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/70">
              Correct
            </span>
            <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/70">
              You said
            </span>

            <span className="font-mono text-emerald-600 text-[14px] font-medium">
              /{c.phonemeDiff?.expected_ipa || "—"}/
            </span>
            <span className="font-mono text-red-500 text-[14px] font-medium">
              /{c.phonemeDiff?.actual_ipa || "—"}/
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
})

WordItem.displayName = "WordItem"

const WordEvaluationList = React.memo(
  ({ result, showExtra }: { result: IShadowingResult; showExtra: boolean }) => {
    const visibleCompares = showExtra
      ? result.compares
      : result.compares.filter((c) => c.status !== "EXTRA")

    return (
      <div className="flex flex-wrap items-end justify-center md:justify-start gap-x-1 sm:gap-x-1.5 gap-y-1.5 px-0">
        {visibleCompares.map((c) => {
          const attempted = c.position <= result.lastRecognizedPosition

          return (
            <WordItem
              key={`${c.position}-${c.status}`}
              c={c}
              attempted={attempted}
            />
          )
        })}
      </div>
    )
  }
)

WordEvaluationList.displayName = "WordEvaluationList"

const ShadowingResultPanel: React.FC<Props> = ({
  result,
  className,
  isLoading,
  expectedPhonetic,
}) => {
  const [showOriginalIpa, setShowOriginalIpa] = useState(false)
  const [showExtraIpa, setShowExtraIpa] = useState(false)

  return (
    <div
      className={cn(
        "rounded-xl border bg-card w-full flex flex-col overflow-hidden",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-2 border-b border-border/50 bg-muted/10">
        <div className="flex items-center">
          {result && !isLoading ? (
            <div className="flex items-center divide-x divide-border/60">
              <div className="flex items-center gap-1.5 pr-2.5 sm:pr-3">
                <Target
                  className={cn(
                    "h-4 w-4",
                    result.weightedAccuracy >= SHADOWING_THRESHOLD.NEXT
                      ? "text-emerald-500"
                      : "text-red-500"
                  )}
                />

                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase leading-none tracking-widest mb-0.5">
                    Accuracy
                  </span>
                  <span className="text-sm font-bold leading-none">
                    {Math.round(result.weightedAccuracy)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pl-2.5 sm:pl-3">
                <Activity className="h-4 w-4 text-sky-500" />

                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase leading-none tracking-widest mb-0.5">
                    Fluency
                  </span>
                  <span className="text-sm font-bold leading-none text-sky-600">
                    {Math.round(result.fluencyScore * 100)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <BookA className="w-4 h-4 text-muted-foreground/70" />
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                Pronunciation
              </span>
            </div>
          )}
        </div>

        {result && !isLoading && (
          <div className="flex items-center gap-3 ml-auto">
            <label className="flex items-center gap-1.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={showOriginalIpa}
                onChange={(e) => setShowOriginalIpa(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-muted-foreground/30 accent-primary cursor-pointer"
              />
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide text-muted-foreground group-hover:text-foreground transition-colors leading-none">
                Dictionary
              </span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={showExtraIpa}
                onChange={(e) => setShowExtraIpa(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-muted-foreground/30 accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide text-amber-600 group-hover:text-amber-500 transition-colors leading-none">
                + Extra
              </span>
            </label>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 px-3 py-2.5">
        <div className="min-h-[32px] flex items-center justify-center overflow-x-auto">
          <IpaRenderer
            compares={result?.compares}
            lastRecognizedPosition={result?.lastRecognizedPosition}
            expectedPhonetic={expectedPhonetic}
            showOriginal={showOriginalIpa}
            showExtra={showExtraIpa}
          />
        </div>

        <div className="min-h-[48px] pt-1 border-t border-border/35">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <SkeletonBlock className="h-7 w-full rounded-md" />
              <SkeletonBlock className="h-8 w-full rounded-md" />
            </div>
          ) : !result ? (
            <div className="flex items-center justify-center py-4">
              <span className="text-[13px] font-medium text-muted-foreground/60 tracking-wide text-center">
                You can see your shadowing result here after you finish practicing!
              </span>
            </div>
          ) : (
            <WordEvaluationList result={result} showExtra={showExtraIpa} />
          )}
        </div>
      </div>
    </div>
  )
}

export default React.memo(ShadowingResultPanel)