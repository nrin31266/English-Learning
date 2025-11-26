import { Badge } from "@/components/ui/badge"
import {
    Mic
} from "lucide-react"

const ShadowingBadge = ({ enabled }: { enabled: boolean }) => {
  if (!enabled) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Mic className="h-3 w-3 opacity-60" />
        Shadowing Off
      </span>
    )
  }

  return (
    <Badge
      variant="outline"
      className="inline-flex items-center gap-1 border-blue-300/70 px-2 py-0 text-[11px] text-blue-600"
    >
      <Mic className="h-3 w-3" />
      Shadowing On
    </Badge>
  )
}
export default ShadowingBadge