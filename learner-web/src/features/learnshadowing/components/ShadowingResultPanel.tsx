import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Sparkles, Target } from "lucide-react"
import type { IShadowingResult, IDiffToken } from "@/types"

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { SHADOWING_THRESHOLD } from "./ActiveSentencePanel"
import SkeletonBlock from "@/components/SkeletonBlock"

interface Props {
  result: IShadowingResult | null
  className?: string
  isLoading: boolean
}

const getWordClass = (status: string, attempted: boolean) => {
  if (!attempted) return "text-muted-foreground/40"
  switch (status) {
    case "CORRECT": return "text-emerald-600 font-medium"
    case "NEAR": return "text-blue-500 font-medium underline decoration-wavy decoration-blue-300 decoration-[1.5px] underline-offset-2"
    case "WRONG": return "text-red-500 font-semibold underline decoration-wavy decoration-red-300 decoration-[1.5px] underline-offset-2"
    case "MISSING": return "text-slate-400 italic border-b border-dashed border-slate-300 underline-offset-2"
    case "EXTRA": return "text-amber-500 text-xs italic border-b border-dashed border-amber-300 underline-offset-2"
    default: return ""
  }
}

// 👉 BLACKLIST RÁC: Chỉ tàng hình những ký tự thực sự không mang giá trị âm vị học
const NOISE_PHONEMES = ["", " ", "ː", "ˑ"]

// 👉 SEMANTIC COLOR MAPPING TỐI GIẢN
const getTokenColorClass = (token: IDiffToken): string => {
  switch (token.type) {
    // 1. Phonemes
    case "MATCH": return "text-emerald-600"
    case "MISMATCH": return "text-red-500 font-semibold"
    case "MISSING": return "text-slate-400"
    case "EXTRA": return "text-amber-500 line-through text-[80%] opacity-80" // Style nhẹ lại để không làm rối UI
    
    // 2. Stress (Clean UI - Đúng 2 trạng thái Correct vs Wrong)
    case "STRESS_MATCH": return "text-emerald-500 font-extrabold text-[110%]"
    case "STRESS_WRONG": return "text-red-500 font-extrabold text-[110%]" 
    
    // 3. Punctuation
    case "PUNCT": return "text-slate-300 font-light" 
      
    default: return "text-muted-foreground"
  }
}

// 👉 THÔNG MINH LẤY TEXT: Ưu tiên expected (Kể cả STRESS_WRONG bị missing). Nếu expected không có, lấy actual.
const getTokenDisplayText = (token: IDiffToken): string => {
  return token.expected_ipa || token.expected || token.actual_ipa || token.actual || ""
}

// 👉 FILTER LỌC STRESS TRÙNG LẶP: Mỗi từ chỉ hiện tối đa 1 STRESS (Ưu tiên MATCH)
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

// Render IPA cho toàn câu từ diff_tokens
const renderSentenceIpaFromDiff = (compares: IShadowingResult['compares'], lastRecognizedPosition: number) => {
  const elements: React.ReactNode[] = []

  compares.forEach((c, idx) => {
    const attempted = c.position <= lastRecognizedPosition

    // EXTRA TỪ LỚN
    if (c.status === "EXTRA") {
      if (attempted) {
        const extraIpa = c.phonemeDiff?.actual_ipa || c.recognizedWord || ""
        elements.push(
          <span key={`ipa-${idx}`} className="inline-block mx-2 font-mono text-amber-500 line-through">
            {extraIpa}
          </span>
        )
      }
      return
    }

    // Chưa đọc: hiển thị màu xám
    if (!attempted) {
      const ipaText = c.phonemeDiff?.expected_ipa || c.expectedWord || ""
      elements.push(
        <span key={`ipa-${idx}`} className="inline-block mx-2 font-mono text-muted-foreground/40">
          {ipaText}
        </span>
      )
      return
    }

    const diffTokens = c.phonemeDiff?.diff_tokens

    if (!diffTokens || diffTokens.length === 0) {
      const ipaText = c.phonemeDiff?.expected_ipa || c.expectedWord || ""
      let colorClass = "text-emerald-600"
      if (c.status === "MISSING") colorClass = "text-slate-400"
      else if (c.status === "NEAR" || c.status === "WRONG") colorClass = "text-red-500 font-semibold"
      elements.push(
        <span key={`ipa-${idx}`} className={cn("inline-block mx-2 font-mono", colorClass)}>
          {ipaText}
        </span>
      )
      return
    }

    // 🎯 Áp dụng Filter STRESS
    const normalizedTokens = normalizeStressTokens(diffTokens)
    const tokenElements: React.ReactNode[] = []
    
    normalizedTokens.forEach((token, tokenIdx) => {
      const displayText = getTokenDisplayText(token)
      if (!displayText) return

      // 🔥 FIX CHUẨN PRODUCTION: Giữ lại toàn bộ EXTRA Phoneme của user để học, chỉ lọc bỏ rác thực sự
      if (token.type === "EXTRA" && NOISE_PHONEMES.includes(displayText)) {
        return 
      }

      tokenElements.push(
        <span key={`token-${idx}-${tokenIdx}`} className={cn("inline-block", getTokenColorClass(token))}>
          {displayText}
        </span>
      )
    })

    elements.push(
      <span key={`ipa-${idx}`} className="inline-flex mx-2 font-mono">
        {tokenElements}
      </span>
    )
  })

  return <div className="font-mono text-xl font-medium tracking-wide leading-relaxed break-all">{elements}</div>
}

const YourResultTab: React.FC<{ result: IShadowingResult }> = ({ result }) => {
  const { weightedAccuracy, fluencyScore, correctWords, totalWords, compares, lastRecognizedPosition } = result
  const isExcellent = weightedAccuracy >= SHADOWING_THRESHOLD.NEXT
  const isGood = weightedAccuracy >= SHADOWING_THRESHOLD.GOOD_SOUND
  const [openPopoverPosition, setOpenPopoverPosition] = useState<number | null>(null)
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            isExcellent ? "bg-emerald-100" : isGood ? "bg-amber-100" : "bg-red-100"
          )}>
            {isExcellent ? <Sparkles className="h-5 w-5 text-emerald-600" /> : <Target className={cn("h-5 w-5", isGood ? "text-amber-600" : "text-red-500")} />}
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold">{weightedAccuracy.toFixed(0)}%</span>
            </div>
            <p className="text-xs text-muted-foreground">Accuracy ({correctWords}/{totalWords})</p>
          </div>
        </div>
        <div className="flex flex-col items-end border-l pl-4 border-border/50">
          <span className="text-2xl font-bold text-primary">{Math.round((fluencyScore || 0) * 100)}%</span>
          <span className="text-xs text-muted-foreground">Fluency</span>
        </div>
      </div>

      <div className="h-px bg-border/50" />

      <div className="flex flex-wrap items-end gap-x-3 gap-y-4">
        {compares.map((c) => {
          const attempted = c.position <= lastRecognizedPosition
          const isExtra = c.status === "EXTRA"
          const hasError = !isExtra && c.status !== "CORRECT" && attempted && c.recognizedWord

          return (
            <Popover
              open={openPopoverPosition === c.position}
              onOpenChange={(open) => setOpenPopoverPosition(open ? c.position : null)}
              key={c.position}
            >
              <div className="flex flex-col items-center">
                <PopoverTrigger
                  asChild
                  onClick={() => setOpenPopoverPosition((prev) => prev === c.position ? null : c.position)}
                  onMouseEnter={() => {
                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                    setOpenPopoverPosition(c.position)
                  }}
                  onMouseLeave={() => {
                    hoverTimeoutRef.current = setTimeout(() => setOpenPopoverPosition(null), 120)
                  }}
                >
                  <div className="flex flex-col items-center cursor-pointer">
                    {isExtra && c.recognizedWord ? (
                      <span className={cn(getWordClass(c.status, attempted), "mb-0.5 text-xs")}>
                        +{c.recognizedWord}
                      </span>
                    ) : hasError ? (
                      <span className="text-muted-foreground line-through text-sm mb-0.5">
                        {c.recognizedWord}
                      </span>
                    ) : (
                      <span className="h-5" />
                    )}
                    <span className={cn("text-lg", getWordClass(c.status, attempted))}>
                      {isExtra ? "" : c.expectedWord || "_"}
                    </span>
                  </div>
                </PopoverTrigger>
              </div>

              <PopoverContent className="w-auto p-3" sideOffset={5}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("text-base font-medium", getWordClass(c.status, attempted))}>
                      {c.expectedWord || c.recognizedWord}
                    </div>
                    {c.phonemeDiff?.score !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                        {(c.phonemeDiff.score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {c.status !== "EXTRA" && (
                    <div className="text-sm">
                      <div className="text-muted-foreground text-xs mb-0.5">Expected IPA:</div>
                      <div className="font-mono text-emerald-700 break-all">
                        {c.phonemeDiff?.expected_ipa || "—"}
                      </div>
                    </div>
                  )}

                  {(c.status === "NEAR" || c.status === "WRONG" || c.status === "EXTRA") && (
                    <div className="text-sm">
                      <div className="text-muted-foreground text-xs mb-0.5">Your IPA:</div>
                      <div className="font-mono text-red-600 break-all">
                        {c.phonemeDiff?.actual_ipa || (c.status === "EXTRA" ? c.recognizedWord : "—")}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )
        })}
      </div>

      <div className="mt-2 flex flex-col gap-2 rounded-xl bg-muted/30 p-4 border border-border/50">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Pronunciation Sequence
        </h4>
        {renderSentenceIpaFromDiff(compares, lastRecognizedPosition)}
      </div>
    </div>
  )
}

const ShadowingResultPanel: React.FC<Props> = ({ result, className, isLoading }) => {
  if (isLoading) {
    return (
      <div className={cn("rounded-2xl border bg-card p-4 flex flex-col gap-4 w-full", className)}>
        <SkeletonBlock className="h-6 w-1/3" />
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-10 w-2/3" />
      </div>
    )
  }
  if (!result) {
    return (
      <div className={cn("rounded-2xl border bg-card p-4 flex flex-col gap-4 w-full", className)}>
        <div className="text-center text-sm text-muted-foreground py-8">No result yet. Record your voice to see feedback.</div>
      </div>
    )
  }
  return (
    <div className={cn("rounded-2xl border bg-card p-4 flex flex-col gap-4 w-full", className)}>
      <YourResultTab result={result} />
    </div>
  )
}

export default React.memo(ShadowingResultPanel)