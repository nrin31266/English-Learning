import { Badge } from "@/components/ui/badge"
import { Mic } from "lucide-react"
import { useTranslation } from "react-i18next"

const ShadowingBadge = ({ enabled }: { enabled: boolean }) => {
  const { t } = useTranslation()
  
  if (!enabled) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Mic className="h-3 w-3 opacity-60" />
        {t("badges.shadowing.off")}
      </span>
    )
  }

  return (
    <Badge
      variant="outline"
      className="inline-flex items-center gap-1 border-blue-300/70 px-2 py-0 text-[11px] text-blue-600"
    >
      <Mic className="h-3 w-3" />
      {t("badges.shadowing.on")}
    </Badge>
  )
}
export default ShadowingBadge