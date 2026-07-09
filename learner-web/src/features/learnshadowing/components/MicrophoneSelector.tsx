import { Mic, ChevronDown, Check } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useMemo } from "react"

interface MicrophoneSelectorProps {
  selectedDeviceId: string
  audioInputDevices: MediaDeviceInfo[]
  disabled: boolean
  getAudioInputValue: (deviceId: string, index: number) => string
  onChange: (value: string) => void
}

const MicrophoneSelector = ({
  selectedDeviceId,
  audioInputDevices,
  disabled,
  getAudioInputValue,
  onChange,
}: MicrophoneSelectorProps) => {

  const selectedLabel = useMemo(() => {
    if (audioInputDevices.length === 0) return "No microphone"
    const device = audioInputDevices.find(
      (d, i) => getAudioInputValue(d.deviceId, i) === selectedDeviceId
    )
    return device?.label || "Microphone"
  }, [selectedDeviceId, audioInputDevices, getAudioInputValue])

  return (
    <div className="absolute left-4 top-4 z-20">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={disabled}
            className="group relative flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-background/60 text-muted-foreground shadow-sm backdrop-blur-sm transition-all hover:bg-accent hover:text-foreground disabled:opacity-50"
            title={selectedLabel}
          >
            <Mic className="h-4 w-4" />
            <ChevronDown className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-background opacity-70" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[280px] p-1.5 rounded-xl shadow-sm border-border/50">
          <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b mb-1">
            Audio Input
          </div>
          {audioInputDevices.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              No microphones found
            </div>
          ) : (
            audioInputDevices.map((device, index) => {
              const value = getAudioInputValue(device.deviceId, index)
              const isSelected = selectedDeviceId === value
              const label = device.label || `Microphone ${index + 1}`

              return (
                <DropdownMenuItem
                  key={value}
                  onClick={() => onChange(value)}
                  className={`flex items-center justify-between cursor-pointer rounded-md px-3 py-2 my-0.5 transition-colors ${isSelected ? "bg-accent text-foreground font-medium" : "text-muted-foreground"
                    }`}
                >
                  <span className="text-sm truncate flex-1">{label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 ml-3" />
                  )}
                </DropdownMenuItem>
              )
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default MicrophoneSelector