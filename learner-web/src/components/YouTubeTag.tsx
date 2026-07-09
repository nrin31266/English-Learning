import { Youtube } from "lucide-react"

const YouTubeTag = () => (
  <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded border border-red-500/40 bg-gradient-to-r from-red-50 to-red-100 px-1.5 text-[11px] font-bold leading-none text-red-700 shadow-sm shadow-red-500/15 ring-1 ring-red-500/10 dark:border-red-400/35 dark:from-red-950/70 dark:to-red-900/45 dark:text-red-300 dark:ring-red-400/10">
    <Youtube className="h-3 w-3 text-red-600 dark:text-red-300" strokeWidth={2.5} />
    YouTube
  </span>
)

export default YouTubeTag