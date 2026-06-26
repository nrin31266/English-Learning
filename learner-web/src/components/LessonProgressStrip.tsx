import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"

interface ProgressBarProps {
  sentences: { id: number }[]
  completedIds: number[]
  activeIndex: number
  onSelect: (index: number) => void
}

const LessonProgressBar = ({
  sentences,
  completedIds,
  activeIndex,
  onSelect,
}: ProgressBarProps) => {
  const completedSet = useMemo(() => new Set(completedIds), [completedIds])
  const scrollRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const { state: sidebarState, isMobile } = useSidebar()
  const isSidebarCollapsed = sidebarState === "collapsed"

  const sidebarWidth = isMobile ? 0 : isSidebarCollapsed ? 48 : 256

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return

    const { scrollLeft, scrollWidth, clientWidth } = el

    setCanScrollLeft(scrollLeft > 5)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    checkScroll()

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return

      e.preventDefault()
      el.scrollLeft += e.deltaY + e.deltaX
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("scroll", checkScroll)
    window.addEventListener("resize", checkScroll)

    return () => {
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("scroll", checkScroll)
      window.removeEventListener("resize", checkScroll)
    }
  }, [sentences.length])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      checkScroll()
    }, 200)

    return () => window.clearTimeout(timer)
  }, [isSidebarCollapsed, isMobile])

  useEffect(() => {
    const activeItem = itemRefs.current[activeIndex]

    if (!activeItem || !scrollRef.current) return

    const timer = window.setTimeout(() => {
      activeItem.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      })
    }, 50)

    return () => window.clearTimeout(timer)
  }, [activeIndex])

  return (
    <div
      className={cn(
        "fixed bottom-0 z-40 select-none border-t border-border/70 bg-background/95 pb-safe",
        "shadow-[0_-8px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl",
        "transition-all duration-300"
      )}
      style={{
        left: `${sidebarWidth}px`,
        right: 0,
      }}
    >
      <div className="relative mx-auto w-full max-w-7xl">
        {/* Left fade */}
        <div
          className={cn(
            "pointer-events-none absolute bottom-0 left-0 top-0 z-20 w-20 transition-opacity duration-200",
            "bg-gradient-to-r from-background via-background/95 to-transparent",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )}
        />

        {canScrollLeft && (
          <div className="pointer-events-none absolute left-2 top-1/2 z-30 -translate-y-1/2 text-muted-foreground/70">
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        )}

        <div
          ref={scrollRef}
          className="no-scrollbar flex h-14 w-full touch-pan-x items-center gap-2 overflow-x-auto px-8"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {sentences.map((sentence, index) => {
            const isActive = index === activeIndex
            const isDone = completedSet.has(sentence.id)

            return (
              <button
                key={sentence.id}
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                onClick={() => onSelect(index)}
                aria-label={`Sentence ${index + 1}`}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "relative flex h-9 min-w-[42px] shrink-0 items-center justify-center rounded-lg",
                  "border text-[14px] font-bold leading-none",
                  "transition-all duration-150 active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",

                  /**
                   * Chưa làm, không active:
                   * Dùng muted + foreground để ăn theo mọi theme.
                   */
                  !isDone &&
                    !isActive &&
                    "border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",

                  /**
                   * Đã hoàn thành:
                   * Dùng accent để không bị xanh cố định.
                   * Với Monochrome Beach sẽ ra teal, Soft Sand sẽ ra beige.
                   */
                  isDone &&
                    !isActive &&
                    "border-accent bg-accent text-accent-foreground shadow-sm hover:brightness-95",

                  /**
                   * Active:
                   * Dùng primary làm trạng thái đang học.
                   */
                  isActive &&
                    "z-10 scale-105 border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40 ring-offset-2 ring-offset-background",

                  /**
                   * Active + đã hoàn thành:
                   * Vẫn dùng primary, nhưng thêm outline accent để phân biệt đã làm.
                   */
                  isActive &&
                    isDone &&
                    "border-primary bg-primary text-primary-foreground ring-accent/70"
                )}
              >
                <span className="relative z-10 mt-[1px]">{index + 1}</span>

                {isActive && (
                  <div className="absolute bottom-1.5 left-1/2 h-[3px] w-3 -translate-x-1/2 rounded-full bg-primary-foreground/45" />
                )}
              </button>
            )
          })}
        </div>

        {/* Right fade */}
        <div
          className={cn(
            "pointer-events-none absolute bottom-0 right-0 top-0 z-20 w-20 transition-opacity duration-200",
            "bg-gradient-to-l from-background via-background/95 to-transparent",
            canScrollRight ? "opacity-100" : "opacity-0"
          )}
        />

        {canScrollRight && (
          <div className="pointer-events-none absolute right-2 top-1/2 z-30 -translate-y-1/2 text-muted-foreground/70">
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

export default LessonProgressBar