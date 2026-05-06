import { useMemo, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

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

  const checkScroll = () => {
    const el = scrollRef.current
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el
      setCanScrollLeft(scrollLeft > 2)
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2)
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/60 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] select-none pb-safe">
      <div className="relative w-full max-w-5xl mx-auto">
        
        {/* Left scroll mask */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 z-20 w-12 pointer-events-none transition-opacity duration-150 bg-gradient-to-r from-background via-background/80 to-transparent",
          canScrollLeft ? "opacity-100" : "opacity-0"
        )} />

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
                  
                  // Incomplete
                  !isDone && !isActive && "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
                  
                  // Completed
                  isDone && !isActive && "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600",
                  
                  // Active
                  isActive && "scale-105 z-10 shadow-md ring-2 ring-offset-2 ring-offset-background",
                  isActive && !isDone && "bg-blue-600 text-white ring-blue-600",
                  isActive && isDone && "bg-emerald-600 text-white ring-emerald-600"
                )}
              >
                <span className="relative z-10 leading-none mt-[1px]">
                  {index + 1}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-[3px] bg-white/40 rounded-full" />
                )}
              </button>
            )
          })}
        </div>

        {/* Right scroll mask */}
        <div className={cn(
          "absolute right-0 top-0 bottom-0 z-20 w-12 pointer-events-none transition-opacity duration-150 bg-gradient-to-l from-background via-background/80 to-transparent",
          canScrollRight ? "opacity-100" : "opacity-0"
        )} />
      </div>
    </div>
  )
}

export default LessonProgressBar