// src/components/layout/BrandLogo.tsx
"use client"

import { Link } from "react-router-dom"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type LogoSize = "sm" | "md" | "lg"

interface BrandLogoProps {
  onlyIcon?: boolean
  asSidebar?: boolean
  size?: LogoSize
  subtitle?: string
  className?: string
}

const sizeMap: Record<LogoSize, {
  icon: string
  text: string
  subtitle: string
  gap: string
}> = {
  sm: {
    icon: "size-8 rounded-lg text-sm",
    text: "text-base",
    subtitle: "text-[11px]",
    gap: "gap-3",
  },
  md: {
    icon: "size-10 rounded-xl text-base",
    text: "text-lg",
    subtitle: "text-xs",
    gap: "gap-3",
  },
  lg: {
    icon: "size-12 rounded-2xl text-lg",
    text: "text-xl",
    subtitle: "text-sm",
    gap: "gap-4",
  },
}

export function BrandLogo({
  onlyIcon = false,
  asSidebar = true,
  size = "sm",
  subtitle,
  className,
}: BrandLogoProps) {
  const sizes = sizeMap[size]

  const content = (
    <Link
      to="/"
      className={cn(
        "flex h-full w-full select-none items-center",
        sizes.gap,
        className
      )}
    >
      <div
        className={cn(
          "flex aspect-square shrink-0 items-center justify-center bg-primary font-black text-primary-foreground group-data-[collapsible=icon]:mx-auto",
          sizes.icon
        )}
      >
        FR
      </div>

      {!onlyIcon && (
        <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
          <span
            className={cn(
              "block truncate font-bold tracking-tight text-foreground",
              sizes.text
            )}
          >
            Fluenrin
          </span>

          {subtitle && (
            <span
              className={cn(
                "mt-0.5 block truncate text-muted-foreground",
                sizes.subtitle
              )}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </Link>
  )

  if (!asSidebar) {
    return content
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          asChild
          className="hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:p-0"
        >
          {content}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}