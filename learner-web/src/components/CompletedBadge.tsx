// src/pages/shadowing/components/CompletedBadge.tsx
import React from "react"
import { cn } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"

interface CompletedBadgeProps {
  className?: string
  size?: "sm" | "md"
}

const CompletedBadge = ({ className, size = "md" }: CompletedBadgeProps) => {
  return (
    <div 
      className={cn(
        // Neo góc phải
        "absolute right-3 top-3 sm:right-4 sm:top-4 z-10",
        // Layout: Flex dứt khoát, bo tròn cực đại
        size === "sm" 
          ? "flex items-center gap-1 px-2 py-0.5 rounded-full"
          : "flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full",
        // Màu sắc: Emerald 600 đồng bộ với nút Next, chữ trắng tương phản cao
        "bg-emerald-600 text-white shadow-md border border-emerald-700/20",
        // Animation xuất hiện nhẹ nhàng
        "animate-in zoom-in-95 fade-in duration-300 ease-out",
        className
      )}
    >
      <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={3} />
      
      <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-widest mt-[0.5px]">
        {/* 👉 Responsive text: Màn nhỏ hiện DONE, màn sm trở lên hiện COMPLETED */}
        <span className="inline sm:hidden">Done</span>
        <span className="hidden sm:inline">Completed</span>
      </span>
    </div>
  )
}

export default React.memo(CompletedBadge)