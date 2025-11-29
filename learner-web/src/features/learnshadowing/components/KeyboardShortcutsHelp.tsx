import React from "react"
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

interface KeyboardShortcutsHelpProps {
  open: boolean
  onClose: () => void
}

const KeyboardShortcutsHelp = ({ open, onClose }: KeyboardShortcutsHelpProps) => {
  const shortcuts = [
    { key: "Ctrl", action: "Replay current segment", category: "playback" },
    { key: "Tab or PageDown", action: "Next sentence", category: "navigation" },
    { key: "PageUp", action: "Previous sentence", category: "navigation" },
  ]

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
            {Object.entries(categories).map(([categoryKey, category]) => {
              const categoryShortcuts = shortcuts.filter(s => s.category === categoryKey)
              
              return (
                <div key={categoryKey} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs font-medium ${category.color}`}
                    >
                      {category.label}
                    </Badge>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border bg-card/50 p-3 transition-colors hover:bg-card"
                      >
                        <span className="text-sm font-medium">{shortcut.action}</span>
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

        <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
          <span>Focus must be outside input fields</span>
          <span>Press ESC to close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default KeyboardShortcutsHelp