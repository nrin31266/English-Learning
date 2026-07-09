import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Keyboard } from "lucide-react"

interface KeyboardShortcutsHelpProps {
  open: boolean
  onClose: () => void
}

const KeyboardShortcutsHelp = ({ open, onClose }: KeyboardShortcutsHelpProps) => {
  // Danh sách phím tắt đã được làm phẳng, không cần chia category cho phức tạp
  const shortcuts = [
    { key: "`", action: "Play / Pause playback" }, // Đã thêm phím `
    { key: "Ctrl", action: "Replay current segment" },
    { key: "Tab / PageDown", action: "Next sentence" },
    { key: "PageUp", action: "Previous sentence" },
  ]

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5"/>
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and control the shadowing practice.
          </DialogDescription>
        </DialogHeader>

        {/* Danh sách phím tắt */}
        <div className="space-y-2 py-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border bg-card/50 p-3 transition-colors hover:bg-card"
            >
              <span className="text-sm font-medium">{shortcut.action}</span>
              <kbd className="rounded border bg-muted px-2 py-1 text-xs font-mono font-semibold shadow-sm">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
          <span>Focus must be outside input fields</span>
          <span>Press ESC to close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default KeyboardShortcutsHelp