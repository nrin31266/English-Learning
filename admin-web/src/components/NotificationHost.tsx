// src/components/notifications/NotificationHost.tsx
import { use, useEffect } from "react"

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
const mocks = [
  {
    id: '1',
    title: 'Info Notification',
    message: 'This is an info notification.',
    variant: 'info' as NotificationVariant,
    durationMs: 4000,
    closable: true,
  },
  {
    id: '2',
    title: 'Success Notification',
    message: 'This is a success notification.',
    variant: 'success' as NotificationVariant,
    durationMs: 4000,
    closable: true,
  },
  {
    id: '3',
    title: 'Warning Notification',
    message: 'This is a warning notification.',
    variant: 'warning' as NotificationVariant,
    durationMs: 4000,
    closable: true,
  },
  {
    id: '4',
    title: 'Error Notification',
    message: 'This is an error notification.',
    variant: 'error' as NotificationVariant,
    durationMs: null, // Không auto ẩn
    closable: true,
  },
];
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
      timers.forEach((t) => { t && clearTimeout(t) })
    }
  }, [items, dispatch])

  if (items.length === 0) return null

  return (
    <div className="pointer-events-none fixed left-1/2 -translate-x-1/2 z-50 flex w-80 flex-col gap-2 top-4 sm:top-6 sm:w-[420px]">
      {items.map((n) => {
        const styles = getVariantStyles(n.variant)

        return (
          <Alert
            key={n.id}
            // error dùng destructive, còn lại default
            variant={n.variant === "error" ? "destructive" : "default"}
            className="pointer-events-auto flex items-start gap-3 border shadow-lg backdrop-blur-sm"
          >
            {/* Thanh màu bên trái */}
            <div
              className={`mt-0.5 h-9 w-1 rounded-full ${styles.barClass}`}
            />

            {/* Nội dung */}
            <div className="flex flex-1 gap-2">
              <div className="mt-0.5">{styles.icon}</div>
              <div className="flex-1 space-y-1">
                {n.title && (
                  <AlertTitle className="text-sm font-semibold">
                    {n.title}
                  </AlertTitle>
                )}
                <AlertDescription className="text-xs leading-snug">
                  {n.message}
                </AlertDescription>
              </div>
            </div>

            {/* Nút tắt */}
            {n.closable !== false && (
              <button
                type="button"
                onClick={() => dispatch(hideNotification(n.id))}
                className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-muted-foreground hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Alert>
        )
      })}
    </div>
  )
}
