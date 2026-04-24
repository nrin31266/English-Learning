import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  return (
    <div className="flex w-full max-w-xs items-center gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">Microphone</span>

      <Select value={selectedDeviceId} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select microphone" />
        </SelectTrigger>

        <SelectContent>
          <SelectGroup>
            {audioInputDevices.map((device, index) => (
              <SelectItem
                key={getAudioInputValue(device.deviceId, index)}
                value={getAudioInputValue(device.deviceId, index)}
              >
                {device.label || `Microphone ${index + 1}`}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

export default MicrophoneSelector
