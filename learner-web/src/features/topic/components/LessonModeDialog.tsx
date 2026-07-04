import AudioFileTag from "@/components/AudioFileTag"
import LanguageLevelBadge from "@/components/LanguageLevel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import YouTubeTag from "@/components/YouTubeTag"
import { cn } from "@/lib/utils"
import type { IHomeLessonResponse } from "@/types"
import { formatDuration } from "@/utils/timeUtils"
import { Clock, Keyboard, Mic, MessageCircleMore } from "lucide-react"

type LessonMode = "shadowing" | "shadowingClassic" | "dictation"

type LessonModeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  lesson: IHomeLessonResponse | null
  topicName?: string
  onNavigate: (mode: LessonMode) => void
}

type ModeTone = "primary" | "blue" | "amber"

type ModeCard = {
  key: LessonMode
  title: string
  description: string
  label: string
  icon: typeof Mic
  enabled: boolean
  tone: ModeTone
}

const LessonModeDialog = ({
  open,
  onOpenChange,
  lesson,
  topicName,
  onNavigate,
}: LessonModeDialogProps) => {
  if (!lesson) return null

  const canUseShadowing = Boolean(lesson.enableShadowing)
  const canUseDictation = Boolean(lesson.enableDictation)

  const modes: ModeCard[] = [
    {
      key: "shadowing",
      title: "Shadowing with Feedback",
      description: "Speak and review pronunciation feedback after each sentence.",
      label: "Feedback",
      icon: MessageCircleMore,
      enabled: canUseShadowing,
      tone: "primary",
    },
    {
      key: "shadowingClassic",
      title: "Classic Shadowing",
      description: "Listen and repeat with the original sentence rhythm.",
      label: "Classic",
      icon: Mic,
      enabled: canUseShadowing,
      tone: "blue",
    },
    {
      key: "dictation",
      title: "Dictation",
      description: "Listen carefully and type exactly what you hear.",
      label: "Listening",
      icon: Keyboard,
      enabled: canUseDictation,
      tone: "amber",
    },
  ]

  const availableModes = modes.filter((mode) => mode.enabled)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden rounded-2xl p-0 sm:max-w-[500px]">
        <div className="border-b border-border/50 bg-muted/20 px-5 py-4">
          <DialogHeader>
            <DialogTitle className="line-clamp-2 text-lg font-bold leading-tight">
              {lesson.title}
            </DialogTitle>

            {topicName && (
              <DialogDescription className="mt-1 text-sm">
                {topicName}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <LanguageLevelBadge level={lesson.languageLevel} />

            {lesson.sourceType === "YOUTUBE" && <YouTubeTag />}
            {lesson.sourceType === "AUDIO_FILE" && <AudioFileTag />}

            <div className="ml-auto flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border/70">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(lesson.durationSeconds)}
            </div>
          </div>
        </div>

        <div className="max-h-[calc(92vh-132px)] overflow-y-auto px-5 py-4">
          <div className="mb-3">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Choose practice mode
            </span>
          </div>

          <div className="grid gap-2.5">
            {availableModes.map((mode) => {
              const Icon = mode.icon

              return (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => onNavigate(mode.key)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl border p-3 text-left",
                    "shadow-sm transition-all duration-200",
                    "hover:-translate-y-0.5 hover:shadow-md",
                    "active:translate-y-0",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20",
                    getCardClass(mode.tone)
                  )}
                >
                  <div
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors",
                      getIconClass(mode.tone)
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="line-clamp-1 flex-1 text-sm font-bold text-foreground sm:text-[15px]">
                        {mode.title}
                      </h3>

                      <Badge
                        variant="secondary"
                        className={cn(
                          "h-5 shrink-0 border-none px-2 text-[10px] font-bold uppercase tracking-wide",
                          getBadgeClass(mode.tone)
                        )}
                      >
                        {mode.label}
                      </Badge>
                    </div>

                    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {mode.description}
                    </p>
                  </div>
                </button>
              )
            })}

            {availableModes.length === 0 && (
              <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                No practice mode is available for this lesson.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-border/50 bg-muted/20 px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="font-semibold"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const getCardClass = (tone: ModeTone) => {
  switch (tone) {
    case "blue":
      return [
        "border-blue-500/20 bg-blue-500/[0.06]",
        "hover:border-blue-500/40 hover:bg-blue-500/[0.1]",
        "active:bg-blue-500/[0.14]",
      ].join(" ")

    case "amber":
      return [
        "border-amber-500/20 bg-amber-500/[0.07]",
        "hover:border-amber-500/40 hover:bg-amber-500/[0.12]",
        "active:bg-amber-500/[0.16]",
      ].join(" ")

    default:
      return [
        "border-primary/20 bg-primary/[0.06]",
        "hover:border-primary/40 hover:bg-primary/[0.1]",
        "active:bg-primary/[0.14]",
      ].join(" ")
  }
}

const getIconClass = (tone: ModeTone) => {
  switch (tone) {
    case "blue":
      return "bg-blue-500 text-white group-hover:bg-blue-600"

    case "amber":
      return "bg-amber-500 text-white group-hover:bg-amber-600"

    default:
      return "bg-primary text-primary-foreground group-hover:bg-primary/90"
  }
}

const getBadgeClass = (tone: ModeTone) => {
  switch (tone) {
    case "blue":
      return "bg-blue-500/10 text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"

    case "amber":
      return "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"

    default:
      return "bg-primary/10 text-primary hover:bg-primary/10"
  }
}

export default LessonModeDialog