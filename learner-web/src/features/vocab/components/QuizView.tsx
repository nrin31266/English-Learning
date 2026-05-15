import type { IVocabWordEntry } from "@/types";
import { Check, X, ChevronRight, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { failSound, successSound } from "@/utils/sound";
import PosBadge from "@/components/PosBadge";

interface Props {
  words: IVocabWordEntry[];
  onAnswer: (wordEntryId: string, correct: boolean) => void;
  quizType: QuizType;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
}

type QuizType = "en-to-vi" | "vi-to-en";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizView({ words, onAnswer, quizType, initialIndex, onIndexChange }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [finished, setFinished] = useState(false);

  // Reset when words change
  useEffect(() => {
    const nextIndex =
      typeof initialIndex === "number" && initialIndex >= 0 && initialIndex < words.length
        ? initialIndex
        : 0;
    setCurrentIdx(nextIndex);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnsweredCount(0);
    setFinished(false);
  }, [words, initialIndex, quizType]);

  const current = words[currentIdx];

  const getWordLabel = (w: IVocabWordEntry) => w.wordText || w.wordKey?.replace(/_/g, " ") || "";
  const getMeaningLabel = (w: IVocabWordEntry) =>
    w.contextMeaningVi || w.contextDefinition || w.note || "(no meaning)";

  // Build 4 choices: 1 correct + 3 distractors from same subtopic
  const choices = useMemo(() => {
    if (!current || words.length < 2) return [];
    const others = words.filter((w) => w.id !== current.id && w.wordReady !== false);

    const pickLabel = (w: IVocabWordEntry) =>
      quizType === "en-to-vi" ? getMeaningLabel(w) : getWordLabel(w);

    const usedLabels = new Set<string>();
    const result: { key: string; label: string; correct: boolean }[] = [];

    const addChoice = (w: IVocabWordEntry, correct: boolean) => {
      const label = pickLabel(w);
      const key = w.id;
      const normalized = label.trim().toLowerCase();
      if (!label || usedLabels.has(normalized)) return false;
      usedLabels.add(normalized);
      result.push({ key, label, correct });
      return true;
    };

    addChoice(current, true);

    for (const w of shuffle(others)) {
      if (result.length >= 4) break;
      addChoice(w, false);
    }

    return shuffle(result);
  }, [current, words, quizType]);

  const resolveEntryId = (word: IVocabWordEntry) =>
    (word as { wordEntryId?: string }).wordEntryId ?? word.id;

  const handleSelect = (choice: (typeof choices)[0]) => {
    if (showResult) return;
    setSelectedAnswer(choice.key);
    setShowResult(true);
    setAnsweredCount((c) => c + 1);
    if (choice.correct) setScore((s) => s + 1);
    if (choice.correct) successSound.play();
    else failSound.play();
    onAnswer(resolveEntryId(current!), choice.correct);
  };

  const handleNext = () => {
    if (currentIdx < words.length - 1) {
      setCurrentIdx((i) => {
        const next = i + 1;
        onIndexChange?.(next);
        return next;
      });
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    onIndexChange?.(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnsweredCount(0);
    setFinished(false);
  };

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (finished) return;
      if (!showResult) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 4 && choices[num - 1]) {
          handleSelect(choices[num - 1]);
        }
      } else if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (!words.length) {
    return <div className="py-20 text-center text-muted-foreground">No words available.</div>;
  }

  if (finished) {
    const pct = answeredCount > 0 ? Math.round((score / answeredCount) * 100) : 0;
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <div className="text-5xl font-black">{pct}%</div>
        <p className="text-lg font-semibold">
          {score}/{answeredCount} correct
        </p>
        <button
          onClick={handleRestart}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" /> Restart
        </button>
      </div>
    );
  }

  if (!current) return null;

  const question = quizType === "en-to-vi" ? getWordLabel(current) : getMeaningLabel(current);
  const definition = current.contextDefinition || "";
  const example = current.contextExample || "";
  const viExample = current.contextViExample || "";
  const note = current.note || "";

  const progressPercent = words.length > 0 ? ((currentIdx + 1) / words.length) * 100 : 0;

  const nextLabel = showResult
    ? currentIdx < words.length - 1
      ? "Tiếp theo"
      : "Xem kết quả"
    : "Chọn đáp án";

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-6">
      {/* Progress */}
      <div className="flex w-full items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {currentIdx + 1}/{words.length}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Question */}
      <div className="w-full rounded-2xl border bg-card p-9 text-center shadow-sm">
        <p className="text-2xl font-semibold sm:text-3xl">{question}</p>
        {showResult && quizType === "en-to-vi" && current.pos && (
          <div className="mt-2 flex justify-center">
            <PosBadge pos={current.pos} />
          </div>
        )}
        {showResult && definition && <p className="mt-3 text-sm text-muted-foreground">{definition}</p>}
        {showResult && note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
        {showResult && example && (
          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-left text-sm italic">
            <p>{example}</p>
            {viExample && <p className="mt-1 text-xs text-muted-foreground">{viExample}</p>}
          </div>
        )}
      </div>

      {/* Choices */}
      <div className="flex w-full flex-col gap-2">
        {choices.map((choice, i) => {
          const isSelected = selectedAnswer === choice.key;
          const isCorrect = choice.correct;
          let variant = "border-border bg-card hover:bg-muted/50";
          if (showResult && isCorrect) variant = "border-green-400 bg-green-50 dark:bg-green-950";
          else if (showResult && isSelected && !isCorrect) variant = "border-red-400 bg-red-50 dark:bg-red-950";

          return (
            <button
              key={choice.key}
              onClick={() => handleSelect(choice)}
              disabled={showResult}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm sm:text-base font-medium transition-all ${variant}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-bold text-muted-foreground">
                {i + 1}
              </span>
              <span className="flex-1">{choice.label}</span>
              {showResult && isCorrect && <Check className="h-4 w-4 text-green-600" />}
              {showResult && isSelected && !isCorrect && <X className="h-4 w-4 text-red-600" />}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <button
        onClick={handleNext}
        disabled={!showResult}
        className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-sm transition-colors ${
          showResult
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "cursor-not-allowed bg-muted text-muted-foreground"
        }`}
      >
        {nextLabel}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
