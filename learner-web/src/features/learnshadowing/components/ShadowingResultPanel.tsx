import React, { useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Sparkles, Target, Mic2 } from "lucide-react"
import type { IShadowingResult, IDiffToken } from "@/types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SHADOWING_THRESHOLD } from "./ActiveSentencePanel"
import SkeletonBlock from "@/components/SkeletonBlock"

interface Props {
  result: IShadowingResult | null
  className?: string
  isLoading: boolean
}

// ============ CONSTANTS ============
const NOISE_PHONEMES = ["", " ", "ː", "ˑ"]

// ============ UTILITY FUNCTIONS ============
const getWordClass = (status: string, attempted: boolean) => {
  if (!attempted) return "text-muted-foreground/40"
  switch (status) {
    case "CORRECT": return "text-emerald-600 font-medium"
    case "NEAR": return "text-blue-500 font-medium underline decoration-blue-300 underline-offset-4"
    case "WRONG": return "text-red-500 font-medium underline decoration-red-300 underline-offset-4"
    case "MISSING": return "text-slate-400 border-b border-dashed border-slate-300"
    case "EXTRA": return "text-amber-500 line-through opacity-80"
    default: return ""
  }
}

const getTokenColorClass = (token: IDiffToken): string => {
  switch (token.type) {
    case "MATCH": return "text-emerald-600"
    case "MISMATCH": return "text-red-500 font-medium"
    case "MISSING": return "text-slate-400 opacity-70"
    case "EXTRA": return "text-amber-500 line-through text-[11px] opacity-80"
    case "STRESS_MATCH": return "text-emerald-600 font-bold"
    case "STRESS_WRONG": return "text-red-600 font-bold"
    case "PUNCT": return "text-slate-300"
    default: return "text-muted-foreground"
  }
}

const getTokenDisplayText = (token: IDiffToken): string => {
  return token.expected_ipa || token.expected || token.actual_ipa || token.actual || ""
}

const normalizeStressTokens = (tokens: IDiffToken[]) => {
  const hasCorrect = tokens.some(t => t.type === "STRESS_MATCH")
  let used = false

  return tokens.filter(t => {
    if (t.type.startsWith("STRESS")) {
      if (used) return false
      if (hasCorrect) {
        if (t.type === "STRESS_MATCH") {
          used = true
          return true
        }
        return false
      } else {
        used = true
        return true
      }
    }
    return true
  })
}

// ============ IPA RENDERER ============
const IpaRenderer = ({ compares, lastRecognizedPosition }: { compares: IShadowingResult['compares'], lastRecognizedPosition: number }) => {
  return (
    <div className="flex flex-wrap justify-center md:justify-start gap-x-2 gap-y-2 leading-relaxed">
      {compares.map((c, idx) => {
        const attempted = c.position <= lastRecognizedPosition

        if (c.status === "EXTRA" && attempted) {
          const extraIpa = c.phonemeDiff?.actual_ipa || c.recognizedWord || ""
          return (
            <span key={`ipa-${idx}`} className="inline-block text-amber-500 line-through opacity-70 font-mono text-[13px] sm:text-base px-0.5">
              {extraIpa}
            </span>
          )
        }

        if (!attempted) {
          const ipaText = c.phonemeDiff?.expected_ipa || c.expectedWord || ""
          return (
            <span key={`ipa-${idx}`} className="inline-block text-muted-foreground/30 font-mono text-[13px] sm:text-base px-0.5">
              {ipaText}
            </span>
          )
        }

        const diffTokens = c.phonemeDiff?.diff_tokens

        if (!diffTokens || diffTokens.length === 0) {
          const ipaText = c.phonemeDiff?.expected_ipa || c.expectedWord || ""
          let colorClass = "text-emerald-600"
          if (c.status === "MISSING") colorClass = "text-slate-400"
          else if (c.status === "NEAR" || c.status === "WRONG") colorClass = "text-red-500"
          return (
            <span key={`ipa-${idx}`} className={cn("inline-block font-mono text-[13px] sm:text-base px-0.5", colorClass)}>
              {ipaText}
            </span>
          )
        }

        const normalizedTokens = normalizeStressTokens(diffTokens)

        return (
          <span key={`ipa-${idx}`} className="inline-block font-mono text-[13px] sm:text-base px-0.5">
            {normalizedTokens.map((token, tokenIdx) => {
              const displayText = getTokenDisplayText(token)
              if (!displayText) return null
              if (token.type === "EXTRA" && NOISE_PHONEMES.includes(displayText)) return null
              return (
                <span key={`token-${idx}-${tokenIdx}`} className={getTokenColorClass(token)}>
                  {displayText}
                </span>
              )
            })}
          </span>
        )
      })}
    </div>
  )
}

// ============ WORD POPOVER ============
const WordItem = ({ c, attempted }: { c: any, attempted: boolean, lastRecognizedPosition: number }) => {
  const [isOpen, setIsOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const isExtra = c.status === "EXTRA"
  const hasError = !isExtra && c.status !== "CORRECT" && attempted && c.recognizedWord

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsOpen(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 120)
  }, [])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex flex-col items-center">
        <PopoverTrigger asChild>
          <div
            className="flex flex-col items-center cursor-pointer group hover:bg-muted/30 rounded-md px-1 transition-colors"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Error line above */}
            <div className="min-h-[16px] flex items-center justify-center mb-0.5">
              {isExtra && c.recognizedWord ? (
                <span className="text-[10px] sm:text-[12px] font-medium text-amber-500 leading-none">
                  +{c.recognizedWord}
                </span>
              ) : hasError ? (
                <span className="text-[10px] sm:text-[12px] text-muted-foreground/50 line-through leading-none">
                  {c.recognizedWord}
                </span>
              ) : null}
            </div>
            
            {/* Main word */}
            <span className={cn(
              "text-base sm:text-xl md:text-2xl font-medium leading-tight",
              getWordClass(c.status, attempted)
            )}>
              {isExtra ? "" : c.expectedWord || "_"}
            </span>
          </div>
        </PopoverTrigger>
      </div>

      <PopoverContent className="w-auto min-w-[140px] p-2 rounded-lg" sideOffset={6}>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-1">
            <span className={cn("text-sm font-semibold", getWordClass(c.status, attempted))}>
              {c.expectedWord || c.recognizedWord}
            </span>
            {c.phonemeDiff?.score !== undefined && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted">
                {(c.phonemeDiff.score * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-1 text-xs">
            {c.status !== "EXTRA" && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] uppercase text-muted-foreground">Expected</span>
                <span className="font-mono text-emerald-600 text-[11px]">/{c.phonemeDiff?.expected_ipa || "—"}/</span>
              </div>
            )}
            {(c.status === "NEAR" || c.status === "WRONG" || c.status === "EXTRA") && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] uppercase text-muted-foreground">You said</span>
                <span className="font-mono text-red-500 text-[11px]">/{c.phonemeDiff?.actual_ipa || (c.status === "EXTRA" ? c.recognizedWord : "—")}/</span>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============ MAIN RESULT TAB ============
const YourResultTab: React.FC<{ result: IShadowingResult }> = ({ result }) => {
  const { weightedAccuracy, fluencyScore, correctWords, totalWords, compares, lastRecognizedPosition } = result
  const isExcellent = weightedAccuracy >= SHADOWING_THRESHOLD.NEXT
  const isGood = weightedAccuracy >= SHADOWING_THRESHOLD.GOOD_SOUND

  return (
    <div className="flex flex-col gap-3">
      {/* Score Card */}
      <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 border border-border/50">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5">
            {isExcellent ? 
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" /> : 
              <Target className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isGood ? "text-amber-500" : "text-red-500")} />
            }
            <span className="text-base sm:text-lg font-bold leading-none">{weightedAccuracy.toFixed(0)}%</span>
            <span className="text-[9px] sm:text-[10px] uppercase text-muted-foreground hidden sm:inline">
              Accuracy ({correctWords}/{totalWords})
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <Mic2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            <span className="text-base sm:text-lg font-bold text-primary leading-none">{Math.round((fluencyScore || 0) * 100)}%</span>
            <span className="text-[9px] sm:text-[10px] uppercase text-muted-foreground hidden sm:inline">Fluency</span>
          </div>
        </div>
      </div>

      {/* Words Grid */}
      <div className="flex flex-wrap justify-center md:justify-start gap-x-1.5 sm:gap-x-2.5 gap-y-2 sm:gap-y-3 px-1">
        {compares.map((c) => {
          const attempted = c.position <= lastRecognizedPosition
          return (
            <WordItem 
              key={c.position} 
              c={c} 
              attempted={attempted} 
              lastRecognizedPosition={lastRecognizedPosition}
            />
          )
        })}
      </div>

      {/* IPA Section */}
      <div className="mt-2 pt-3 border-t border-border/40">
        <IpaRenderer compares={compares} lastRecognizedPosition={lastRecognizedPosition} />
      </div>
    </div>
  )
}

// ============ MAIN COMPONENT ============
const ShadowingResultPanel: React.FC<Props> = ({ result, className, isLoading }) => {
  if (isLoading) {
    return (
      <div className={cn("rounded-xl border bg-card p-3 sm:p-4 flex flex-col gap-3 w-full", className)}>
        <SkeletonBlock className="h-10 w-full rounded-md" />
        <SkeletonBlock className="h-16 w-full" />
        <SkeletonBlock className="h-12 w-full" />
      </div>
    )
  }
  
  if (!result) {
    return (
      <div className={cn("rounded-xl border bg-card p-3 flex flex-col w-full", className)}>
        <div className="flex items-center justify-center py-6 text-muted-foreground/60 gap-2">
          <span className="text-xs">Record your voice for feedback</span>
        </div>
      </div>
    )
  }
  
  return (
    <div className={cn("rounded-xl border bg-card p-3 sm:p-4 w-full", className)}>
      <YourResultTab result={result} />
    </div>
  )
}

export default React.memo(ShadowingResultPanel)