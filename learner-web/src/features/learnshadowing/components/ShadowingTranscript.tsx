import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ILessonSentenceDetailsResponse } from "@/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Languages,
  Quote,
  CheckCircle2,
  Circle,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ShadowingTranscriptProps = {
  sentences: ILessonSentenceDetailsResponse[]
  activeIndex: number
  onSelectSentence: (index: number) => void
  visible?: boolean
  completedIds: number[]
}

const TranscriptItem = React.memo(({
  sentence,
  index,
  isActive,
  isCompleted,
  showIPA,
  showTranslation,
  onSelect,
  setItemRef
}: {
  sentence: ILessonSentenceDetailsResponse
  index: number
  isActive: boolean
  isCompleted: boolean
  showIPA: boolean
  showTranslation: boolean
  onSelect: (index: number) => void
  setItemRef: (el: HTMLButtonElement | null, index: number) => void
}) => {
  const mainText = sentence.textDisplay ?? sentence.textRaw

  const handleClick = useCallback(() => {
    onSelect(index)
  }, [onSelect, index])

  return (
    <button
      type="button"
      ref={(el) => setItemRef(el, index)}
      onClick={handleClick}
      className={cn(
        "w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-100", // Giảm transition chỉ còn màu sắc
        isActive
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : isCompleted
          ? "border-green-300 bg-green-50" 
          : "border-border bg-background hover:bg-muted/30" // Giảm độ đậm của hover
      )}
    >
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <div className="flex items-center gap-1.5">
          {isCompleted ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          ) : isActive ? (
            <Circle className="h-3.5 w-3.5 text-primary fill-primary" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          
          <span className={cn(
            "font-medium",
            isActive ? "text-primary" : "text-muted-foreground"
          )}>
            #{index + 1}
          </span>
        </div>

        {sentence.audioSegmentUrl && (
          <Badge variant="outline" className="px-1.5 py-0 text-[11px] bg-primary/5 border-primary/20">
            audio
          </Badge>
        )}
      </div>

      <p className={cn(
        "text-sm leading-snug font-medium",
        isActive ? "text-primary" : "text-foreground"
      )}>
        {mainText}
      </p>

      {showTranslation && sentence.translationVi && (
        <p className="mt-1 text-[13px] leading-snug text-muted-foreground/80">
          {sentence.translationVi}
        </p>
      )}

      {showIPA && (sentence.phoneticUs || "") && (
        <p className="mt-1 text-[13px] italic text-muted-foreground/70">
         {sentence.phoneticUs || ""}
        </p>
      )}
    </button>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.isCompleted === nextProps.isCompleted &&
    prevProps.showIPA === nextProps.showIPA &&
    prevProps.showTranslation === nextProps.showTranslation &&
    prevProps.sentence.id === nextProps.sentence.id
  )
})

TranscriptItem.displayName = "TranscriptItem"

const ShadowingTranscript = ({
  sentences,
  activeIndex,
  onSelectSentence,
  visible = true,
  completedIds = []
}: ShadowingTranscriptProps) => {
  const [showIPA, setShowIPA] = useState(false)
  const [showTranslation, setShowTranslation] = useState(true)

  const completedMap = useMemo(() => {
    const map = new Map<number, true>()
    completedIds.forEach(id => map.set(id, true))
    return map
  }, [completedIds])

  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const completedCount = useMemo(() => completedIds.length, [completedIds]);

  const currentStepText = useMemo(() => {
    if (!sentences.length) return "0 / 0";
    return `${activeIndex + 1} / ${sentences.length}`;
  }, [sentences.length, activeIndex]);

  const handleSelectSentence = useCallback((index: number) => {
    onSelectSentence(index)
  }, [onSelectSentence])

  const setItemRef = useCallback((el: HTMLButtonElement | null, index: number) => {
    itemRefs.current[index] = el
  }, [])

  // ✅ SỬA LOGIC SCROLL: Luôn đưa lên đầu khi activeIndex thay đổi
  useEffect(() => {
    if (!visible) return
    if (activeIndex < 0 || activeIndex >= sentences.length) return

    const timer = setTimeout(() => {
      const el = itemRefs.current[activeIndex]
      if (!el || !scrollAreaRef.current) return

      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      ) as HTMLElement

      if (!scrollContainer) return

      // Công thức cuộn lên đầu: lấy offsetTop của phần tử
      // Trừ đi một khoảng nhỏ (ví dụ 12px) để không bị dính sát mép trên cùng của container
      const scrollTo = el.offsetTop - 12

      scrollContainer.scrollTo({ 
        top: scrollTo, 
        behavior: "smooth" // Giữ scroll mượt
      })
    }, 50) // Giảm delay xuống để phản hồi nhanh hơn

    return () => clearTimeout(timer)
  }, [activeIndex, sentences.length, visible])

  return (
    <div className="flex h-[calc(100vh-17vh)] min-h-[260px] flex-col rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col border-b bg-muted/30 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="text-base font-semibold">Transcript</span>
              <p className="text-[10px] text-muted-foreground">{sentences.length} sentences</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showIPA ? "default" : "outline"}
              className="h-8 gap-1 px-2.5 text-[12px]"
              onClick={() => setShowIPA((prev) => !prev)}
            >
              <Quote className="h-3.5 w-3.5" />
              IPA
            </Button>
            <Button
              size="sm"
              variant={showTranslation ? "default" : "outline"}
              className="h-8 gap-1 px-2.5 text-[12px]"
              onClick={() => setShowTranslation((prev) => !prev)}
            >
              <Languages className="h-3.5 w-3.5" />
              Trans
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-border/50 pt-2.5">
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-bold text-green-700 border border-green-100">
            <CheckCircle2 className="h-3 w-3" />
            <span>COMPLETED: {completedCount}/{sentences.length}</span>
          </div>
          
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary border border-primary/20">
            <Circle className="h-3 w-3 fill-primary" />
            <span>STEP: {currentStepText}</span>
          </div>
        </div>
      </div>

      <ScrollArea ref={scrollAreaRef} className="h-full overflow-auto">
        <div className="space-y-2 p-3">
          {sentences.map((s, index) => {
            const isActive = index === activeIndex
            const isCompleted = !!completedMap.get(s.id)

            return (
              <TranscriptItem
                key={s.id}
                sentence={s}
                index={index}
                isActive={isActive}
                isCompleted={isCompleted}
                showIPA={showIPA}
                showTranslation={showTranslation}
                onSelect={handleSelectSentence}
                setItemRef={setItemRef}
              />
            )
          })}

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

export default React.memo(ShadowingTranscript)