// src/components/notifications/NotificationHost.tsx
import { useEffect } from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  X,
} from "lucide-react"
import { hideNotification, type NotificationVariant } from "@/store/system/notificationSlice"
import { useAppDispatch, useAppSelector } from "@/store"

const getVariantStyles = (variant: NotificationVariant) => {
  switch (variant) {
    case "success":
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        barClass: "bg-emerald-500",
      }
    case "warning":
      return {
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        barClass: "bg-amber-500",
      }
    case "error":
      return {
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        barClass: "bg-red-500",
      }
    case "info":
    default:
      return {
        icon: <Info className="h-4 w-4 text-sky-500" />,
        barClass: "bg-sky-500",
      }
  }
}
export const NotificationHost = () => {
  const dispatch = useAppDispatch()
  const items = useAppSelector((state) => state.system.notifications.items)


  // Auto-hide theo durationMs
  useEffect(() => {
    const timers = items
      .filter((n) => n.durationMs && n.durationMs > 0)
      .map((n) =>
        n.durationMs && setTimeout(() => {
          dispatch(hideNotification(n.id))
        }, n.durationMs)
      )

    return () => {
      timers.forEach((t) => {
        if (t) clearTimeout(t)
      })
    }
  }, [items, dispatch])

  if (items.length === 0) return null

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-500 flex w-[92vw] max-w-[520px] -translate-x-1/2 flex-col gap-2 sm:top-6">
      {items.map((n) => {
        const styles = getVariantStyles(n.variant)

        return (
          <Alert
            key={n.id}
            // error dùng destructive, còn lại default
            variant={n.variant === "error" ? "destructive" : "default"}
            className="pointer-events-auto flex items-start gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-sm"
          >
            {/* Thanh màu bên trái */}
            <div
              className={`mt-0.5 h-11 w-1 rounded-full ${styles.barClass}`}
            />

            {/* Nội dung */}
            <div className="flex flex-1 gap-2">
              <div className="mt-0.5">{styles.icon}</div>
              <div className="flex-1 space-y-1">
                {n.title && (
                  <AlertTitle className="text-sm font-semibold leading-tight">
                    {n.title}
                  </AlertTitle>
                )}
                <AlertDescription className="text-sm leading-snug text-foreground/85">
                  {n.message}
                </AlertDescription>
              </div>
            </div>

            {/* Nút tắt */}
            {n.closable !== false && (
              <button
                type="button"
                onClick={() => dispatch(hideNotification(n.id))}
                className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </Alert>
        )
      })}
    </div>
  )
}
