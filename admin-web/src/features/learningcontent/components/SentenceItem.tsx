import React, { useEffect, useMemo, useState } from "react"
import type { ILessonSentence } from "@/types"
import { formatTimeMs } from "@/utils/timeUtils"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, RotateCcw, Save, Sparkles, EyeOff, ToggleRight } from "lucide-react"
import { useAppDispatch, useAppSelector } from "@/store"
import { showNotification } from "@/store/system/notificationSlice"
import { markSentenceActiveInactive } from "@/store/learningcontent/lessonDetailsSlide"


type SentenceItemProps = {
  sentence: ILessonSentence
  mode?: "view" | "edit"
  // optional, để sau này bạn hook vào API
  onSave?: (payload: {
    sentenceId: number
    textDisplay: string
    translationVi: string
    phoneticUk: string
    phoneticUs: string
  }) => void,
  viewMode?: "minimal" | "detailed"
}

const SentenceItem = ({ sentence, mode = "view", onSave, viewMode = "minimal" }: SentenceItemProps) => {
    const {type, status, data} = useAppSelector(state => state.learningContent.lessonDetails.sentenceMutation);
  const s = sentence
  const isEditMode = mode === "edit"
  const isMinimalView = viewMode === "minimal"
    const dispatch = useAppDispatch()
  // ───────────────────────────────────────────
  // State & initial values
  // ───────────────────────────────────────────
  const initialValues = useMemo(
    () => ({
      textDisplay: s.textDisplay ?? s.textRaw ?? "",
      translationVi: s.translationVi ?? "",
      phoneticUk: s.phoneticUk ?? "",
      phoneticUs: s.phoneticUs ?? "",
    }),
    // Nếu câu đổi (id / content khác) thì reset initial
    [s.id, s.textDisplay, s.textRaw, s.translationVi, s.phoneticUk, s.phoneticUs]
  )

  const [formValues, setFormValues] = useState(initialValues)

  useEffect(() => {
    setFormValues(initialValues)
  }, [initialValues])

  const hasChanges =
    formValues.textDisplay !== initialValues.textDisplay ||
    formValues.translationVi !== initialValues.translationVi ||
    formValues.phoneticUk !== initialValues.phoneticUk ||
    formValues.phoneticUs !== initialValues.phoneticUs

  // ───────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────

  const handleSave = () => {
    dispatch(showNotification({
      title: "Coming soon",
      variant: "info",
      message: "Save functionality is coming soon!",
    }))
    // In dữ liệu (tạm thời)
    console.log("Saving sentence changes:", {
      sentenceId: s.id,
      ...formValues,
    })

    // // Callback cho parent (nếu có)
    // onSave?.({
    //   sentenceId: s.id,
    //   textDisplay: formValues.textDisplay,
    //   translationVi: formValues.translationVi,
    //   phoneticUk: formValues.phoneticUk,
    //   phoneticUs: formValues.phoneticUs,
    // })
  }

  const handleReset = () => {
    if (!hasChanges) return
    setFormValues(initialValues)

    dispatch(showNotification({
      title: "Reset successful",
      message: `Sentence #${s.orderIndex + 1} has been restored from raw text.`,
      variant: "success",
    }))
  }

  const handleRegenerate = () => {
    dispatch(showNotification({
      title: "Coming soon",
      variant: "info",
      message: `AI regeneration feature is coming soon!`,
    }))
  }
  const handleMarkActiveInactive = (id: number, isActive: boolean) => {
    dispatch(markSentenceActiveInactive({ id, active: isActive }));
  }

  // ───────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────

  return (
    <div className={`flex gap-3 py-3`}>
      {/* Time column */}
      <div className="mt-0.5 w-12 shrink-0 text-[14px] text-muted-foreground font-semibold">
        
        #{s.orderIndex + 1}
      </div>
      <div className="mt-0.5 w-12 shrink-0 text-[14px] text-muted-foreground">
        
        {formatTimeMs(s.audioStartMs)}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        {isEditMode ? (
          <>
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              {/* Sentence text */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Sentence
                </Label>
                <Textarea
                  value={formValues.textDisplay}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      textDisplay: e.target.value,
                    }))
                  }
                  className="min-h-[80px] text-sm"
                />
              </div>

              {
                !isMinimalView && (
                  <>
                    {/* Translation */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Vietnamese translation
                </Label>
                <Textarea
                  value={formValues.translationVi}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      translationVi: e.target.value,
                    }))
                  }
                  placeholder="Nhập bản dịch tiếng Việt…"
                  className="min-h-[60px] text-sm"
                />
              </div>

              {/* Phonetics */}
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Phonetic UK
                  </Label>
                  <Input
                    value={formValues.phoneticUk}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        phoneticUk: e.target.value,
                      }))
                    }
                    placeholder="/ˈsɛntəns/"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Phonetic US
                  </Label>
                  <Input
                    value={formValues.phoneticUs}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        phoneticUs: e.target.value,
                      }))
                    }
                    placeholder="/ˈsɛntəns/"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
                  </>
                )
              }
            </div>

            {/* Actions row */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
              <Button
                type="button"
                size="sm"
                className="h-7 px-2 text-[12px]"
                onClick={handleSave}
                disabled={!hasChanges}
              >
                <Save className="mr-1 h-3 w-3" />
                Save changes
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[12px]"
                onClick={handleReset}
                disabled={!hasChanges}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset from raw
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[12px]"
                onClick={handleRegenerate}
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Regenerate with AI
              </Button>
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
              {s.phoneticUk && (
                <p className="text-[12px] leading-snug text-muted-foreground">
                  UK: [{s.phoneticUk}]
                </p>
              )}
              {s.phoneticUs && (
                <p className="text-[12px] leading-snug text-muted-foreground">
                  US: [{s.phoneticUs}]
                </p>
              )}
            </div>

            {s.lessonWords && s.lessonWords.length > 0 && (
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
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default SentenceItem
