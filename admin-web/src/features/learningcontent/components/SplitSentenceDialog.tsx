import React, { use, useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
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
    phoneticUk: z.string().min(1, "Phonetic UK không được để trống"),
    phoneticUs: z.string().min(1, "Phonetic US không được để trống"),
  }),
  sentence2: z.object({
    textDisplay: z.string().min(1, "Câu 2 không được để trống"),
    translationVi: z.string().min(1, "Bản dịch tiếng Việt không được để trống"),
    phoneticUk: z.string().min(1, "Phonetic UK không được để trống"),
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

// ─── Sub: SentenceDataFields ──────────────────────────────────────────────────
const SentenceDataFields = ({
  prefix, label, form,
}: {
  prefix: "sentence1" | "sentence2"
  label: string
  form: any
}) => (
  <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    <FormField control={form.control} name={`${prefix}.textDisplay`} render={({ field }) => (
      <FormItem>
        <FormLabel className="text-[11px] text-muted-foreground">Sentence</FormLabel>
        <FormControl>
          <Textarea {...field} className="min-h-[60px] text-sm" placeholder="Nội dung câu..." />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />

    <FormField control={form.control} name={`${prefix}.translationVi`} render={({ field }) => (
      <FormItem>
        <FormLabel className="text-[11px] text-muted-foreground">Dịch tiếng Việt</FormLabel>
        <FormControl>
          <Textarea {...field} className="min-h-[50px] text-sm" placeholder="Bản dịch..." />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />

    <div className="grid  gap-2">
      <FormField control={form.control} name={`${prefix}.phoneticUk`} render={({ field }) => (
        <FormItem>
          <FormLabel className="text-[11px] text-muted-foreground">Phonetic UK</FormLabel>
          <FormControl><Input {...field} className="h-8 text-sm" placeholder="/ˈ.../" /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name={`${prefix}.phoneticUs`} render={({ field }) => (
        <FormItem>
          <FormLabel className="text-[11px] text-muted-foreground">Phonetic US</FormLabel>
          <FormControl><Input {...field} className="h-8 text-sm" placeholder="/ˈ.../" /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  </div>
)

// ─── Main Component ───────────────────────────────────────────────────────────
const SplitSentenceDialog = ({ open, onClose, sentence }: ISplitSentenceDialogProps) => {
  const { t } = useTranslation()
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null)
  const dispatch = useAppDispatch()
  const {
    sentenceMutation
  } = useAppSelector((state) => state.learningContent.lessonDetails) // for re-render after split sentence

  const form = useForm<SplitSentenceForm>({
    resolver: zodResolver(splitSentenceSchema),
    defaultValues: {
      splitAfterWordId: 0,
      sentence1: { textDisplay: "", translationVi: "", phoneticUk: "", phoneticUs: "" },
      sentence2: { textDisplay: "", translationVi: "", phoneticUk: "", phoneticUs: "" },
    },
  })

  // Reset khi đổi sentence
  useEffect(() => {
    if (sentence) {
      setSelectedWordId(null)
      form.reset({
        splitAfterWordId: 0,
        sentence1: {
          textDisplay: sentence.textDisplay ?? sentence.textRaw ?? "",
          translationVi: sentence.translationVi ?? "",
          phoneticUk: sentence.phoneticUk ?? "",
          phoneticUs: sentence.phoneticUs ?? "",
        },
        sentence2: { textDisplay: "", translationVi: "", phoneticUk: "", phoneticUs: "" },
      })
    }
  }, [sentence?.id])

  // Khi chọn word: tự động tách textDisplay thành 2 phần
  const handleSelectWord = (word: ILessonWord) => {
    if (!sentence) return
    setSelectedWordId(word.id)
    form.setValue("splitAfterWordId", word.id)

    const words = [...(sentence.lessonWords ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
    const splitIdx = words.findIndex(w => w.id === word.id)

    const part1 = words.slice(0, splitIdx + 1).map(w => w.wordText).join(" ").trim()
    const part2 = words.slice(splitIdx + 1).map(w => w.wordText).join(" ").trim()

    form.setValue("sentence1.textDisplay", part1)
    form.setValue("sentence2.textDisplay", part2)
  }

  const handleSubmit = (data: SplitSentenceForm) => {
    if (!sentence) return
    console.log("Submitting split sentence with data:", data)
    dispatch(splitSentence({data, id: sentence.id})).unwrap()
      .then((res) => {
        console.log("Split sentence successful:", res)
        dispatch(showNotification({
          title: "Tách câu thành công",
          variant: "success",
          message: `Câu đã được tách thành 2 câu mới.`,
        }))
        onClose()
      })
      .catch((err) => {
        console.error("Split sentence failed:", err)
        dispatch(showNotification({
          title: "Tách câu thất bại",
          variant: "error",
          message: err.message || "Đã có lỗi xảy ra khi tách câu.",
        }))
      })  
  }

  const words = [...(sentence?.lessonWords ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
  const splitIdx = words.findIndex(w => w.id === selectedWordId)

  return (
    <Dialog open={open && !!sentence} onOpenChange={onClose}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="!max-w-[90vw] w-[90vw] max-h-[90vh] overflow-auto [&>button]:hidden"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scissors className="h-4 w-4 text-primary" />
            Tách câu
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-5 gap-6 min-h-[60vh]">

              {/* LEFT: chọn từ cắt */}
              <div className="space-y-3 flex flex-col col-span-2">
                <div>
                  <p className="text-sm font-semibold">Chọn điểm cắt</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Click vào từ cuối cùng của <span className="text-foreground font-semibold">câu 1</span>
                  </p>
                </div>

                {/* Original sentence hint */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Câu gốc</p>
                  <p className="text-sm leading-relaxed">{sentence?.textDisplay ?? sentence?.textRaw}</p>
                  {sentence?.translationVi && (
                    <p className="text-[12px] text-muted-foreground">{sentence.translationVi}</p>
                  )}
                  {(sentence?.phoneticUk || sentence?.phoneticUs) && (
                    <div className="flex gap-3 text-[11px] text-muted-foreground">
                      {sentence?.phoneticUk && <span>🇬🇧 {sentence.phoneticUk}</span>}
                      {sentence?.phoneticUs && <span>🇺🇸 {sentence.phoneticUs}</span>}
                    </div>
                  )}
                </div>

                {/* Words selector */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-4 min-h-[120px] content-start">
                    {words.map((word, idx) => {
                      const isSelected = word.id === selectedWordId
                      const isBeforeSplit = splitIdx >= 0 && idx <= splitIdx
                      const isAfterSplit = splitIdx >= 0 && idx > splitIdx
                      return (
                        <React.Fragment key={word.id}>
                          {splitIdx >= 0 && idx === splitIdx + 1 && (
                            <div className="flex items-center">
                              <ChevronRight className="h-5 w-5 text-primary animate-pulse" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSelectWord(word)}
                            className={cn(
                              "rounded-full border px-3 py-1 text-sm transition-all",
                              isSelected && "border-primary bg-primary text-primary-foreground font-semibold shadow-sm",
                              isBeforeSplit && !isSelected && "border-primary/40 bg-primary/10 text-primary",
                              isAfterSplit && "border-muted-foreground/30 text-muted-foreground",
                              !isBeforeSplit && !isAfterSplit && "hover:bg-muted cursor-pointer",
                            )}
                          >
                            {word.wordText}
                          </button>
                        </React.Fragment>
                      )
                    })}
                  </div>
                  {form.formState.errors.splitAfterWordId && (
                    <p className="text-[12px] text-destructive">{form.formState.errors.splitAfterWordId.message}</p>
                  )}
                </div>
              </div>

              {/* RIGHT: fill 2 câu */}
              <div className="space-y-3 flex flex-col col-span-3">
                <div>
                  <p className="text-sm font-semibold">Nội dung 2 câu</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    textDisplay tự điền — copy phần gốc bên trái để điền translation/phonetic
                  </p>
                </div>

                {!selectedWordId ? (
                  <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    ← Chọn điểm cắt trước
                  </div>
                ) : (
                  <div className="flex-1 space-y-3 overflow-auto">
                    <SentenceDataFields prefix="sentence1" label="Câu 1" form={form} />
                    <SentenceDataFields prefix="sentence2" label="Câu 2" form={form} />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" disabled={sentenceMutation.status === "loading"} onClick={onClose}>
                {t("topicDialog.cancelButton", { defaultValue: "Huỷ" })}
              </Button>
              <Button type="submit" disabled={sentenceMutation.status === "loading" || !selectedWordId} className="gap-2">
                {
                  sentenceMutation.status === "loading" && sentenceMutation.type === "split" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null
                }
                <Scissors className="h-3.5 w-3.5" />
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