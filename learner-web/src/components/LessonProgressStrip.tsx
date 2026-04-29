import { useMemo, useEffect, useRef } from "react"
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

  useEffect(() => {
    const activeItem = itemRefs.current[activeIndex]
    if (activeItem && scrollRef.current) {
      // Dùng setTimeout cực ngắn để đảm bảo UI kịp render khi vừa bật Toggle lên, 
      // sau đó nó mới lướt mượt mà tới câu đang học
      const timer = setTimeout(() => {
        activeItem.scrollIntoView({
          behavior: "smooth", // Scroll trượt mượt nhẹ nhàng
          block: "nearest",
          inline: "center",
        })
      }, 50) 
      return () => clearTimeout(timer)
    }
  }, [activeIndex]) // Chạy khi component mount (Bật lại) hoặc khi chuyển câu

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background">
      <div 
        ref={scrollRef}
        className="flex h-5 w-full overflow-x-auto no-scrollbar border-t border-border"
        style={{ scrollSnapType: 'x mandatory' }}
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
                "relative flex h-full min-w-[32px] flex-1 items-center justify-center text-[10px] font-bold",
                "scroll-snap-align-center",
                
                // 1. Đã xong: Emerald phẳng
                isDone && !isActive && "bg-emerald-500 text-transparent", 
                
                // 2. Chưa xong: Slate phẳng
                !isDone && !isActive && "bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600",
                
                // 3. Đang học (Active): Blue/Emerald đậm, không hiệu ứng nhô cao
                isActive && !isDone && "bg-blue-600 text-white",
                isActive && isDone && "bg-emerald-700 text-white"
              )}
            >
              {/* Vạch chỉ thị Active (Amber) - Chỉ là 1 vạch phẳng bám đỉnh */}
              {isActive && (
                <div className="absolute inset-x-0 top-0 h-[2px] bg-amber-400" />
              )}
              
              {/* Hiển thị số: Không transition, không scale */}
              <span>
                {shouldShowNumber ? index + 1 : ""}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default LessonProgressBar