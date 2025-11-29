// components/Alert.tsx
import React from "react"
import { cn } from "@/lib/utils"
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  X, type LucideIcon
} from "lucide-react"

export interface AlertProps {
  title?: string
  description: string
  variant?: "default" | "destructive" | "success" | "warning" | "info"
  size?: "sm" | "md" | "lg"
  icon?: LucideIcon
  showIcon?: boolean
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
  action?: React.ReactNode
  fullWidth?: boolean
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({
    title,
    description,
    variant = "default",
    size = "md",
    icon: Icon,
    showIcon = true,
    dismissible = false,
    onDismiss,
    className,
    action,
    fullWidth = false,
    ...props
  }, ref) => {
    // Config cho từng variant
    const variantConfig = {
      default: {
        bg: "bg-background",
        border: "border",
        icon: Info,
        iconColor: "text-blue-500",
        text: "text-foreground"
      },
      destructive: {
        bg: "bg-destructive/10",
        border: "border-destructive/20",
        icon: XCircle,
        iconColor: "text-destructive",
        text: "text-destructive"
      },
      success: {
        bg: "bg-green-50",
        border: "border-green-200",
        icon: CheckCircle,
        iconColor: "text-green-600",
        text: "text-green-800"
      },
      warning: {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        icon: AlertTriangle,
        iconColor: "text-yellow-600",
        text: "text-yellow-800"
      },
      info: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: Info,
        iconColor: "text-blue-600",
        text: "text-blue-800"
      }
    }

    const sizeConfig = {
      sm: {
        padding: "p-2",
        iconSize: 16,
        title: "text-sm",
        description: "text-xs",
        gap: "gap-2"
      },
      md: {
        padding: "p-4",
        iconSize: 20,
        title: "text-base",
        description: "text-sm",
        gap: "gap-3"
      },
      lg: {
        padding: "p-6",
        iconSize: 24,
        title: "text-lg",
        description: "text-base",
        gap: "gap-4"
      }
    }

    const config = variantConfig[variant]
    const sizeStyle = sizeConfig[size]
    const FinalIcon = Icon || config.icon

    const hasTitle = !!title

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative rounded-lg border",
          config.bg,
          config.border,
          sizeStyle.padding,
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        <div className={cn("flex items-start", sizeStyle.gap)}>
          {/* Icon */}
          {showIcon && (
            <FinalIcon
              className={cn(
                "flex-shrink-0",
                config.iconColor,
                !hasTitle && "mt-0.5" // Căn chỉnh khi không có title
              )}
              size={sizeStyle.iconSize}
            />
          )}
          
          {/* Content */}
          <div className={cn("flex-1 min-w-0", config.text)}>
            {hasTitle ? (
              <>
                <h5 className={cn("font-semibold mb-1", sizeStyle.title)}>
                  {title}
                </h5>
                <p className={cn("leading-relaxed", sizeStyle.description)}>
                  {description}
                </p>
              </>
            ) : (
              <p className={cn("leading-relaxed", sizeStyle.description)}>
                {description}
              </p>
            )}
            
            {/* Action button */}
            {action && (
              <div className={cn("mt-3", !hasTitle && "mt-2")}>
                {action}
              </div>
            )}
          </div>

          {/* Dismiss button */}
          {dismissible && (
            <button
              onClick={onDismiss}
              className={cn(
                "flex-shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring",
                config.text,
                !hasTitle && "mt-0.5" // Căn chỉnh khi không có title
              )}
            >
              <X size={sizeStyle.iconSize} />
            </button>
          )}
        </div>
      </div>
    )
  }
)

Alert.displayName = "Alert"

export default Alert