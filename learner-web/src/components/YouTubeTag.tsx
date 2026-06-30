import { Youtube } from "lucide-react"

const YouTubeTag = () => (
  <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded border border-red-600/35 bg-red-100 px-1.5 text-[11px] font-bold leading-none text-red-800 shadow-sm dark:border-red-400/40 dark:bg-red-950 dark:text-red-300">
    <Youtube className="h-3 w-3" strokeWidth={2.5} />
    YouTube
  </span>
)

export default YouTubeTag
