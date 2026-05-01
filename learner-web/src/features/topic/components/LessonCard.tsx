// src/pages/Topics.tsx (LessonCard Component)

import AudioFileTag from "@/components/AudioFileTag"
import LanguageLevelBadge from "@/components/LanguageLevel"
import YouTubeTag from "@/components/YouTubeTag"
import type { IHomeLessonResponse } from "@/types"
import { formatDuration } from "@/utils/timeUtils"
import { cn } from "@/lib/utils"
import {
  Mic,
  Keyboard,
  Clock,
  List
} from "lucide-react"

type LessonCardProps = {
  lesson: IHomeLessonResponse
  onClick: () => void
}

const CompactProgress = ({
  icon: Icon,
  status,
  percent,
  activeColor,
  label
}: {
  icon: React.ElementType
  status: string
  percent: number
  activeColor: string
  label: string
}) => {
  const isCompleted = status === "COMPLETED"
  const isNotStarted = status === "NOT_STARTED"
  const displayPercent = isCompleted ? 100 : (percent || 0)

  return (
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Icon className="h-3 w-3" />
          <span className="text-[9px] font-semibold uppercase tracking-wide">{label}</span>
        </div>
        <span className={cn(
          "text-[9px] font-bold",
          isCompleted ? "text-green-500" : isNotStarted ? "text-muted-foreground/40" : "text-foreground"
        )}>
          {isCompleted ? "✓" : isNotStarted ? "—" : `${displayPercent}%`}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-border/40">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            isCompleted ? "bg-green-500" : isNotStarted ? "bg-transparent" : activeColor
          )}
          style={{ width: `${displayPercent}%` }}
        />
      </div>
    </div>
  )
}

const LessonCard = ({ lesson, onClick }: LessonCardProps) => {
  const hasShadowing = lesson.enableShadowing === true
  const hasDictation = lesson.enableDictation === true
  const hasAnyMode = hasShadowing || hasDictation

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      {/* Thumbnail */}
      <div className="relative h-40 w-full overflow-hidden bg-muted/50 shrink-0">
        {lesson.thumbnailUrl ? (
          <img
            src={lesson.thumbnailUrl}
            alt={lesson.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No thumbnail
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        <div className="absolute left-2 top-2">
          <LanguageLevelBadge level={lesson.languageLevel} hasBg={true} />
        </div>

        <div className="absolute right-2 top-2">
          {lesson.sourceType === "YOUTUBE" && <YouTubeTag />}
          {lesson.sourceType === "AUDIO_FILE" && <AudioFileTag />}
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-1 rounded bg-black/50 backdrop-blur-sm px-1.5 py-0.5">
            <List className="h-2.5 w-2.5 text-white/80" />
            <span className="text-[10px] font-medium text-white">{lesson.activeSentenceCount || 0}</span>
          </div>
          <div className="flex items-center gap-1 rounded bg-black/50 backdrop-blur-sm px-1.5 py-0.5">
            <Clock className="h-2.5 w-2.5 text-white/80" />
            <span className="text-[10px] font-medium text-white">{formatDuration(lesson.durationSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="flex-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
          {lesson.title}
        </h3>
      </div>

      {/* Progress Footer */}
      {hasAnyMode && (
        <div className="border-t bg-muted/20 px-3 py-2.5 mt-auto">
          <div className="flex items-center gap-3">
            {hasShadowing && (
              <CompactProgress
                icon={Mic}
                label="SHADOW"
                status={lesson.shadowingStatus}
                percent={lesson.shadowingProgressPercent}
                activeColor="bg-primary"
              />
            )}
            
            {hasShadowing && hasDictation && (
              <div className="w-px h-5 bg-border/50 shrink-0" />
            )}

            {hasDictation && (
              <CompactProgress
                icon={Keyboard}
                label="DICT"
                status={lesson.dictationStatus}
                percent={lesson.dictationProgressPercent}
                activeColor="bg-sky-500"
              />
            )}
          </div>
        </div>
      )}
    </button>
  )
}

export default LessonCard