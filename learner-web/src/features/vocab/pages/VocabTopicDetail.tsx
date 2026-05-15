import { useAppDispatch, useAppSelector } from "@/store";
import {
  fetchSubTopics,
  fetchWords,
  setActiveSubtopic,
  clearDetail,
} from "@/store/vocabDetailSlide";
import type { IVocabSubTopic, IVocabWordEntry } from "@/types";
import {
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FlashcardView from "../components/FlashcardView";
import QuizView from "../components/QuizView.tsx";
import LanguageLevelBadge, { type LanguageLevel } from "@/components/LanguageLevel";
// ── local‑first persistence ──────────────────────────────────────────────
import { recordAnswer, getSession, saveSession, deleteSession, getAllProgress } from "@/utils/vocabDB";

interface Mode {
  key: string;
  label: string;
  coming?: boolean;
}

const MODES: Mode[] = [
  { key: "flashcard", label: "Flashcard" },
  { key: "quiz-en-vi", label: "Quiz EN→VI" },
  { key: "quiz-vi-en", label: "Quiz VI→EN" },
];

/** Detect large‑screen once at mount */
function useIsLargeScreen() {
  const [large] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    // only check once at mount
  }, []);
  return large;
}

export default function VocabTopicDetail() {
  const { id, subtopicId } = useParams<{ id: string; subtopicId?: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isLarge = useIsLargeScreen();
  const { subtopics, subtopicsStatus, words, wordsStatus, activeSubtopicId } =
    useAppSelector((s) => s.vocabDetail);

  const [mode, setMode] = useState<string>("flashcard");
  const [syncing, setSyncing] = useState(false);
  const syncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [restoredIndex, setRestoredIndex] = useState<number | null>(null);
  const [progressVersion, setProgressVersion] = useState(0);

  const normalizeMode = (value?: string | null) => {
    if (!value) return undefined;
    if (value === "quiz") return "quiz-en-vi";
    return value;
  };

  // ── Filter only active subtopics ──────────────────────────────────────
  const activeSubtopics = useMemo(
    () => subtopics.filter((s) => s.isActive === true || s.active === true),
    [subtopics]
  );

  // ── Load subtopics on mount + restore session from localStorage ────────
  useEffect(() => {
    if (!id) return;
    dispatch(fetchSubTopics(id));

    // Restore last learning session (desktop only)
    const saved = getSession();
    if (saved?.topicId === id) {
      const nextMode = normalizeMode(saved.mode);
      if (nextMode) setMode(nextMode);
      if (typeof saved.currentIndex === "number") {
        setRestoredIndex(saved.currentIndex);
        setCurrentIndex(saved.currentIndex);
      }
      if (isLarge && saved.subtopicId && !subtopicId) {
        dispatch(setActiveSubtopic(saved.subtopicId));
      }
    }
    return () => {
      dispatch(clearDetail());
    };
  }, [id, dispatch, isLarge, subtopicId]);

  // Load words when active subtopic changes
  useEffect(() => {
    if (activeSubtopicId) {
      dispatch(fetchWords(activeSubtopicId));
    }
  }, [activeSubtopicId, dispatch]);

  useEffect(() => {
    if (!id || !activeSubtopicId) return;
    const saved = getSession();
    if (saved?.topicId === id && saved.subtopicId === activeSubtopicId) {
      const nextIndex = typeof saved.currentIndex === "number" ? saved.currentIndex : 0;
      setRestoredIndex(nextIndex);
      setCurrentIndex(nextIndex);
      const nextMode = normalizeMode(saved.mode);
      if (nextMode) setMode(nextMode);
    } else {
      setRestoredIndex(0);
      setCurrentIndex(0);
    }
  }, [activeSubtopicId, id]);

  // If no active subtopic yet, auto‑select on desktop only
  const pickDefaultSubtopic = useCallback(() => {
    if (activeSubtopics.length === 0) return null;

    const withProgress = activeSubtopics
      .map((sub) => {
        const records = getAllProgress(sub.id);
        const lastReviewedAt = records.reduce((max, r) => Math.max(max, r.lastReviewedAt), 0);
        return { sub, lastReviewedAt };
      })
      .filter((item) => item.lastReviewedAt > 0)
      .sort((a, b) => b.lastReviewedAt - a.lastReviewedAt);

    if (withProgress.length > 0) return withProgress[0].sub;

    const firstIncomplete = activeSubtopics.find((sub) => subtopicProgress(sub) < 100);
    return firstIncomplete ?? activeSubtopics[0];
  }, [activeSubtopics]);

  useEffect(() => {
    if (!subtopicId) return;
    if (activeSubtopics.length === 0) return;
    const match = activeSubtopics.find((s) => s.id === subtopicId);
    if (match && activeSubtopicId !== match.id) dispatch(setActiveSubtopic(match.id));
  }, [subtopicId, activeSubtopics, activeSubtopicId, dispatch]);

  useEffect(() => {
    if (!isLarge) return;
    if (subtopicId) return;
    if (subtopicsStatus !== "succeeded" || activeSubtopics.length === 0) return;
    if (activeSubtopicId && activeSubtopics.some((s) => s.id === activeSubtopicId)) return;
    const pick = pickDefaultSubtopic();
    if (pick) dispatch(setActiveSubtopic(pick.id));
  }, [isLarge, subtopicId, subtopicsStatus, activeSubtopics, activeSubtopicId, pickDefaultSubtopic, dispatch]);

  const activeSubtopic = useMemo(
    () => activeSubtopics.find((s) => s.id === activeSubtopicId),
    [activeSubtopics, activeSubtopicId]
  );

  const handleSubtopicClick = (sub: IVocabSubTopic) => {
    if (id) {
      navigate(`/vocab/topics/${id}/subtopics/${sub.id}`);
    }
    dispatch(setActiveSubtopic(sub.id));
    setRestoredIndex(0);
    setCurrentIndex(0);
  };

  // ── Answer handler ────────────────────────────────────────────────────
  const handleAnswer = useCallback(
    (wordEntryId: string, correct: boolean) => {
      if (!activeSubtopicId || !id) return;
      recordAnswer(wordEntryId, activeSubtopicId, id, mode, correct);
      setProgressVersion((v) => v + 1);

      if (syncRef.current) clearTimeout(syncRef.current);
      syncRef.current = setTimeout(() => {
        setSyncing(true);
        setTimeout(() => setSyncing(false), 800);
      }, 15_000);
    },
    [activeSubtopicId, id, mode]
  );

  // ── Helpers ───────────────────────────────────────────────────────────
  const progressBySubtopic = useMemo(() => {
    const map = new Map<string, { learnedCount: number; masteredCount: number; total: number; progressPercent: number }>();
    activeSubtopics.forEach((sub) => {
      const records = getAllProgress(sub.id);
      const learnedCount = records.filter((r) => r.correctCount + r.wrongCount > 0).length;
      const masteredCount = records.filter((r) => r.status === "mastered").length;
      const total = sub.wordCount ?? 0;
      const progressPercent = total > 0 ? Math.min(100, Math.round((learnedCount / total) * 100)) : 0;
      map.set(sub.id, { learnedCount, masteredCount, total, progressPercent });
    });
    return map;
  }, [activeSubtopics, progressVersion]);

  const getLearningStats = (sub: IVocabSubTopic) =>
    progressBySubtopic.get(sub.id) ?? {
      learnedCount: 0,
      masteredCount: 0,
      total: sub.wordCount ?? 0,
      progressPercent: 0,
    };

  const subtopicProgress = (sub: IVocabSubTopic) => getLearningStats(sub).progressPercent;

  const activeWords = useMemo(
    () => words.filter((w) => w.wordReady !== false),
    [words]
  );
  const isLoading = subtopicsStatus === "loading" || subtopicsStatus === "idle";

  const resolveEntryId = (word: IVocabWordEntry) =>
    (word as { wordEntryId?: string }).wordEntryId ?? word.id;

  useEffect(() => {
    if (!id || !activeSubtopicId) return;
    const saved = getSession();
    const startedAt =
      saved?.topicId === id && saved.subtopicId === activeSubtopicId
        ? saved.startedAt
        : Date.now();
    saveSession({
      topicId: id,
      subtopicId: activeSubtopicId,
      currentIndex,
      mode,
      startedAt,
      wordEntryIds: activeWords.map(resolveEntryId),
    });
  }, [id, activeSubtopicId, currentIndex, mode, activeWords]);

  // ── MOBILE: full‑width subtopic list only ──────────────────────────────
  if (!isLarge) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <button
          onClick={() => navigate("/vocab/topics")}
          className="mb-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to topics
        </button>

        <h1 className="mb-4 text-xl font-bold">{activeSubtopic?.title ?? "Subtopics"}</h1>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && activeSubtopics.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">No active subtopics available.</p>
        )}

        {!isLoading && (
          <div className="space-y-2">
            {activeSubtopics.map((sub) => {
              const { learnedCount, total, progressPercent } = getLearningStats(sub);
              return (
                <button
                  key={sub.id}
                  onClick={() => handleSubtopicClick(sub)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-muted bg-muted/30 p-5 text-left shadow-sm transition-all hover:bg-muted/50 hover:border-primary/30"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {sub.order + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold">{sub.title}</p>
                      {sub.cefrLevel && (
                        <LanguageLevelBadge
                          level={sub.cefrLevel as LanguageLevel}
                          className="h-6 min-w-[2.1rem] px-2 text-[10px]"
                          hasBg={true}
                        />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {learnedCount}/{total} đã học
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                  {progressPercent >= 100 ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        {!isLoading && activeSubtopicId && (
          <div className="mt-6">
            <div className="mb-3 flex gap-2">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => !m.coming && setMode(m.key)}
                  disabled={m.coming}
                  className={`rounded-lg px-4 py-2 text-base font-semibold transition-colors ${
                    mode === m.key
                      ? "bg-primary text-primary-foreground"
                      : m.coming
                        ? "cursor-not-allowed text-muted-foreground/40"
                        : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {wordsStatus === "loading" && (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {wordsStatus === "succeeded" && mode === "flashcard" && (
              <FlashcardView
                words={activeWords}
                onAnswer={handleAnswer}
                initialIndex={restoredIndex ?? 0}
                onIndexChange={setCurrentIndex}
              />
            )}

            {wordsStatus === "succeeded" && mode === "quiz-en-vi" && (
              <QuizView
                words={activeWords}
                onAnswer={handleAnswer}
                quizType="en-to-vi"
                initialIndex={restoredIndex ?? 0}
                onIndexChange={setCurrentIndex}
              />
            )}

            {wordsStatus === "succeeded" && mode === "quiz-vi-en" && (
              <QuizView
                words={activeWords}
                onAnswer={handleAnswer}
                quizType="vi-to-en"
                initialIndex={restoredIndex ?? 0}
                onIndexChange={setCurrentIndex}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // ── DESKTOP: split‑view sidebar + learning area ────────────────────────
  return (
    <div className="flex h-[calc(100vh-6rem)] gap-0 overflow-hidden rounded-2xl border bg-background">
      {/* Sidebar */}
      <aside className="flex w-72 shrink-0 flex-col border-r bg-muted/20">
        <div className="border-b p-3">
          <button
            onClick={() => {
              deleteSession();
              navigate("/vocab/topics");
            }}
            className="mb-2 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to topics
          </button>
          <h2 className="truncate text-base font-bold">
            {activeSubtopic?.title ?? (isLoading ? "Loading..." : "Select a topic")}
          </h2>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {subtopicsStatus === "succeeded" &&
            activeSubtopics.map((sub) => {
              const isActive = sub.id === activeSubtopicId;
              const { learnedCount, total, progressPercent } = getLearningStats(sub);
              return (
                <button
                  key={sub.id}
                  onClick={() => handleSubtopicClick(sub)}
                  className={`flex w-full items-center gap-2 rounded-xl border p-3 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary/40 font-semibold shadow-sm"
                      : "border-muted bg-muted/30 text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-background/50 text-[11px] font-bold">
                    {sub.order + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{sub.title}</p>
                      {sub.cefrLevel && (
                        <LanguageLevelBadge
                          level={sub.cefrLevel as LanguageLevel}
                          className="h-6 min-w-[2.1rem] px-2 text-[10px]"
                          hasBg={true}
                        />
                      )}
                    </div>
                    <p className="text-[11px] opacity-70">
                      {learnedCount}/{total} đã học
                    </p>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-background/70">
                      <div
                        className="h-full rounded-full bg-primary/80"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                  {progressPercent >= 100 ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  ) : null}
                </button>
              );
            })}
        </div>
      </aside>

      {/* Main area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mode tabs */}
        <div className="flex items-center justify-between border-b bg-muted/10 px-5 py-3">
          <div className="flex items-center gap-1">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => !m.coming && setMode(m.key)}
                disabled={m.coming}
                className={`rounded-lg px-4 py-2 text-base font-semibold transition-colors ${
                  mode === m.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : m.coming
                      ? "cursor-not-allowed text-muted-foreground/40"
                      : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {m.label}
                {m.coming && <span className="ml-1 rounded bg-muted-foreground/10 px-1 text-[8px]">SOON</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {syncing && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Syncing...
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">{activeWords.length} từ có sẵn</span>
          </div>
        </div>

        {/* Learning area */}
        <div className="flex flex-1 items-start justify-center overflow-y-auto p-8">
          {wordsStatus === "loading" && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {wordsStatus === "succeeded" && mode === "flashcard" && (
            <FlashcardView
              words={activeWords}
              onAnswer={handleAnswer}
              initialIndex={restoredIndex ?? 0}
              onIndexChange={setCurrentIndex}
            />
          )}

          {wordsStatus === "succeeded" && mode === "quiz-en-vi" && (
            <QuizView
              words={activeWords}
              onAnswer={handleAnswer}
              quizType="en-to-vi"
              initialIndex={restoredIndex ?? 0}
              onIndexChange={setCurrentIndex}
            />
          )}

          {wordsStatus === "succeeded" && mode === "quiz-vi-en" && (
            <QuizView
              words={activeWords}
              onAnswer={handleAnswer}
              quizType="vi-to-en"
              initialIndex={restoredIndex ?? 0}
              onIndexChange={setCurrentIndex}
            />
          )}

          {wordsStatus === "succeeded" && !["flashcard", "quiz-en-vi", "quiz-vi-en"].includes(mode) && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <BookMarked className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">Coming soon</p>
              <p className="text-xs">This learning mode is under development.</p>
            </div>
          )}

          {wordsStatus === "succeeded" && activeWords.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <BookMarked className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">Chưa có từ để học</p>
              <p className="text-xs">Đang xử lý dữ liệu, vui lòng thử lại sau.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
