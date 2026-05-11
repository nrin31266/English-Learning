import type { IResumeLessonDto } from "@/types"
import LanguageLevelBadge from "@/components/LanguageLevel"
import AudioFileTag from "@/components/AudioFileTag"
import YouTubeTag from "@/components/YouTubeTag"
import { cn } from "@/lib/utils"
import { Mic, Keyboard } from "lucide-react"

type ResumeLessonItemProps = {
  lesson: IResumeLessonDto
  onContinue: (lesson: IResumeLessonDto) => void
}

const ResumeLessonItem = ({ lesson, onContinue }: ResumeLessonItemProps) => {
  const isShadowing = lesson.mode === "SHADOWING"
  const progressPercent = lesson.progressPercent ?? 0

  return (
    <button
      type="button"
      onClick={() => onContinue(lesson)}
      className="group flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md active:scale-[0.99]"
    >
      {/* Mode icon */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          isShadowing
            ? "bg-primary/10 text-primary"
            : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
        )}
      >
        {isShadowing ? (
          <Mic className="h-4 w-4" />
        ) : (
          <Keyboard className="h-4 w-4" />
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Title — wraps naturally, max 2 lines */}
        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
          {lesson.title}
        </h4>

        {/* Row: Level badge + Mode label + Source + Progress */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <LanguageLevelBadge level={lesson.languageLevel} />

          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            {isShadowing ? "Shadowing" : "Dictation"}
          </span>

          {lesson.sourceType === "YOUTUBE" && <YouTubeTag />}
          {lesson.sourceType === "AUDIO_FILE" && <AudioFileTag />}

          <span className="text-[10px] text-muted-foreground/40">·</span>

          <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
            {progressPercent}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-border/40">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              isShadowing ? "bg-primary" : "bg-sky-500"
            )}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>
    </button>
  )
}

export default ResumeLessonItem
