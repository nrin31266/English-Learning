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

type ShadowingTranscriptProps = {
  sentences: ILLessonSentence[]
  activeIndex: number
  onSelectSentence: (index: number) => void
  /** optional: nếu sau này bạn hide bằng CSS thay vì unmount thì truyền thêm */
  visible?: boolean
}

const ShadowingTranscript = ({
  sentences,
  activeIndex,
  onSelectSentence,
  visible = true,
}: ShadowingTranscriptProps) => {
  const [showIPA, setShowIPA] = useState(false)
  const [showTranslation, setShowTranslation] = useState(true)

  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const progress = useMemo(() => {
    if (!sentences.length) return 0
    return Math.round(((activeIndex + 1) / sentences.length) * 100)
  }, [sentences.length, activeIndex])

  // Auto scroll: đưa câu active lên giữa viewport
  useEffect(() => {
    if (!visible) return
    if (activeIndex < 0 || activeIndex >= sentences.length) return
    const el = itemRefs.current[activeIndex]
    if (!el || !scrollAreaRef.current) return

    // Lấy container của ScrollArea
    const scrollContainer = scrollAreaRef.current.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement
    
    if (!scrollContainer) return

    const itemTop = el.offsetTop
    const itemHeight = el.offsetHeight
    const containerHeight = scrollContainer.clientHeight

    // Tính toán vị trí scroll để đưa item ra giữa 1/5 chiều cao container
    const scrollTo = itemTop - (containerHeight / 5) + (itemHeight / 2)
    
    scrollContainer.scrollTo({
      top: scrollTo,
      behavior: "smooth"
    })
  }, [activeIndex, sentences.length, visible])

  return (
    <div className="flex h-[calc(100vh-17vh)] min-h-[260px] flex-col rounded-xl border bg-gradient-to-b from-card to-card/50 shadow-md">
      {/* Header with gradient */}
      <div className="flex flex-col gap-2 border-b bg-gradient-to-r from-primary/5 to-primary/10 px-3 py-3">
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

        <div className="hidden items-center gap-2 text-[12px] text-muted-foreground sm:flex">
          <span>{progress}%</span>
          <div className="w-full">
            <Progress value={progress} />
          </div>
        </div>
      </div>

      {/* List */}
      <ScrollArea ref={scrollAreaRef} className="h-full overflow-auto">
        <div className="space-y-2 p-3">
          {sentences.map((s, index) => {
            const isActive = index === activeIndex
            const mainText = s.textDisplay ?? s.textRaw

            return (
              <button
                key={s.id}
                type="button"
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                onClick={() => onSelectSentence(index)}
                className={[
                  "w-full rounded-lg border px-3 py-2.5 text-left text-sm shadow-sm transition-all duration-200",
                  "hover:shadow-md hover:scale-[1.01]",
                  isActive
                    ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-primary/20"
                    : "border-border bg-background hover:bg-muted/50",
                ].join(" ")}
              >
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-1.5">
                    {index < activeIndex ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    ) : isActive ? (
                      <Circle className="h-3.5 w-3.5 text-primary fill-primary" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className={isActive ? "text-primary font-medium" : "text-muted-foreground"}>#{index+1}</span>
                  </div>
                  {s.audioSegmentUrl && (
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 text-[11px] bg-primary/5 border-primary/20"
                    >
                      audio
                    </Badge>
                  )}
                </div>

                <p className="text-[15px] font-medium leading-relaxed">
                  {mainText}
                </p>

                {showTranslation && s.translationVi && (
                  <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                    {s.translationVi}
                  </p>
                )}

                {showIPA && (s.phoneticUk || s.phoneticUs) && (
                  <p className="mt-1 text-[13px] italic text-muted-foreground">
                    {s.phoneticUk ?? s.phoneticUs}
                  </p>
                )}
              </button>
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

export default ShadowingTranscript