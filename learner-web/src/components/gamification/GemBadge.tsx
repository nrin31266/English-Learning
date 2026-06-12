// src/components/gamification/GemBadge.tsx
import { Gem } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber"

interface GemBadgeProps {
    gems: number
    className?: string
}

const formatCompactNumber = (value: number, suffix: string) => {
    return `${Number(value.toFixed(2))}${suffix}`
}

const formatMobileGems = (value: number) => {
    const absValue = Math.abs(value)
    if (absValue >= 1_000_000_000) return formatCompactNumber(value / 1_000_000_000, "B")
    if (absValue >= 1_000_000) return formatCompactNumber(value / 1_000_000, "M")
    if (absValue >= 1_000) return formatCompactNumber(value / 1_000, "K")
    return value.toLocaleString()
}

const formatDesktopGems = (value: number) => {
    const absValue = Math.abs(value)
    if (absValue >= 1_000_000_000) return formatCompactNumber(value / 1_000_000_000, "B")
    return value.toLocaleString()
}

const GemBadge = ({ gems, className }: GemBadgeProps) => {
    const { displayValue, diffQueue } = useAnimatedNumber(gems)

    const mobileGems = formatMobileGems(displayValue)
    const desktopGems = formatDesktopGems(displayValue)

    return (
        <TooltipProvider delayDuration={200}>
            {/* CSS Animation bay lơ lửng tại chỗ */}
            <style>{`
                @keyframes localFloatUp {
                    0% { opacity: 0; transform: translate(-50%, 0) scale(0.5); }
                    20% { opacity: 1; transform: translate(-50%, -15px) scale(1.2); }
                    80% { opacity: 1; transform: translate(-50%, -35px) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -45px) scale(0.8); }
                }
                .animate-local-float {
                    animation: localFloatUp 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                }
            `}</style>

            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "flex items-center gap-1 sm:gap-1.5 px-1 py-0.5 sm:py-1 transition-transform duration-200 hover:scale-105",
                            className
                        )}
                    >
                        <span className="text-xs sm:text-sm font-black leading-none text-cyan-700 dark:text-cyan-300 tabular-nums tracking-tight">
                            <span className="sm:hidden">{mobileGems}</span>
                            <span className="hidden sm:inline">{desktopGems}</span>
                        </span>
                        
                        <div className="relative flex items-center justify-center">
                            <Gem className="size-4 sm:size-5 shrink-0 text-cyan-500 dark:text-cyan-400" />
                            
                            {/*  HẠT KIM CƯƠNG BAY LÊN */}
                            {diffQueue.map((item) => (
                                <span
                                    key={item.id}
                                    className="pointer-events-none absolute left-1/2 top-4 z-50 text-xs sm:text-sm font-black text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-local-float"
                                    style={{ willChange: 'transform, opacity' }}
                                >
                                    +{item.diff}
                                </span>
                            ))}
                        </div>
                    </div>
                </TooltipTrigger>

                <TooltipContent side="bottom" className="z-[100]">
                    <p>
                        Gems: <span className="font-bold text-cyan-500">{gems.toLocaleString()}</span>
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

export default GemBadge