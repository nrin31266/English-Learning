// SentencesTab.tsx
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import type { ILessonDetailsDto } from "@/types"
import { Headphones, Eye, Pencil } from "lucide-react"
import { useMemo, useState } from "react"
import SentenceItem from "./SentenceItem" // chỉnh path cho đúng

const SentencesTab = ({ lesson }: { lesson: ILessonDetailsDto }) => {
  const { t } = useTranslation()
  const [mode, setMode] = useState<"view" | "edit">("view")

  const orderIndexFiltered = useMemo(() => {
    if (!lesson.sentences) return []
    return lesson.sentences
      .map((s, index) => ({ ...s, originalIndex: index }))
      .sort((a, b) => (a.audioStartMs ?? 0) - (b.audioStartMs ?? 0))
      .map((s) => s.originalIndex)
  }, [lesson.sentences])

  const toggleMode = () => {
    setMode((prev) => (prev === "view" ? "edit" : "view"))
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Headphones className="h-4 w-4" />
            {t("sentencesTab.title")}
          </CardTitle>
          <CardDescription className="text-xs">
            {mode === "view"
              ? t("sentencesTab.viewDescription")
              : t("sentencesTab.editDescription")}
          </CardDescription>
        </div>

        <Button
          type="button"
          size="sm"
          variant={mode === "view" ? "outline" : "default"}
          className="h-7 px-2 text-[12px]"
          onClick={toggleMode}
        >
          {mode === "view" ? (
            <>
              <Pencil className="mr-1 h-3 w-3" />
              {t("sentencesTab.editModeButton")}
            </>
          ) : (
            <>
              <Eye className="mr-1 h-3 w-3" />
              {t("sentencesTab.viewModeButton")}
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="h-[480px] p-0">
        <ScrollArea className="h-full px-4">
          <div className="divide-y">
            {orderIndexFiltered && orderIndexFiltered.length > 0 ? (
              orderIndexFiltered.map((index) => {
                const s = lesson.sentences[index]
                return <SentenceItem key={s.id} sentence={s} mode={mode} />
              })
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t("sentencesTab.noSentences")}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default SentencesTab
