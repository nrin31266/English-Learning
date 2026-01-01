/**
 * Component ShadowingTranscript.tsx
 * 
 * Mục đích:
 * - Hiển thị danh sách tất cả các câu trong bài học (transcript)
 * - Cho phép user jump tới bất kỳ câu nào bằng cách click
 * - Highlight câu đang active (đang practice)
 * - Auto scroll để câu active luôn visible
 * 
 * Tính năng:
 * - Progress bar hiển thị tiến độ học (đã học bao nhiêu câu)
 * - Toggle hiển thị IPA (phiên âm)
 * - Toggle hiển thị translation (dịch nghĩa)
 * - Visual indicator: CheckCircle cho câu đã học, Circle fill cho câu đang học
 * - Badge "audio" cho câu có audio segment riêng
 * 
 * UX:
 * - Smooth scroll animation khi chuyển câu
 * - Hover effect để user biết có thể click
 * - Gradient border cho câu active
 * - Responsive: các controls ẩn/hiện theo màn hình
 * 
 * Performance:
 * - useMemo để cache progress calculation
 * - useRef để tránh re-render không cần thiết khi scroll
 * - useEffect với dependency chính xác để tránh infinite loop
 */
import { useEffect, useMemo, useRef, useState } from "react"
import type { ILLessonSentence } from "@/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Languages,
  Quote,
  CheckCircle2,
  Circle,
} from "lucide-react"

/**
 * Props cho ShadowingTranscript component
 */
type ShadowingTranscriptProps = {
  /** Danh sách tất cả các câu trong lesson */
  sentences: ILLessonSentence[]
  /** Index của câu đang active (đang practice) */
  activeIndex: number
  /** Callback khi user click chọn một câu */
  onSelectSentence: (index: number) => void
  /** 
   * Optional: nếu sau này hide bằng CSS thay vì unmount thì dùng prop này
   * Để tránh chạy scroll logic khi component bị ẩn
   */
  visible?: boolean
}

/**
 * Component chính hiển thị transcript
 */
const ShadowingTranscript = ({
  sentences,
  activeIndex,
  onSelectSentence,
  visible = true,
}: ShadowingTranscriptProps) => {
  // State cho các toggle buttons
  const [showIPA, setShowIPA] = useState(false)           // Hiển thị phiên âm IPA
  const [showTranslation, setShowTranslation] = useState(true)  // Hiển thị dịch nghĩa

  // Refs để quản lý scroll behavior
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])  // Ref tới từng sentence item
  const scrollAreaRef = useRef<HTMLDivElement>(null)         // Ref tới ScrollArea container

  /**
   * Tính progress (% câu đã học)
   * Memoize để tránh recalculate mỗi lần render
   */
  const progress = useMemo(() => {
    if (!sentences.length) return 0
    return Math.round(((activeIndex + 1) / sentences.length) * 100)
  }, [sentences.length, activeIndex])

  /**
   * Auto scroll: đưa câu active lên vị trí dễ nhìn trong viewport
   * 
   * Logic:
   * - Tính toán vị trí để câu active ở khoảng 1/5 từ trên xuống
   * - Sử dụng smooth scroll để UX mượt mà
   * - Chỉ chạy khi activeIndex thay đổi và component visible
   */
  useEffect(() => {
    if (!visible) return  // Không scroll nếu component bị ẩn
    if (activeIndex < 0 || activeIndex >= sentences.length) return  // Guard: index hợp lệ
    
    const el = itemRefs.current[activeIndex]
    if (!el || !scrollAreaRef.current) return

    // Lấy container của ScrollArea (Radix UI sử dụng internal viewport)
    const scrollContainer = scrollAreaRef.current.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement
    
    if (!scrollContainer) return

    const itemTop = el.offsetTop           // Vị trí từ top của item
    const itemHeight = el.offsetHeight     // Chiều cao của item
    const containerHeight = scrollContainer.clientHeight  // Chiều cao của viewport

    // Tính toán vị trí scroll để đưa item ra giữa 1/5 chiều cao container
    // Công thức: scroll tới vị trí item, trừ đi 1/5 chiều cao container, cộng nửa chiều cao item
    const scrollTo = itemTop - (containerHeight / 5) + (itemHeight / 2)
    
    scrollContainer.scrollTo({
      top: scrollTo,
      behavior: "smooth"  // Smooth scroll animation
    })
  }, [activeIndex, sentences.length, visible])

  return (
    <div className="flex h-[calc(100vh-17vh)] min-h-[260px] flex-col rounded-xl border bg-gradient-to-b from-card to-card/50 shadow-md">
      {/* Header với gradient background */}
      <div className="flex flex-col gap-2 border-b bg-gradient-to-r from-primary/5 to-primary/10 px-3 py-3">
        {/* Row 1: Title và controls */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Title với icon */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="text-base font-semibold">Transcript</span>
              <p className="text-[10px] text-muted-foreground">{sentences.length} sentences</p>
            </div>
          </div>

          {/* Right: Toggle buttons */}
          <div className="flex items-center gap-2">
            {/* Toggle IPA (phiên âm) */}
            <Button
              size="sm"
              variant={showIPA ? "default" : "outline"}  // Active state
              className="h-8 gap-1 px-2.5 text-[12px]"
              onClick={() => setShowIPA((prev) => !prev)}
            >
              <Quote className="h-3.5 w-3.5" />
              IPA
            </Button>
            {/* Toggle Translation (dịch nghĩa) */}
            <Button
              size="sm"
              variant={showTranslation ? "default" : "outline"}  // Active state
              className="h-8 gap-1 px-2.5 text-[12px]"
              onClick={() => setShowTranslation((prev) => !prev)}
            >
              <Languages className="h-3.5 w-3.5" />
              Trans
            </Button>
          </div>
        </div>

        {/* Row 2: Progress bar (ẩn trên mobile nhỏ) */}
        <div className="hidden items-center gap-2 text-[12px] text-muted-foreground sm:flex">
          <span>{progress}%</span>
          <div className="w-full">
            <Progress value={progress} />
          </div>
        </div>
      </div>

      {/* Danh sách các câu - scrollable */}
      <ScrollArea ref={scrollAreaRef} className="h-full overflow-auto">
        <div className="space-y-2 p-3">
          {sentences.map((s, index) => {
            const isActive = index === activeIndex  // Câu đang practice
            const mainText = s.textDisplay ?? s.textRaw  // Text chính để hiển thị

            return (
              <button
                key={s.id}
                type="button"
                ref={(el) => {
                  itemRefs.current[index] = el  // Lưu ref cho mỗi item
                }}
                onClick={() => onSelectSentence(index)}
                className={[
                  "w-full rounded-lg border px-3 py-2.5 text-left text-sm shadow-sm transition-all duration-200",
                  "hover:shadow-md hover:scale-[1.01]",  // Hover effect
                  isActive
                    ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-primary/20"  // Active style
                    : "border-border bg-background hover:bg-muted/50",  // Default style
                ].join(" ")}
              >
                {/* Header của mỗi câu: số thứ tự + status icon + badge */}
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-1.5">
                    {/* Icon status: đã học / đang học / chưa học */}
                    {index < activeIndex ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />  // Đã học
                    ) : isActive ? (
                      <Circle className="h-3.5 w-3.5 text-primary fill-primary" />  // Đang học
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground" />  // Chưa học
                    )}
                    <span className={isActive ? "text-primary font-medium" : "text-muted-foreground"}>#{index+1}</span>
                  </div>
                  {/* Badge "audio" nếu câu có audio segment riêng */}
                  {s.audioSegmentUrl && (
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 text-[11px] bg-primary/5 border-primary/20"
                    >
                      audio
                    </Badge>
                  )}
                </div>

                {/* Text chính của câu */}
                <p className="text-[15px] font-medium leading-relaxed">
                  {mainText}
                </p>

                {/* Translation (dịch nghĩa) - hiển thị nếu toggle bật */}
                {showTranslation && s.translationVi && (
                  <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                    {s.translationVi}
                  </p>
                )}

                {/* IPA (phiên âm) - hiển thị nếu toggle bật */}
                {showIPA && (s.phoneticUk || s.phoneticUs) && (
                  <p className="mt-1 text-[13px] italic text-muted-foreground">
                    {s.phoneticUk ?? s.phoneticUs}
                  </p>
                )}
              </button>
            )
          })}

          {/* Empty state - hiển thị khi không có câu nào */}
          {!sentences.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No transcript available for this lesson.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default ShadowingTranscript