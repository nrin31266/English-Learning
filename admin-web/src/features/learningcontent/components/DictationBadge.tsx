import { Badge } from "@/components/ui/badge"
import {
    NotebookPen
} from "lucide-react"
const DictationBadge = ({ enabled }: { enabled: boolean }) => {
  if (!enabled) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <NotebookPen className="h-3 w-3" />
        Off
      </span>
    )
  }

  return (
    <Badge
      variant="outline"
      className="inline-flex items-center gap-1 border-emerald-300/70 px-2 py-0 text-[11px] text-emerald-600"
    >
      <NotebookPen className="h-3 w-3" />
      Dictation On
    </Badge>
  )
}

export default DictationBadge