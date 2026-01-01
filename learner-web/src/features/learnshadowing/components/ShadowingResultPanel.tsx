/**
 * Component ShadowingResultPanel.tsx
 * 
 * Mục đích:
 * - Hiển thị kết quả phân tích pronunciation sau khi user ghi âm
 * - So sánh từng từ giữa câu mẫu (expected) và câu user đọc (recognized)
 * - Hiển thị điểm số tổng thể và feedback chi tiết
 * 
 * Tính năng:
 * - Circular progress bar hiển thị điểm (0-100%)
 * - Alert với màu sắc tùy theo mức độ chính xác (success/warning/destructive)
 * - Hiển thị 2 hàng từ: Target sentence và You said
 * - Mỗi từ có màu sắc riêng theo status (CORRECT, NEAR, WRONG, MISSING, EXTRA)
 * - Từ chưa đọc tới được hiển thị mờ với border dashed
 * 
 * Các status của từ:
 * - CORRECT: Đọc đúng hoàn toàn (màu xanh lá)
 * - NEAR: Gần đúng, có thể nhận diện (màu vàng)
 * - WRONG: Sai hoàn toàn (màu đỏ)
 * - MISSING: Thiếu từ (màu xám, italic)
 * - EXTRA: Thêm từ không cần thiết (màu xanh dương)
 * 
 * Optimization:
 * - Sử dụng React.memo để tránh re-render không cần thiết
 * - useMemo để cache các class names đã tính toán
 * - Pure functions bên ngoài component để tránh tạo lại functions
 */
import React, { useMemo } from "react"
import { cn } from "@/lib/utils"
import Alert from "@/components/Alert"
import CircularProgressWithLabel from "@/components/CircularProgressWithLabelProps"
import { Sparkles, Target } from "lucide-react"
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
        "mt-2 space-y-3 rounded-xl border bg-gradient-to-br from-muted/40 via-muted/20 to-primary/5 p-4 shadow-md",
        className
      )}
    >
      {/* Header với icon - Thể hiện mức độ thành công */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-primary/10">
          {/* Icon thay đổi theo điểm: Sparkles nếu tốt, Target nếu cần cải thiện */}
          {weightedAccuracy >= 85 ? (
            <Sparkles className="h-4 w-4 text-green-600" />
          ) : (
            <Target className="h-4 w-4 text-primary" />
          )}
        </div>
        <span className="text-sm font-semibold">Pronunciation Analysis</span>
      </div>

      {/* Top section: Điểm số + Summary feedback */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Circular progress hiển thị điểm */}
        <CircularProgressWithLabel
          value={weightedAccuracy}
          size="sm"
          label="Pronunciation score"
          helperText={`${correctWords}/${totalWords} exact · ${weightedAccuracy.toFixed(
            1
          )}% overall`}
        />

        {/* Alert box với feedback message */}
        <Alert
          variant={alertVariant}
          size="sm"
          showIcon
          description={alertDescription}
          className="sm:max-w-[320px]"
        />
      </div>

      {/* Chi tiết từng từ: Expected vs Recognized */}
      <div className="space-y-3 text-xs">
        {/* Section 1: Target sentence (câu mẫu cần đọc) */}
        <div className="p-3 rounded-lg bg-background/50">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Target className="h-3 w-3" />
            Target sentence
          </p>
          <div className="flex flex-wrap gap-1.5">
            {/* Hiển thị từng từ với màu sắc theo status */}
            {expectedWordsWithClasses.map((c) => (
              <span
                key={`exp-${c.position}`}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                  c.chipClasses
                )}
              >
                {c.expectedWord}
              </span>
            ))}
          </div>
        </div>

        {/* Section 2: You said (những gì user thực sự đọc) */}
        <div className="p-3 rounded-lg bg-background/50">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            You said
          </p>
          <div className="flex flex-wrap gap-1.5">
            {/* Hiển thị từng từ user đọc với màu sắc theo status */}
            {recognizedWordsWithClasses.map((c) => (
              <span
                key={`rec-${c.position}-${c.recognizedWord}`}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px]",
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
