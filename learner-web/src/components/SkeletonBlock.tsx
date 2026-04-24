import { cn } from "@/lib/utils"

const SkeletonBlock = ({ className = "" }) => (
  <div className={cn("bg-muted animate-pulse rounded-md", className)} />
)
export default SkeletonBlock