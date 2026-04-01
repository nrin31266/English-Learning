import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, GitMerge } from "lucide-react"
import { useAppDispatch, useAppSelector } from "@/store"
import { mergeSentence } from "@/store/learningcontent/lessonDetailsSlide"
import { showNotification } from "@/store/system/notificationSlice"
import type { ILessonSentence } from "@/types"
import { DialogDescription } from "@/components/ui/dialog"
interface IMergeSentenceDialogProps {
  open: boolean
  onClose: () => void
  sentence1: ILessonSentence | null
  sentence2: ILessonSentence | null
}

const getWordCount = (s?: ILessonSentence) =>
  s?.lessonWords?.length ?? 0

const getDuration = (s?: ILessonSentence) => {
  if (!s?.audioStartMs || !s?.audioEndMs) return 0
  return (s.audioEndMs - s.audioStartMs) / 1000
}

const MergeSentenceDialog = ({
  open,
  onClose,
  sentence1,
  sentence2,
}: IMergeSentenceDialogProps) => {
  const dispatch = useAppDispatch()
  const { sentenceMutation } = useAppSelector(
    (state) => state.learningContent.lessonDetails
  )

  if (!sentence1 || !sentence2) return null


  const totalDuration = (getDuration(sentence1) + getDuration(sentence2)).toFixed(2)
  const totalWords = getWordCount(sentence1) + getWordCount(sentence2)

  const handleMerge = () => {
    dispatch(
      mergeSentence({
        data: {
          sentence1Id: sentence1.id,
          sentence2Id: sentence2.id,
        },
      })
    )
      .unwrap()
      .then(() => {
        dispatch(
          showNotification({
            title: "Ghép câu thành công",
            variant: "success",
            message: "Hai câu đã được ghép lại.",
          })
        )
        onClose()
      })
      .catch((err) => {
        dispatch(
          showNotification({
            title: "Ghép câu thất bại",
            variant: "error",
            message: err.message || "Đã có lỗi xảy ra.",
          })
        )
      })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <GitMerge className="h-4 w-4 text-primary" />
            Ghép câu
          </DialogTitle>
          <DialogDescription>
    Xác nhận ghép 2 câu liên tiếp thành một câu duy nhất. Hành động này không thể hoàn tác.
  </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">

          {/* Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>#{sentence1.orderIndex} → #{sentence2.orderIndex}</span>
            <span>{getWordCount(sentence1)} + {getWordCount(sentence2)} words</span>
          </div>

          {/* Sentences */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Câu 1</p>
              <p className="text-sm leading-relaxed">{sentence1.textDisplay}</p>
              <div className="text-[11px] text-muted-foreground">
                ⏱ {getDuration(sentence1).toFixed(2)}s
              </div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Câu 2</p>
              <p className="text-sm leading-relaxed">{sentence2.textDisplay}</p>
              <div className="text-[11px] text-muted-foreground">
                ⏱ {getDuration(sentence2).toFixed(2)}s
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <GitMerge className="h-6 w-6 text-primary" />
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-primary bg-primary/5 p-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase text-primary">Sau khi ghép</p>

            <p className="text-sm leading-relaxed font-medium">
              <span>{sentence1.textDisplay}</span>
              <span className="mx-1 text-primary font-bold">|</span>
              <span>{sentence2.textDisplay}</span>
            </p>

            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{totalWords} words</span>
              <span>⏱ {totalDuration}s</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={sentenceMutation.status === "loading"}
            onClick={onClose}
          >
            Huỷ
          </Button>

          <Button
            type="button"
            onClick={handleMerge}
            disabled={sentenceMutation.status === "loading"}
            className="gap-2"
          >
            {sentenceMutation.status === "loading" && sentenceMutation.type === "merge" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            <GitMerge className="h-4 w-4" />
            Ghép câu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MergeSentenceDialog
