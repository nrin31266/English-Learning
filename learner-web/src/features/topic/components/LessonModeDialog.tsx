// src/pages/Topics.tsx (LessonModeDialog)

import AudioFileTag from "@/components/AudioFileTag"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import YouTubeTag from "@/components/YouTubeTag"
import LanguageLevelBadge from "@/components/LanguageLevel"
import type { IHomeLessonResponse, IHomeTopicResponse } from "@/types"
import { formatDuration } from "@/utils/timeUtils"
import { Mic, Keyboard, Sparkles, Clock } from "lucide-react"

type LessonModeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  lesson: IHomeLessonResponse | null
  topic: IHomeTopicResponse | null
  onNavigate: (mode: "listening" | "shadowing" | "dictation") => void
}

const LessonModeDialog = ({
  open,
  onOpenChange,
  lesson,
  topic,
  onNavigate,
}: LessonModeDialogProps) => {
  if (!lesson || !topic) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-background">
        
        {/* Header Section */}
        <div className="p-6 pb-4 border-b border-border/50 bg-muted/20">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold leading-tight text-foreground">
              {lesson.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1.5">
              {topic.name}
            </DialogDescription>
          </DialogHeader>

          {/* Tags Info */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <LanguageLevelBadge level={lesson.languageLevel} />
            {lesson.sourceType === "YOUTUBE" && <YouTubeTag />}
            {lesson.sourceType === "AUDIO_FILE" && <AudioFileTag />}
            
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md ml-auto">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(lesson.durationSeconds)}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Select Mode</span>
          </div>

          <div className="grid gap-3">
            {/* Shadowing Mode */}
            {lesson.enableShadowing && (
              <button
                type="button"
                onClick={() => onNavigate("shadowing")}
                className="group flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Mic className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-base">Shadowing</span>
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary border-none">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Speak along with the audio to master rhythm and native pronunciation.
                  </p>
                </div>
              </button>
            )}

            {/* Dictation Mode */}
            {lesson.enableDictation && (
              <button
                type="button"
                onClick={() => onNavigate("dictation")}
                className="group flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all duration-200 hover:border-blue-500 hover:bg-blue-500/5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                  <Keyboard className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-base">Dictation</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Focus
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Type exactly what you hear to train your listening accuracy.
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 bg-muted/20 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="font-semibold">
            Cancel
          </Button>
        </div>
        
      </DialogContent>
    </Dialog>
  )
}

export default LessonModeDialog