import type { IVocabWordEntry } from "@/types";

export type VocabLearningMode = "FLASHCARD" | "EN_TO_VI" | "VI_TO_EN" | "LISTEN_AND_TYPE";
export type VocabStudyPlan = "COMBINED" | VocabLearningMode;
export type ReviewRating = "AGAIN" | "HARD" | "MEDIUM" | "EASY" | "DONE";

export type LocalVocabWordProgress = {
  wordId: string;
  seenCount: number;
  completedModes: VocabLearningMode[];
  modeScores: Partial<Record<VocabLearningMode, number>>;
  lastMode?: VocabLearningMode;
  lastStudiedAt?: string;
  reviewRating?: ReviewRating;
  nextReviewAt?: string | null;
  needsReview: boolean;
  isDone: boolean;
  masteryScore: number;
};

export type ProgressMap = Record<string, LocalVocabWordProgress>;
export const SESSION_SIZE = 5;

export const REVIEW_RATING_META: Record<ReviewRating, { label: string; interval: string }> = {
  AGAIN: { label: "Học lại", interval: "1d" }, HARD: { label: "Khó", interval: "3d" },
  MEDIUM: { label: "Trung bình", interval: "7d" }, EASY: { label: "Dễ", interval: "14d" },
  DONE: { label: "Đã thuộc", interval: "Hoàn tất" },
};

export const REVIEW_RATING_SCORE: Record<ReviewRating, number> = {
  AGAIN: 20, HARD: 40, MEDIUM: 60, EASY: 100, DONE: 100,
};

export const REVIEW_RATING_STYLES: Record<ReviewRating, string> = {
  AGAIN: "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
  HARD: "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300",
  MEDIUM: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  EASY: "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300",
  DONE: "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
};

export const emptyProgress = (wordId = ""): LocalVocabWordProgress => ({
  wordId, seenCount: 0, completedModes: [], modeScores: {}, needsReview: false, isDone: false, masteryScore: 0,
});

export const getTarget = (word: IVocabWordEntry) => word.wordText || word.wordKey.replace(/_/g, " ");
export const getMeaning = (word: IVocabWordEntry) => word.contextMeaningVi || word.wordDetail?.summaryVi || word.wordDetail?.definitions?.[0]?.meaningVi || "Chưa có nghĩa tiếng Việt";
export const getDefinition = (word: IVocabWordEntry) => word.contextDefinition || word.wordDetail?.definitions?.[0]?.definition || "Chưa có định nghĩa";
export const getExample = (word: IVocabWordEntry) => word.contextExample || word.wordDetail?.definitions?.[0]?.example || "";
export const getViExample = (word: IVocabWordEntry) => word.contextViExample || word.wordDetail?.definitions?.[0]?.viExample || "";
export const getPhonetic = (word: IVocabWordEntry) => word.wordDetail?.phonetics?.us || word.wordDetail?.phonetics?.uk || "";
export const getAudioUrl = (word: IVocabWordEntry) => word.wordDetail?.phonetics?.usAudioUrl || word.wordDetail?.phonetics?.ukAudioUrl || "";

let activeAudio: HTMLAudioElement | null = null;
export function playVocabAudio(word: IVocabWordEntry) {
  activeAudio?.pause(); window.speechSynthesis?.cancel();
  const url = getAudioUrl(word);
  if (url) { activeAudio = new Audio(url); void activeAudio.play().catch(() => speak(getTarget(word))); }
  else speak(getTarget(word));
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "en-US"; utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}

export const normalizeAnswer = (value: string) => value.toLocaleLowerCase().trim().replace(/[’']/g, "'").replace(/\s+/g, " ");

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}

export function getLearningSessions(subtopicId: string, words: IVocabWordEntry[], progress: ProgressMap): IVocabWordEntry[][] {
  const storageKey = `vocab-learning-plan:${subtopicId}`;
  const sorted = [...words].sort((a, b) => a.order - b.order);
  const ordered = [...sorted.filter((word) => !progress[word.id]?.isDone), ...sorted.filter((word) => progress[word.id]?.isDone)];
  const sessions = Array.from({ length: Math.ceil(ordered.length / SESSION_SIZE) }, (_, index) => ordered.slice(index * SESSION_SIZE, (index + 1) * SESSION_SIZE));
  localStorage.setItem(storageKey, JSON.stringify(sessions.map((session) => session.map((word) => word.id)))); return sessions;
}

export const isRevealableChar = (char: string) => /[\p{L}\p{N}]/u.test(char);
export const getRevealableCharIndexes = (text: string) => Array.from(text).flatMap((char, index) => isRevealableChar(char) ? [index] : []);
export const buildMaskedText = (text: string, revealed: Set<number>) => Array.from(text).map((char, index) => !isRevealableChar(char) || revealed.has(index) ? char : "_").join("");
export function getMaxHints(text: string) { const count = getRevealableCharIndexes(text).length; if (count <= 1) return 0; if (count <= 3) return 1; if (count <= 5) return 2; if (count <= 8) return 3; if (count <= 12) return 4; return Math.min(6, count - 1); }

export function completeMode(progress: LocalVocabWordProgress, mode: VocabLearningMode, score: number): LocalVocabWordProgress {
  const completedModes = progress.completedModes.includes(mode) ? progress.completedModes : [...progress.completedModes, mode];
  const modeScores = { ...progress.modeScores, [mode]: Math.max(progress.modeScores[mode] || 0, score) };
  return { ...progress, seenCount: progress.seenCount + 1, completedModes, modeScores, lastMode: mode, lastStudiedAt: new Date().toISOString(), masteryScore: Math.min(100, Object.values(modeScores).reduce((sum, value) => sum + (value || 0), 0)) };
}

export function applyReviewRating(progress: LocalVocabWordProgress, rating: ReviewRating, now = new Date()): LocalVocabWordProgress {
  const day = 24 * 3_600_000;
  const delays: Partial<Record<ReviewRating, number>> = { AGAIN: day, HARD: 3 * day, MEDIUM: 7 * day, EASY: 14 * day };
  const delay = delays[rating];
  return { ...progress, reviewRating: rating, nextReviewAt: delay ? new Date(now.getTime() + delay).toISOString() : null, needsReview: rating === "AGAIN" || rating === "HARD" || rating === "MEDIUM", isDone: rating === "DONE", lastStudiedAt: now.toISOString(), masteryScore: REVIEW_RATING_SCORE[rating] };
}

export const needsReview = (progress?: LocalVocabWordProgress) => !!progress && !progress.isDone && (progress.needsReview || !!progress.nextReviewAt);
export function getReviewWords(words: IVocabWordEntry[], progress: ProgressMap, limit = SESSION_SIZE) {
  const priority = (rating?: ReviewRating) => rating === "AGAIN" ? 3 : rating === "HARD" ? 2 : 1;
  return words.filter((word) => needsReview(progress[word.id])).sort((a, b) => priority(progress[b.id]?.reviewRating) - priority(progress[a.id]?.reviewRating) || new Date(progress[a.id]?.nextReviewAt || 0).getTime() - new Date(progress[b.id]?.nextReviewAt || 0).getTime()).slice(0, limit);
}

export const modeLabel = (mode: VocabLearningMode) => ({ FLASHCARD: "Flashcard", EN_TO_VI: "Anh → Việt", VI_TO_EN: "Việt → Anh", LISTEN_AND_TYPE: "Nghe & nhập" })[mode];

export function loadProgress(subtopicId: string): ProgressMap {
  try {
    const stored = JSON.parse(localStorage.getItem(`vocab-learning:${subtopicId}`) || "{}") as Record<string, Record<string, unknown>>;
    return Object.fromEntries(Object.entries(stored).map(([id, value]) => {
      if (Array.isArray(value.completedModes)) {
        const mappedModes = [...new Set((value.completedModes as string[]).map((mode) => mode === "MULTIPLE_CHOICE" ? "EN_TO_VI" : mode === "TYPE_WORD" ? "LISTEN_AND_TYPE" : mode).filter((mode): mode is VocabLearningMode => ["FLASHCARD", "EN_TO_VI", "VI_TO_EN", "LISTEN_AND_TYPE"].includes(mode)))];
        const reviewRating = value.reviewRating as ReviewRating | undefined;
        return [id, { ...emptyProgress(id), ...value, completedModes: mappedModes, wordId: id, masteryScore: reviewRating ? REVIEW_RATING_SCORE[reviewRating] : Math.min(100, Number(value.masteryScore || 0)) } as LocalVocabWordProgress];
      }
      const legacyRating: ReviewRating | undefined = value.status === "MASTERED" || value.knowledgeLevel === "EASY" ? "DONE" : value.isHard || value.knowledgeLevel === "HARD" || value.knowledgeLevel === "UNKNOWN" ? "HARD" : value.seenCount ? "MEDIUM" : undefined;
      const migrated = { ...emptyProgress(id), seenCount: Number(value.seenCount || 0), completedModes: value.seenCount ? ["FLASHCARD" as const] : [], modeScores: value.seenCount ? { FLASHCARD: 20 } : {}, masteryScore: value.seenCount ? 20 : 0 };
      return [id, legacyRating ? applyReviewRating(migrated, legacyRating) : migrated];
    }));
  } catch { return {}; }
}

export const saveProgress = (subtopicId: string, progress: ProgressMap) => localStorage.setItem(`vocab-learning:${subtopicId}`, JSON.stringify(progress));
