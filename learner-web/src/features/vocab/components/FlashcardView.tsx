import type { IVocabWordEntry } from "@/types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, RotateCw, Volume2, Check, X } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { failSound, successSound } from "@/utils/sound";
import PosBadge from "@/components/PosBadge";
import LanguageLevelBadge, { type LanguageLevel } from "@/components/LanguageLevel";

interface Props {
  words: IVocabWordEntry[];
  onAnswer: (wordEntryId: string, correct: boolean) => void;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
}

export default function FlashcardView({ words, onAnswer, initialIndex, onIndexChange }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answered, setAnswered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const current = words[currentIdx];

  // Reset state when words change
  useEffect(() => {
    const nextIndex =
      typeof initialIndex === "number" && initialIndex >= 0 && initialIndex < words.length
        ? initialIndex
        : 0;
    setCurrentIdx(nextIndex);
    setFlipped(false);
    setAnswered(false);
  }, [words, initialIndex]);

  const handleFlip = () => {
    if (answered || !current) return;
    setFlipped((f) => {
      const next = !f;
      if (next) {
        const wordToSpeak = current.wordText || current.wordKey?.replace(/_/g, " ") || "";
        if (wordToSpeak) speak(wordToSpeak);
      }
      return next;
    });
  };

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (answered || !current) return;
      setAnswered(true);
      onAnswer(current.wordEntryId ?? current.id, correct);
      if (correct) successSound.play();
      else failSound.play();

      // Auto-advance after 600ms
      setTimeout(() => {
        if (currentIdx < words.length - 1) {
          setCurrentIdx((i) => {
            const next = i + 1;
            onIndexChange?.(next);
            return next;
          });
          setFlipped(false);
          setAnswered(false);
        }
      }, 600);
    },
    [answered, current, currentIdx, words.length, onAnswer, onIndexChange]
  );

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= words.length) return;
    setCurrentIdx(idx);
    onIndexChange?.(idx);
    setFlipped(false);
    setAnswered(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        handleFlip();
      } else if (e.key === "ArrowLeft") goTo(currentIdx - 1);
      else if (e.key === "ArrowRight") goTo(currentIdx + 1);
      else if (e.key === "1" || e.key === "a") handleAnswer(true);
      else if (e.key === "2" || e.key === "s") handleAnswer(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (!words.length) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No words in this topic.
      </div>
    );
  }

  if (!current) return null;

  const wordText = current.wordText || current.wordKey?.replace(/_/g, " ") || "";
  const meaning = current.contextMeaningVi || "";
  const example = current.contextExample || "";
  const viExample = current.contextViExample || "";
  const definition = current.contextDefinition || "";
  const note = current.note || "";
  const level = current.contextLevel || "";

  const progressPercent = words.length > 0 ? ((currentIdx + 1) / words.length) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Progress bar */}
      <div className="flex w-full max-w-3xl items-center gap-3">
        <span className="text-xs text-muted-foreground shrink-0">
          {currentIdx + 1}/{words.length}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div
        ref={cardRef}
        className="relative h-80 w-full max-w-3xl cursor-pointer perspective-1000 sm:h-96"
        onClick={handleFlip}
      >
        <div
          className={cn(
            "relative h-full w-full rounded-2xl border bg-card shadow-lg transition-all duration-500 transform-3d",
            flipped && "transform-[rotateY(180deg)]"
          )}
        >
          {/* Front */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl p-6 backface-hidden">
            <p className="mb-3 text-4xl font-black tracking-tight sm:text-5xl">{wordText}</p>
            {current.pos && <PosBadge pos={current.pos} />}
            {level && (
              <LanguageLevelBadge
                level={level as LanguageLevel}
                className="mt-2 h-6 min-w-[2.1rem] px-2 text-[10px]"
              />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                speak(wordText);
              }}
              className="mt-4 rounded-full bg-muted p-2.5 transition-colors hover:bg-muted/80"
            >
              <Volume2 className="h-5 w-5 text-muted-foreground" />
            </button>
            <p className="mt-3 text-xs text-muted-foreground">Click or press Space to flip</p>
          </div>

          {/* Back */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-card p-6 backface-hidden transform-[rotateY(180deg)]">
            <p className="text-xl font-semibold">{meaning}</p>
            {definition && (
              <p className="mt-2 text-center text-sm text-muted-foreground">{definition}</p>
            )}
            {note && <p className="mt-2 text-center text-xs text-muted-foreground">{note}</p>}
            {example && (
              <div className="mt-4 rounded-lg bg-muted/50 p-3 text-center text-sm italic">
                <p>{example}</p>
                {viExample && (
                  <p className="mt-1 text-xs text-muted-foreground">{viExample}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <button
          onClick={() => handleAnswer(false)}
          disabled={answered}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-6 py-3 font-semibold transition-all",
            answered
              ? "opacity-30"
              : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
          )}
        >
          <X className="h-5 w-5" />
          Not yet
          <span className="text-xs opacity-50">(S)</span>
        </button>

        <button
          onClick={handleFlip}
          className="flex items-center gap-2 rounded-xl border bg-muted px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/80"
        >
          <RotateCw className="h-4 w-4" />
          Flip
        </button>

        <button
          onClick={() => handleAnswer(true)}
          disabled={answered}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-6 py-3 font-semibold transition-all",
            answered
              ? "opacity-30"
              : "border-green-200 bg-green-50 text-green-600 hover:bg-green-100 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
          )}
        >
          <Check className="h-5 w-5" />
          Got it
          <span className="text-xs opacity-50">(A)</span>
        </button>
      </div>

      {/* Nav */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => goTo(currentIdx - 1)}
          disabled={currentIdx === 0}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <button
          onClick={() => goTo(currentIdx + 1)}
          disabled={currentIdx >= words.length - 1}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function speak(text: string) {
  if ("speechSynthesis" in window) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }
}
