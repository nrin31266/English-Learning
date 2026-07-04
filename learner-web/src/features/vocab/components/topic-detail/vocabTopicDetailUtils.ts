import type { IVocabWordEntry } from "@/types";
import { CircleHelp, Headphones, Languages, Layers3, LayoutGrid } from "lucide-react";
import type { ProgressMap, VocabStudyPlan } from "../learning/vocabLearningUtils";

export const getWordDefinition = (word: IVocabWordEntry) => word.contextDefinition || word.wordDetail?.definitions?.[0]?.definition || "";
export const getWordMeaning = (word: IVocabWordEntry) => word.contextMeaningVi || word.wordDetail?.summaryVi || word.wordDetail?.definitions?.[0]?.meaningVi || "";
export const getWordExample = (word: IVocabWordEntry) => word.contextExample || word.wordDetail?.definitions?.[0]?.example || "";
export const getWordViExample = (word: IVocabWordEntry) => word.contextViExample || word.wordDetail?.definitions?.[0]?.viExample || "";
export const getAudioUrl = (word: IVocabWordEntry) => word.wordDetail?.phonetics?.usAudioUrl || word.wordDetail?.phonetics?.ukAudioUrl || "";
export const getPhonetic = (word: IVocabWordEntry) => word.wordDetail?.phonetics?.us || word.wordDetail?.phonetics?.uk || "";
export const playWordAudio = (word: IVocabWordEntry) => {
  const audioUrl = getAudioUrl(word);
  if (audioUrl) void new Audio(audioUrl).play();
};
export const isDueProgress = (item?: ProgressMap[string]) => Boolean(item && !item.isDone && item.nextReviewAt && new Date(item.nextReviewAt).getTime() <= Date.now());
export function getWordStatus(item?: ProgressMap[string]) {
  if (!item?.reviewRating) return { labelKey: "vocab.common.new", className: "border-border bg-muted text-muted-foreground", titleKey: undefined };
  if (item.reviewRating === "DONE") return { labelKey: "vocab.common.mastered", className: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300", titleKey: "vocab.detail.masteredHint" };
  if (isDueProgress(item)) return { labelKey: "vocab.common.due", className: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300", titleKey: undefined };
  return { labelKey: "vocab.common.learned", className: "border-primary/25 bg-primary/10 text-primary", titleKey: undefined };
}

export const STUDY_PLANS: Array<{ id: VocabStudyPlan; labelKey: string; descriptionKey: string }> = [
  { id: "COMBINED", labelKey: "vocab.detail.combined", descriptionKey: "vocab.detail.combinedDesc" },
  { id: "FLASHCARD", labelKey: "vocab.detail.flashcard", descriptionKey: "vocab.detail.flashcardDesc" },
  { id: "EN_TO_VI", labelKey: "vocab.detail.enToVi", descriptionKey: "vocab.detail.enToViDesc" },
  { id: "VI_TO_EN", labelKey: "vocab.detail.viToEn", descriptionKey: "vocab.detail.viToEnDesc" },
  { id: "LISTEN_AND_TYPE", labelKey: "vocab.detail.listen", descriptionKey: "vocab.detail.listenDesc" },
];
export const STUDY_PLAN_ICONS = [
  { id: "COMBINED" as const, icon: LayoutGrid, labelKey: "vocab.detail.combined" },
  { id: "FLASHCARD" as const, icon: Layers3, labelKey: "vocab.detail.flashcard" },
  { id: "EN_TO_VI" as const, icon: CircleHelp, labelKey: "vocab.detail.enToVi" },
  { id: "VI_TO_EN" as const, icon: Languages, labelKey: "vocab.detail.viToEn" },
  { id: "LISTEN_AND_TYPE" as const, icon: Headphones, labelKey: "vocab.detail.listen" },
];
