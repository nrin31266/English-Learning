// src/pages/Topics.tsx

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
import type {
    ILHomeLessonResponse,
    ILHomeTopicResponse
} from "@/types"
import { formatDuration } from "@/utils/timeUtils"
import {
    Headphones,
    Tv,
    Wand2
} from "lucide-react"

type LessonModeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  lesson: ILHomeLessonResponse | null
  topic: ILHomeTopicResponse | null
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {lesson.title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Topic: {topic.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="flex flex-wrap gap-2 text-[14px]">
            <Badge variant="outline">{lesson.languageLevel}</Badge>
            {lesson.sourceType === "YOUTUBE" && <YouTubeTag />}
            {lesson.sourceType === "AUDIO_FILE" && <AudioFileTag />}
            <span className="text-muted-foreground">
              {formatDuration(lesson.durationSeconds)}
            </span>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p>Choose how you want to practice this lesson:</p>
          </div>

          <div className="space-y-2">
            

            {lesson.enableShadowing && (
              <Button
                size="sm"
                
                className="w-full justify-start gap-2"
                onClick={() => onNavigate("shadowing")}
              >
                <Wand2 className="h-4 w-4" />
                Shadowing practice
              </Button>
            )}

            {lesson.enableDictation && (
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => onNavigate("dictation")}
              >
                <Tv className="h-4 w-4" />
                Dictation mode
              </Button>
            )}
            <Button
              size="sm"
              variant={"ghost"}
              className="w-full justify-start gap-2"
              onClick={() => onNavigate("listening")}
            >
              <Headphones className="h-4 w-4" />
              Standard listening mode
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default LessonModeDialog