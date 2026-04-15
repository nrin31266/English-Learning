// src/components/players/PlayerControlPanel.tsx
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Pause,
    Play,
    RotateCcw,
    StepBack,
    StepForward,
    Volume2,
    Keyboard
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useRef, useState } from "react"

interface PlayerControlPanelProps {
    // Transport controls
    onPrev: () => void
    onNext: () => void
    onReplay: () => void
    onPlay: () => void
    onPause: () => void
    isPlaying: boolean
    disabled?: boolean

    // Navigation state
    hasPrev?: boolean
    hasNext?: boolean

    // Settings
    autoStop?: boolean
    onAutoStopChange?: (checked: boolean) => void
    largeVideo?: boolean
    onLargeVideoChange?: (checked: boolean) => void
    sourceType?: "YOUTUBE" | "AUDIO"

    // Playback speed
    playbackRate?: number
    onPlaybackRateChange?: (rate: number) => void

    // Shortcuts
    onShowShortcuts?: () => void
    userInteracted?: boolean
    onUserInteracted?: (interacted: boolean) => void,
    visableLargeVideoOption?: boolean
}

const PlayerControlPanel = ({
    // Transport controls
    onPrev,
    onNext,
    onReplay,
    onPlay,
    onPause,
    isPlaying,
    disabled = false,

    // Navigation state
    hasPrev = true,
    hasNext = true,

    // Settings
    autoStop = true,
    onAutoStopChange,
    largeVideo = false,
    onLargeVideoChange,
    sourceType = "AUDIO",

    // Playback speed
    playbackRate = 1.0,
    onPlaybackRateChange,

    // Shortcuts
    onShowShortcuts,
    userInteracted,
    onUserInteracted,
    visableLargeVideoOption = false,
}: PlayerControlPanelProps) => {
    const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
    const divRef = useRef<HTMLDivElement>(null)
    const [isSmall, setIsSmall] = useState(false)

    useEffect(() => {
        if (!divRef.current) return

        const observer = new ResizeObserver(entries => {
            const width = entries[0].contentRect.width
            // Chỉ set state khi vượt ngưỡng 768px
            setIsSmall(prev => {
                const newValue = width < 600
                return prev !== newValue ? newValue : prev
            })
        })

        observer.observe(divRef.current)
        return () => observer.disconnect()
    }, [])

    return (
        <div ref={divRef} className={`grid  gap-3  px-3 py-2 text-xs ${isSmall ? "" : "grid-cols-[auto_1fr]"}`}>
            <div className="flex flex-nowrap items-center gap-2">
                {/* Left side - Settings toggles */}
                {/* Auto Stop toggle */}
                {onAutoStopChange && (
                    <div className="flex items-center gap-2">
                        <Switch
                            id="auto-stop"
                            checked={autoStop}
                            onCheckedChange={onAutoStopChange}
                        />
                        <Label htmlFor="auto-stop" className="text-xs">
                            Auto Stop
                        </Label>
                    </div>
                )}

                {/* Large Video toggle - chỉ hiện khi source là YouTube */}
                {sourceType === "YOUTUBE" && onLargeVideoChange && visableLargeVideoOption && (
                    <div className="flex items-center gap-2">
                        <Switch
                            id="large-video"
                            checked={largeVideo}
                            onCheckedChange={onLargeVideoChange}
                        />
                        <Label htmlFor="large-video" className="text-xs">
                            Large-sized video
                        </Label>
                    </div>
                )}

            </div>

            <div className=" items-center gap-2 grid grid-cols-2  ">
                {/* Right side - Utility controls */}
                {
                    !userInteracted ? (
                        <Button
                            onClick={() => onUserInteracted && onUserInteracted(true)}
                            className="w-full gap-2 h-8"
                        >
                            <Play className="h-4 w-4" />
                            Bắt đầu
                        </Button>) :

                        <div className="flex w-max gap-3 border rounded-md px-2 py-1 items-center justify-center">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                disabled={!hasPrev || disabled}
                                onClick={onPrev}
                            >
                                <StepBack className="h-4 w-4" />
                            </Button>

                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={onReplay}
                                disabled={disabled}
                            >
                                <RotateCcw className="h-4 w-4" />
                            </Button>

                            <Button
                                size="icon"
                                variant="default"
                                className="h-7 w-7"
                                onClick={isPlaying ? onPause : onPlay}
                                disabled={disabled}
                            >
                                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>

                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                disabled={!hasNext || disabled}
                                onClick={onNext}
                            >
                                <StepForward className="h-4 w-4" />
                            </Button>
                        </div>
                }


                <div className="justify-end gap-2 flex "> {/* Shortcuts button */}
                    {onShowShortcuts && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-2 px-2 text-xs"
                            onClick={onShowShortcuts}
                        >
                            <Keyboard className="h-3 w-3" />

                        </Button>
                    )}

                    {/* Playback speed dropdown */}
                    {onPlaybackRateChange && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-7 gap-2 px-2 text-xs">
                                    <Volume2 className="h-3 w-3" />
                                    <span>{playbackRate.toFixed(2)}x</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Playback Speed</DropdownMenuLabel>
                                    {speedOptions.map((speed) => (
                                        <DropdownMenuItem
                                            key={speed}
                                            onSelect={() => onPlaybackRateChange(speed)}
                                            className={playbackRate === speed ? "bg-accent" : ""}
                                        >
                                            {speed === 1 ? "Normal (1.0x)" : `${speed.toFixed(2)}x`}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}</div>
            </div>
        </div>
    )
}

export default PlayerControlPanel