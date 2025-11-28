import { Youtube } from 'lucide-react'
import React from 'react'


const YouTubeTag = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-white border-red-500 border px-2 py-[2px] text-[14px] font-medium text-red-600">
    <Youtube className="h-3 w-3" />
    YouTube
  </span>
)

export default YouTubeTag