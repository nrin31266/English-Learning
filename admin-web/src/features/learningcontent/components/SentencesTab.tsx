import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ILessonDetailsDto } from "@/types"
import { formatTimeMs } from "@/utils/timeUtils"
import {
    Headphones
} from "lucide-react"
import { useMemo } from "react"

const SentencesTab = ({ lesson }: { lesson: ILessonDetailsDto }) => {
    const orderIndexFiltered = useMemo(() => {
        if (!lesson.sentences) return [];
        return lesson.sentences
            .map((s, index) => ({ ...s, originalIndex: index }))
            .sort((a, b) => a.audioStartMs - b.audioStartMs)
            .map((s) => s.originalIndex);
    }, [lesson.sentences]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Headphones className="h-4 w-4" />
          Transcript & sentences
        </CardTitle>
        <CardDescription className="text-xs">
          Click on words to open vocabulary later (mock UI for now).
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[480px] p-0">
        <ScrollArea className="h-full px-4">
          <div className="divide-y">
            {orderIndexFiltered && orderIndexFiltered.length > 0 ? orderIndexFiltered.map((index) => {
              const s = lesson.sentences[index];
              return (
                <div key={s.id} className="flex gap-3 py-3">
                  <div className="mt-0.5 w-12 shrink-0 text-[14px] text-muted-foreground">
                    {formatTimeMs(s.audioStartMs)}
                  </div>
                  <div className="flex-1 space-y-1">
                  <p className="text-sm leading-snug">{s.textDisplay ?? s.textRaw}</p>
                  {s.translationVi && (
                    <p className="text-[12px] leading-snug text-muted-foreground">
                      {s.translationVi}
                    </p>
                  )}

                  {s.lessonWords.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {s.lessonWords.map((w) => (
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
                          {w.wordLower}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No sentences available for this lesson.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
export default SentencesTab