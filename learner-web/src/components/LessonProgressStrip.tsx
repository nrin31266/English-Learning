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
  
  // 👉 State để kiểm tra xem có thể cuộn trái/phải không
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Hàm kiểm tra vị trí cuộn
  const checkScroll = () => {
    const el = scrollRef.current
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el
      // Sai số 2px để xử lý làm tròn trên các màn hình khác nhau
      setCanScrollLeft(scrollLeft > 2)
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2)
    }
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    // Kiểm tra lần đầu và khi resize
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
  }, [sentences.length]) // Chạy lại khi số lượng câu thay đổi

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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background select-none">
      <div className="relative w-full overflow-hidden">
        
        {/* 🌓 Mask mờ bên trái */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 z-20 w-12 pointer-events-none transition-opacity duration-300 bg-gradient-to-r from-background to-transparent",
          canScrollLeft ? "opacity-100" : "opacity-0"
        )} />

        <div 
          ref={scrollRef}
          className={cn(
            "flex h-7 w-full overflow-x-auto border-t border-border no-scrollbar touch-pan-x",
          )}
          style={{ 
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {sentences.map((s, index) => {
            const isActive = index === activeIndex
            const isDone = completedSet.has(s.id)
            const shouldShowNumber = isActive || !isDone

            return (
              <button
                key={s.id}
                ref={(el) => { itemRefs.current[index] = el }}
                onClick={() => onSelect(index)}
                className={cn(
                  "relative flex h-full min-w-[36px] flex-1 shrink-0 items-center justify-center text-[11px] font-bold",
                  "scroll-snap-align-center transition-all duration-200",
                  
                  // 1. Đã xong: Emerald phẳng
                  isDone && !isActive && "bg-emerald-500 text-transparent", 
                  
                  // 2. Chưa xong: Slate phẳng
                  !isDone && !isActive && "bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600",
                  
                  // 3. Đang học (Active)
                  isActive && !isDone && "bg-blue-600 text-white",
                  isActive && isDone && "bg-emerald-700 text-white",

                  // Hiệu ứng hover nhẹ trên PC
                  "hover:brightness-110 active:scale-95"
                )}
              >
                {isActive && (
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-amber-400 z-10" />
                )}
                
                <span className="relative z-0">
                  {shouldShowNumber ? index + 1 : ""}
                </span>
              </button>
            )
          })}
        </div>

        {/* 🌓 Mask mờ bên phải */}
        <div className={cn(
          "absolute right-0 top-0 bottom-0 z-20 w-12 pointer-events-none transition-opacity duration-300 bg-gradient-to-l from-background to-transparent",
          canScrollRight ? "opacity-100" : "opacity-0"
        )} />
      </div>
    </div>
  )
}

export default LessonProgressBar