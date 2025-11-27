import { Badge } from "@/components/ui/badge"
import { NotebookPen } from "lucide-react"
import { useTranslation } from "react-i18next"

const DictationBadge = ({ enabled }: { enabled: boolean }) => {
  const { t } = useTranslation()
  
  if (!enabled) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <NotebookPen className="h-3 w-3" />
        {t("badges.dictation.off")}
      </span>
    )
  }

  return (
    <Badge
      variant="outline"
      className="inline-flex items-center gap-1 border-emerald-300/70 px-2 py-0 text-[11px] text-emerald-600"
    >
      <NotebookPen className="h-3 w-3" />
      {t("badges.dictation.on")}
    </Badge>
  )
}

export default DictationBadge