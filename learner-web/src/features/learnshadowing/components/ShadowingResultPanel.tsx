import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Sparkles, Target, Bug } from "lucide-react"
import type { IShadowingResult } from "@/types"

interface Props {
  result: IShadowingResult
  className?: string
}

// ===== GIỮ NGUYÊN LOGIC CỦA BẠN =====
const getWordClass = (status: string, attempted: boolean) => {
  if (!attempted) return "text-muted-foreground/40"

  switch (status) {
    case "CORRECT":
      return "text-emerald-600 font-medium"
    case "NEAR":
      return "text-amber-500 font-medium underline decoration-wavy decoration-amber-300 decoration-1.5 underline-offset-2"
    case "WRONG":
      return "text-red-500 font-semibold underline decoration-wavy decoration-red-300 decoration-1.5 underline-offset-2"
    case "MISSING":
      return "text-slate-400 italic border-b border-dashed border-slate-300"
    case "EXTRA":
      return "text-yellow-500 font-medium"
    default:
      return ""
  }
}

// ===== TAB 1: UI CỦA BẠN (GIỮ NGUYÊN) =====
const YourResultTab: React.FC<{ result: IShadowingResult }> = ({ result }) => {
  const { weightedAccuracy, correctWords, totalWords, compares, lastRecognizedPosition } = result
  const isExcellent = weightedAccuracy >= 85
  const isGood = weightedAccuracy >= 60

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

      <div className="flex flex-wrap items-end gap-x-3 gap-y-4">
        {compares.map((c) => {
          const attempted = c.position <= lastRecognizedPosition
          const isExtra = c.status === "EXTRA"
          const hasError = !isExtra && c.status !== "CORRECT" && attempted && c.recognizedWord
          return (
            <div key={c.position} className="flex flex-col items-center">
              {isExtra && c.recognizedWord ? (
                <span className="text-yellow-500 text-sm mb-0.5">+{c.recognizedWord}</span>
              ) : hasError ? (
                <span className="text-muted-foreground line-through text-sm mb-0.5">{c.recognizedWord}</span>
              ) : (
                <span className="h-5" />
              )}
              <span className={cn("text-lg", getWordClass(c.status, attempted))}>
                {isExtra ? "" : c.expectedWord || "_"}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ===== TAB 2: DEBUG (GỌN - ĐỦ - DỄ ĐỌC) =====
const DebugTab: React.FC<{ result: IShadowingResult }> = ({ result }) => {
  const { weightedAccuracy, correctWords, totalWords, compares, lastRecognizedPosition, expectedText, recognizedText } = result
  const EXTRA_ALPHA = 0.3
  // Thống kê nhanh
  const correct = compares.filter(c => c.status === "CORRECT").length
  const near = compares.filter(c => c.status === "NEAR").length
  const wrong = compares.filter(c => c.status === "WRONG").length
  const missing = compares.filter(c => c.status === "MISSING").length
  const extra = compares.filter(c => c.status === "EXTRA").length
  const totalScore = compares.reduce((sum, c) => sum + c.score, 0)

  // Tính Levenshtein đơn giản
  const getLevenshtein = (a: string, b: string) => {
    if (!a || !b) return null
    if (a === b) return { dist: 0, sim: 100 }
    let len = Math.max(a.length, b.length)
    let dist = 0
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) dist++
    }
    dist += Math.abs(a.length - b.length)
    return { dist, sim: Math.round((1 - dist / len) * 100) }
  }

  return (
    <div className="space-y-3">
      {/* 5 ô thống kê */}
      <div className="grid grid-cols-5 gap-2 text-center">
        <div className="bg-emerald-50 p-2 rounded"><div className="text-xl font-bold text-emerald-600">{correct}</div><div className="text-xs">CORRECT</div></div>
        <div className="bg-amber-50 p-2 rounded"><div className="text-xl font-bold text-amber-600">{near}</div><div className="text-xs">NEAR</div></div>
        <div className="bg-red-50 p-2 rounded"><div className="text-xl font-bold text-red-600">{wrong}</div><div className="text-xs">WRONG</div></div>
        <div className="bg-slate-100 p-2 rounded"><div className="text-xl font-bold text-slate-500">{missing}</div><div className="text-xs">MISSING</div></div>
        <div className="bg-yellow-50 p-2 rounded"><div className="text-xl font-bold text-yellow-600">{extra}</div><div className="text-xs">EXTRA</div></div>
      </div>

      {/* Bảng chi tiết từng từ */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="border-b">
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Expected → Norm</th>
              <th className="p-2 text-left">Recognized → Norm</th>
              <th className="p-2">Status</th>
              <th className="p-2">Score</th>
              <th className="p-2">Lev</th>
            </tr>
          </thead>
          <tbody>
            {compares.map((c) => {
              const lev = getLevenshtein(c.expectedNormalized || "", c.recognizedNormalized || "")
              return (
                <tr key={c.position} className="border-b hover:bg-muted/30">
                  <td className="p-2 font-mono text-center">{c.position}</td>
                  <td className="p-2">
                    <div className="font-medium">{c.expectedWord || "—"}</div>
                    {c.expectedNormalized && <div className="text-[11px] text-muted-foreground">{c.expectedNormalized}</div>}
                  </td>
                  <td className="p-2">
                    <div>{c.recognizedWord || "—"}</div>
                    {c.recognizedNormalized && <div className="text-[11px] text-muted-foreground">{c.recognizedNormalized}</div>}
                  </td>
                  <td className="p-2 text-center">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded font-medium",
                      c.status === "CORRECT" && "bg-emerald-100 text-emerald-700",
                      c.status === "NEAR" && "bg-amber-100 text-amber-700",
                      c.status === "WRONG" && "bg-red-100 text-red-700",
                      c.status === "MISSING" && "bg-slate-100 text-slate-600",
                      c.status === "EXTRA" && "bg-yellow-100 text-yellow-700",
                    )}>{c.status}</span>
                  </td>
                  <td className="p-2 text-center font-mono font-medium">{c.score.toFixed(2)}</td>
                  <td className="p-2 text-center text-xs">
                    {lev ? `${lev.dist} (${lev.sim}%)` : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Text so sánh */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-muted/30 p-2 rounded"><div className="text-xs text-muted-foreground mb-1">Expected</div>{expectedText}</div>
        <div className="bg-muted/30 p-2 rounded"><div className="text-xs text-muted-foreground mb-1">Recognized</div>{recognizedText || "(empty)"}</div>
      </div>

      {/* Công thức */}
      <div className="bg-slate-100 p-3 rounded text-sm">
        <div className="font-semibold mb-1">Công thức:</div>
        <div className="font-mono text-xs">
          weightedAccuracy = ({totalScore.toFixed(2)} / ({totalWords} + {EXTRA_ALPHA} × {extra})) × 100 = <span className="font-bold text-base">{weightedAccuracy.toFixed(1)}%</span>
        </div>
        <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
          <span>✓ CORRECT: 1.0</span>
          <span>⚠ NEAR: 0.7-0.95</span>
          <span>✗ WRONG: 0.0</span>
          <span>◌ MISSING: 0.0</span>
          <span>+ EXTRA: 0.0</span>
        </div>
      </div>
    </div>
  )
}

// ===== MAIN =====
const ShadowingResultPanel: React.FC<Props> = ({ result, className }) => {
  const [tab, setTab] = useState<"result" | "debug">("result")

  return (
    <div className={cn("rounded-2xl border bg-card p-4 flex flex-col gap-4 w-full", className)}>
      {/* Tab buttons */}
      <div className="flex gap-2 border-b">
        <button onClick={() => setTab("result")} className={cn("px-4 py-2 text-sm font-medium", tab === "result" && "border-b-2 border-primary text-primary")}>
          Result
        </button>
        <button onClick={() => setTab("debug")} className={cn("px-4 py-2 text-sm font-medium flex items-center gap-1", tab === "debug" && "border-b-2 border-primary text-primary")}>
          <Bug className="h-3.5 w-3.5" /> Debug
        </button>
      </div>

      {/* Content */}
      {tab === "result" && <YourResultTab result={result} />}
      {tab === "debug" && <DebugTab result={result} />}
    </div>
  )
}

export default React.memo(ShadowingResultPanel)