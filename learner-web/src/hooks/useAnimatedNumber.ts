// src/hooks/useAnimatedNumber.ts
import { useEffect, useState, useRef } from "react"

// Hàm easeOutExpo: Tăng tốc cực nhanh ở đầu, chậm dần cực mượt ở cuối
const easeOutExpo = (x: number): number => {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
}

export const useAnimatedNumber = (targetValue: number, duration = 1500) => {
  const [displayValue, setDisplayValue] = useState(targetValue)
  const [diffQueue, setDiffQueue] = useState<{ id: number; diff: number }[]>([])
  const prevTarget = useRef(targetValue)

  useEffect(() => {
    if (targetValue > prevTarget.current) {
      const diff = targetValue - prevTarget.current
      const startValue = prevTarget.current
      prevTarget.current = targetValue

      // 1. Thêm số chênh lệch vào hàng đợi để nổ hiệu ứng bay lên
      const id = Date.now()
      setDiffQueue((prev) => [...prev, { id, diff }])
      setTimeout(() => {
        setDiffQueue((prev) => prev.filter((item) => item.id !== id))
      }, 1500) // Xóa khỏi DOM sau 1.5s (Khớp với thời gian bay)

      // 2. Chạy Animation đếm số nhảy vù vù
      let startTime: number
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp
        const progress = timestamp - startTime
        const percentage = Math.min(progress / duration, 1)

        const easedProgress = easeOutExpo(percentage)
        setDisplayValue(startValue + (targetValue - startValue) * easedProgress)

        if (percentage < 1) {
          requestAnimationFrame(animate)
        } else {
          setDisplayValue(targetValue)
        }
      }
      requestAnimationFrame(animate)

    } else if (targetValue < prevTarget.current) {
      // Nếu xài tiền (trừ đi) thì nhảy luôn số không cần đếm
      setDisplayValue(targetValue)
      prevTarget.current = targetValue
    }
  }, [targetValue, duration])

  return { displayValue: Math.round(displayValue), diffQueue }
}