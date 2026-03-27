import React, { useMemo } from "react"
import { cn } from "@/lib/utils"
import Alert from "@/components/Alert"
import CircularProgressWithLabel from "@/components/CircularProgressWithLabelProps"
import { Sparkles, Target, Mic, BookOpen } from "lucide-react"
import type { IShadowingResult, IShadowingWordCompare } from "@/types"

/**
 * Props cho ShadowingResultPanel
 */
interface ShadowingResultPanelProps {
  /** Kết quả phân tích từ API (bao gồm điểm số và chi tiết từng từ) */
  result: IShadowingResult
  /** Class CSS thêm vào cho container */
  className?: string
}

/**
 * Helper function: Trả về CSS classes cho word chip dựa trên status
 * Pure function, định nghĩa bên ngoài component để tránh tạo lại
 * 
 * @param compare - Object chứa thông tin so sánh của từ
 * @param lastPos - Vị trí từ cuối cùng user đọc được nhận diện
 * @returns CSS class string
 */
const getWordChipClasses = (
  compare: IShadowingWordCompare,
  lastPos: number
) => {
  // Kiểm tra xem từ này user có đọc tới chưa
  const attempted = compare.position <= lastPos

  if (!attempted) {
    // Chưa đọc tới: hiển thị mờ với border dashed
    return "border border-dashed border-muted-foreground/30 text-muted-foreground/70 bg-muted/40"
  }

  // Đã đọc tới: màu sắc theo status
  switch (compare.status) {
    case "CORRECT":
      return "bg-emerald-50 text-emerald-800 border border-emerald-200"
    case "NEAR":
      return "bg-amber-50 text-amber-800 border border-amber-200"
    case "WRONG":
      return "bg-red-50 text-red-800 border border-red-200"
    case "MISSING":
      return "bg-slate-50 text-slate-500 border border-slate-200 italic"
    case "EXTRA":
      return "bg-blue-50 text-blue-800 border border-blue-200"
    default:
      return "bg-muted text-muted-foreground border border-muted"
  }
}

/**
 * Helper function: Chọn variant alert dựa trên điểm số
 * Pure function để xác định màu sắc feedback
 * 
 * @param score - Điểm số (0-100)
 * @returns Variant cho Alert component
 */
const getAlertVariant = (score: number) => {
  if (score >= 85) return "success" as const    // Rất tốt
  if (score >= 60) return "warning" as const    // Cần cải thiện
  return "destructive" as const                 // Cần practice nhiều hơn
}

/**
 * Component chính hiển thị kết quả shadowing
 */
const ShadowingResultPanel: React.FC<ShadowingResultPanelProps> = ({
  result,
  className,
}) => {
  // Destructure các giá trị cần thiết từ result
  const {
    weightedAccuracy,      // Điểm tổng thể (0-100)
    correctWords,          // Số từ đọc đúng hoàn toàn
    totalWords,            // Tổng số từ trong câu
    compares,              // Mảng chi tiết so sánh từng từ
    lastRecognizedPosition,// Vị trí từ cuối cùng được nhận diện
  } = result

  /**
   * Memoize danh sách expected words với classes đã tính sẵn
   * Chỉ recalculate khi compares hoặc lastRecognizedPosition thay đổi
   */
  const expectedWordsWithClasses = useMemo(
    () =>
      compares
        .filter((c) => c.expectedWord)  // Chỉ lấy từ có expectedWord (target sentence)
        .map((c) => ({
          ...c,
          chipClasses: getWordChipClasses(c, lastRecognizedPosition),
        })),
    [compares, lastRecognizedPosition]
  )

  /**
   * Memoize danh sách recognized words với classes đã tính sẵn
   * Đây là những từ user thực sự đọc (có thể sai hoặc thừa)
   */
  const recognizedWordsWithClasses = useMemo(
    () =>
      compares
        .filter((c) => c.recognizedWord)  // Chỉ lấy từ có recognizedWord (user said)
        .map((c) => ({
          ...c,
          chipClasses: getWordChipClasses(c, lastRecognizedPosition),
        })),
    [compares, lastRecognizedPosition]
  )

  /**
   * Memoize alert variant để tránh recalculate mỗi lần render
   */
  const alertVariant = useMemo(
    () => getAlertVariant(weightedAccuracy),
    [weightedAccuracy]
  )

  /**
   * Memoize alert description (feedback message) dựa trên điểm số
   */
  const alertDescription = useMemo(() => {
    if (weightedAccuracy >= 85)
      return "Very natural! You're matching this sentence really well."
    if (weightedAccuracy >= 60)
      return "Good job! A few words can be improved."
    return "Keep practicing this sentence — focus on the highlighted words."
  }, [weightedAccuracy])

  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br from-muted/40 via-muted/20 to-primary/5 shadow-md",
        className
      )}
    >
      {/* Header với icon - compact hơn */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-primary/10">
            {weightedAccuracy >= 85 ? (
              <Sparkles className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Target className="h-3.5 w-3.5 text-primary" />
            )}
          </div>
          <span className="text-xs font-semibold">Pronunciation Analysis</span>
        </div>
        
        {/* Score nhỏ gọn ở header */}
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold leading-none">
            {weightedAccuracy.toFixed(0)}
          </span>
          <span className="text-[10px] text-muted-foreground">%</span>
          <span className="text-[10px] text-muted-foreground mx-0.5">•</span>
          <span className="text-[10px] text-muted-foreground">
            {correctWords}/{totalWords}
          </span>
        </div>
      </div>

      {/* Alert feedback - gọn hơn */}
      <div className="px-4 pt-3">
        <Alert
          variant={alertVariant}
          size="sm"
          showIcon
          description={alertDescription}
          className="text-xs py-1.5"
        />
      </div>

      {/* Chi tiết từng từ: Target vs Said - layout 2 cột ngang */}
      <div className="grid grid-cols-2 gap-3 p-4 pt-2">
        {/* Section 1: Target sentence */}
        <div className="rounded-lg bg-background/50 p-2.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            Target
          </p>
          <div className="flex flex-wrap gap-1">
            {expectedWordsWithClasses.map((c) => (
              <span
                key={`exp-${c.position}`}
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-relaxed transition-all",
                  c.chipClasses
                )}
              >
                {c.expectedWord}
              </span>
            ))}
          </div>
        </div>

        {/* Section 2: You said */}
        <div className="rounded-lg bg-background/50 p-2.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Mic className="h-3 w-3" />
            Said
          </p>
          <div className="flex flex-wrap gap-1">
            {recognizedWordsWithClasses.map((c) => (
              <span
                key={`rec-${c.position}-${c.recognizedWord}`}
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] leading-relaxed",
                  c.chipClasses
                )}
              >
                {c.recognizedWord}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(ShadowingResultPanel)