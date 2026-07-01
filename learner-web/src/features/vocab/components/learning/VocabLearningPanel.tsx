import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { IVocabSubTopic, IVocabWordEntry } from "@/types";
import { getPartOfSpeechI18nKey } from "@/utils/partOfSpeech";
import { failSound, successSound } from "@/utils/sound";
import { ArrowLeft, Check, ChevronRight, CircleHelp, Headphones, Languages, Layers3, Lightbulb, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  applyReviewRating, buildMaskedText, completeMode, emptyProgress, getDefinition, getExample,
  getLearningSessions, getMaxHints, getMeaning, getPhonetic, getRevealableCharIndexes,
  getReviewWords, getTarget, getViExample, modeLabel, normalizeAnswer, playVocabAudio,
  REVIEW_RATING_META, REVIEW_RATING_STYLES, shuffle, type LocalVocabWordProgress, type ProgressMap,
  type ReviewRating, type VocabLearningMode,
} from "./vocabLearningUtils";

type Props = { subtopic: IVocabSubTopic; words: IVocabWordEntry[]; initialProgress: ProgressMap; onProgressChange: (progress: ProgressMap) => void; onClose: () => void; startInReview?: boolean; learnAll?: boolean };
const MODES: Array<{ id: VocabLearningMode; icon: typeof Layers3 }> = [
  { id: "FLASHCARD", icon: Layers3 }, { id: "EN_TO_VI", icon: CircleHelp },
  { id: "VI_TO_EN", icon: Languages }, { id: "LISTEN_AND_TYPE", icon: Headphones },
];
const RATING_ORDER = Object.keys(REVIEW_RATING_META) as ReviewRating[];
const RATING_SHORTCUT: Record<ReviewRating, number> = { DONE: 1, EASY: 2, MEDIUM: 3, HARD: 4, AGAIN: 5 };

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (target.matches("input:not(:disabled), textarea:not(:disabled), select:not(:disabled)") || target.isContentEditable);
}

function PosBadge({ pos }: { pos: string }) { const { t } = useTranslation(); return <span className="rounded-md border bg-muted px-2 py-1 text-xs font-semibold">{t(getPartOfSpeechI18nKey(pos))}</span>; }

export default function VocabLearningPanel({ subtopic, words, initialProgress, onProgressChange, onClose, startInReview = false, learnAll = false }: Props) {
  const [sessions] = useState(() => getLearningSessions(subtopic.id, words, initialProgress));
  const [remainingWords] = useState(() => sessions.flat().filter((item) => !initialProgress[item.id]?.reviewRating));
  const remainingSessions = useMemo(() => Array.from({ length: Math.ceil(remainingWords.length / 5) }, (_, index) => remainingWords.slice(index * 5, (index + 1) * 5)), [remainingWords]);
  const initialReview = useMemo(() => getReviewWords(words, initialProgress), [initialProgress, words]);
  const [reviewWords, setReviewWords] = useState<IVocabWordEntry[] | null>(() => startInReview ? initialReview : null);
  const [sessionIndex, setSessionIndex] = useState(0); const [wordIndex, setWordIndex] = useState(0);
  const [mode, setMode] = useState<VocabLearningMode>("FLASHCARD");
  const [showResult, setShowResult] = useState(false); const [progress, setProgress] = useState(initialProgress);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const sessionWords = reviewWords || (learnAll ? remainingWords : remainingSessions[sessionIndex]) || []; const word = sessionWords[wordIndex];

  const updateWord = useCallback((wordId: string, updater: (value: LocalVocabWordProgress) => LocalVocabWordProgress) => {
    setProgress((current) => { const next = { ...current, [wordId]: updater(current[wordId] || emptyProgress(wordId)) }; onProgressChange(next); return next; });
  }, [onProgressChange]);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !showExitDialog) setShowExitDialog(true); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [showExitDialog]);

  const completeCurrentMode = useCallback((score: number) => updateWord(word.id, (item) => completeMode(item, mode, score)), [mode, updateWord, word?.id]);
  const continueMode = () => { const index = MODES.findIndex((item) => item.id === mode); setMode(MODES[(index + 1) % MODES.length].id); };
  const rateAndAdvance = (rating: ReviewRating) => {
    updateWord(word.id, (item) => applyReviewRating(item, rating));
    if (wordIndex >= sessionWords.length - 1) setShowResult(true);
    else { setWordIndex((value) => value + 1); setMode("FLASHCARD"); }
  };
  const nextSession = () => { setReviewWords(null); setSessionIndex((value) => value + 1); setWordIndex(0); setMode("FLASHCARD"); setShowResult(false); };
  const review = () => { const candidates = getReviewWords(words, progress); if (!candidates.length) return; setReviewWords(candidates); setWordIndex(0); setMode("FLASHCARD"); setShowResult(false); };

  if (!word && !showResult) return <div className="p-8 text-center text-muted-foreground">Không có từ phù hợp để học.</div>;
  return <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-background">
    <LearningHeader subtopic={subtopic} mode={mode} progress={word ? progress[word.id] : undefined} current={wordIndex + 1} total={sessionWords.length} result={showResult} onClose={() => setShowExitDialog(true)} />
    <div className="no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4">
      {showResult ? <ResultView subtopic={subtopic} words={sessionWords} progress={progress} isReview={!!reviewWords} hasNext={!learnAll && !reviewWords && sessionIndex < remainingSessions.length - 1} nextCount={remainingSessions[sessionIndex + 1]?.length || 0} onNext={nextSession} onReview={review} onClose={onClose} /> : <>
        {mode === "FLASHCARD" && <FlashcardMode key={`${word.id}:flash`} word={word} onComplete={completeCurrentMode} onContinue={continueMode} onRate={rateAndAdvance} />}
        {mode === "EN_TO_VI" && <MultipleChoiceMode key={`${word.id}:en-vi`} word={word} allWords={words} direction="EN_TO_VI" onComplete={completeCurrentMode} onContinue={continueMode} onRate={rateAndAdvance} />}
        {mode === "VI_TO_EN" && <MultipleChoiceMode key={`${word.id}:vi-en`} word={word} allWords={words} direction="VI_TO_EN" onComplete={completeCurrentMode} onContinue={continueMode} onRate={rateAndAdvance} />}
        {mode === "LISTEN_AND_TYPE" && <TypingMode key={`${word.id}:listen`} word={word} onComplete={completeCurrentMode} onContinue={continueMode} onRate={rateAndAdvance} />}
      </>}
    </div>
    <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl">Học thêm chút nữa nhé? ✨</DialogTitle>
          <DialogDescription>Bạn đang làm rất tốt. Tiếp tục thêm một từ nữa để giữ nhịp học, hoặc thoát nếu bạn cần nghỉ.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="grid grid-cols-2 sm:grid-cols-2">
          <Button variant="outline" onClick={onClose}>Thoát buổi học</Button>
          <Button onClick={() => setShowExitDialog(false)}>Tiếp tục học</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

function LearningHeader({ subtopic, mode, progress, current, total, result, onClose }: { subtopic: IVocabSubTopic; mode: VocabLearningMode; progress?: LocalVocabWordProgress; current: number; total: number; result: boolean; onClose: () => void }) {
  const activeIndex = Math.max(0, MODES.findIndex((item) => item.id === mode));
  return <header className="border-b px-3 py-1.5"><div className="flex items-center justify-between"><div><p className="text-sm font-bold">{subtopic.title}</p>{!result && <p className="text-[11px] text-muted-foreground">{modeLabel(mode)}</p>}</div><Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button></div>
    <div className="mx-auto mt-1.5 max-w-md"><div className="mb-1 flex items-center justify-between text-[11px] font-medium text-muted-foreground"><span>{result ? "Hoàn thành" : "Tiến trình"}</span><span>{Math.min(current, total)}/{total} từ</span></div><div className="mb-1 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${total ? Math.min(100, current / total * 100) : 0}%` }} /></div>
      {!result && <div className="relative grid h-10 grid-cols-4 overflow-hidden rounded-xl border bg-muted/60 p-1">
        <span className="absolute bottom-1 top-1 w-[calc(25%-0.5rem)] rounded-lg border bg-background shadow-sm transition-[left] duration-300" style={{ left: `calc(${activeIndex * 25}% + 0.25rem)` }} />
        {MODES.map((item) => { const Icon = item.icon; const active = !result && item.id === mode; const done = result || !!progress?.completedModes.includes(item.id); return <div key={item.id} className={cn("relative z-10 flex items-center justify-center transition-colors", active ? "text-primary" : done ? "text-foreground/70" : "text-muted-foreground/60")} title={modeLabel(item.id)}><Icon className={cn("h-5 w-5", active && "drop-shadow-sm")} /></div>; })}
      </div>}
    </div>
  </header>;
}

function FlashcardMode({ word, onComplete, onContinue, onRate }: ModeProps) {
  const [flipped, setFlipped] = useState(false); const [completed, setCompleted] = useState(false);
  const autoPlayedRef = useRef(false);
  useEffect(() => {
    if (autoPlayedRef.current) return;
    autoPlayedRef.current = true;
    const timer = window.setTimeout(() => playVocabAudio(word), 120);
    return () => window.clearTimeout(timer);
  }, [word]);
  const flip = () => { setFlipped((current) => { if (!current) { playVocabAudio(word); if (!completed) { onComplete(20); setCompleted(true); } } return !current; }); };
  useEffect(() => {
    const flipWithSpace = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || isTypingTarget(event.target)) return;
      event.preventDefault();
      flip();
    };
    window.addEventListener("keydown", flipWithSpace);
    return () => window.removeEventListener("keydown", flipWithSpace);
  });
  return <div className="mx-auto max-w-2xl"><div className="h-80 [perspective:1200px]"><div className={cn("relative h-full transition-transform duration-500 [transform-style:preserve-3d]", flipped && "[transform:rotateY(180deg)]")}>
    <button onClick={flip} className="absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-2xl border bg-card p-6 [backface-visibility:hidden]"><div className="flex items-center gap-2"><h2 className="text-3xl font-bold">{getTarget(word)}</h2><PosBadge pos={word.pos} /></div>{getPhonetic(word) && <p className="mt-2 text-muted-foreground">/{getPhonetic(word).replace(/^\/+|\/+$/g, "")}/</p>}<Volume2 className="mt-5 h-5 w-5 text-muted-foreground" /><p className="mt-8 text-sm text-muted-foreground">Nhấn vào thẻ hoặc phím Space để lật</p></button>
    <div onClick={flip} className="no-scrollbar absolute inset-0 flex h-full cursor-pointer flex-col justify-center overflow-y-auto rounded-2xl border bg-card p-5 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]"><p className="text-xl font-bold text-primary">{getMeaning(word)}</p><p className="mt-2">{getDefinition(word)}</p>{getExample(word) && <div className="mt-3 rounded-lg bg-muted p-3 text-left text-sm"><p className="italic">“{getExample(word)}”</p><p className="text-muted-foreground">{getViExample(word)}</p></div>}<div onClick={(event) => event.stopPropagation()}>{completed && <LearningActions onContinue={onContinue} onRate={onRate} />}</div></div>
  </div></div></div>;
}

type ModeProps = { word: IVocabWordEntry; onComplete: (score: number) => void; onContinue: () => void; onRate: (rating: ReviewRating) => void };
function MultipleChoiceMode({ word, allWords, direction, onComplete, onContinue, onRate }: ModeProps & { allWords: IVocabWordEntry[]; direction: "EN_TO_VI" | "VI_TO_EN" }) {
  const question = useMemo(() => { const getOption = (item: IVocabWordEntry) => direction === "EN_TO_VI" ? getMeaning(item) : getTarget(item); const answer = getOption(word); const same = shuffle(allWords.filter((item) => item.id !== word.id && item.pos === word.pos)); const rest = shuffle(allWords.filter((item) => item.id !== word.id && item.pos !== word.pos)); const seen = new Set([normalizeAnswer(answer)]); const distractors: string[] = []; for (const item of [...same, ...rest]) { const value = getOption(item); const normalized = normalizeAnswer(value); if (!normalized || seen.has(normalized)) continue; seen.add(normalized); distractors.push(value); if (distractors.length === 3) break; } return { answer, choices: shuffle([answer, ...distractors]) }; }, [allWords, direction, word]);
  const [selected, setSelected] = useState<string | null>(null); const correct = selected === question.answer;
  const autoPlayedRef = useRef(false);
  useEffect(() => {
    if (direction !== "EN_TO_VI" || autoPlayedRef.current) return;
    autoPlayedRef.current = true;
    const timer = window.setTimeout(() => playVocabAudio(word), 120);
    return () => window.clearTimeout(timer);
  }, [direction, word]);
  const choose = (choice: string) => { if (selected) return; setSelected(choice); const ok = choice === question.answer; (ok ? successSound : failSound).play(); if (direction === "EN_TO_VI") window.setTimeout(() => playVocabAudio(word), 350); onComplete(ok ? 30 : 10); };
  useEffect(() => { const key = (event: KeyboardEvent) => { if (!selected && /^[1-4]$/.test(event.key)) { const choice = question.choices[Number(event.key) - 1]; if (choice) choose(choice); } }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); });
  return <div className="mx-auto max-w-2xl"><div className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{direction === "EN_TO_VI" ? "Từ này có nghĩa là gì?" : "Từ nào mang nghĩa này?"} · Chọn bằng phím 1–4</p><h2 className="mt-1 text-2xl font-bold">{direction === "EN_TO_VI" ? getTarget(word) : getMeaning(word)}</h2><div className="mt-5 grid gap-2 sm:grid-cols-2">{question.choices.map((choice, index) => <button key={choice} disabled={!!selected} onClick={() => choose(choice)} className={cn("flex h-16 items-center gap-3 rounded-xl border p-3 text-left font-medium", selected && choice === question.answer && "border-primary bg-primary/10 text-primary", selected === choice && !correct && "border-destructive bg-destructive/10 text-destructive", selected && choice !== selected && choice !== question.answer && "opacity-55")}><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background text-xs font-bold">{index + 1}</span><span>{choice}</span></button>)}</div>{selected && <><p className={cn("mt-3 text-center text-base font-bold", correct ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{correct ? "Chính xác" : "Chưa đúng"}</p><LearningActions onContinue={onContinue} onRate={onRate} /></>}</div></div>;
}

function TypingMode({ word, onComplete, onContinue, onRate }: ModeProps) {
  const target = getTarget(word); const maxHints = getMaxHints(target); const [revealedChars, setRevealedChars] = useState<Set<number>>(new Set()); const [answer, setAnswer] = useState(""); const [attempts, setAttempts] = useState(0); const [resolved, setResolved] = useState<"correct" | "unknown" | null>(null); const inputRef = useRef<HTMLInputElement>(null);
  const play = useCallback(() => playVocabAudio(word), [word]);
  useEffect(() => { inputRef.current?.focus(); window.setTimeout(play, 100); }, [play]);
  useEffect(() => { const replay = (event: KeyboardEvent) => { if (event.ctrlKey && event.code === "Space") { event.preventDefault(); play(); } }; window.addEventListener("keydown", replay); return () => window.removeEventListener("keydown", replay); }, [play]);
  const check = () => { if (!answer.trim() || resolved) return; const ok = normalizeAnswer(answer) === normalizeAnswer(target); if (ok) { successSound.play(); window.setTimeout(play, 350); setResolved("correct"); onComplete(attempts || revealedChars.size ? 20 : 30); } else { failSound.play(); setAttempts((value) => value + 1); window.setTimeout(() => inputRef.current?.focus(), 0); } };
  const hint = () => { const available = getRevealableCharIndexes(target).filter((index) => !revealedChars.has(index)); if (!available.length || revealedChars.size >= maxHints) return; setRevealedChars((current) => new Set(current).add(available[Math.floor(Math.random() * available.length)])); };
  const unknown = () => { setResolved("unknown"); onComplete(5); };
  const canGiveUp = attempts >= 2 || maxHints === 0 || revealedChars.size >= maxHints;
  return <div className="mx-auto max-w-2xl"><div className="rounded-2xl border bg-card p-5 text-center"><button onClick={play} className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground"><Headphones /></button><div className="mt-3 flex justify-center"><PosBadge pos={word.pos} /></div><p className="mt-2">{getDefinition(word)}</p><p className="mt-1 font-semibold text-primary">{getMeaning(word)}</p><p className="mt-5 whitespace-pre-wrap font-mono text-lg tracking-widest">{resolved ? target : buildMaskedText(target, revealedChars)}</p>
    <input ref={inputRef} value={answer} disabled={!!resolved} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); check(); } }} className={cn("mt-4 h-11 w-full rounded-lg border bg-background px-3 text-center outline-none focus:ring-2 focus:ring-primary/30", resolved === "correct" && "border-primary ring-2 ring-primary/20")} placeholder="Nhập từ rồi nhấn Enter" />{attempts > 0 && !resolved && <p className="mt-2 text-sm text-destructive">Chưa đúng, thử lại hoặc dùng hint.</p>}
    {!resolved && <div className="mt-3 flex justify-center gap-2"><Button variant="outline" onClick={play}><Volume2 /> Replay · Ctrl+Space</Button><Button variant="outline" disabled={!maxHints || revealedChars.size >= maxHints} onClick={hint}><Lightbulb /> Hint {revealedChars.size}/{maxHints}</Button>{canGiveUp && <Button variant="outline" onClick={unknown}>Không biết</Button>}</div>}{resolved && <><p className={cn("mt-3 text-base font-bold", resolved === "correct" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{resolved === "correct" ? "Chính xác" : "Chưa nhớ từ này"}</p><LearningActions onContinue={onContinue} onRate={onRate} finishLabel="Đã thuộc" /></>}</div></div>;
}

function LearningActions({ onContinue, onRate, finishLabel = "Đã xong" }: { onContinue: () => void; onRate: (rating: ReviewRating) => void; finishLabel?: string }) {
  const [showRatings, setShowRatings] = useState(false);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (!showRatings && event.key === "Enter") { event.preventDefault(); setShowRatings(true); return; }
      if (!showRatings && event.key === "Tab") { event.preventDefault(); onContinue(); return; }
      if (!showRatings || !/^[1-5]$/.test(event.key)) return;
      const rating = RATING_ORDER.find((item) => RATING_SHORTCUT[item] === Number(event.key));
      if (rating) onRate(rating);
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [onContinue, onRate, showRatings]);
  return <div className="mt-4">{!showRatings ? <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setShowRatings(true)}>{finishLabel} · Enter <Check /></Button><Button onClick={onContinue}>Học tiếp · Tab <ChevronRight /></Button></div> : <><p className="mb-2 text-sm text-muted-foreground">Chọn lịch ôn để chuyển sang từ tiếp theo · phím 1–5</p><div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">{RATING_ORDER.map((rating) => <button key={rating} onClick={() => onRate(rating)} className={cn("rounded-lg border px-2 py-2.5 text-sm transition-colors", REVIEW_RATING_STYLES[rating])}><span className="block font-bold">{RATING_SHORTCUT[rating]}. {REVIEW_RATING_META[rating].label}</span><span className="text-xs opacity-80">{REVIEW_RATING_META[rating].interval}</span></button>)}</div></>}</div>;
}

function ResultView({ subtopic, words, progress, isReview, hasNext, nextCount, onNext, onReview, onClose }: { subtopic: IVocabSubTopic; words: IVocabWordEntry[]; progress: ProgressMap; isReview: boolean; hasNext: boolean; nextCount: number; onNext: () => void; onReview: () => void; onClose: () => void }) {
  const reviewed = words.filter((word) => progress[word.id]?.reviewRating); const dueCount = reviewed.filter((word) => progress[word.id]?.needsReview).length; const score = reviewed.reduce((sum, word) => sum + (progress[word.id]?.masteryScore || 0), 0); const xp = Math.floor(score / 10) + reviewed.filter((word) => ["DONE", "EASY"].includes(progress[word.id]?.reviewRating || "")).length * 3;
  const wordList = <div className="grid content-start gap-2">{words.map((word) => { const item = progress[word.id] || emptyProgress(word.id); const rating = item.reviewRating; const meta = rating ? REVIEW_RATING_META[rating] : null; return <div key={word.id} className="rounded-xl border bg-background p-3"><div className="flex justify-between gap-2"><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{getTarget(word)}</p><PosBadge pos={word.pos} />{meta && rating && <span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", REVIEW_RATING_STYLES[rating])}>{meta.label} · {meta.interval}</span>}</div><p className="mt-1 text-sm text-muted-foreground">{getMeaning(word)}</p></div><button onClick={() => playVocabAudio(word)}><Volume2 className="h-4 w-4" /></button></div><div className="mt-2 flex flex-wrap gap-1">{item.completedModes.map((doneMode) => <span key={doneMode} className="rounded-md bg-muted px-2 py-0.5 text-[10px]">{modeLabel(doneMode)}</span>)}</div></div>; })}</div>;
  return <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)] lg:items-start"><section><h2 className="mb-2 text-sm font-bold text-muted-foreground">Các từ vừa học</h2>{wordList}</section><aside className="lg:sticky lg:top-0"><div className="rounded-2xl border bg-card p-5 text-center"><Check className="mx-auto h-9 w-9 text-primary" /><h2 className="mt-2 text-2xl font-bold">Bạn đã {isReview ? "ôn" : "học"} {reviewed.length} từ</h2><p className="mt-1 text-sm text-muted-foreground">{subtopic.title}</p><div className="mt-4 grid grid-cols-3 gap-2"><Stat label="Đã chốt" value={reviewed.length} /><Stat label="Cần ôn sớm" value={dueCount} /><Stat label="Phần thưởng" value={`${xp} XP · ${Math.floor(xp / 5)} coin`} /></div></div><div className="mt-3 grid gap-2 rounded-xl border bg-background/95 p-2">{hasNext && <Button onClick={onNext}>Học {nextCount} từ tiếp theo</Button>}<Button variant="outline" disabled={!dueCount} onClick={onReview}>Ôn từ cần ôn</Button><Button variant="outline" disabled>Thêm vào bộ thẻ · Sắp ra mắt</Button><Button variant="outline" onClick={onClose}><ArrowLeft /> Quay lại danh sách</Button></div></aside></div>;
}
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-muted p-3"><p className="font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>; }
