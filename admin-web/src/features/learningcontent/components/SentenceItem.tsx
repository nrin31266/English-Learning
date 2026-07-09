import { Button } from "@/components/ui/button"
import { useAppDispatch, useAppSelector } from "@/store"
import { markSentenceActiveInactive } from "@/store/learningcontent/lessonDetailsSlide"
import type { ILessonSentence } from "@/types"
import { formatTimeMs } from "@/utils/timeUtils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip"
import { EyeOff, GitMerge, Loader2, Scissors, ToggleRight } from "lucide-react"
import { useMemo } from "react"

type SentenceItemProps = {
  sentence: ILessonSentence
  mode?: "view" | "edit"
  viewMode?: "minimal" | "detailed",
  onSplitSentence?: (sentenceId: number) => void,
  onMergeSentence?: (sentence1: ILessonSentence) => void,
  lastSentence?: boolean
}

const SentenceItem = ({ sentence, mode = "view", viewMode = "minimal", onSplitSentence, onMergeSentence, lastSentence }: SentenceItemProps) => {
  const { type, status, data } = useAppSelector(state => state.learningContent.lessonDetails.sentenceMutation);
  const s = sentence
  const isEditMode = mode === "edit"
  const isMinimalView = viewMode === "minimal"
  const dispatch = useAppDispatch()

  // ───────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────

  const handleMarkActiveInactive = (id: number, isActive: boolean) => {
    dispatch(markSentenceActiveInactive({ id, active: isActive }));
  }
  
  const handleSplitSentence = () => {
    onSplitSentence?.(s.id);
  }
  
  const sortedWords = useMemo(() => {
    return [...s.lessonWords].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [s.lessonWords]);

  // ───────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────

  return (
    <div className={`flex gap-3 py-3`}>
      {/* Time column */}
      <div className="mt-0.5 w-12 shrink-0 text-[14px] text-muted-foreground font-semibold">
        #{s.orderIndex + 1}
      </div>
      <div className="mt-0.5 w-24 shrink-0 text-[14px] text-muted-foreground">
        {formatTimeMs(s.audioStartMs)}-{formatTimeMs(s.audioEndMs)}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        {isEditMode ? (
          <>
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <p className="leading-snug font-medium">{s.textDisplay ?? s.textRaw}</p>
              {!isMinimalView && s.translationVi && (
                <p className="leading-snug text-muted-foreground">{s.translationVi}</p>
              )}
              {!isMinimalView && s.phoneticUs && (
                <p className="text-[12px] leading-snug text-muted-foreground">US: [{s.phoneticUs}]</p>
              )}
              {!isMinimalView && s.lessonWords && s.lessonWords.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {sortedWords.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      className={[
                        "rounded-full border px-2 py-0.5 text-[14px]",
                        w.isClickable
                          ? "cursor-pointer hover:bg-slate-100"
                          : "cursor-default opacity-60",
                      ].join(" ")}
                    >
                      {w.wordText}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions row */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
              {
                !lastSentence && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[12px]"
                          onClick={() => onMergeSentence && onMergeSentence(sentence)}
                        >
                          <GitMerge className="h-4 w-4" /> Merge
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Ghép với câu tiếp theo
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              }
              {
                sentence.lessonWords.length >= 2 && <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[12px]"
                  onClick={handleSplitSentence}
                >
                  <Scissors className="mr-1 h-3 w-3" />
                  Split sentence
                </Button>
              }

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={status === "loading" && data !== null && data === s.id.toString()}
                className="h-7 px-2 text-[12px]"
                onClick={() => handleMarkActiveInactive(s.id, !s.isActive)}
              >
                {
                  data === s.id.toString() && status === "loading" && type === "mark-active-inactive" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null
                }
                {
                  s.isActive ? <ToggleRight className="mr-1 h-3 w-3" /> : <ToggleRight className="mr-1 h-3 w-3 rotate-180 text-red-500" />
                }
                {s.isActive ? "Active" : "Inactive"}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* View mode */}
            <p className="leading-snug relative">{s.textDisplay ?? s.textRaw}
              {
                !s.isActive && (
                  <span className="absolute top-0 right-0 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    <EyeOff className="inline mr-1 h-3 w-3" />
                    Inactive
                  </span>
                )
              }
            </p>

            {!isMinimalView && (
              <>
                {s.translationVi && (
                  <p className="leading-snug text-muted-foreground">
                    {s.translationVi}
                  </p>
                )}

                <div>
                  {s.phoneticUs && (
                    <p className="text-[12px] leading-snug text-muted-foreground">
                      US: [{s.phoneticUs}]
                    </p>
                  )}
                </div>

                {s.lessonWords && s.lessonWords.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {sortedWords.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        className={[
                          "rounded-full border px-2 py-0.5 text-[14px]",
                          w.isClickable
                            ? "cursor-pointer hover:bg-slate-100"
                            : "cursor-default opacity-60",
                        ].join(" ")}
                      >
                        {w.wordText}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default SentenceItem
