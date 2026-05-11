import { Music2 } from 'lucide-react'


const AudioFileTag = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-background border-sky-400 border px-2 py-[2px] text-[14px] font-medium text-sky-400">
    <Music2 className="h-3 w-3" />
    Audio
  </span>
)

export default AudioFileTag