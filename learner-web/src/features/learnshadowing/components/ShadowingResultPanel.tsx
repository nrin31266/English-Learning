import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Sparkles, Target, Bug } from "lucide-react"
import type { IPhonemeDiff, IShadowingResult } from "@/types"

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

// ===== GIỮ NGUYÊN LOGIC CỦA BẠN =====
const getWordClass = (status: string, attempted: boolean) => {
  if (!attempted) return "text-muted-foreground/40"

  switch (status) {
    case "CORRECT":
      return "text-emerald-600 font-medium"
    case "NEAR":
      return "text-blue-500 font-medium underline decoration-wavy decoration-blue-300 decoration-1.5 underline-offset-2"
    case "WRONG":
      return "text-red-500 font-semibold underline decoration-wavy decoration-red-300 decoration-1.5 underline-offset-2"
    case "MISSING":
      return "text-slate-400 italic border-b border-dashed border-slate-300 underline-offset-2"
    case "EXTRA":
      return "text-yellow-500 font-xs italic border-b border-dashed border-yellow-300 underline-offset-2"
    default:
      return ""
  }
}

// ===== TAB 1: UI CỦA BẠN (SỬA HOVER) =====
const YourResultTab: React.FC<{ result: IShadowingResult }> = ({ result }) => {
  const { weightedAccuracy, fluencyScore, correctWords, totalWords, compares, lastRecognizedPosition } = result
  const isExcellent = weightedAccuracy >= SHADOWING_THRESHOLD.NEXT
  const isGood = weightedAccuracy >= SHADOWING_THRESHOLD.GOOD_SOUND
  const [openPopoverPosition, setOpenPopoverPosition] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          isExcellent ? "bg-emerald-100" : isGood ? "bg-amber-100" : "bg-red-100"
        )}>
          {isExcellent ? <Sparkles className="h-5 w-5 text-emerald-600" /> : <Target className={cn("h-5 w-5", isGood ? "text-amber-600" : "text-red-500")} />}
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold">{weightedAccuracy.toFixed(0)}%</span>
            <span className="text-sm text-muted-foreground">({correctWords}/{totalWords})</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isExcellent ? "Excellent pronunciation!" : isGood ? "Good, keep improving." : "Focus on highlighted words."}
          </p>
        </div>
      </div>

      <div className="h-px bg-border/50" />

      <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Fluency: </span>
        <span className="font-semibold text-primary">{Math.round((fluencyScore || 0) * 100)}%</span>
      </div>

      <div className="flex flex-wrap items-end gap-x-3 gap-y-4">
        {compares.map((c) => {
          const attempted = c.position <= lastRecognizedPosition
          const isExtra = c.status === "EXTRA"
          const hasError = !isExtra && c.status !== "CORRECT" && attempted && c.recognizedWord
          const showHover = c.phonemeDiff || c.extraOrMissingIpa
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
                  onMouseEnter={() => setOpenPopoverPosition(c.position)}
                  onMouseLeave={() => setOpenPopoverPosition((prev) => prev === c.position ? null : prev)}
                >
                  <div className="flex flex-col items-center cursor-pointer">
                    {/* Extra / Error line - nằm TRONG trigger */}
                    {isExtra && c.recognizedWord ? (
                      <span className={cn(getWordClass(c.status, attempted), "text-sm mb-0.5")}>
                        +{c.recognizedWord}
                      </span>
                    ) : hasError ? (
                      <span className="text-muted-foreground line-through text-sm mb-0.5">
                        {c.recognizedWord}
                      </span>
                    ) : (
                      <span className="h-5" />
                    )}

                    {/* Main word */}
                    <span className={cn("text-lg", getWordClass(c.status, attempted))}>
                      {isExtra ? "" : c.expectedWord || "_"}
                    </span>
                  </div>
                </PopoverTrigger>
              </div>

              {/* Popover Content - chi tiết */}
              {showHover && (
                <PopoverContent className="w-auto p-3">
                  <div className="flex flex-col gap-2">

                    {/* WORD */}
                    <div className="text-base font-semibold">
                      {c.expectedWord || c.recognizedWord}
                    </div>

                    {/* MISSING case */}
                    {c.status === "MISSING" && c.extraOrMissingIpa && (
                      <div className="text-base">

                        <div className="text-muted-foreground text-xs mt-1">IPA:</div>
                        <div className="font-mono">
                          {c.extraOrMissingIpa.ipa}
                        </div>
                      </div>
                    )}

                    {/* EXTRA case */}
                    {c.status === "EXTRA" && c.extraOrMissingIpa && (
                      <div className="text-base">

                        <div className="text-muted-foreground text-xs mt-1">IPA:</div>
                        <div className="font-mono">
                          {c.extraOrMissingIpa.ipa}
                        </div>
                      </div>
                    )}

                    {/* NEAR / WRONG case - có phonemeDiff */}
                    {c.phonemeDiff && (
                      <>
                        {/* Score */}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-xs">Accuracy:</span>
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            c.phonemeDiff.score >= 0.8 ? "bg-emerald-100 text-emerald-700" :
                              c.phonemeDiff.score >= 0.5 ? "bg-amber-100 text-amber-700" :
                                "bg-red-100 text-red-700"
                          )}>
                            {Math.round(c.phonemeDiff.score * 100)}%
                          </span>
                        </div>

                        {/* IPA comparison */}
                        <div className="text-base">
                          <div className="text-muted-foreground text-xs">You said:</div>
                          <div className="font-mono text-red-500 break-all">{c.phonemeDiff.actual_ipa || "∅"}</div>
                          <div className="text-muted-foreground text-xs mt-1">Expected:</div>
                          <div className="font-mono text-green-600 break-all">{c.phonemeDiff.expected_ipa}</div>
                        </div>

                        {/* Diff details */}
                        <div className="text-base">
                          <div className="text-muted-foreground text-xs">Details:</div>
                          <div className="flex flex-wrap gap-1">
                            {c.phonemeDiff.diff_tokens.map((t, i) => (
                              <span
                                key={i}
                                className={cn(
                                  "px-1 py-0.5 rounded text-xs cursor-help",
                                  t.type === "MATCH" && "bg-green-50 text-green-600",
                                  t.type === "MISMATCH" && "bg-red-50 text-red-600",
                                  t.type === "MISSING" && "bg-orange-50 text-orange-600 line-through",
                                  t.type === "EXTRA" && "bg-yellow-50 text-yellow-600"
                                )}
                                title={`${t.type}: ${t.expected_ipa || "∅"} → ${t.actual_ipa || "∅"}`}
                              >
                                {t.expected_ipa || t.actual_ipa || "?"}
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </PopoverContent>
              )}
            </Popover>
          )
        })}
      </div>
    </div>
  )
}
// ===== TAB 2: DEBUG (THÊM PHONEME DIFF) =====
const DebugTab: React.FC<{ result: IShadowingResult }> = ({ result }) => {
  const {
    weightedAccuracy,
    fluencyScore,
    avgPause,
    speechRate,
    totalWords,
    compares,
    expectedText,
    recognizedText,
  } = result

  const EXTRA_ALPHA = 0.3

  // Thống kê
  const stats = {
    correct: compares.filter(c => c.status === "CORRECT").length,
    near: compares.filter(c => c.status === "NEAR").length,
    wrong: compares.filter(c => c.status === "WRONG").length,
    missing: compares.filter(c => c.status === "MISSING").length,
    extra: compares.filter(c => c.status === "EXTRA").length,
  }

  const totalScore = compares.reduce((sum, c) => sum + c.score, 0)

  // Render phoneme diff dạng text
  const renderPhonemeDiffText = (diff: IPhonemeDiff | null | undefined) => {
    if (!diff || !diff.diff_tokens) return "—"

    return diff.diff_tokens.map(t => {
      if (t.type === "MATCH") return t.expected_ipa
      if (t.type === "MISMATCH") return `${t.expected_ipa}→${t.actual_ipa}`
      if (t.type === "MISSING") return `+${t.expected_ipa}`
      if (t.type === "EXTRA") return `-${t.actual_ipa}`
      return "?"
    }).join(" ")
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-2">
        <div className="bg-emerald-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-emerald-600">{stats.correct}</div>
          <div className="text-xs text-emerald-600">CORRECT</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.near}</div>
          <div className="text-xs text-blue-600">NEAR</div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600">{stats.wrong}</div>
          <div className="text-xs text-red-600">WRONG</div>
        </div>
        <div className="bg-slate-100 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-slate-500">{stats.missing}</div>
          <div className="text-xs text-slate-500">MISSING</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.extra}</div>
          <div className="text-xs text-yellow-600">EXTRA</div>
        </div>
      </div>

      {/* Formula Summary */}
      <div className="bg-background/50 p-3 rounded-lg text-sm space-y-1">
        <div className="font-semibold">📊 Scoring Formula</div>
        <div className="font-mono text-xs">
          weightedAccuracy = ({totalScore.toFixed(2)} / ({totalWords} + {EXTRA_ALPHA} × {stats.extra})) × 100
        </div>
        <div className="font-mono text-xs font-bold text-primary">
          = {weightedAccuracy.toFixed(1)}%
        </div>
        <div className="text-xs text-muted-foreground pt-1">
          🗣️ fluencyScore: {(fluencyScore || 0).toFixed(2)} | avgPause: {(avgPause || 0).toFixed(2)}s | speechRate: {(speechRate || 0).toFixed(2)} w/s
        </div>
      </div>

      {/* Text Comparison */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-muted/30 p-2 rounded">
          <div className="text-xs text-muted-foreground mb-1">📖 Expected</div>
          <div className="wrap-break-word">{expectedText}</div>
        </div>
        <div className="bg-muted/30 p-2 rounded">
          <div className="text-xs text-muted-foreground mb-1">🎤 Recognized</div>
          <div className="wrap-break-word">{recognizedText || "(empty)"}</div>
        </div>
      </div>

      {/* Detailed Table - THÊM CỘT PHONEME */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="border-b">
              <th className="p-2 text-center w-12">#</th>
              <th className="p-2 text-left">Expected</th>
              <th className="p-2 text-left">Recognized</th>
              <th className="p-2 text-center w-20">Status</th>
              <th className="p-2 text-center w-16">Score</th>
              <th className="p-2 text-left">Phoneme Diff</th>
            </tr>
          </thead>
          <tbody>
            {compares.map((c) => {
              const isEven = c.position % 2 === 0
              const phonemeText = renderPhonemeDiffText(c.phonemeDiff)
              const hasPhonemeIssue = c.phonemeDiff && c.phonemeDiff.score < 0.8

              return (
                <tr key={c.position} className={cn("border-b", isEven ? "bg-muted/5" : "")}>
                  <td className="p-2 text-center font-mono text-xs">{c.position + 1}</td>
                  <td className="p-2">
                    <div className="font-medium">{c.expectedWord || "—"}</div>
                    {c.expectedNormalized && (
                      <div className="text-[10px] text-muted-foreground">{c.expectedNormalized}</div>
                    )}
                    {/* Hiển thị IPA chuẩn nếu có */}
                    {c.phonemeDiff?.expected_ipa && (
                      <div className="text-[10px] font-mono text-green-600 mt-0.5">
                        /{c.phonemeDiff.expected_ipa}/
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    <div>{c.recognizedWord || "—"}</div>
                    {c.recognizedNormalized && (
                      <div className="text-[10px] text-muted-foreground">{c.recognizedNormalized}</div>
                    )}
                    {/* Hiển thị IPA user nói nếu có */}
                    {c.phonemeDiff?.actual_ipa && (
                      <div className="text-[10px] font-mono text-red-500 mt-0.5">
                        /{c.phonemeDiff.actual_ipa}/
                      </div>
                    )}
                    {/* Extra/Missing IPA */}
                    {c.extraOrMissingIpa && (
                      <div className="text-[10px] font-mono text-yellow-600 mt-0.5">
                        /{c.extraOrMissingIpa.ipa}/
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded font-medium",
                      c.status === "CORRECT" && "bg-emerald-100 text-emerald-700",
                      c.status === "NEAR" && "bg-blue-100 text-blue-700",
                      c.status === "WRONG" && "bg-red-100 text-red-700",
                      c.status === "MISSING" && "bg-slate-100 text-slate-600",
                      c.status === "EXTRA" && "bg-yellow-100 text-yellow-700",
                    )}>
                      {c.status}
                    </span>
                    {/* Hiển thị % phoneme nếu có */}
                    {c.phonemeDiff && (
                      <div className={cn(
                        "text-[9px] mt-0.5",
                        c.phonemeDiff.score >= 0.8 ? "text-emerald-500" :
                          c.phonemeDiff.score >= 0.5 ? "text-amber-500" :
                            "text-red-500"
                      )}>
                        {Math.round(c.phonemeDiff.score * 100)}%
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-center font-mono font-medium">
                    {c.score.toFixed(2)}
                  </td>
                  <td className="p-2">
                    <div className={cn(
                      "text-[11px] font-mono",
                      hasPhonemeIssue ? "text-red-600" : "text-green-600"
                    )}>
                      {phonemeText !== "—" ? phonemeText : (
                        c.extraOrMissingIpa ?
                          (c.status === "EXTRA" ? `+${c.extraOrMissingIpa.word}` : `-${c.extraOrMissingIpa.word}`) :
                          "—"
                      )}
                    </div>
                    {/* Tooltip chi tiết khi hover vào phoneme */}
                    {c.phonemeDiff && c.phonemeDiff.diff_tokens && (
                      <div className="text-[9px] text-muted-foreground mt-0.5">
                        {c.phonemeDiff.diff_tokens.filter(t => t.type !== "MATCH").length} errors
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="text-[10px] text-muted-foreground flex flex-wrap gap-4 pt-2 border-t">
        <span>✅ CORRECT: 1.0</span>
        <span>🔵 NEAR: 0.7-0.95</span>
        <span>❌ WRONG: 0.0</span>
        <span>◌ MISSING: 0.0</span>
        <span>➕ EXTRA: 0.0</span>
        <span className="text-green-600">✓ MATCH</span>
        <span className="text-red-600">✗ MISMATCH</span>
        <span className="text-orange-600">+ MISSING</span>
        <span className="text-yellow-600">- EXTRA</span>
      </div>
    </div>
  )
}

// ===== MAIN =====
const ShadowingResultPanel: React.FC<Props> = ({ result, className, isLoading }) => {
  const [tab, setTab] = useState<"result" | "debug">("result")

  // 👉 Nếu đang loading, chỉ hiển thị skeleton
  if (isLoading) {
    return (
      <div className={cn("rounded-2xl border bg-card p-4 flex flex-col gap-4 w-full", className)}>
        <div className="flex gap-2 border-b">
          <div className="px-4 py-2 text-sm font-medium text-muted-foreground">Result</div>
          <div className="px-4 py-2 text-sm font-medium text-muted-foreground">Debug</div>
        </div>
        <div className="flex flex-col gap-3">
          <SkeletonBlock className="h-6 w-1/3" />
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-2/3" />
        </div>
      </div>
    )
  }

  // 👉 Không có result
  if (!result) {
    return (
      <div className={cn("rounded-2xl border bg-card p-4 flex flex-col gap-4 w-full", className)}>
        <div className="text-center text-sm text-muted-foreground py-8">
          No result yet. Record your voice to see feedback.
        </div>
      </div>
    )
  }

  console.log("Rendering ShadowingResultPanel", { 
    weightedAccuracy: result.weightedAccuracy, 
    fluencyScore: result.fluencyScore 
  })

  return (
    <div className={cn("rounded-2xl border bg-card p-4 flex flex-col gap-4 w-full", className)}>
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("result")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition",
            tab === "result" && "border-b-2 border-primary text-primary"
          )}
        >
          Result
        </button>
        <button
          onClick={() => setTab("debug")}
          className={cn(
            "px-4 py-2 text-sm font-medium flex items-center gap-1 transition",
            tab === "debug" && "border-b-2 border-primary text-primary"
          )}
        >
          Debug
        </button>
      </div>

      <div className="animate-fade-in">
        {tab === "result" && <YourResultTab result={result} />}
        {tab === "debug" && <DebugTab result={result} />}
      </div>
    </div>
  )
}

export default React.memo(ShadowingResultPanel)