import React from "react"
import { cn } from "@/lib/utils"
import { Sparkles, Target } from "lucide-react"
import type { IShadowingResult } from "@/types"

interface Props {
  result: IShadowingResult
  className?: string
}

const getWordClass = (status: string, attempted: boolean) => {
  if (!attempted) return "text-muted-foreground/40"

  switch (status) {
    case "CORRECT":
      return "text-emerald-600 font-medium"
    case "NEAR":
      // Thêm decoration-wavy cho đường lượn sóng
      return "text-amber-500 font-medium underline decoration-wavy decoration-amber-300 decoration-1.5 underline-offset-2"
    case "WRONG":
      // Thêm decoration-wavy cho đường lượn sóng
      return "text-red-500 font-semibold underline decoration-wavy decoration-red-300 decoration-1.5 underline-offset-2"
    case "MISSING":
      return "text-slate-400 italic border-b border-dashed border-slate-300"
    case "EXTRA":
      return "text-blue-500"
    default:
      return ""
  }
}

const ShadowingResultPanel: React.FC<Props> = ({ result, className }) => {
  const {
    weightedAccuracy,
    correctWords,
    totalWords,
    compares,
    lastRecognizedPosition,
  } = result

  const isExcellent = weightedAccuracy >= 85
  const isGood = weightedAccuracy >= 60

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card text-card-foreground shadow-sm p-4 w-full flex flex-col gap-4",
        className
      )}
    >
      {/* HEADER GỌN NHẸ (Đã bỏ nút toggle) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              isExcellent ? "bg-emerald-100" : isGood ? "bg-amber-100" : "bg-red-100"
            )}
          >
            {isExcellent ? (
              <Sparkles className="h-5 w-5 text-emerald-600" />
            ) : (
              <Target className={cn("h-5 w-5", isGood ? "text-amber-600" : "text-red-500")} />
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight">
                {weightedAccuracy.toFixed(0)}%
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                ({correctWords}/{totalWords})
              </span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {isExcellent
                ? "Excellent pronunciation!"
                : isGood
                ? "Good, keep improving."
                : "Focus on highlighted words."}
            </p>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-border/50" />

      {/* ===== VÙNG HIỂN THỊ CÂU ĐƠN GIẢN & HIỆU QUẢ ===== */}
      <div className="pt-1 pb-2">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-4">
          {compares.map((c) => {
            const attempted = c.position <= lastRecognizedPosition
            const hasError = c.status !== "CORRECT" && attempted && c.recognizedWord

            return (
              <div key={c.position} className="flex flex-col items-center group cursor-default">
                {/* Chữ đọc sai */}
                {hasError ? (
                  <span className="font-medium text-muted-foreground line-through decoration-red-600/20 mb-0.5">
                    {c.recognizedWord}
                  </span>
                ) : (
                  // Căn lề cho mượt
                  <span className="h-[20px]" /> 
                )}

                {/* Từ gốc với gạch dưới dạng sóng */}
                <span className={cn("text-lg", getWordClass(c.status, attempted))}>
                  {c.expectedWord || "_"}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default React.memo(ShadowingResultPanel)