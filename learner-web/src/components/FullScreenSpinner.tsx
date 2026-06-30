// components/FullScreenSpinner.tsx
import { useEffect, useState } from "react"

interface Props {
  label: string
  isInitial?: boolean
}

const FullScreenSpinner = ({ label, isInitial = false }: Props) => {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setOpacity(1)
    })

    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      className="
        fixed inset-0 z-[9999]
        flex items-center justify-center
        bg-background/80 text-foreground
        backdrop-blur-sm
        transition-opacity duration-200 ease-in-out
      "
      style={{ opacity }}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className="
          flex flex-col items-center gap-4
          rounded-2xl border border-border
          bg-card/90 px-8 py-7
          text-card-foreground shadow-xl
        "
      >
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-muted" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
          {isInitial && (
            <div className="absolute inset-2 rounded-full bg-primary/10" />
          )}
        </div>

        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {isInitial && (
            <p className="text-xs text-muted-foreground">
              Preparing your learning space...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default FullScreenSpinner