
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Keyboard } from "lucide-react"

/**
 * Props cho KeyboardShortcutsHelp component
 */
interface KeyboardShortcutsHelpProps {
  /** Dialog có đang mở không */
  open: boolean
  /** Callback khi đóng dialog */
  onClose: () => void
}

/**
 * Component chính để hiển thị keyboard shortcuts
 */
const KeyboardShortcutsHelp = ({ open, onClose }: KeyboardShortcutsHelpProps) => {
  /**
   * Danh sách tất cả shortcuts được support
   * Có thể thêm shortcuts mới vào đây khi cần
   */
  const shortcuts = [
    { key: "Ctrl", action: "Replay current segment", category: "playback" },
    { key: "Tab or PageDown", action: "Next sentence", category: "navigation" },
    { key: "PageUp", action: "Previous sentence", category: "navigation" },
  ]

  /**
   * Định nghĩa các category với màu sắc tương ứng
   * Mỗi category có label và color scheme riêng để dễ phân biệt
   */
  const categories = {
    playback: { label: "Playback", color: "bg-blue-100 text-blue-800 border-blue-200" },
    navigation: { label: "Navigation", color: "bg-green-100 text-green-800 border-green-200" },
    recording: { label: "Recording", color: "bg-red-100 text-red-800 border-red-200" },
    settings: { label: "Settings", color: "bg-purple-100 text-purple-800 border-purple-200" },
    view: { label: "View", color: "bg-orange-100 text-orange-800 border-orange-200" },
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard/>
            <Badge variant="secondary" className="text-xs">
              {shortcuts.length} shortcuts
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and control the shadowing practice efficiently.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* Lặp qua từng category và hiển thị shortcuts thuộc category đó */}
            {Object.entries(categories).map(([categoryKey, category]) => {
              // Lọc shortcuts thuộc category hiện tại
              const categoryShortcuts = shortcuts.filter(s => s.category === categoryKey)
              
              // Chỉ render nếu category có shortcuts
              if (categoryShortcuts.length === 0) return null
              
              return (
                <div key={categoryKey} className="space-y-2">
                  {/* Header của category với line separator */}
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs font-medium ${category.color}`}
                    >
                      {category.label}
                    </Badge>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  
                  {/* Danh sách shortcuts trong category */}
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border bg-card/50 p-3 transition-colors hover:bg-card"
                      >
                        {/* Mô tả action */}
                        <span className="text-sm font-medium">{shortcut.action}</span>
                        {/* Key hiển thị dạng keyboard key */}
                        <kbd className="rounded border bg-background px-2 py-1 text-xs font-mono shadow-sm">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        {/* Footer với gợi ý */}
        <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
          <span>Focus must be outside input fields</span>
          <span>Press ESC to close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default KeyboardShortcutsHelp