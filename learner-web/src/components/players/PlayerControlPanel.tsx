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
    Keyboard,
    PanelBottom,
    Settings2,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
    hideVideo?: boolean
    onHideVideoChange?: (checked: boolean) => void
    sourceType?: "YOUTUBE" | "AUDIO"
    
    // Progress Bar Toggle 👈 Thêm
    showProgress?: boolean
    onToggleProgress?: () => void

    // Playback speed
    playbackRate?: number
    onPlaybackRateChange?: (rate: number) => void

    // Shortcuts
    onShowShortcuts?: () => void
    userInteracted?: boolean
    onUserInteracted?: (interacted: boolean) => void,
    visableLargeVideoOption?: boolean
    forceCompact?: boolean
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
    hideVideo = false,
    onHideVideoChange,
    sourceType = "AUDIO",

    // Progress Bar Toggle 👈 Thêm
    showProgress = true,
    onToggleProgress,

    // Playback speed
    playbackRate = 1.0,
    onPlaybackRateChange,

    // Shortcuts
    onShowShortcuts,
    userInteracted,
    onUserInteracted,
    visableLargeVideoOption = false,
    forceCompact = false,
}: PlayerControlPanelProps) => {
    const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
    const divRef = useRef<HTMLDivElement>(null)
    const [isSmall, setIsSmall] = useState(false)
    const [isMobileViewport, setIsMobileViewport] = useState(false)

    useEffect(() => {
        if (!divRef.current) return

        const observer = new ResizeObserver(entries => {
            const width = entries[0].contentRect.width
            // Chỉ set state khi vượt ngưỡng 600px
            setIsSmall(prev => {
                const newValue = width < 600
                return prev !== newValue ? newValue : prev
            })
        })

        observer.observe(divRef.current)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        const updateViewport = () => {
            setIsMobileViewport(window.innerWidth < 768)
        }

        updateViewport()
        window.addEventListener("resize", updateViewport)

        return () => window.removeEventListener("resize", updateViewport)
    }, [])

    const showLargeVideoOption = sourceType === "YOUTUBE" && onLargeVideoChange && visableLargeVideoOption
    const showHideVideoOption = sourceType === "YOUTUBE" && onHideVideoChange && visableLargeVideoOption
    const compactControls = forceCompact || (isSmall && isMobileViewport)

    const settingsMenu = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    title="Player settings"
                >
                    <Settings2 className="h-3.5 w-3.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Player Settings</DropdownMenuLabel>
                <DropdownMenuGroup>
                    {onAutoStopChange && (
                        <DropdownMenuCheckboxItem
                            checked={autoStop}
                            onCheckedChange={onAutoStopChange}
                            onSelect={(event) => event.preventDefault()}
                        >
                            Auto Stop
                        </DropdownMenuCheckboxItem>
                    )}
                    {showLargeVideoOption && (
                        <DropdownMenuCheckboxItem
                            checked={largeVideo}
                            onCheckedChange={onLargeVideoChange}
                            onSelect={(event) => event.preventDefault()}
                        >
                            Large video
                        </DropdownMenuCheckboxItem>
                    )}
                    {showHideVideoOption && (
                        <DropdownMenuCheckboxItem
                            checked={hideVideo}
                            onCheckedChange={onHideVideoChange}
                            onSelect={(event) => event.preventDefault()}
                        >
                            Hide video
                        </DropdownMenuCheckboxItem>
                    )}
                    {onToggleProgress && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={showProgress}
                                onCheckedChange={() => onToggleProgress()}
                                onSelect={(event) => event.preventDefault()}
                            >
                                Progress strip
                            </DropdownMenuCheckboxItem>
                        </>
                    )}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )

    return (
        <div ref={divRef} className={`grid gap-2 px-3 py-1.5 text-xs ${compactControls ? "" : isSmall ? "" : "grid-cols-[auto_1fr]"}`}>
            {!compactControls && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
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
                {showLargeVideoOption && (
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

                {showHideVideoOption && (
                    <div className="flex items-center gap-2">
                        <Switch
                            id="hide-video"
                            checked={hideVideo}
                            onCheckedChange={onHideVideoChange}
                        />
                        <Label htmlFor="hide-video" className="text-xs">
                            Hide video
                        </Label>
                    </div>
                )}
            </div>
            )}

            <div className={compactControls ? "grid grid-cols-2 items-center gap-2" : "flex flex-wrap items-center justify-between gap-2"}>
                {/* Right side - Utility controls */}
                {
                    !userInteracted ? (
                        <Button
                            onClick={() => onUserInteracted && onUserInteracted(true)}
                            className="h-8 min-w-32 gap-2"
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


                <div className="flex justify-end gap-2">
                    {compactControls && settingsMenu}

                    {/* Nút Toggle Progress Bar (Chỉ Icon) 👈 Thêm */}
                    {onToggleProgress && !compactControls && (
                        <Button
                            variant={showProgress ? "secondary" : "outline"}
                            size="icon"
                            className="h-7 w-7"
                            onClick={onToggleProgress}
                            title="Bật/Tắt thanh tiến trình"
                        >
                            <PanelBottom className="h-3.5 w-3.5" />
                        </Button>
                    )}

                    {/* Shortcuts button */}
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
