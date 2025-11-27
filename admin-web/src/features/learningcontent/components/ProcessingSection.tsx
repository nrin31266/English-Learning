// src/features/learning-content/components/ProcessingSection.tsx
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import type { ILessonDetailsDto } from "@/types"
import { getProcessingMeta, getStepLabel } from "@/utils/lessonContentUtils"
import { AlertTriangle, CheckCircle2, CircleDot, Gauge, Loader2 } from "lucide-react"

type ProcessingStep = ILessonDetailsDto["processingStep"]

const ProcessingSection = ({ lesson }: { lesson: ILessonDetailsDto }) => {
  const { t } = useTranslation()

  console.log(lesson)  
  const meta = getProcessingMeta(lesson.processingStep)

  // Các step hiển thị trong timeline (bỏ NONE & FAILED)
  const steps: ProcessingStep[] = [
    "PROCESSING_STARTED",
    "SOURCE_FETCHED",
    "TRANSCRIBED",
    "NLP_ANALYZED",
    "COMPLETED",
  ]

  const isError = lesson.status === "ERROR" 
  const isCompleted = lesson.processingStep === "COMPLETED"
  const isDraft = lesson.status === "DRAFT"

  // -----------------------------
  // INTERPRETATION:
  // processingStep = bước cuối cùng đã hoàn thành
  // → bước tiếp theo = step đang diễn ra (active)
  // -----------------------------

  // Nếu NONE → chưa có bước nào done
  // Nếu FAILED → coi như fail ở bước cuối (COMPLETED)
  // Còn lại → index của step đó trong timeline (nếu không thuộc steps thì = -1)
  const baseIndex =
    lesson.processingStep === "NONE"
      ? -1
      : lesson.processingStep === "FAILED"
      ? steps.length - 1 // fail tại "COMPLETED"
      : steps.indexOf(lesson.processingStep)

  const lastDoneIndex = Math.min(baseIndex, steps.length - 1)

  // Bước đang diễn ra: bước tiếp theo sau lastDoneIndex
  const activeIndex =
    isCompleted || isError
      ? -1 // không còn bước active (đã xong / fail)
      : Math.min(lastDoneIndex + 1, steps.length - 1)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Gauge className="h-4 w-4" />
          {t("processingSection.title")}
        </CardTitle>
        <CardDescription className="text-xs">
          {t("processingSection.description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Header status + % */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {isError ? (
              <AlertTriangle className="h-3 w-3 text-red-500" />
            ) : lesson.status === "PROCESSING" ? (
              <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
            ) : isDraft ? (
              <CircleDot className="h-3 w-3 text-gray-500" />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            )}
            <span>{meta.label}</span>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">{meta.progress}%</span>
        </div>

        <Progress value={meta.progress} className="h-2" />

        <Separator className="my-2" />

        {/* Timeline từng step */}
        <div className="space-y-1.5">
          {steps.map((step, idx) => {
            const failed = isError && step === "COMPLETED"

            // step đã hoàn thành
            const done = !failed && (isCompleted || idx <= lastDoneIndex)

            // step đang diễn ra (chỉ khi chưa completed / failed)
            const active = !isCompleted && !isError && idx === activeIndex

            const dotClass = [
              "h-2.5 w-2.5 rounded-full border",
              failed
                ? "border-red-400 bg-red-300"
                : done
                ? "border-emerald-400 bg-emerald-400"
                : active
                ? "border-amber-400 bg-amber-200"
                : "border-slate-300 bg-slate-100",
            ].join(" ")

          return (
            <div
              key={step}
              className="flex items-center justify-between text-[11px] text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <div className={dotClass} />
                <span>{getStepLabel(step)}</span>
              </div>

              {done && !failed && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
              {failed && <AlertTriangle className="h-3 w-3 text-red-500" />}
            </div>
          )
        })}
        </div>
        {lesson.aiMessage && (
          isError ? (
            <p className="pt-1 text-[11px] text-red-500">
              {lesson.aiMessage}
            </p>
          ) : (
            <p className="pt-1 text-[11px] text-gray-500">
              {lesson.aiMessage}
            </p>
          )
        )}
        {isError && (
          <p className="pt-1 text-[11px] text-red-500">
            {t("processingSection.errorMessage")}
          </p>
        )}
        {
            isDraft && (
              <p className="pt-1 text-[11px] text-gray-500">
                {t("processingSection.draftMessage")}
              </p>
            )
        }
      </CardContent>
    </Card>
  )
}

export default ProcessingSection
