import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ILessonSentenceDetailsResponse } from "@/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Languages,
  Quote,
  CheckCircle2,
  Circle,
} from "lucide-react"
import { hasPunctuation, normalizeWordLower } from "@/utils/textUtils"
import { cn } from "@/lib/utils"

type DictationTranscriptProps = {
  sentences: ILessonSentenceDetailsResponse[]
  activeIndex: number
  onSelectSentence: (index: number) => void
  completedIds?: Set<number> | number[]
  visible?: boolean
}

// 🚀 TỐI ƯU 1: TranscriptItem cực kỳ "lì", chỉ re-render khi cần thiết
const TranscriptItem = React.memo(({
  sentence,
  index,
  isActive,
  isCompleted,
  showIPA,
  showTranslation,
  onSelect,
  setItemRef
}: {
  sentence: ILessonSentenceDetailsResponse
  index: number
  isActive: boolean
  isCompleted: boolean
  showIPA: boolean
  showTranslation: boolean
  onSelect: (index: number) => void
  setItemRef: (el: HTMLButtonElement | null, index: number) => void
}) => {
  
  // 🚀 TỐI ƯU 2: Đưa logic xử lý text vào useMemo NỘI BỘ của từng item.
  // Khi video chạy, isActive của các câu khác không đổi -> Logic này KHÔNG CHẠY LẠI.
  const processedText = useMemo(() => {
    const text = sentence.textDisplay ?? sentence.textRaw;
    if (isCompleted || !text) return text;

    return text
      .split(/(\s+|[.,!?;:]|\b)/)
      .filter(Boolean)
      .map(token => {
        const trimmed = token.trim();
        if (trimmed === "" || token === " ") return token;
        if (hasPunctuation(trimmed) && trimmed.length === 1) return token;
        const normalized = normalizeWordLower(trimmed);
        if (!normalized) return token;
        return "*".repeat(normalized.length);
      })
      .join("");
  }, [sentence.textDisplay, sentence.textRaw, isCompleted]);

  const handleClick = useCallback(() => {
    onSelect(index);
  }, [onSelect, index]);
  console.log(`Render TranscriptItem #${index + 1} - Active: ${isActive} - Completed: ${isCompleted}`);
  return (
    <button
      type="button"
      ref={(el) => setItemRef(el, index)}
      onClick={handleClick}
      className={cn(
        "w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-all duration-75", 
        isActive
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : isCompleted
          ? "border-green-300 bg-green-50" 
          : "border-border bg-background hover:bg-muted/30"
      )}
    >
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <div className="flex items-center gap-1.5">
          {isCompleted ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          ) : isActive ? (
            <Circle className="h-3.5 w-3.5 text-primary fill-primary" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className={cn("font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
            #{index + 1}
          </span>
        </div>
        {sentence.audioSegmentUrl && (
          <Badge variant="outline" className="px-1.5 py-0 text-[11px] bg-primary/5 border-primary/20">audio</Badge>
        )}
      </div>

      <p className={cn(
        "text-[15px] leading-snug font-medium font-mono tracking-wide",
        isActive ? "text-primary" : "text-foreground"
      )}>
        {processedText}
      </p>

      {showTranslation && sentence.translationVi && (
        <p className="mt-1 text-[13px] leading-snug text-muted-foreground/80">{sentence.translationVi}</p>
      )}

      {showIPA && (sentence.phoneticUs || "") && (
        <p className="mt-1 text-[13px] italic text-muted-foreground/70">{sentence.phoneticUs || ""}</p>
      )}
    </button>
  );
}, (prev, next) => {
  // 🚀 TỐI ƯU 3: Custom so sánh để ngăn chặn mọi re-render rác từ Player
  return (
    prev.isActive === next.isActive &&
    prev.isCompleted === next.isCompleted &&
    prev.showIPA === next.showIPA &&
    prev.showTranslation === next.showTranslation &&
    prev.sentence.id === next.sentence.id
  );
});

TranscriptItem.displayName = "TranscriptItem";

const DictationTranscript = ({
  sentences,
  activeIndex,
  onSelectSentence,
  visible = true,
  completedIds = new Set()
}: DictationTranscriptProps) => {
  const [showIPA, setShowIPA] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 🚀 TỐI ƯU 4: Memoize Map ID để check cực nhanh
  const completedMap = useMemo(() => {
    const set = completedIds instanceof Set ? completedIds : new Set(completedIds);
    return set;
  }, [completedIds]);

  const currentStepText = useMemo(() => {
    if (!sentences.length) return "0 / 0";
    return `${activeIndex + 1} / ${sentences.length}`;
  }, [sentences.length, activeIndex]);

  const handleSelectSentence = useCallback((index: number) => onSelectSentence(index), [onSelectSentence]);
  const setItemRef = useCallback((el: HTMLButtonElement | null, index: number) => { itemRefs.current[index] = el; }, []);

  // Logic Scroll giữ nguyên bản mượt
  useEffect(() => {
    if (!visible || activeIndex < 0 || activeIndex >= sentences.length) return;
    const timer = setTimeout(() => {
      const el = itemRefs.current[activeIndex];
      if (!el || !scrollAreaRef.current) return;
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (!scrollContainer) return;

      const itemTop = el.offsetTop;
      const itemHeight = el.offsetHeight;
      const containerHeight = scrollContainer.clientHeight;
      const currentScroll = scrollContainer.scrollTop;

      const isVisible = itemTop >= currentScroll && (itemTop + itemHeight) <= (currentScroll + containerHeight);

      if (!isVisible) {
        const scrollTo = itemTop - (containerHeight / 3) + (itemHeight / 2);
        scrollContainer.scrollTo({ top: scrollTo, behavior: "smooth" });
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [activeIndex, sentences.length, visible]);

  return (
    <div className="flex h-[calc(100vh-17vh)] min-h-[260px] flex-col rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col border-b bg-muted/30 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="text-base font-semibold">Transcript</span>
              <p className="text-[10px] text-muted-foreground">{sentences.length} sentences</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={showIPA ? "default" : "outline"} className="h-8 gap-1 px-2.5 text-[12px]" onClick={() => setShowIPA(v => !v)}>
              <Quote className="h-3.5 w-3.5" />IPA
            </Button>
            <Button size="sm" variant={showTranslation ? "default" : "outline"} className="h-8 gap-1 px-2.5 text-[12px]" onClick={() => setShowTranslation(v => !v)}>
              <Languages className="h-3.5 w-3.5" />Trans
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-border/50 pt-2.5">
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-bold text-green-700 border border-green-100">
            <CheckCircle2 className="h-3 w-3" />
            <span>COMPLETED: {completedMap.size}/{sentences.length}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary border border-primary/20">
            <Circle className="h-3 w-3 fill-primary" />
            <span>STEP: {currentStepText}</span>
          </div>
        </div>
      </div>

      <ScrollArea ref={scrollAreaRef} className="h-full overflow-auto">
        <div className="space-y-2 p-3">
          {sentences.map((s, index) => (
            <TranscriptItem
              key={s.id}
              sentence={s}
              index={index}
              isActive={index === activeIndex}
              isCompleted={completedMap.has(s.id)}
              showIPA={showIPA}
              showTranslation={showTranslation}
              onSelect={handleSelectSentence}
              setItemRef={setItemRef}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default React.memo(DictationTranscript);