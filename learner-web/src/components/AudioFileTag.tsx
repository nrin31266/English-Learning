import { Music2 } from 'lucide-react'
import React from 'react'

const AudioFileTag = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-white border-sky-600 border px-2 py-[2px] text-[14px] font-medium text-sky-600">
    <Music2 className="h-3 w-3" />
    Audio
  </span>
)

export default AudioFileTag