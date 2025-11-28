// src/pages/Topics.tsx

import AudioFileTag from "@/components/AudioFileTag"
import { Badge } from "@/components/ui/badge"
import YouTubeTag from "@/components/YouTubeTag"
import type {
    ILHomeLessonResponse
} from "@/types"
import { formatDuration } from "@/utils/timeUtils"
import {
    Headphones
} from "lucide-react"
type LessonCardProps = {
  lesson: ILHomeLessonResponse
  onClick: () => void
}

const LessonCard = ({ lesson, onClick }: LessonCardProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-background text-left text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      {/* thumbnail */}
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        {lesson.thumbnailUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <img
            src={lesson.thumbnailUrl}
            alt={lesson.title}
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No thumbnail
          </div>
        )}
        <div className="absolute left-1 top-1 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
            <Headphones className="h-5 w-5 text-white drop-shadow-md" />
            <span>
                12345
            </span>
        </div>

        <div className="absolute top-1 right-1">
            <span
                className="text-[14px] text-black bg-white/80 px-2 py-0.5 rounded text-sm font-medium"
          >
            {lesson.languageLevel}
          </span>
        </div>
        <div className="absolute left-1 bottom-1">
             {lesson.sourceType === "YOUTUBE" && <YouTubeTag />}
          {lesson.sourceType === "AUDIO_FILE" && <AudioFileTag />}
        </div>
        <div className="absolute right-1 bottom-1">
            <span className="text-[14px] text-black bg-white/80 px-2 py-0.5 rounded text-sm font-medium">
            {formatDuration(lesson.durationSeconds)}
          </span>
        </div>
      </div>

      {/* content */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="line-clamp-1 text-[16px] font-medium">
          {lesson.title}
        </div>


        {(lesson.enableDictation || lesson.enableShadowing) && (
          <div className="mt-auto flex flex-wrap gap-1">
            {lesson.enableShadowing && (
              <Badge
                variant="outline"
                className="border-emerald-500/50 bg-emerald-500/5 px-1.5 py-0 text-[13px] text-emerald-600"
              >
                Shadowing
              </Badge>
            )}
            {lesson.enableDictation && (
              <Badge
                variant="outline"
                className="border-sky-500/50 bg-sky-500/5 px-1.5 py-0 text-[13px] text-sky-600"
              >
                Dictation
              </Badge>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

export default LessonCard