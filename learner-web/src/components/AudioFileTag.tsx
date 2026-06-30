import { Music2 } from "lucide-react"

const AudioFileTag = () => (
  <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded border border-sky-600/35 bg-sky-100 px-1.5 text-[11px] font-bold leading-none text-sky-800 shadow-sm dark:border-sky-400/40 dark:bg-sky-950 dark:text-sky-300">
    <Music2 className="h-3 w-3" strokeWidth={2.5} />
    Audio
  </span>
)

export default AudioFileTag
