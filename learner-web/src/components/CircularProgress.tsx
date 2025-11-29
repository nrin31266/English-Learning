// components/CircularProgress.tsx
import React from "react"
import { cn } from "@/lib/utils"

interface CircularProgressProps {
  value: number // 0-100
  size?: "sm" | "md" | "lg"
  className?: string
  showLabel?: boolean
}

const CircularProgress = ({
  value,
  size = "md",
  className,
  showLabel = true
}: CircularProgressProps) => {
  // Xác định màu sắc dựa trên giá trị
  const getColor = (val: number) => {
    if (val < 60) return "text-red-500 stroke-red-500"
    if (val < 85) return "text-yellow-500 stroke-yellow-500"
    return "text-green-500 stroke-green-500"
  }

  // Xác định kích thước
  const sizeConfig = {
    sm: { svg: 60, stroke: 4, text: "text-sm" },
    md: { svg: 80, stroke: 6, text: "text-lg" },
    lg: { svg: 100, stroke: 8, text: "text-xl" }
  }

  const config = sizeConfig[size]
  const radius = (config.svg - config.stroke) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (value / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={config.svg}
        height={config.svg}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.svg / 2}
          cy={config.svg / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={config.stroke}
          fill="none"
          className="text-gray-200 opacity-50"
        />
        
        {/* Progress circle */}
        <circle
          cx={config.svg / 2}
          cy={config.svg / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={config.stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn("transition-all duration-500 ease-out", getColor(value))}
        />
      </svg>
      
      {/* Percentage text */}
      {showLabel && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold",
          getColor(value),
          config.text
        )}>
          {Math.round(value)}%
        </div>
      )}
    </div>
  )
}

export default CircularProgress