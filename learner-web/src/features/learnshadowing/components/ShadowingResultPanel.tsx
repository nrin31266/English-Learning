// ShadowingResultPanel.tsx
import React, { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Sparkles, Target, BookA } from "lucide-react"
import type { IShadowingResult, IDiffToken } from "@/types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SHADOWING_THRESHOLD } from "./ActiveSentencePanel"
import SkeletonBlock from "@/components/SkeletonBlock"

interface Props {
  result: IShadowingResult | null
  className?: string
  isLoading: boolean
  expectedPhonetic?: string | null
}

const NOISE_PHONEMES = ["", " ", "ː", "ˑ", "None"]

// Typography configs
const IPA_TYPOGRAPHY = "font-sans text-[17px] sm:text-[19px] font-medium tracking-[0.03em]"
const WORD_TYPOGRAPHY = "text-[17px] sm:text-[20px] md:text-[24px] font-medium leading-tight"
const ERROR_TYPOGRAPHY = "text-[12px] sm:text-[13px] font-medium tracking-wide"

const getWordClass = (status: string, attempted: boolean) => {
  if (!attempted) return "text-muted-foreground/40"
  switch (status) {
    case "CORRECT": return "text-emerald-600 font-medium"
    case "NEAR": return "text-blue-500 font-medium underline decoration-blue-300 underline-offset-4"
    case "WRONG": return "text-red-500 font-medium underline decoration-red-300 underline-offset-4"
    case "MISSING": return "text-slate-400 border-b border-dashed border-slate-300 opacity-80"
    default: return ""
  }
}

const getTokenColorClass = (token: IDiffToken, showExtra: boolean): string => {
  switch (token.type) {
    case "MATCH": return "text-emerald-600"
    case "MISMATCH": return "text-red-500 font-medium"
    case "MISSING": return "text-slate-400 opacity-70"
    case "EXTRA": return showExtra ? "text-amber-500 line-through opacity-80 text-[0.9em]" : "hidden"
    case "STRESS_MATCH": return "text-emerald-600 font-bold"
    case "STRESS_WRONG": return "text-red-600 font-bold"
    case "PUNCT": return "text-slate-300"
    default: return "text-muted-foreground"
  }
}

const getTokenDisplayText = (token: IDiffToken): string => {
  const exp = token.expected_ipa || token.expected || ""
  const act = token.actual_ipa || token.actual || ""
  
  if (exp && exp !== "None") return exp
  if (act && act !== "None") return act
  return ""
}

const IpaRenderer = React.memo(({ 
  compares, 
  lastRecognizedPosition = 0, 
  expectedPhonetic,
  showOriginal,
  showExtra
}: { 
  compares?: IShadowingResult['compares'], 
  lastRecognizedPosition?: number,
  expectedPhonetic?: string | null,
  showOriginal: boolean,
  showExtra: boolean
}) => {
  const wordGroupClass = "underline decoration-muted-foreground/40 underline-offset-[5px] decoration-1"
  const spaceElement = <span className="select-none inline-block w-2 sm:w-2.5" />

  // Render raw IPA from dictionary if requested or no result available
  if (!compares || compares.length === 0 || showOriginal) {
    if (!expectedPhonetic) {
      return <span className="text-sm text-muted-foreground/50 italic">No phonetic data</span>
    }

    const originalWords = expectedPhonetic.split(/\s+/).filter(w => w.trim() !== "")

    return (
      <div className={cn("w-full wrap-break-word text-center leading-loose", IPA_TYPOGRAPHY)}>
        <span className="text-muted-foreground/50 select-none mr-1.5">/</span>
        {originalWords.map((word, idx) => (
          <React.Fragment key={`orig-${idx}`}>
            {idx > 0 && spaceElement}
            <span className={cn("inline-block text-foreground/80", wordGroupClass)}>
              {word}
            </span>
          </React.Fragment>
        ))}
        <span className="text-muted-foreground/50 select-none ml-1.5">/</span>
      </div>
    )
  }

  // Filter out completely EXTRA words if not requested
  const filteredCompares = showExtra 
    ? compares 
    : compares.filter(c => c.status !== "EXTRA")

  return (
    <div className={cn("w-full wrap-break-word text-center leading-loose", IPA_TYPOGRAPHY)}>
      <span className="text-muted-foreground/50 select-none mr-1.5">/</span>
      
      {filteredCompares.map((c, idx) => {
        const attempted = c.position <= lastRecognizedPosition

        // Handle completely extra word recognized by user
        if (c.status === "EXTRA" && showExtra) {
          const extraText = c.phonemeDiff?.actual_ipa || c.recognizedWord || ""
          if (!extraText || extraText === "None") return null
          return (
            <React.Fragment key={`ipa-${idx}`}>
              {idx > 0 && spaceElement}
              <span className={cn("inline-block text-amber-500 line-through opacity-80 text-[0.9em]", wordGroupClass)}>
                {extraText}
              </span>
            </React.Fragment>
          )
        }

        if (c.status === "EXTRA" && !showExtra) return null

        // Handle unattempted words (grayed out)
        if (!attempted) {
          const ipaText = c.phonemeDiff?.expected_ipa || c.expectedWord || ""
          return (
            <React.Fragment key={`ipa-${idx}`}>
              {idx > 0 && spaceElement}
              <span className={cn("inline-block text-muted-foreground/40", wordGroupClass)}>
                {ipaText}
              </span>
            </React.Fragment>
          )
        }

        // Handle words without specific diff tokens (fallback)
        const diffTokens = c.phonemeDiff?.diff_tokens
        if (!diffTokens || diffTokens.length === 0) {
          const ipaText = c.phonemeDiff?.expected_ipa || c.expectedWord || ""
          let colorClass = "text-emerald-600"
          if (c.status === "MISSING") colorClass = "text-slate-400"
          else if (c.status === "NEAR" || c.status === "WRONG") colorClass = "text-red-500"
          
          return (
            <React.Fragment key={`ipa-${idx}`}>
              {idx > 0 && spaceElement}
              <span className={cn("inline-block", colorClass, wordGroupClass)}>
                {ipaText}
              </span>
            </React.Fragment>
          )
        }

        // Render phoneme diff tokens naturally
        const displayTokens = showExtra ? diffTokens : diffTokens.filter(t => t.type !== "EXTRA")
        
        return (
          <React.Fragment key={`ipa-${idx}`}>
            {idx > 0 && spaceElement}
            <span className={cn("inline-block", wordGroupClass)}>
              {displayTokens.map((token, tokenIdx) => {
                const displayText = getTokenDisplayText(token as IDiffToken)
                if (!displayText || NOISE_PHONEMES.includes(displayText)) return null
                return (
                  <span key={`token-${idx}-${tokenIdx}`} className={getTokenColorClass(token as IDiffToken, showExtra)}>
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
})
IpaRenderer.displayName = "IpaRenderer"

const WordItem = React.memo(({ c, attempted }: { c: any, attempted: boolean }) => {
  const [isOpen, setIsOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const isExtra = c.status === "EXTRA"
  const hasError = !isExtra && c.status !== "CORRECT" && attempted && c.recognizedWord

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
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
      <div className="flex flex-col items-center px-0.5 opacity-60">
        <div className="min-h-5 flex items-end justify-center mb-0.5">
          <span className={cn("text-amber-500 leading-none", ERROR_TYPOGRAPHY)}>
            {c.recognizedWord}
          </span>
        </div>
        <span className="text-amber-500 text-[14px] sm:text-[16px] leading-none font-medium">
          {"+"}
        </span>
      </div>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex flex-col items-center">
        <PopoverTrigger asChild>
          <div
            className="flex flex-col items-center cursor-pointer group hover:bg-muted/30 rounded px-1 transition-colors"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="min-h-5 flex items-end justify-center mb-0.5 whitespace-nowrap">
              {hasError ? (
                <span className={cn("text-muted-foreground/60 line-through leading-none", ERROR_TYPOGRAPHY)}>
                  {c.recognizedWord}
                </span>
              ) : null}
            </div>
            <span className={cn(WORD_TYPOGRAPHY, "leading-none", getWordClass(c.status, attempted))}>
              {c.expectedWord || "_"}
            </span>
          </div>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto min-w-40 p-3 rounded-lg border-border/60 shadow-md" sideOffset={6}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2">
            <span className={cn("text-[15px] font-bold tracking-wide", getWordClass(c.status, attempted))}>
              {c.expectedWord || c.recognizedWord}
            </span>
            {c.phonemeDiff?.score !== undefined && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {Math.max(0, c.phonemeDiff.score * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-1">
            <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/70">Correct</span>
            <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/70">You said</span>
            <span className="font-mono text-emerald-600 text-[14px] font-medium">/{c.phonemeDiff?.expected_ipa || "—"}/</span>
            <span className="font-mono text-red-500 text-[14px] font-medium">/{c.phonemeDiff?.actual_ipa || "—"}/</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
})
WordItem.displayName = "WordItem"

const YourResultTab = React.memo(({ result }: { result: IShadowingResult }) => {
  const { weightedAccuracy, fluencyScore, compares, lastRecognizedPosition } = result
  const isExcellent = weightedAccuracy >= SHADOWING_THRESHOLD.NEXT
  const isGood = weightedAccuracy >= SHADOWING_THRESHOLD.GOOD_SOUND

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 px-2 py-0.5">
        <div className="flex items-center gap-2">
          {isExcellent ? 
            <Sparkles className="h-4 w-4 text-emerald-500" /> : 
            <Target className={cn("h-4 w-4", isGood ? "text-amber-500" : "text-red-500")} />
          }
          <span className="text-[24px] sm:text-[26px] leading-none font-bold tracking-tight">{weightedAccuracy.toFixed(0)}%</span>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Accuracy</span>
        </div>
        <div className="h-6 w-px bg-border/60 mx-2" />
        <div className="flex items-center gap-2">
          <span className="text-[24px] sm:text-[26px] leading-none font-bold tracking-tight text-sky-600">{Math.round(fluencyScore * 100)}%</span>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Fluency</span>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-center md:justify-start gap-x-1.5 sm:gap-x-2 gap-y-2 px-0.5">
        {compares.map((c) => {
          const attempted = c.position <= lastRecognizedPosition
          return <WordItem key={c.position} c={c} attempted={attempted} />
        })}
      </div>
    </div>
  )
})
YourResultTab.displayName = "YourResultTab"

const ShadowingResultPanel: React.FC<Props> = ({ result, className, isLoading, expectedPhonetic }) => {
  const [showOriginalIpa, setShowOriginalIpa] = useState(false)
  const [showExtraIpa, setShowExtraIpa] = useState(false)

  return (
    <div className={cn("rounded-xl border bg-card p-4 w-full flex flex-col gap-0", className)}>
      
      {/* SECTION 1: PHONETIC */}
      <div className="flex flex-col gap-3 pb-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <BookA className="w-4 h-4 text-muted-foreground/70" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Pronunciation</span>
          </div>
          {(result && !isLoading) && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={showOriginalIpa}
                  onChange={(e) => setShowOriginalIpa(e.target.checked)}
                  className="w-4 h-4 rounded border-muted-foreground/30 accent-primary cursor-pointer"
                />
                <span className="text-[12px] font-semibold tracking-wide text-muted-foreground group-hover:text-foreground transition-colors">Dictionary</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={showExtraIpa}
                  onChange={(e) => setShowExtraIpa(e.target.checked)}
                  className="w-4 h-4 rounded border-muted-foreground/30 accent-amber-500 cursor-pointer"
                />
                <span className="text-[12px] font-semibold tracking-wide text-amber-600 group-hover:text-amber-500 transition-colors">+ Extra sounds</span>
              </label>
            </div>
          )}
        </div>

        <div className="min-h-[60px] flex items-center justify-center rounded-lg bg-muted/20 px-4 py-3 border border-border/40 shadow-sm">
          <IpaRenderer 
            compares={result?.compares} 
            lastRecognizedPosition={result?.lastRecognizedPosition}
            expectedPhonetic={expectedPhonetic}
            showOriginal={showOriginalIpa}
            showExtra={showExtraIpa}
          />
        </div>
      </div>

      {/* SECTION 2: CONTENT */}
      <div className="min-h-[100px] pt-4 border-t border-border/50">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <SkeletonBlock className="h-10 w-full rounded-md" />
            <SkeletonBlock className="h-14 w-full rounded-md" />
          </div>
        ) : !result ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-[15px] font-medium text-muted-foreground/60 tracking-wide text-center">
              You can see your shadowing result here after you finish practicing!
            </span>
          </div>
        ) : (
          <YourResultTab result={result} />
        )}
      </div>
    </div>
  )
}

export default React.memo(ShadowingResultPanel)