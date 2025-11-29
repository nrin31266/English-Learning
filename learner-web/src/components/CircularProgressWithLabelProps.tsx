import React from "react"
import { cn } from "@/lib/utils"
import CircularProgress from "./CircularProgress"

interface CircularProgressWithLabelProps {
  value: number
  size?: "sm" | "md" | "lg"
  label?: string
  helperText?: string
  className?: string
}

const CircularProgressWithLabel: React.FC<CircularProgressWithLabelProps> = ({
  value,
  size = "md",
  label,
  helperText,
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <CircularProgress value={value} size={size} />

      <div className="space-y-0.5">
        {label && (
          <p className="text-sm font-semibold leading-tight">
            {label}
          </p>
        )}
        {helperText && (
          <p className="text-xs text-muted-foreground leading-snug">
            {helperText}
          </p>
        )}
      </div>
    </div>
  )
}

export default CircularProgressWithLabel
