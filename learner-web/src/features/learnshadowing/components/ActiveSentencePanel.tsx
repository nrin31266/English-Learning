import React from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Play,
  Pause,
  StepBack,
  StepForward,
  RotateCcw,
  Mic,
  Volume2,
} from "lucide-react"

interface ActiveSentencePanelProps {
  currentSentence?: {
    textDisplay?: string
    textRaw: string
    phoneticUk?: string
  }
  activeIndex: number
  sentencesLength: number
  onPrev: () => void
  onNext: () => void
  onReplay: () => void
  onPlay: () => void
  onPause: () => void
}

const ActiveSentencePanel = ({
  currentSentence,
  activeIndex,
  sentencesLength,
  onPrev,
  onNext,
  onReplay,
  onPlay,
  onPause,
}: ActiveSentencePanelProps) => {
  return (
    <ScrollArea className="min-h-0 flex-1 rounded-xl border bg-card">
      <div className="flex min-h-[220px] flex-col items-center justify-between gap-4 px-4 py-4">
        {/* Sentence text */}
        <div className="space-y-2 text-center">
          <p className="text-lg font-semibold leading-relaxed">
            {currentSentence
              ? currentSentence.textDisplay ?? currentSentence.textRaw
              : "No sentence selected."}
          </p>
          {currentSentence?.phoneticUk && (
            <p className="text-sm italic text-muted-foreground">
              {currentSentence.phoneticUk}
            </p>
          )}
        </div>

        {/* Transport controls */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              disabled={activeIndex === 0}
              onClick={onPrev}
            >
              <StepBack className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={onReplay}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              className="shadow"
              onClick={onPlay}
            >
              <Play className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={onPause}
            >
              <Pause className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              disabled={activeIndex === sentencesLength - 1}
              onClick={onNext}
            >
              <StepForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Record buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled
              className="gap-2"
            >
              <Volume2 className="h-4 w-4" />
              Play recorded audio
            </Button>
            <Button size="sm" className="gap-2">
              <Mic className="h-4 w-4" />
              Record
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

export default ActiveSentencePanel