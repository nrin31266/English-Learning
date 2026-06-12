import { useMemo, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"

interface ProgressBarProps {
  sentences: { id: number }[]
  completedIds: number[]
  activeIndex: number
  onSelect: (index: number) => void
}

const LessonProgressBar = ({ sentences, completedIds, activeIndex, onSelect }: ProgressBarProps) => {
  const completedSet = useMemo(() => new Set(completedIds), [completedIds])
  const scrollRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const { state: sidebarState, isMobile } = useSidebar()
  const isSidebarCollapsed = sidebarState === "collapsed"

  // Khi mobile thì sidebar ẩn, left = 0
  const sidebarWidth = isMobile
    ? 0
    : (isSidebarCollapsed ? 48 : 256)

  const checkScroll = () => {
    const el = scrollRef.current
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el
      setCanScrollLeft(scrollLeft > 5)
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5)
    }
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
    const timer = setTimeout(() => {
      checkScroll()
    }, 200)
    return () => clearTimeout(timer)
  }, [isSidebarCollapsed, isMobile])

  useEffect(() => {
    const activeItem = itemRefs.current[activeIndex]
    if (activeItem && scrollRef.current) {
      const timer = setTimeout(() => {
        activeItem.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        })
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [activeIndex])

  return (
    <div
      className="fixed bottom-0 z-40 bg-background border-t border-border/60 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] select-none pb-safe transition-all duration-300"
      style={{
        left: `${sidebarWidth}px`,
        right: 0
      }}
    >
      <div className="relative w-full max-w-7xl mx-auto">

        {/* Left scroll indicator - chỉ là hiệu ứng mờ, không phải nút */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 z-20 w-20 pointer-events-none transition-opacity duration-200",
            "bg-gradient-to-r from-background via-background/90 to-transparent",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )}
        />

        {canScrollLeft && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-30 pointer-events-none text-muted-foreground/70">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex items-center h-14 w-full overflow-x-auto no-scrollbar touch-pan-x px-8 gap-2"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {sentences.map((s, index) => {
            const isActive = index === activeIndex
            const isDone = completedSet.has(s.id)

            return (
              <button
                key={s.id}
                ref={(el) => { itemRefs.current[index] = el }}
                onClick={() => onSelect(index)}
                className={cn(
                  "relative flex shrink-0 items-center justify-center h-9 min-w-[42px] rounded-md text-[14px] font-bold",
                  "scroll-snap-align-center transition-all duration-75 active:scale-95",

                  !isDone && !isActive && "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
                  isDone && !isActive && "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600",
                  isActive && "scale-105 z-10 shadow-md ring-2 ring-offset-2 ring-offset-background",
                  isActive && !isDone && "bg-blue-600 text-white ring-blue-600",
                  isActive && isDone && "bg-emerald-600 text-white ring-emerald-600"
                )}
              >
                <span className="relative z-10 leading-none mt-[1px]">
                  {index + 1}
                </span>

                {isActive && (
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-[3px] bg-white/40 rounded-full" />
                )}
              </button>
            )
          })}
        </div>

        {/* Right scroll indicator */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 z-20 w-20 pointer-events-none transition-opacity duration-200",
            "bg-gradient-to-l from-background via-background/90 to-transparent",
            canScrollRight ? "opacity-100" : "opacity-0"
          )}
        />

        {canScrollRight && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30 pointer-events-none text-muted-foreground/70">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

export default LessonProgressBar