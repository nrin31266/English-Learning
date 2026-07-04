import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RewardCelebration from "@/components/gamification/RewardCelebration";
import {
  waitForVocabSessionReward,
  type VocabSessionReward,
} from "../../api/vocabRewardBus";
import { cn } from "@/lib/utils";
import type { IVocabSubTopic, IVocabWordEntry } from "@/types";
import { getPartOfSpeechI18nKey } from "@/utils/partOfSpeech";
import { failSound, successSound } from "@/utils/sound";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleHelp,
  Headphones,
  Languages,
  Layers3,
  Lightbulb,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  applyReviewRating,
  completeMode,
  emptyProgress,
  getDefinition,
  getExample,
  getLearningSessions,
  getMaxHints,
  getMeaning,
  getPhonetic,
  isRevealableChar,
  getReviewWords,
  getTarget,
  getViExample,
  modeLabel,
  normalizeAnswer,
  playVocabAudio,
  REVIEW_RATING_META,
  REVIEW_RATING_STYLES,
  shuffle,
  type LocalVocabWordProgress,
  type ProgressMap,
  type ReviewRating,
  type VocabLearningMode,
  type VocabStudyPlan,
} from "./vocabLearningUtils";

type SessionWord = {
  wordId: string;
  rating: ReviewRating;
  completedModes: VocabLearningMode[];
};
type SessionCommit = { progress: ProgressMap; rewardExpected: boolean };
type Props = {
  subtopic: IVocabSubTopic;
  words: IVocabWordEntry[];
  initialProgress: ProgressMap;
  onProgressChange: (progress: ProgressMap) => void;
  onSessionCommit?: (
    sessionId: string,
    words: SessionWord[],
  ) => Promise<SessionCommit>;
  onClose: () => void;
  startInReview?: boolean;
  learnAll?: boolean;
  studyPlan?: VocabStudyPlan;
  reviewQueueRemaining?: number;
  onContinueReview?: () => void;
};
const MODES: Array<{ id: VocabLearningMode; icon: typeof Layers3 }> = [
  { id: "FLASHCARD", icon: Layers3 },
  { id: "EN_TO_VI", icon: CircleHelp },
  { id: "VI_TO_EN", icon: Languages },
  { id: "LISTEN_AND_TYPE", icon: Headphones },
];
const RATING_ORDER = Object.keys(REVIEW_RATING_META) as ReviewRating[];
const RATING_SHORTCUT: Record<ReviewRating, number> = {
  DONE: 1,
  EASY: 2,
  MEDIUM: 3,
  HARD: 4,
  AGAIN: 5,
};
const SCHEDULED_RATINGS = RATING_ORDER.filter(
  (rating): rating is Exclude<ReviewRating, "DONE"> => rating !== "DONE",
);

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.matches(
      "input:not(:disabled), textarea:not(:disabled), select:not(:disabled)",
    ) || target.isContentEditable
  );
}

function responsiveTermSize(value: string, emphasis: "hero" | "prompt" = "hero") {
  const length = value.trim().length;
  const words = value.trim().split(/\s+/).filter(Boolean).length;
  if (emphasis === "prompt") {
    if (length <= 24 && words <= 3) return "text-2xl sm:text-3xl";
    if (length <= 48 && words <= 6) return "text-xl sm:text-2xl";
    return "text-lg sm:text-xl";
  }
  if (length <= 12 && words <= 2) return "text-5xl sm:text-6xl";
  if (length <= 24 && words <= 4) return "text-4xl sm:text-5xl";
  if (length <= 42 && words <= 7) return "text-3xl sm:text-4xl";
  return "text-2xl leading-tight sm:text-3xl";
}

function PosBadge({ pos }: { pos: string }) {
  const { t } = useTranslation();
  return (
    <span className="rounded-md border bg-muted px-2 py-1 text-xs font-semibold">
      {t(getPartOfSpeechI18nKey(pos))}
    </span>
  );
}

export default function VocabLearningPanel({
  subtopic,
  words,
  initialProgress,
  onProgressChange,
  onSessionCommit,
  onClose,
  startInReview = false,
  learnAll = false,
  studyPlan = "COMBINED",
  reviewQueueRemaining,
  onContinueReview,
}: Props) {
  const [sessions] = useState(() =>
    getLearningSessions(words, initialProgress),
  );
  const [remainingWords] = useState(() =>
    sessions.flat().filter((item) => !initialProgress[item.id]?.reviewRating),
  );
  const remainingSessions = useMemo(
    () =>
      Array.from({ length: Math.ceil(remainingWords.length / 5) }, (_, index) =>
        remainingWords.slice(index * 5, (index + 1) * 5),
      ),
    [remainingWords],
  );
  const initialReview = useMemo(
    () => getReviewWords(words, initialProgress, words.length),
    [initialProgress, words],
  );
  const [reviewWords, setReviewWords] = useState<IVocabWordEntry[] | null>(
    () => (startInReview ? initialReview : null),
  );
  const [sessionIndex, setSessionIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const singleMode = studyPlan !== "COMBINED";
  const initialMode: VocabLearningMode = singleMode ? studyPlan : "FLASHCARD";
  const [mode, setMode] = useState<VocabLearningMode>(initialMode);
  const [showResult, setShowResult] = useState(false);
  const [progress, setProgress] = useState(initialProgress);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [rewardExpected, setRewardExpected] = useState(false);
  const [sessionSaving, setSessionSaving] = useState(false);
  const ratingPendingRef = useRef(false);
  const sessionWords =
    reviewWords ||
    (learnAll ? remainingWords : remainingSessions[sessionIndex]) ||
    [];
  const word = sessionWords[wordIndex];

  const updateWord = useCallback(
    (
      wordId: string,
      updater: (value: LocalVocabWordProgress) => LocalVocabWordProgress,
    ) => {
      setProgress((current) => {
        const next = {
          ...current,
          [wordId]: updater(current[wordId] || emptyProgress(wordId)),
        };
        onProgressChange(next);
        return next;
      });
    },
    [onProgressChange],
  );
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !showExitDialog) setShowExitDialog(true);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [showExitDialog]);

  const completeCurrentMode = useCallback(
    (score: number) =>
      updateWord(word.id, (item) => completeMode(item, mode, score)),
    [mode, updateWord, word?.id],
  );
  const continueMode = () => {
    if (singleMode) return;
    const index = MODES.findIndex((item) => item.id === mode);
    setMode(MODES[(index + 1) % MODES.length].id);
  };
  const rateAndAdvance = async (rating: ReviewRating) => {
    if (ratingPendingRef.current) return;
    ratingPendingRef.current = true;
    const optimisticWord = applyReviewRating(
      progress[word.id] || emptyProgress(word.id),
      rating,
    );
    const optimisticProgress = { ...progress, [word.id]: optimisticWord };
    setProgress(optimisticProgress);
    onProgressChange(optimisticProgress);
    try {
      if (wordIndex >= sessionWords.length - 1) {
        const sessionPayload = sessionWords.map((sessionWord) => {
          const item = optimisticProgress[sessionWord.id];
          if (!item.reviewRating)
            throw new Error("Session contains an unrated word");
          return {
            wordId: sessionWord.id,
            rating: item.reviewRating,
            completedModes: item.completedModes,
          };
        });
        setSessionSaving(true);
        setShowResult(true);
        const committed = await onSessionCommit?.(sessionId, sessionPayload);
        if (committed) {
          setProgress(committed.progress);
          onProgressChange(committed.progress);
          setRewardExpected(committed.rewardExpected);
        }
      } else {
        setWordIndex((value) => value + 1);
        setMode(initialMode);
      }
    } catch {
      setProgress(progress);
      onProgressChange(progress);
      setShowResult(false);
    } finally {
      setSessionSaving(false);
      ratingPendingRef.current = false;
    }
  };
  const nextSession = () => {
    setReviewWords(null);
    setSessionIndex((value) => value + 1);
    setWordIndex(0);
    setMode(initialMode);
    setSessionId(crypto.randomUUID());
    setRewardExpected(false);
    setShowResult(false);
  };

  if (!word && !showResult)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Không có từ phù hợp để học.
      </div>
    );
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl bg-background">
      <LearningHeader
        subtopic={subtopic}
        mode={mode}
        progress={word ? progress[word.id] : undefined}
        current={wordIndex + 1}
        total={sessionWords.length}
        result={showResult}
        showModeStrip={!singleMode}
        onClose={() => setShowExitDialog(true)}
      />
      <div className="no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4">
        {showResult ? (
          <ResultView
            subtopic={subtopic}
            words={sessionWords}
            progress={progress}
            sessionId={sessionId}
            rewardExpected={rewardExpected}
            isReview={!!reviewWords}
            hasNext={
              !learnAll &&
              !reviewWords &&
              sessionIndex < remainingSessions.length - 1
            }
            nextCount={remainingSessions[sessionIndex + 1]?.length || 0}
            onNext={nextSession}
            onClose={onClose}
            reviewQueueRemaining={reviewQueueRemaining}
            onContinueReview={onContinueReview}
            sessionSaving={sessionSaving}
          />
        ) : (
          <>
            {mode === "FLASHCARD" && (
              <FlashcardMode
                key={`${word.id}:flash`}
                word={word}
                onComplete={completeCurrentMode}
                onContinue={continueMode}
                onRate={rateAndAdvance}
                singleMode={singleMode}
              />
            )}
            {mode === "EN_TO_VI" && (
              <MultipleChoiceMode
                key={`${word.id}:en-vi`}
                word={word}
                allWords={words}
                direction="EN_TO_VI"
                onComplete={completeCurrentMode}
                onContinue={continueMode}
                onRate={rateAndAdvance}
                singleMode={singleMode}
              />
            )}
            {mode === "VI_TO_EN" && (
              <MultipleChoiceMode
                key={`${word.id}:vi-en`}
                word={word}
                allWords={words}
                direction="VI_TO_EN"
                onComplete={completeCurrentMode}
                onContinue={continueMode}
                onRate={rateAndAdvance}
                singleMode={singleMode}
              />
            )}
            {mode === "LISTEN_AND_TYPE" && (
              <TypingMode
                key={`${word.id}:listen`}
                word={word}
                onComplete={completeCurrentMode}
                onContinue={continueMode}
                onRate={rateAndAdvance}
                singleMode={singleMode}
              />
            )}
          </>
        )}
      </div>
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-xl">
              Học thêm chút nữa nhé?
            </DialogTitle>
            <DialogDescription>
              Bạn đang làm rất tốt. Tiếp tục thêm một từ nữa để giữ nhịp học,
              hoặc thoát nếu bạn cần nghỉ.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="grid grid-cols-2 sm:grid-cols-2">
            <Button variant="outline" onClick={onClose}>
              Thoát buổi học
            </Button>
            <Button onClick={() => setShowExitDialog(false)}>
              Tiếp tục học
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LearningHeader({
  subtopic,
  mode,
  progress,
  current,
  total,
  result,
  showModeStrip,
  onClose,
}: {
  subtopic: IVocabSubTopic;
  mode: VocabLearningMode;
  progress?: LocalVocabWordProgress;
  current: number;
  total: number;
  result: boolean;
  showModeStrip: boolean;
  onClose: () => void;
}) {
  const activeIndex = Math.max(
    0,
    MODES.findIndex((item) => item.id === mode),
  );
  return (
    <header className="border-b px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-bold">{subtopic.title}</p>
          {!result && !showModeStrip && (
            <span className="shrink-0 rounded-md border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {modeLabel(mode)}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-xs font-semibold text-muted-foreground">
            {result ? "Đã học xong" : `${Math.min(current, total)}/${total} từ`}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {!result && (
        <div className="mx-auto mt-1.5 max-w-md">
          <div className="mb-1 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{
                width: `${total ? Math.min(100, (current / total) * 100) : 0}%`,
              }}
            />
          </div>
          {showModeStrip && (
            <div className="relative grid h-10 grid-cols-4 overflow-hidden rounded-xl border bg-muted/60 p-1">
              <span
                className="absolute bottom-1 top-1 w-[calc(25%-0.5rem)] rounded-lg border bg-background shadow-sm transition-[left] duration-300"
                style={{ left: `calc(${activeIndex * 25}% + 0.25rem)` }}
              />
              {MODES.map((item) => {
                const Icon = item.icon;
                const active = !result && item.id === mode;
                const done =
                  result || !!progress?.completedModes.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "relative z-10 flex items-center justify-center transition-colors",
                      active
                        ? "text-primary"
                        : done
                          ? "text-foreground/70"
                          : "text-muted-foreground/60",
                    )}
                    title={modeLabel(item.id)}
                  >
                    <Icon
                      className={cn("h-5 w-5", active && "drop-shadow-sm")}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </header>
  );
}

function FlashcardMode({
  word,
  onComplete,
  onContinue,
  onRate,
  singleMode,
}: ModeProps) {
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const target = getTarget(word);
  const meaning = getMeaning(word);
  const flip = () => {
    setFlipped((current) => {
      if (!current) {
        playVocabAudio(word);
        if (!completed) {
          onComplete(20);
          setCompleted(true);
        }
      }
      return !current;
    });
  };
  useEffect(() => {
    const flipWithSpace = (event: KeyboardEvent) => {
      if (
        event.code !== "Space" ||
        event.repeat ||
        isTypingTarget(event.target)
      )
        return;
      event.preventDefault();
      flip();
    };
    window.addEventListener("keydown", flipWithSpace);
    return () => window.removeEventListener("keydown", flipWithSpace);
  });
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="h-80 perspective-distant">
        <div
          className={cn(
            "relative h-full transform-3d transition-transform duration-500",
            flipped && "transform-[rotateY(180deg)]",
          )}
        >
          <button
            onClick={flip}
            className="absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-2xl border bg-card p-6 backface-hidden"
          >
            <div className="flex items-center gap-2">
              <h2 className={cn("max-w-full text-balance font-bold tracking-tight", responsiveTermSize(target))}>{target}</h2>
              <PosBadge pos={word.pos} />
            </div>
            {getPhonetic(word) && (
              <p className="mt-3 text-lg text-muted-foreground">
                /{getPhonetic(word).replace(/^\/+|\/+$/g, "")}/
              </p>
            )}
            <Volume2 className="mt-5 h-5 w-5 text-muted-foreground" />
            <p className="mt-8 text-sm text-muted-foreground">
              Nhấn vào thẻ hoặc phím Space để lật
            </p>
          </button>
          <div
            onClick={flip}
            className="no-scrollbar absolute inset-0 flex h-full cursor-pointer flex-col justify-center overflow-y-auto rounded-2xl border bg-card p-5 text-center backface-hidden transform-[rotateY(180deg)]"
          >
            <p className={cn("text-balance font-bold text-primary", responsiveTermSize(meaning, "prompt"))}>{meaning}</p>
            <p className="mt-3 text-lg leading-relaxed">{getDefinition(word)}</p>
            {getExample(word) && (
              <div className="mt-4 rounded-lg bg-muted p-4 text-left text-base leading-relaxed">
                <p className="italic">“{getExample(word)}”</p>
                <p className="mt-1 text-muted-foreground">{getViExample(word)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {completed && (
        <div onClick={(event) => event.stopPropagation()}>
          <LearningActions onContinue={onContinue} onRate={onRate} directRatings={singleMode} />
        </div>
      )}
    </div>
  );
}

type ModeProps = {
  word: IVocabWordEntry;
  onComplete: (score: number) => void;
  onContinue: () => void;
  onRate: (rating: ReviewRating) => void;
  singleMode?: boolean;
};
function MultipleChoiceMode({
  word,
  allWords,
  direction,
  onComplete,
  onContinue,
  onRate,
  singleMode,
}: ModeProps & {
  allWords: IVocabWordEntry[];
  direction: "EN_TO_VI" | "VI_TO_EN";
}) {
  const question = useMemo(() => {
    const getOption = (item: IVocabWordEntry) =>
      direction === "EN_TO_VI" ? getMeaning(item) : getTarget(item);
    const answer = getOption(word);
    const same = shuffle(
      allWords.filter((item) => item.id !== word.id && item.pos === word.pos),
    );
    const rest = shuffle(
      allWords.filter((item) => item.id !== word.id && item.pos !== word.pos),
    );
    const seen = new Set([normalizeAnswer(answer)]);
    const distractors: string[] = [];
    for (const item of [...same, ...rest]) {
      const value = getOption(item);
      const normalized = normalizeAnswer(value);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      distractors.push(value);
      if (distractors.length === 3) break;
    }
    return { answer, choices: shuffle([answer, ...distractors]) };
  }, [allWords, direction, word]);
  const [selected, setSelected] = useState<string | null>(null);
  const prompt = direction === "EN_TO_VI" ? getTarget(word) : getMeaning(word);
  const correct = selected === question.answer;
  const choose = (choice: string) => {
    if (selected) return;
    setSelected(choice);
    const ok = choice === question.answer;
    if (ok) window.setTimeout(() => playVocabAudio(word), 80);
    else failSound.play();
    onComplete(ok ? 30 : 10);
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!selected && /^[1-4]$/.test(event.key)) {
        const choice = question.choices[Number(event.key) - 1];
        if (choice) choose(choice);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          {direction === "EN_TO_VI"
            ? "Từ này có nghĩa là gì?"
            : "Từ nào mang nghĩa này?"}{" "}
          | Chọn bằng phím 1–4
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className={cn("min-w-0 text-balance font-bold", responsiveTermSize(prompt, "prompt"))}>{prompt}</h2>
          <PosBadge pos={word.pos} />
        </div>
        <div className="mt-5 grid auto-rows-fr gap-2 sm:grid-cols-2">
          {question.choices.map((choice, index) => (
            <button
              key={choice}
              disabled={!!selected}
              onClick={() => choose(choice)}
              className={cn(
                "flex min-h-20 min-w-0 items-center gap-3 overflow-hidden rounded-xl border p-3 text-left font-medium",
                selected &&
                  choice === question.answer &&
                  "border-primary bg-primary/10 text-primary",
                selected === choice &&
                  !correct &&
                  "border-destructive bg-destructive/10 text-destructive",
                selected &&
                  choice !== selected &&
                  choice !== question.answer &&
                  "opacity-55",
              )}
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background text-xs font-bold">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug [overflow-wrap:anywhere]">{choice}</span>
            </button>
          ))}
        </div>
        {selected && (
          <>
            <p
              className={cn(
                "mt-3 text-center text-base font-bold",
                correct
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive",
              )}
            >
              {correct ? "Chính xác" : "Chưa đúng"}
            </p>
            {singleMode && <AnswerDetail word={word} />}
          </>
        )}
      </div>
      {selected && <LearningActions onContinue={onContinue} onRate={onRate} directRatings={singleMode} />}
    </div>
  );
}

function TypingMode({
  word,
  onComplete,
  onContinue,
  onRate,
  singleMode,
}: ModeProps) {
  const target = getTarget(word);
  const maxHints = getMaxHints(target);
  const [revealedChars, setRevealedChars] = useState<Set<number>>(new Set());
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState<"correct" | "unknown" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const play = useCallback(() => playVocabAudio(word), [word]);
  useEffect(() => {
    inputRef.current?.focus();
    window.setTimeout(play, 100);
  }, [play]);
  useEffect(() => {
    const replay = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.code === "Space") {
        event.preventDefault();
        play();
      }
    };
    window.addEventListener("keydown", replay);
    return () => window.removeEventListener("keydown", replay);
  }, [play]);
  const check = () => {
    if (!answer.trim() || resolved) return;
    const ok = normalizeAnswer(answer) === normalizeAnswer(target);
    if (ok) {
      window.setTimeout(play, 80);
      setResolved("correct");
      onComplete(attempts || revealedChars.size ? 20 : 30);
    } else {
      failSound.play();
      setAttempts((value) => value + 1);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };
  const revealHint = (index: number) => {
    if (
      revealedChars.size >= maxHints ||
      !isRevealableChar(Array.from(target)[index] || "")
    )
      return;
    setRevealedChars((current) =>
      current.has(index) || current.size >= maxHints
        ? current
        : new Set(current).add(index),
    );
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };
  const unknown = () => {
    setResolved("unknown");
    onComplete(5);
  };
  const canGiveUp =
    attempts >= 2 || maxHints === 0 || revealedChars.size >= maxHints;
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border bg-card p-5 text-center">
        <button
          onClick={play}
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Headphones />
        </button>
        <div className="mt-3 flex justify-center">
          <PosBadge pos={word.pos} />
        </div>
        <p className="mt-2">{getDefinition(word)}</p>
        <p className="mt-1 font-semibold text-primary">{getMeaning(word)}</p>
        <div className="mt-5 flex min-h-8 flex-wrap items-center justify-center gap-1 font-mono text-lg tracking-widest">
          {resolved ? (
            <span>{target}</span>
          ) : (
            Array.from(target).map((char, index) =>
              !isRevealableChar(char) ? (
                <span key={index} className="whitespace-pre">
                  {char === " " ? "\u00a0" : char}
                </span>
              ) : revealedChars.has(index) ? (
                <span key={index} className="min-w-5 font-bold text-primary">
                  {char}
                </span>
              ) : (
                <button
                  key={index}
                  type="button"
                  disabled={revealedChars.size >= maxHints}
                  onClick={() => revealHint(index)}
                  className="min-w-5 border-b border-dashed border-muted-foreground/50 font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-default disabled:opacity-60"
                  aria-label={`Mở ký tự gợi ý số ${index + 1}`}
                >
                  _
                </button>
              ),
            )
          )}
        </div>
        <input
          ref={inputRef}
          value={answer}
          disabled={!!resolved}
          onChange={(event) => setAnswer(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              check();
            }
          }}
          className={cn(
            "mt-4 h-11 w-full rounded-lg border bg-background px-3 text-center outline-none focus:ring-2 focus:ring-primary/30",
            resolved === "correct" && "border-primary ring-2 ring-primary/20",
          )}
          placeholder="Nhập từ rồi nhấn Enter"
        />
        {attempts > 0 && !resolved && (
          <p className="mt-2 text-sm text-destructive">
            Chưa đúng, thử lại hoặc dùng hint.
          </p>
        )}
        {!resolved && (
          <>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5" />
              Còn{" "}
              <b className="text-foreground">
                {Math.max(0, maxHints - revealedChars.size)}
              </b>{" "}
              hint | bấm vào dấu _ muốn mở
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <Button variant="outline" onClick={play}>
                <Volume2 /> Replay | Ctrl+Space
              </Button>
              {canGiveUp && (
                <Button variant="outline" onClick={unknown}>
                  Không biết
                </Button>
              )}
            </div>
          </>
        )}
        {resolved && (
          <>
            <p
              className={cn(
                "mt-3 text-base font-bold",
                resolved === "correct"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive",
              )}
            >
              {resolved === "correct" ? "Chính xác" : "Chưa nhớ từ này"}
            </p>
            {singleMode && <AnswerDetail word={word} />}
          </>
        )}
      </div>
      {resolved && <LearningActions onContinue={onContinue} onRate={onRate} directRatings={singleMode} />}
    </div>
  );
}

function AnswerDetail({ word }: { word: IVocabWordEntry }) {
  return (
    <div className="mt-3 rounded-xl border bg-muted/40 p-3 text-left">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold">{getTarget(word)}</p>
            <PosBadge pos={word.pos} />
          </div>
          {getPhonetic(word) && (
            <p className="text-sm text-muted-foreground">
              /{getPhonetic(word).replace(/^\/+|\/+$/g, "")}/
            </p>
          )}
        </div>
        <button
          onClick={() => playVocabAudio(word)}
          className="rounded-md border bg-background p-2"
        >
          <Volume2 className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 font-semibold text-primary">{getMeaning(word)}</p>
      <p className="mt-1 text-sm">{getDefinition(word)}</p>
      {getExample(word) && (
        <div className="mt-2 rounded-lg bg-background p-2 text-sm">
          <p className="italic">“{getExample(word)}”</p>
          <p className="text-muted-foreground">{getViExample(word)}</p>
        </div>
      )}
    </div>
  );
}

function LearningActions({
  onContinue,
  onRate,
  directRatings = false,
}: {
  onContinue: () => void;
  onRate: (rating: ReviewRating) => void;
  directRatings?: boolean;
}) {
  const [showRatings, setShowRatings] = useState(directRatings);
  const submitRating = useCallback(
    (rating: ReviewRating) => {
      successSound.play();
      onRate(rating);
    },
    [onRate],
  );
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (!showRatings && event.key === "Enter") {
        event.preventDefault();
        setShowRatings(true);
        return;
      }
      if (!showRatings && event.key === "Tab") {
        event.preventDefault();
        onContinue();
        return;
      }
      if (!showRatings || !/^[1-5]$/.test(event.key)) return;
      const rating = RATING_ORDER.find(
        (item) => RATING_SHORTCUT[item] === Number(event.key),
      );
      if (rating) submitRating(rating);
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [onContinue, showRatings, submitRating]);
  return (
    <div className="mt-6">
      {!showRatings ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setShowRatings(true)}>
            Đánh giá | Enter <Check />
          </Button>
          <Button onClick={onContinue}>
            Học tiếp | Tab <ChevronRight />
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              title="Quay lại"
              aria-label="Quay lại"
              onClick={() => setShowRatings(false)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-medium text-foreground">
              Tự đánh giá mức độ ghi nhớ
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {SCHEDULED_RATINGS.map((rating) => (
              <button
                type="button"
                key={rating}
                onClick={() => submitRating(rating)}
                className={cn(
                  "relative rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                  REVIEW_RATING_STYLES[rating],
                )}
              >
                <span className="block pr-6 font-bold">
                  {REVIEW_RATING_META[rating].label}
                </span>
                <span className="mt-0.5 block text-xs opacity-80">
                  {REVIEW_RATING_META[rating].interval}
                </span>
                <kbd className="absolute right-2 top-2 rounded border border-current/20 bg-background/50 px-1.5 py-0.5 text-[10px] font-semibold leading-none opacity-70">
                  {RATING_SHORTCUT[rating]}
                </kbd>
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground">
            <span>Đã chắc chắn thuộc?</span>
            <button
              type="button"
              onClick={() => submitRating("DONE")}
              className="rounded-md px-1.5 py-1 font-medium text-muted-foreground underline-offset-4 transition-colors hover:bg-muted hover:text-foreground hover:underline"
            >
              Thuộc hẳn <kbd className="ml-1 rounded border bg-muted px-1 py-0.5 text-[10px]">1</kbd>
            </button>
            <span>để bỏ khỏi lịch ôn.</span>
          </div>
        </>
      )}
    </div>
  );
}

function ResultView({
  subtopic,
  words,
  progress,
  sessionId,
  rewardExpected,
  isReview,
  hasNext,
  nextCount,
  onNext,
  onClose,
  reviewQueueRemaining,
  onContinueReview,
  sessionSaving,
}: {
  subtopic: IVocabSubTopic;
  words: IVocabWordEntry[];
  progress: ProgressMap;
  sessionId: string;
  rewardExpected: boolean;
  isReview: boolean;
  hasNext: boolean;
  nextCount: number;
  onNext: () => void;
  onClose: () => void;
  reviewQueueRemaining?: number;
  onContinueReview?: () => void;
  sessionSaving: boolean;
}) {
  const [reward, setReward] = useState<VocabSessionReward | null>(null);
  const [rewardTimedOut, setRewardTimedOut] = useState(false);
  useEffect(() => {
    let active = true;
    if (!rewardExpected) return;
    void waitForVocabSessionReward(sessionId).then((value) => {
      if (!active) return;
      setReward(value);
      setRewardTimedOut(!value);
    });
    return () => {
      active = false;
    };
  }, [rewardExpected, sessionId]);
  const reviewed = words.filter((word) => progress[word.id]?.reviewRating);
  const dueCount = reviewed.filter(
    (word) => progress[word.id]?.needsReview,
  ).length;
  const score = reviewed.reduce(
    (sum, word) => sum + Math.min(100, progress[word.id]?.masteryScore || 0),
    0,
  );
  const averageScore = reviewed.length
    ? Math.round(score / reviewed.length)
    : 0;
  const wordList = (
    <div className="grid content-start gap-2">
      {words.map((word) => {
        const item = progress[word.id] || emptyProgress(word.id);
        const rating = item.reviewRating;
        const meta = rating ? REVIEW_RATING_META[rating] : null;
        return (
          <div key={word.id} className="rounded-xl border bg-background p-3">
            <div className="flex justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{getTarget(word)}</p>
                  <PosBadge pos={word.pos} />
                  {meta && rating && (
                    <span
                      title={meta.interval}
                      className={cn(
                        "cursor-help rounded-full border px-2.5 py-1 text-xs font-bold",
                        REVIEW_RATING_STYLES[rating],
                      )}
                    >
                      {meta.label}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getMeaning(word)}
                </p>
              </div>
              <button onClick={() => playVocabAudio(word)}>
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {item.completedModes.map((doneMode) => (
                <span
                  key={doneMode}
                  className="rounded-md bg-muted px-2 py-0.5 text-[10px]"
                >
                  {modeLabel(doneMode)}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
  const rewardText = sessionSaving
    ? "Đang lưu..."
    : reward
      ? `+${reward.earnedXp} XP | +${reward.earnedCoins} coin`
      : rewardExpected && !rewardTimedOut
        ? "Đang nhận..."
        : rewardExpected
          ? "Đã cộng trên server"
          : "Không có điểm tăng thêm";
  return (
    <>
      {reward && <RewardCelebration />}
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)] lg:items-start">
        <section>
          <h2 className="mb-2 text-sm font-bold text-muted-foreground">
            Các từ vừa học
          </h2>
          {wordList}
        </section>
        <aside className="lg:sticky lg:top-0">
          <div className="rounded-2xl border bg-card p-5 text-center">
            <Check className="mx-auto h-9 w-9 text-primary" />
            <h2 className="mt-2 text-2xl font-bold">
              Bạn đã {isReview ? "ôn" : "học"} {reviewed.length} từ
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {subtopic.title}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Stat label="Đã học" value={reviewed.length} />
              <Stat label="Điểm trung bình" value={`${averageScore}/100`} />
              <Stat label="Cần ôn" value={dueCount} />
              <Stat label="Phần thưởng" value={rewardText} />
            </div>
            {reviewQueueRemaining !== undefined && (
              <p className="mt-3 text-sm font-semibold text-primary">
                Còn {reviewQueueRemaining} từ trong hàng đợi ôn
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Session được lưu một lần; XP và coin nhận trực tiếp qua WebSocket.
            </p>
          </div>
          <div className="mt-3 grid gap-2 rounded-xl border bg-background/95 p-2">
            {hasNext && (
              <Button disabled={sessionSaving} onClick={onNext}>
                Học {nextCount} từ tiếp theo
              </Button>
            )}
            {onContinueReview &&
              reviewQueueRemaining !== undefined &&
              reviewQueueRemaining > 0 && (
                <Button disabled={sessionSaving} onClick={onContinueReview}>
                  Ôn tiếp {Math.min(10, reviewQueueRemaining)} từ
                </Button>
              )}
            <Button variant="outline" disabled>
              Thêm vào bộ thẻ | Sắp ra mắt
            </Button>
            <Button
              variant="outline"
              disabled={sessionSaving}
              onClick={onClose}
            >
              <ArrowLeft /> Quay lại danh sách
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <p className="font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
