import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Sparkles, Tag, Target } from "lucide-react"
import type { IShadowingResult } from "@/types"

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
    case "EXTRA": return "text-yellow-500 text-xs italic border-b border-dashed border-yellow-300 underline-offset-2"
    default: return ""
  }
}

// Render IPA cho toàn câu CHỈ LẤY TEXT GỐC (EXPECTED_IPA) VÀ CÁC ÂM EXTRA 
const renderSentenceIpaFromDiff = (compares: IShadowingResult['compares'], lastRecognizedPosition: number) => {
  const elements: React.ReactNode[] = []

  compares.forEach((c, idx) => {
    const attempted = c.position <= lastRecognizedPosition

    // NẾU LÀ TỪ EXTRA: Vẫn cho hiển thị IPA thực tế (actual_ipa) màu vàng để user biết mình đọc thừa
    if (c.status === "EXTRA") {
      if (attempted) {
        const extraIpa = c.phonemeDiff?.actual_ipa || c.recognizedWord || ""
        elements.push(
          // css gạch bỏ để phân biệt với expected IPA, vì EXTRA là từ thừa mà user đọc vào nên không có expected_ipa tương ứng
          <span key={`ipa-${idx}`} className="inline-block mx-2 font-mono text-yellow-500 line-through ">
            {extraIpa}
          </span>
        )
      }
      return 
    }

    if (!attempted) {
      // Chưa đọc: hiển thị expected IPA màu xám nhạt
      const ipaText = c.phonemeDiff?.expected_ipa || c.expectedWord || ""
      elements.push(
        <span key={`ipa-${idx}`} className="inline-block mx-2 font-mono text-muted-foreground/40">
          {ipaText}
        </span>
      )
      return
    }

    // Đã đọc: dùng diff_tokens để render từng phoneme
    const diffTokens = c.phonemeDiff?.diff_tokens

    if (!diffTokens || diffTokens.length === 0) {
      // Fallback: không có diff_tokens
      const ipaText = c.phonemeDiff?.expected_ipa || c.expectedWord || ""
      let colorClass = "text-emerald-600" // mặc định xanh
      if (c.status === "MISSING") colorClass = "text-slate-400"
      else if (c.status === "NEAR" || c.status === "WRONG") colorClass = "text-red-500"
      elements.push(
        <span key={`ipa-${idx}`} className={cn("inline-block mx-2 font-mono", colorClass)}>
          {ipaText}
        </span>
      )
      return
    }

    // Có diff_tokens: render từng token với màu sắc riêng
    const tokenElements: React.ReactNode[] = []
    diffTokens.forEach((token, tokenIdx) => {
      let colorClass = ""
      let displayText = ""

      if (token.type === "EXTRA") {
        // HIỂN THỊ ÂM EXTRA BẰNG MÀU VÀNG (Lấy actual_ipa vì expected_ipa sẽ là null/rỗng)
        colorClass = "text-yellow-500 line-through"
        displayText = token.actual_ipa || ""
      } else {
        // Các âm còn lại CHỈ lấy expected (câu gốc) để hiển thị
        displayText = token.expected_ipa || token.expected_ipa || ""
        
        switch (token.type) {
          case "MATCH":
            colorClass = "text-emerald-600" // xanh
            break
          case "MISMATCH":
            colorClass = "text-red-500" // đỏ
            break
          case "MISSING":
            colorClass = "text-slate-400" // xám
            break
          default:
            colorClass = "text-muted-foreground"
        }
      }

      if (!displayText) return // Tránh render thẻ rỗng

      tokenElements.push(
        <span key={`token-${idx}-${tokenIdx}`} className={cn("inline-block", colorClass)}>
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

  return <div className="font-mono text-base leading-relaxed break-all">{elements}</div>
}

const YourResultTab: React.FC<{ result: IShadowingResult }> = ({ result }) => {
  const { weightedAccuracy, fluencyScore, correctWords, totalWords, compares, lastRecognizedPosition } = result
  const isExcellent = weightedAccuracy >= SHADOWING_THRESHOLD.NEXT
  const isGood = weightedAccuracy >= SHADOWING_THRESHOLD.GOOD_SOUND
  const [openPopoverPosition, setOpenPopoverPosition] = useState<number | null>(null)
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  return (
    <div className="flex flex-col gap-5">
      {/* HEADER */}
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

      {/* DÒNG 1: TỪ VỰNG (5 status) */}
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
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current)
                    }
                    setOpenPopoverPosition(c.position)
                  }}
                  onMouseLeave={() => {
                    hoverTimeoutRef.current = setTimeout(() => {
                      setOpenPopoverPosition(null)
                    }, 120) // delay 120ms cho mượt
                  }}
                >
                  <div className="flex flex-col items-center cursor-pointer">
                    {isExtra && c.recognizedWord ? (
                      <span className={cn(getWordClass(c.status, attempted), "mb-0.5")}>
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

              {/* POPOVER: chỉ hiển thị expected/actual IPA */}
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

                  {
                    c.status !== "EXTRA" && <div className="text-sm">
                      <div className="text-muted-foreground text-xs mb-0.5">Expected IPA:</div>
                      <div className="font-mono text-green-700 break-all">
                        {c.phonemeDiff?.expected_ipa}
                      </div>
                    </div>
                  }

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

      {/* DÒNG 2: IPA TOÀN CÂU - dùng diff_tokens để tô màu từng phoneme */}
      <div className="mt-2 flex flex-col gap-2 rounded-xl bg-muted/30 p-4 border border-border/50">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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