import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Sparkles, Target, Mic2 } from "lucide-react"
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

// 👉 UI Gọn Gàng: Màu sắc và hiệu ứng gạch chân mỏng, không rườm rà
const getWordClass = (status: string, attempted: boolean) => {
  if (!attempted) return "text-muted-foreground/40"
  switch (status) {
    case "CORRECT": return "text-emerald-600 font-medium"
    case "NEAR": return "text-blue-500 font-medium underline decoration-blue-300 underline-offset-2"
    case "WRONG": return "text-red-500 font-medium underline decoration-red-300 underline-offset-2"
    case "MISSING": return "text-slate-400 opacity-60 border-b border-dashed border-slate-300"
    case "EXTRA": return "text-amber-500 text-xs line-through opacity-80"
    default: return ""
  }
}

const NOISE_PHONEMES = ["", " ", "ː", "ˑ"]

const getTokenColorClass = (token: IDiffToken): string => {
  switch (token.type) {
    case "MATCH": return "text-emerald-600"
    case "MISMATCH": return "text-red-500 font-medium"
    case "MISSING": return "text-slate-400 opacity-70"
    case "EXTRA": return "text-amber-500 line-through text-[10px] opacity-80" 
    case "STRESS_MATCH": return "text-emerald-600 font-bold"
    case "STRESS_WRONG": return "text-red-600 font-bold" 
    case "PUNCT": return "text-slate-300 font-light" 
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

const renderSentenceIpaFromDiff = (compares: IShadowingResult['compares'], lastRecognizedPosition: number) => {
  const elements: React.ReactNode[] = []

  compares.forEach((c, idx) => {
    const attempted = c.position <= lastRecognizedPosition

    if (c.status === "EXTRA") {
      if (attempted) {
        const extraIpa = c.phonemeDiff?.actual_ipa || c.recognizedWord || ""
        elements.push(
          <span key={`ipa-${idx}`} className="inline-block mx-1 font-mono text-amber-500 line-through opacity-70">
            {extraIpa}
          </span>
        )
      }
      return
    }

    if (!attempted) {
      const ipaText = c.phonemeDiff?.expected_ipa || c.expectedWord || ""
      elements.push(
        <span key={`ipa-${idx}`} className="inline-block mx-1 font-mono text-muted-foreground/30">
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
      else if (c.status === "NEAR" || c.status === "WRONG") colorClass = "text-red-500"
      elements.push(
        <span key={`ipa-${idx}`} className={cn("inline-block mx-1 font-mono", colorClass)}>
          {ipaText}
        </span>
      )
      return
    }

    const normalizedTokens = normalizeStressTokens(diffTokens)
    const tokenElements: React.ReactNode[] = []
    
    normalizedTokens.forEach((token, tokenIdx) => {
      const displayText = getTokenDisplayText(token)
      if (!displayText) return
      if (token.type === "EXTRA" && NOISE_PHONEMES.includes(displayText)) return 

      tokenElements.push(
        <span key={`token-${idx}-${tokenIdx}`} className={cn("inline-block", getTokenColorClass(token))}>
          {displayText}
        </span>
      )
    })

    elements.push(
      <span key={`ipa-${idx}`} className="inline-flex mx-1 font-mono">
        {tokenElements}
      </span>
    )
  })

  return <div className="font-mono text-sm sm:text-base tracking-wide leading-snug break-words">{elements}</div>
}

const YourResultTab: React.FC<{ result: IShadowingResult }> = ({ result }) => {
  const { weightedAccuracy, fluencyScore, correctWords, totalWords, compares, lastRecognizedPosition } = result
  const isExcellent = weightedAccuracy >= SHADOWING_THRESHOLD.NEXT
  const isGood = weightedAccuracy >= SHADOWING_THRESHOLD.GOOD_SOUND
  const [openPopoverPosition, setOpenPopoverPosition] = useState<number | null>(null)
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  return (
    <div className="flex flex-col gap-3">
      
      {/* 🎯 SCORE STRIP: Thanh điểm số siêu gọn 1 hàng ngang */}
      <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 border border-border/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {isExcellent ? <Sparkles className="h-4 w-4 text-emerald-500" /> : <Target className={cn("h-4 w-4", isGood ? "text-amber-500" : "text-red-500")} />}
            <span className="text-base sm:text-lg font-bold leading-none">{weightedAccuracy.toFixed(0)}%</span>
            <span className="text-[10px] uppercase text-muted-foreground hidden sm:inline-block">Accuracy ({correctWords}/{totalWords})</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <Mic2 className="h-4 w-4 text-primary" />
            <span className="text-base sm:text-lg font-bold text-primary leading-none">{Math.round((fluencyScore || 0) * 100)}%</span>
            <span className="text-[10px] uppercase text-muted-foreground hidden sm:inline-block">Fluency</span>
          </div>
        </div>
      </div>

      {/* 🎯 MAIN TEXT: Bố cục sát nhau nhưng KHÔNG BỊ DÍNH */}
      {/* 👉 Dùng flex-wrap và tăng gap-y lên một chút để tránh các dòng đè lên nhau */}
      <div className="flex flex-wrap items-end gap-x-1.5 sm:gap-x-2 gap-y-1.5 px-1 mt-1">
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
                  {/* 👉 BỎ ABSOLUTE: Chia mỗi từ thành 1 cột chứa 2 dòng (Lỗi ở trên, Chữ chính ở dưới) */}
                  <div className="flex flex-col items-center cursor-pointer group hover:bg-muted/30 rounded px-0.5 transition-colors">
                    
                    {/* KHU VỰC HIỂN THỊ LỖI (Dòng trên) */}
                    {/* 👉 Set min-h-[16px] để đảm bảo dòng trên luôn chiếm chỗ, kể cả khi từ đó đúng. Điều này giữ baseline luôn thẳng. */}
                    <div className="min-h-[16px] flex items-end justify-center mb-0.5 whitespace-nowrap">
                      {isExtra && c.recognizedWord ? (
                        <span className={cn(getWordClass(c.status, attempted), "text-[11px] font-semibold leading-none")}>
                          +{c.recognizedWord}
                        </span>
                      ) : hasError ? (
                        // Tăng size chữ gạch ngang lên text-[11px] để dễ nhìn
                        <span className="text-muted-foreground/70 line-through text-[11px] font-medium leading-none">
                          {c.recognizedWord}
                        </span>
                      ) : null}
                    </div>
                    
                    {/* CHỮ CHÍNH (Dòng dưới) */}
                    <span className={cn(
                      "text-lg sm:text-xl md:text-2xl transition-colors leading-none", 
                      getWordClass(c.status, attempted)
                    )}>
                      {isExtra ? "" : c.expectedWord || "_"}
                    </span>
                  </div>
                </PopoverTrigger>
              </div>

              {/* 🎯 POPOVER: Nhỏ gọn, sát chữ */}
              <PopoverContent className="w-auto min-w-[140px] p-2.5 rounded-lg shadow-md border-border/60" sideOffset={6}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-1.5">
                    <span className={cn("text-sm font-semibold", getWordClass(c.status, attempted))}>
                      {c.expectedWord || c.recognizedWord}
                    </span>
                    {c.phonemeDiff?.score !== undefined && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {(c.phonemeDiff.score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    {c.status !== "EXTRA" && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] uppercase text-muted-foreground">Expected</span>
                        <span className="font-mono text-emerald-600 font-medium">/{c.phonemeDiff?.expected_ipa || "—"}/</span>
                      </div>
                    )}
                    {(c.status === "NEAR" || c.status === "WRONG" || c.status === "EXTRA") && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] uppercase text-muted-foreground">You Said</span>
                        <span className="font-mono text-red-500 font-medium">/{c.phonemeDiff?.actual_ipa || (c.status === "EXTRA" ? c.recognizedWord : "—")}/</span>
                      </div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )
        })}
      </div>

      {/* 🎯 BẢNG PHIÊN ÂM (Sequence): Chuyển thành text block nhỏ */}
      <div className="mt-2 pt-3 border-t border-border/40">
        {renderSentenceIpaFromDiff(compares, lastRecognizedPosition)}
      </div>
    </div>
  )
}

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