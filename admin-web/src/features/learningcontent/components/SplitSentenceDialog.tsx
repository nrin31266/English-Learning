import React, { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod/dist/zod.js'
import type { ILessonSentence, ILessonWord } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Scissors, ChevronRight, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store'
import { splitSentence } from '@/store/learningcontent/lessonDetailsSlide'
import { showNotification } from '@/store/system/notificationSlice'

// ─── Schema ───────────────────────────────────────────────────────────────────
export const splitSentenceSchema = z.object({
  splitAfterWordId: z.number().min(1, "Vui lòng chọn từ để cắt"),
  sentence1: z.object({
    textDisplay: z.string().min(1, "Câu 1 không được để trống"),
    translationVi: z.string().min(1, "Bản dịch tiếng Việt không được để trống"),
    phoneticUs: z.string().min(1, "Phonetic US không được để trống"),
  }),
  sentence2: z.object({
    textDisplay: z.string().min(1, "Câu 2 không được để trống"),
    translationVi: z.string().min(1, "Bản dịch tiếng Việt không được để trống"),
    phoneticUs: z.string().min(1, "Phonetic US không được để trống"),
  }),
})
type SplitSentenceForm = z.infer<typeof splitSentenceSchema>

// ─── Props ────────────────────────────────────────────────────────────────────
interface ISplitSentenceDialogProps {
  open: boolean
  onClose: () => void
  sentence: ILessonSentence | null
}

// ─── Sub: SentenceCard ────────────────────────────────────────────────────────
const SentenceCard = ({
  prefix, label, form, textPreview,
}: {
  prefix: "sentence1" | "sentence2"
  label: string
  form: any
  textPreview?: string
}) => (
  <div className="rounded-lg border bg-muted/30 p-3 space-y-2 flex-1 min-w-0">
    {/* Header */}
    <div className="flex items-baseline justify-between gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">{label}</p>
      {textPreview && (
        <p className="text-[11px] text-muted-foreground/60 truncate text-right">{textPreview}</p>
      )}
    </div>

    {/* Translation — nổi bật nhất, user hay chỉnh nhất */}
    <FormField control={form.control} name={`${prefix}.translationVi`} render={({ field }) => (
      <FormItem>
        <FormLabel className="text-[11px] text-muted-foreground">Dịch tiếng Việt</FormLabel>
        <FormControl>
          <Textarea {...field} className="h-[72px] min-h-[72px] max-h-[72px] resize-none text-sm" placeholder="Bản dịch..." />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />

    {/* Sentence text */}
    <FormField control={form.control} name={`${prefix}.textDisplay`} render={({ field }) => (
      <FormItem>
        <FormLabel className="text-[11px] text-muted-foreground">Sentence</FormLabel>
        <FormControl>
          <Textarea {...field} className="h-[56px] min-h-[56px] max-h-[56px] resize-none text-sm" placeholder="Nội dung câu..." />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />

    {/* Phonetic US only */}
    <FormField control={form.control} name={`${prefix}.phoneticUs`} render={({ field }) => (
      <FormItem>
        <FormLabel className="text-[11px] text-muted-foreground">🇺🇸 Phonetic US</FormLabel>
        <FormControl><Input {...field} className="h-8 text-sm" placeholder="/ˈ.../" /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  </div>
)

// ─── Main Component ───────────────────────────────────────────────────────────
const SplitSentenceDialog = ({ open, onClose, sentence }: ISplitSentenceDialogProps) => {
  const { t } = useTranslation()
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null)
  const dispatch = useAppDispatch()
  const { sentenceMutation } = useAppSelector((state) => state.learningContent.lessonDetails)

  const form = useForm<SplitSentenceForm>({
    resolver: zodResolver(splitSentenceSchema),
    defaultValues: {
      splitAfterWordId: 0,
      sentence1: { textDisplay: "", translationVi: "", phoneticUs: "" },
      sentence2: { textDisplay: "", translationVi: "", phoneticUs: "" },
    },
  })

  useEffect(() => {
    if (sentence) {
      setSelectedWordId(null)
      form.reset({
        splitAfterWordId: 0,
        sentence1: {
          textDisplay: sentence.textDisplay ?? sentence.textRaw ?? "",
          translationVi: sentence.translationVi ?? "",
          phoneticUs: sentence.phoneticUs ?? "",
        },
        sentence2: { textDisplay: "", translationVi: "", phoneticUs: "" },
      })
    }
  }, [sentence?.id])

  const words = [...(sentence?.lessonWords ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
  const splitIdx = words.findIndex(w => w.id === selectedWordId)
  const canSplit = words.length > 1

  const handleSelectWord = (word: ILessonWord) => {
    if (!sentence) return
    setSelectedWordId(word.id)
    form.setValue("splitAfterWordId", word.id)

    const idx = words.findIndex(w => w.id === word.id)

    form.setValue("sentence1.textDisplay", words.slice(0, idx + 1).map(w => w.wordText).join(" ").trim())
    form.setValue("sentence2.textDisplay", words.slice(idx + 1).map(w => w.wordText).join(" ").trim())

    const splitPhonetic = (phonetic?: string | null): [string, string] => {
      if (!phonetic) return ["", ""]
      const tokens = phonetic.trim().split(/\s+/)
      if (Math.abs(tokens.length - words.length) > 1) return ["", ""]
      return [tokens.slice(0, idx + 1).join(" "), tokens.slice(idx + 1).join(" ")]
    }

    const [us1, us2] = splitPhonetic(sentence.phoneticUs)
    form.setValue("sentence1.phoneticUs", us1)
    form.setValue("sentence2.phoneticUs", us2)

    form.setValue("sentence1.translationVi", sentence.translationVi ?? "")
    form.setValue("sentence2.translationVi", "")
  }

  const handleSubmit = (data: SplitSentenceForm) => {
    if (!sentence) return
    dispatch(splitSentence({ data, id: sentence.id })).unwrap()
      .then(() => {
        dispatch(showNotification({
          title: "Tách câu thành công",
          variant: "success",
          message: "Câu đã được tách thành 2 câu mới.",
        }))
        onClose()
      })
      .catch((err) => {
        dispatch(showNotification({
          title: "Tách câu thất bại",
          variant: "error",
          message: err.message || "Đã có lỗi xảy ra khi tách câu.",
        }))
      })
  }

  const isLoading = sentenceMutation.status === "loading"
  const s1Text = splitIdx >= 0 ? words.slice(0, splitIdx + 1).map(w => w.wordText).join(" ") : ""
  const s2Text = splitIdx >= 0 ? words.slice(splitIdx + 1).map(w => w.wordText).join(" ") : ""

  return (
    <Dialog open={open && !!sentence} onOpenChange={onClose}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="!max-w-[82vw] w-[82vw] max-h-[92vh] overflow-auto [&>button]:hidden"
      >
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scissors className="h-4 w-4 text-primary" />
            Tách câu
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Chọn từ cuối câu 1 — phonetic tự điền nếu khớp số từ, chỉnh bản dịch rồi lưu
          </DialogDescription>
        </DialogHeader>

        {/* Câu gốc + word picker */}
        <div className="rounded-lg border bg-muted/20 px-3 py-2.5 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Câu gốc</span>
            <span className="font-medium">{sentence?.textDisplay ?? sentence?.textRaw}</span>
            {sentence?.translationVi && (
              <span className="text-muted-foreground text-[12px]">{sentence.translationVi}</span>
            )}
            {sentence?.phoneticUs && (
              <span className="ml-auto flex gap-3 text-[11px] text-muted-foreground">
                <span>🇺🇸 {sentence.phoneticUs}</span>
              </span>
            )}
          </div>

          {canSplit && (
            <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-border/40">
              {words.map((word, idx) => {
                const isLast = idx === words.length - 1
                const isSelected = word.id === selectedWordId
                const isBeforeSplit = splitIdx >= 0 && idx <= splitIdx
                const isAfterSplit = splitIdx >= 0 && idx > splitIdx

                return (
                  <React.Fragment key={word.id}>
                    {splitIdx >= 0 && idx === splitIdx + 1 && (
                      <ChevronRight className="h-4 w-4 text-primary animate-pulse self-center" />
                    )}
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleSelectWord(word)}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-sm transition-all",
                        isLast
                          ? "opacity-25 cursor-not-allowed border-dashed"
                          : [
                              isSelected && "border-primary bg-primary text-primary-foreground font-semibold shadow-sm",
                              !isSelected && isBeforeSplit && "border-primary/40 bg-primary/10 text-primary",
                              isAfterSplit && "border-muted-foreground/30 text-muted-foreground",
                              !isBeforeSplit && !isAfterSplit && "hover:bg-muted cursor-pointer",
                            ],
                      )}
                    >
                      {word.wordText}
                    </button>
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">

            {!canSplit ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed py-10 text-sm text-muted-foreground">
                Câu chỉ có 1 từ, không thể tách
              </div>
            ) : !selectedWordId ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed py-8 text-sm text-muted-foreground">
                ↑ Chọn từ cuối câu 1 ở trên để bắt đầu
              </div>
            ) : (
              <div className="flex gap-3 items-start">
                <SentenceCard prefix="sentence1" label="Câu 1" form={form} textPreview={s1Text} />
                <SentenceCard prefix="sentence2" label="Câu 2" form={form} textPreview={s2Text} />
              </div>
            )}

            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" disabled={isLoading} onClick={onClose}>
                {t("topicDialog.cancelButton", { defaultValue: "Huỷ" })}
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !selectedWordId || !canSplit}
                className="gap-1.5"
              >
                {isLoading && sentenceMutation.type === "split"
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Scissors className="h-3.5 w-3.5" />
                }
                Tách câu
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default SplitSentenceDialog