// SentencesTab.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ILessonDetailsDto } from "@/types"
import { Headphones } from "lucide-react"
import { useMemo } from "react"
import SentenceItem from "./SentenceItem" // chỉnh path cho đúng

const SentencesTab = ({ lesson }: { lesson: ILessonDetailsDto }) => {
  const orderIndexFiltered = useMemo(() => {
    if (!lesson.sentences) return []
    return lesson.sentences
      .map((s, index) => ({ ...s, originalIndex: index }))
      .sort((a, b) => (a.audioStartMs ?? 0) - (b.audioStartMs ?? 0))
      .map((s) => s.originalIndex)
  }, [lesson.sentences])

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
            {orderIndexFiltered && orderIndexFiltered.length > 0 ? (
              orderIndexFiltered.map((index) => {
                const s = lesson.sentences[index]
                return <SentenceItem key={s.id} sentence={s} />
              })
            ) : (
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
