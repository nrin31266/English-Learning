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
import type { ILHomeLessonResponse, ILHomeTopicResponse } from "@/types"
import { formatDuration } from "@/utils/timeUtils"
import { Headphones, Tv, Wand2, Sparkles } from "lucide-react"

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
     
      <DialogContent>
  
        <div className="relative  overflow-hidden">
          {/* decor nhẹ, không che nội dung */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-44 w-44 rounded-full bg-primary/10 blur-3xl sm:h-56 sm:w-56" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl sm:h-56 sm:w-56" />


            <DialogHeader>
              <DialogTitle className="text-base font-semibold leading-tight sm:text-lg">
                {lesson.title}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Topic: {topic.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{lesson.languageLevel}</Badge>
                {lesson.sourceType === "YOUTUBE" && <YouTubeTag />}
                {lesson.sourceType === "AUDIO_FILE" && <AudioFileTag />}
                <span className="text-muted-foreground">
                  {formatDuration(lesson.durationSeconds)}
                </span>

                <Badge className="gap-1 sm:ml-auto" variant="secondary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Choose mode
                </Badge>
              </div>

              <div className="grid gap-3">
                {/* Shadowing */}
                {lesson.enableShadowing && (
                  <button
                    type="button"
                    onClick={() => onNavigate("shadowing")}
                    className={[
                      "w-full rounded-xl border p-4 text-left transition",
                      "bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-transparent",
                      "hover:border-violet-500/40 hover:shadow-sm",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600">
                        <Wand2 className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold">Shadowing</div>
                          <Badge
                            variant="outline"
                            className="border-violet-500/30 bg-violet-500/10 text-violet-700"
                          >
                            Recommended
                          </Badge>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Speak along to improve rhythm & pronunciation.
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                {/* Dictation */}
                {lesson.enableDictation && (
                  <button
                    type="button"
                    onClick={() => onNavigate("dictation")}
                    className={[
                      "w-full rounded-xl border p-4 text-left transition",
                      "bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent",
                      "hover:border-amber-500/40 hover:shadow-sm",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700">
                        <Tv className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold">Dictation</div>
                          <Badge
                            variant="outline"
                            className="border-amber-500/30 bg-amber-500/10 text-amber-800"
                          >
                            Focus
                          </Badge>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Type what you hear to train accuracy.
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                {/* Listening (always) */}
                <button
                  type="button"
                  onClick={() => onNavigate("listening")}
                  className={[
                    "w-full rounded-xl border p-4 text-left transition",
                    "bg-gradient-to-r from-sky-500/15 via-cyan-500/10 to-transparent",
                    "hover:border-sky-500/40 hover:shadow-sm",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-700">
                      <Headphones className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold">Listening</div>
                        <Badge
                          variant="outline"
                          className="border-sky-500/30 bg-sky-500/10 text-sky-800"
                        >
                          Classic
                        </Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Standard listening with transcript.
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        
      </DialogContent>
    </Dialog>
  )
}

export default LessonModeDialog
