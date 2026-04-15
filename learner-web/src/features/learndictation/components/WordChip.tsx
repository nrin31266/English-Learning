import { cn } from "@/lib/utils"
import type { ILessonWordResponse } from "@/types"
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react"

// ─── Sub-component: WordChip ──────────────────────────────────────────────────
export type WordChipStatus = "untyped" | "wrong" | "correct_typed" | "revealed"

type WordChipProps = {
  displayText: string
  status: WordChipStatus
  onReveal?: () => void
  onClickWord?: (word: ILessonWordResponse, el: HTMLElement) => void
  word?: ILessonWordResponse
}

const WordChip = ({
  displayText,
  status,
  onReveal,
  onClickWord,
  word
}: WordChipProps) => {

  // 👉 chỉ reveal khi chưa đúng
  const isRevealable = status === "untyped" || status === "wrong"

  // 👉 chỉ click mở popup khi đúng hoặc revealed
  const isClickable = status === "correct_typed" || status === "revealed"

  const config = {
    correct_typed: {
      border: "border-emerald-500/40 bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-400",
      icon: null,
    },
    revealed: {
      border: "border-sky-500/40 bg-sky-500/10",
      text: "text-sky-700 dark:text-sky-400",
      icon: <Eye className="h-4 w-4 text-sky-500" />,
    },
    wrong: {
      border: "border-rose-500/40 bg-rose-500/10",
      text: "text-rose-600 dark:text-rose-400",
      icon: <EyeOff className="h-4 w-4 text-rose-500" />,
    },
    untyped: {
      border: "border-border bg-muted/30 hover:border-primary/40 hover:bg-primary/5",
      text: "text-muted-foreground",
      icon: <EyeOff className="h-4 w-4" />,
    },
  }

  const current = config[status]

  return (
    <button
      type="button"
      onClick={(e) => {
        if (isRevealable) {
          onReveal?.()
        } else if (isClickable && word) {
          onClickWord?.(word, e.currentTarget)
        }
      }}
      className={cn(
        "group relative inline-flex flex-col items-center justify-center h-max",
        // Chỉnh padding-top (pt-5) đủ chỗ cho icon tuyệt đối, viền bo tròn hơn (rounded-xl)
        "rounded-xl border px-2 pt-1.5 pb-1.5 min-w-[2rem] text-center", 
        "transition-all duration-200",
        current.border,

        // 👉 Hiệu ứng hover nhẹ nhàng, gọn gàng
        isClickable && "cursor-pointer hover:bg-primary/10 hover:shadow-sm",
        isRevealable && "cursor-pointer hover:shadow-sm"
      )}
    >
      {/* Icon đính tuyệt đối ở góc trên bên phải */}
      {current.icon && <span className="absolute bg-background rounded-full -top-2 -right-2 opacity transition-opacity group-hover:opacity-100">
        {current.icon}
      </span>}

      {/* Chữ to hơn (text-base hoặc text-lg tùy chọn) */}
      <span className={cn("font-mono text-base  font-bold tracking-wider", current.text)}>
        {displayText}
      </span>
    </button>
  )
}

export default WordChip