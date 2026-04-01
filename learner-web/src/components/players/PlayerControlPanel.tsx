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
}: PlayerControlPanelProps) => {
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
  
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2 text-xs">
      {/* Left side - Settings toggles */}
      <div className="flex flex-wrap items-center gap-4">
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
        {sourceType === "YOUTUBE" && onLargeVideoChange && (
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

      {/* Center - Transport controls */}
      <div className="flex items-center gap-1">
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

      {/* Right side - Utility controls */}
      <div className="flex items-center gap-2">
        {/* Shortcuts button */}
        {onShowShortcuts && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-2 px-2 text-xs"
            onClick={onShowShortcuts}
          >
            <Keyboard className="h-3 w-3" />
            Shortcuts
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
        )}
      </div>
    </div>
  )
}

export default PlayerControlPanel