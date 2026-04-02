import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react"

// ─── Sub-component: WordChip ──────────────────────────────────────────────────
export type WordChipStatus = "untyped" | "wrong" | "correct_typed" | "revealed"

type WordChipProps = {
  displayText: string
  status: WordChipStatus
  onReveal?: () => void
}

const WordChip = ({ displayText, status, onReveal }: WordChipProps) => {
  const isInteractive = status === "untyped" || status === "wrong"
  
  const config = {
    correct_typed: {
      border: "border-emerald-500/40 bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-400",
      icon: <CheckCircle2 className="h-3 w-3 text-emerald-500" />,
    },
    revealed: {
      border: "border-sky-500/40 bg-sky-500/10",
      text: "text-sky-700 dark:text-sky-400",
      icon: <Eye className="h-3 w-3 text-sky-500" />,
    },
    wrong: {
      border: "border-rose-500/40 bg-rose-500/10",
      text: "text-rose-600 dark:text-rose-400",
      icon: <AlertCircle className="h-3 w-3 text-rose-500" />,
    },
    untyped: {
      border: "border-border bg-muted/30 hover:border-primary/40 hover:bg-primary/5",
      text: "text-muted-foreground",
      icon: <EyeOff className="h-3 w-3" />,
    },
  }

  const current = config[status]

  return (
    <button
      type="button"
      onClick={isInteractive ? onReveal : undefined}
      disabled={!isInteractive}
      className={cn(
        "group relative inline-flex flex-col items-center justify-center",
        "rounded-lg border px-3 pt-4 pb-2 min-w-[3.5rem] min-h-[3rem] text-center",
        "transition-all duration-200",
        "hover:scale-105 active:scale-95",
        current.border,
        isInteractive && "cursor-pointer"
      )}
    >
      <span className="absolute top-1 right-1.5 opacity-60 transition-opacity group-hover:opacity-100">
        {current.icon}
      </span>
      <span className={cn("font-mono text-sm font-bold tracking-wider", current.text)}>
        {displayText}
      </span>
    </button>
  )
}

export default WordChip