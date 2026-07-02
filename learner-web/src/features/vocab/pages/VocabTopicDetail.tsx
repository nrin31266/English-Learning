import LanguageLevelBadge, {
  type LanguageLevel,
} from "@/components/LanguageLevel";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  clearDetail,
  fetchSubTopics,
  fetchTopicDetail,
  fetchWords,
  setActiveSubtopic,
} from "@/store/vocabDetailSlide";
import type { IVocabSubTopic, IVocabWordEntry } from "@/types";
import { getPartOfSpeechI18nKey } from "@/utils/partOfSpeech";
import VocabLearningPanel from "../components/learning/VocabLearningPanel";
import {
  type ProgressMap,
  type VocabStudyPlan,
} from "../components/learning/vocabLearningUtils";
import {
  ArrowLeft,
  BookMarked,
  CircleHelp,
  CheckCircle2,
  Headphones,
  Languages,
  Layers3,
  LayoutGrid,
  Loader2,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/keycloak/providers/AuthProvider";
import {
  fetchScopedVocabProgress,
  fetchVocabProgress,
  submitVocabSession,
  type VocabProgressDashboard,
} from "@/store/vocabProgressSlice";
import type {
  ReviewRating,
  VocabLearningMode,
} from "../components/learning/vocabLearningUtils";
import { showNotification } from "@/store/system/notificationSlice";
import KeycloakClient from "@/features/keycloak/keycloak";

function getWordDefinition(word: IVocabWordEntry) {
  return (
    word.contextDefinition ||
    word.wordDetail?.definitions?.[0]?.definition ||
    ""
  );
}

function getWordMeaning(word: IVocabWordEntry) {
  return (
    word.contextMeaningVi ||
    word.wordDetail?.summaryVi ||
    word.wordDetail?.definitions?.[0]?.meaningVi ||
    ""
  );
}

function getWordExample(word: IVocabWordEntry) {
  return (
    word.contextExample || word.wordDetail?.definitions?.[0]?.example || ""
  );
}

function getWordViExample(word: IVocabWordEntry) {
  return (
    word.contextViExample || word.wordDetail?.definitions?.[0]?.viExample || ""
  );
}

function getAudioUrl(word: IVocabWordEntry) {
  return (
    word.wordDetail?.phonetics?.usAudioUrl ||
    word.wordDetail?.phonetics?.ukAudioUrl ||
    ""
  );
}

function getPhonetic(word: IVocabWordEntry) {
  return word.wordDetail?.phonetics?.us || word.wordDetail?.phonetics?.uk || "";
}

function playWordAudio(word: IVocabWordEntry) {
  const audioUrl = getAudioUrl(word);
  if (!audioUrl) return;
  void new Audio(audioUrl).play();
}

function isDueProgress(item?: ProgressMap[string]) {
  if (!item || item.isDone || !item.nextReviewAt) return false;
  return new Date(item.nextReviewAt).getTime() <= Date.now();
}

function getWordStatus(item?: ProgressMap[string]) {
  if (!item?.reviewRating) {
    return {
      labelKey: "vocab.common.new",
      className: "border-border bg-muted text-muted-foreground",
      titleKey: undefined,
    };
  }
  if (item.reviewRating === "DONE") {
    return {
      labelKey: "vocab.common.mastered",
      className:
        "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
      titleKey: "vocab.detail.masteredHint",
    };
  }
  if (isDueProgress(item)) {
    return {
      labelKey: "vocab.common.due",
      className:
        "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
      titleKey: undefined,
    };
  }
  return {
    labelKey: "vocab.common.learned",
    className: "border-primary/25 bg-primary/10 text-primary",
    titleKey: undefined,
  };
}

const STUDY_PLANS: Array<{
  id: VocabStudyPlan;
  labelKey: string;
  descriptionKey: string;
}> = [
  { id: "COMBINED", labelKey: "vocab.detail.combined", descriptionKey: "vocab.detail.combinedDesc" },
  { id: "FLASHCARD", labelKey: "vocab.detail.flashcard", descriptionKey: "vocab.detail.flashcardDesc" },
  { id: "EN_TO_VI", labelKey: "vocab.detail.enToVi", descriptionKey: "vocab.detail.enToViDesc" },
  { id: "VI_TO_EN", labelKey: "vocab.detail.viToEn", descriptionKey: "vocab.detail.viToEnDesc" },
  { id: "LISTEN_AND_TYPE", labelKey: "vocab.detail.listen", descriptionKey: "vocab.detail.listenDesc" },
];

const STUDY_PLAN_ICONS = [
  { id: "COMBINED" as const, icon: LayoutGrid, labelKey: "vocab.detail.combined" },
  { id: "FLASHCARD" as const, icon: Layers3, labelKey: "vocab.detail.flashcard" },
  { id: "EN_TO_VI" as const, icon: CircleHelp, labelKey: "vocab.detail.enToVi" },
  { id: "VI_TO_EN" as const, icon: Languages, labelKey: "vocab.detail.viToEn" },
  { id: "LISTEN_AND_TYPE" as const, icon: Headphones, labelKey: "vocab.detail.listen" },
];

export default function VocabTopicDetail() {
  const { t } = useTranslation();
  const { id, subtopicId } = useParams<{ id: string; subtopicId?: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { profile } = useAuth();
  const [learningMode, setLearningMode] = useState(false);
  const [learnAllRemaining, setLearnAllRemaining] = useState(false);
  const [localProgress, setLocalProgress] = useState<ProgressMap>({});
  const [studyPlan, setStudyPlan] = useState<VocabStudyPlan>("COMBINED");
  const [subtopicSummaries, setSubtopicSummaries] = useState<
    Record<string, VocabProgressDashboard["subtopics"][number]>
  >({});

  const {
    topic,
    topicStatus,
    subtopics,
    subtopicsStatus,
    words,
    wordsStatus,
    activeSubtopicId,
  } = useAppSelector((s) => s.vocabDetail);

  const activeSubtopics = useMemo(
    () => subtopics.filter((s) => s.isActive === true || s.active === true),
    [subtopics],
  );

  const activeSubtopic = useMemo(
    () => activeSubtopics.find((s) => s.id === activeSubtopicId),
    [activeSubtopics, activeSubtopicId],
  );

  const subtopicProgress = useMemo(
    () =>
      new Map(
        activeSubtopics.map((sub) => {
          const summary = subtopicSummaries[sub.id];
          const savedProgress =
            sub.id === activeSubtopicId ? localProgress : {};
          const entries = Object.values(savedProgress);
          const learned = entries.length
            ? entries.filter((item) => !!item.reviewRating).length
            : summary?.learnedWords || 0;
          const total = summary?.totalWords || sub.wordCount || 0;
          const percent =
            total > 0 ? Math.min(100, Math.round((learned / total) * 100)) : 0;
          return [sub.id, { learned, total, percent }] as const;
        }),
      ),
    [activeSubtopicId, activeSubtopics, localProgress, subtopicSummaries],
  );
  const topicCompleted =
    activeSubtopics.length > 0 &&
    activeSubtopics.every(
      (sub) => (subtopicProgress.get(sub.id)?.percent || 0) >= 100,
    );
  const completedSubtopicCount = activeSubtopics.filter(
    (sub) => (subtopicProgress.get(sub.id)?.percent || 0) >= 100,
  ).length;

  useEffect(() => {
    if (!id) return;
    dispatch(fetchTopicDetail(id));
    dispatch(fetchSubTopics(id));

    return () => {
      dispatch(clearDetail());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (!profile) {
      setSubtopicSummaries({});
      return;
    }
    if (!id) return;
    void dispatch(fetchScopedVocabProgress([id]))
      .unwrap()
      .then((scoped) =>
        setSubtopicSummaries(
          Object.fromEntries(
            scoped.subtopics.map((item) => [item.subtopicId, item]),
          ),
        ),
      )
      .catch(() => {});
  }, [dispatch, profile, id]);

  useEffect(() => {
    if (!subtopicId) {
      if (activeSubtopicId) dispatch(setActiveSubtopic(null));
      return;
    }
    if (activeSubtopicId !== subtopicId) {
      dispatch(setActiveSubtopic(subtopicId));
    }
  }, [activeSubtopicId, dispatch, subtopicId]);

  useEffect(() => {
    if (!activeSubtopicId) return;
    dispatch(fetchWords(activeSubtopicId));
    setLocalProgress({});
    if (profile) {
      void dispatch(fetchVocabProgress(activeSubtopicId))
        .unwrap()
        .then(({ progress }) => setLocalProgress(progress))
        .catch(() =>
          dispatch(
            showNotification({
              message: t("vocab.detail.loadProgressFailed"),
              variant: "error",
            }),
          ),
        );
    }
    setLearningMode(false);
    setLearnAllRemaining(false);
  }, [dispatch, activeSubtopicId, profile, t]);

  const handleProgressChange = useCallback((progress: ProgressMap) => {
    setLocalProgress(progress);
  }, []);

  const handleSessionCommit = useCallback(
    async (
      sessionId: string,
      sessionWords: Array<{
        wordId: string;
        rating: ReviewRating;
        completedModes: VocabLearningMode[];
      }>,
    ) => {
      if (!profile || !activeSubtopicId)
        throw new Error("Authentication required");
      try {
        const committed = await dispatch(
          submitVocabSession({
            subtopicId: activeSubtopicId,
            sessionId,
            words: sessionWords,
          }),
        ).unwrap();
        setLocalProgress(committed.progress);
        const learnedWords = Object.keys(committed.progress).length;
        const dueReviewWords = Object.values(committed.progress).filter((item) =>
          isDueProgress(item),
        ).length;
        const masteredCount = Object.values(committed.progress).filter(
          (item) => item.reviewRating === "DONE",
        ).length;
        setSubtopicSummaries((current) => ({
          ...current,
          [activeSubtopicId]: {
            subtopicId: activeSubtopicId,
            learnedWords,
            totalWords: words.length,
            dueReviewWords,
            masteredCount,
            dueReviewCount: dueReviewWords,
            newCount: Math.max(0, words.length - learnedWords),
            status: learnedWords >= words.length ? "COMPLETED" : "IN_PROGRESS",
            learningStatus:
              learnedWords === 0
                ? "NOT_STARTED"
                : learnedWords >= words.length
                  ? "LEARNED"
                  : "LEARNING",
          },
        }));
        return {
          progress: committed.progress,
          rewardExpected: committed.rewardExpected,
        };
      } catch (error) {
        dispatch(
          showNotification({
            message: t("vocab.detail.saveProgressFailed"),
            variant: "error",
          }),
        );
        throw error;
      }
    },
    [activeSubtopicId, dispatch, profile, t, words.length],
  );

  const dueCount = words.filter((word) =>
    isDueProgress(localProgress[word.id]),
  ).length;
  const learnedCount = words.filter(
    (word) => !!localProgress[word.id]?.reviewRating,
  ).length;
  const remainingCount = words.filter(
    (word) => !localProgress[word.id]?.reviewRating,
  ).length;
  const activeStudyPlanIndex = Math.max(
    0,
    STUDY_PLAN_ICONS.findIndex((plan) => plan.id === studyPlan),
  );

  const handleSelectSubtopic = (sub: IVocabSubTopic) => {
    if (!id) return;
    dispatch(setActiveSubtopic(sub.id));
    navigate(`/vocab/topics/${id}/subtopics/${sub.id}`);
  };

  const handleHeaderBack = () => {
    if (!id) return;
    const isCompactLayout = window.matchMedia("(max-width: 1279px)").matches;
    if (isCompactLayout && activeSubtopicId) {
      dispatch(setActiveSubtopic(null));
      navigate(`/vocab/topics/${id}`);
      return;
    }
    navigate("/vocab/topics");
  };

  const rightEmptyState = (
    <div className="relative flex h-full items-center justify-center overflow-hidden p-10">
      <div className="pointer-events-none absolute -right-16 top-16 h-56 w-56 rounded-full bg-primary/[0.04] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-primary/[0.05] blur-3xl" />

      <div className="relative max-w-xl text-center">
        <div className="relative mx-auto mb-6 h-28 w-48" aria-hidden="true">
          <div className="absolute left-1 top-5 h-20 w-36 -rotate-6 rounded-xl border border-primary/10 bg-primary/[0.04]" />
          <div className="absolute right-1 top-3 h-20 w-36 rotate-6 rounded-xl border border-primary/15 bg-card" />
          <div className="absolute inset-x-4 top-0 h-24 rounded-2xl border border-primary/25 bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/30" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/20" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/10" />
              </div>
              <span className="h-2 w-8 rounded-full bg-primary/10" />
            </div>
            <div className="mt-3 flex items-center gap-3 text-left">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookMarked className="h-5 w-5" />
              </span>
              <div className="flex-1 space-y-2">
                <div className="h-2.5 w-3/4 rounded-full bg-primary/20" />
                <div className="h-2 w-full rounded-full bg-muted" />
                <div className="h-2 w-2/3 rounded-full bg-muted" />
              </div>
            </div>
          </div>
        </div>

        <span className="mb-3 inline-flex items-center rounded-full border border-primary/15 bg-primary/[0.06] px-3 py-1 text-xs font-semibold text-primary">
          <span className="xl:hidden">{t("vocab.detail.chooseAbove")}</span>
          <span className="hidden xl:inline">{t("vocab.detail.chooseLeft")}</span>
        </span>
        <h2 className="text-2xl font-bold tracking-tight">
          {t("vocab.detail.chooseTitle")}
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          {t("vocab.detail.chooseText")}
        </p>
      </div>
    </div>
  );

  const rightLearningState = (
    <div className="flex flex-col p-2.5 sm:p-3 xl:h-full xl:min-h-0 xl:overflow-y-auto">
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="line-clamp-2 text-xl font-bold tracking-tight sm:text-2xl">
                {activeSubtopic?.title}
              </h2>
              {activeSubtopic?.cefrLevel && (
                <LanguageLevelBadge
                  level={activeSubtopic.cefrLevel as LanguageLevel}
                  className="h-6 min-w-[2.1rem] px-2 text-[10px]"
                  hasBg
                />
              )}
            </div>
          </div>
        </div>
        <div className="mt-1.5 max-w-3xl">
          {activeSubtopic?.titleVi && (
            <p className="text-sm text-muted-foreground">
              {activeSubtopic.titleVi}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {t("vocab.detail.learnedProgress")}{" "}
            <b className="font-semibold text-foreground">
              {learnedCount}/{words.length} từ
            </b>
            <span className="mx-1.5 text-border">|</span>
            {t("vocab.detail.newRemaining")}{" "}
            <b className="font-semibold text-foreground">
              {t("vocab.detail.newWords", { count: remainingCount })}
            </b>
            {dueCount > 0 && (
              <span className="ml-1.5 font-semibold text-amber-600 dark:text-amber-400">
                <span className="mr-1.5 text-border">|</span>
                {t("vocab.detail.dueWords", { count: dueCount })}
              </span>
            )}
          </p>
          <div className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{
                width: `${words.length ? Math.round((learnedCount / words.length) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="w-full max-w-md shrink-0 xl:w-96">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("vocab.detail.studyMode")}
            </p>
            <div className="relative grid h-12 grid-cols-5 overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.04] p-1">
              <span
                className="absolute bottom-1 top-1 w-[calc(20%-0.4rem)] rounded-lg border border-primary/35 bg-primary/15 shadow-sm ring-1 ring-primary/10 transition-[left] duration-300"
                style={{ left: `calc(${activeStudyPlanIndex * 20}% + 0.2rem)` }}
              />
              {STUDY_PLAN_ICONS.map((item) => {
                const Icon = item.icon;
                const plan = STUDY_PLANS.find(
                  (candidate) => candidate.id === item.id,
                );
                const active = studyPlan === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setStudyPlan(item.id)}
                    title={`${plan ? t(plan.labelKey) : ""}: ${plan ? t(plan.descriptionKey) : ""}`}
                    aria-label={plan ? t(plan.labelKey) : undefined}
                    className={cn(
                      "relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors",
                      active
                        ? "text-primary drop-shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn("h-3.5 w-3.5", active && "drop-shadow-sm")}
                    />
                    <span className="whitespace-nowrap text-[9px] font-semibold leading-none sm:text-[10px]">
                      {t(item.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {remainingCount === 0 ? (
            <div className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              {t("vocab.detail.lessonCompleted")}
            </div>
          ) : profile ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setLearnAllRemaining(false);
                  setLearningMode(true);
                }}
                className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm sm:flex-none"
              >
                {t("vocab.detail.learnNew", {
                  count: Math.min(5, remainingCount),
                })}
              </button>
              <button
                onClick={() => {
                  setLearnAllRemaining(true);
                  setLearningMode(true);
                }}
                className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted sm:flex-none"
              >
                {t("vocab.detail.learnAllNew", { count: remainingCount })}
              </button>
            </div>
          ) : (
            <button
              onClick={() => void KeycloakClient.getInstance().keycloak.login()}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              {t("vocab.detail.signInToLearn")}
            </button>
          )}
        </div>
      </div>

      {wordsStatus === "loading" && (
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {wordsStatus === "succeeded" && words.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          {t("vocab.detail.noWords")}
        </div>
      )}

      {wordsStatus === "failed" && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {t("vocab.detail.loadWordsFailed")}
        </div>
      )}

      {wordsStatus === "succeeded" && words.length > 0 && (
        <div className="mt-3 grid items-start gap-2 xl:grid-cols-2">
          {words
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((word) => {
              const definition = getWordDefinition(word);
              const meaning = getWordMeaning(word);
              const example = getWordExample(word);
              const viExample = getWordViExample(word);
              const audioUrl = getAudioUrl(word);
              const phonetic = getPhonetic(word);
              const posLabel = t(getPartOfSpeechI18nKey(word.pos));
              const wordProgress = localProgress[word.id];
              const wordStatus = getWordStatus(wordProgress);

              return (
                <article
                  key={word.id}
                  className="rounded-lg border border-border/70 bg-card px-2.5 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="text-lg font-bold leading-tight">
                          {word.wordText}
                        </h3>
                        {phonetic && (
                          <span className="text-sm text-muted-foreground">
                            /{phonetic.replace(/^\/+|\/+$/g, "")}/
                          </span>
                        )}
                        <span
                          className="inline-flex h-6 items-center rounded-md border border-border bg-muted px-2 text-xs font-semibold text-foreground"
                          title={posLabel}
                        >
                          {posLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        title={wordStatus.titleKey ? t(wordStatus.titleKey) : undefined}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-bold",
                          wordStatus.className,
                        )}
                      >
                        {t(wordStatus.labelKey)}
                      </span>
                      {audioUrl && (
                        <button
                          onClick={() => playWordAudio(word)}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:text-foreground"
                          title={t("vocab.detail.playAudio")}
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {meaning && (
                    <p className="mt-0.5 text-[15px] font-semibold leading-snug text-primary">
                      {meaning}
                    </p>
                  )}
                  {definition && (
                    <p className="mt-0.5 text-sm leading-snug text-foreground/90">
                      {definition}
                    </p>
                  )}

                  {(example || viExample) && (
                    <div className="mt-1.5 border-t border-border/60 pt-1.5 text-sm leading-snug">
                      {example && (
                        <p className="italic text-foreground/90">“{example}”</p>
                      )}
                      {viExample && (
                        <p className="mt-0.5 text-muted-foreground">
                          {viExample}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
        </div>
      )}
    </div>
  );

  return (
    <div className="py-2 xl:h-[calc(100vh-6rem)]">
      <header className="mb-2 rounded-xl border bg-background px-2.5 py-1.5">
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
          <button
            onClick={handleHeaderBack}
            title="Quay lại"
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("vocab.common.back")}
          </button>

          <span className="shrink-0 text-muted-foreground/40">|</span>
          <h1 className="max-w-[16rem] truncate text-base font-bold sm:max-w-md">
            {topic?.title ||
              (topicStatus === "loading"
                ? t("vocab.detail.loadingTopic")
                : t("vocab.detail.topicFallback"))}
          </h1>

          {topic?.cefrRange && (
            <span className="shrink-0 rounded-md border border-primary/20 bg-primary/[0.06] px-2 py-0.5 text-[11px] font-semibold text-primary">
              {topic.cefrRange}
            </span>
          )}
          {topicCompleted && (
            <div className="flex shrink-0 items-center gap-1 rounded-full border border-green-100 bg-green-50 px-1.5 py-0.5 text-green-600 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              <span className="text-[10px] font-bold">
                {t("vocab.common.completed")}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-2 xl:h-[calc(100%-4.75rem)] xl:grid-cols-12">
        <aside
          className={`col-span-1 w-full flex-col overflow-hidden rounded-2xl border bg-muted/15 xl:col-span-3 xl:h-full xl:min-h-0 ${
            learningMode
              ? "hidden"
              : activeSubtopicId
                ? "hidden xl:flex"
                : "flex"
          }`}
        >
          <div className="border-b bg-card/80 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold">{t("vocab.detail.subtopics")}</h2>
              <span className="rounded-full border border-primary/15 bg-primary/[0.07] px-2 py-0.5 text-[10px] font-semibold text-primary">
                {t("vocab.detail.lessonSummary", {
                  learned: completedSubtopicCount,
                  total: activeSubtopics.length,
                })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("vocab.detail.chooseLesson")}
            </p>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
            {subtopicsStatus === "loading" && (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {subtopicsStatus === "succeeded" &&
              activeSubtopics.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {t("vocab.detail.emptySubtopics")}
                </div>
              )}

            {subtopicsStatus === "succeeded" &&
              activeSubtopics.map((sub) => {
                const isActive = sub.id === activeSubtopicId;
                const learningProgress = subtopicProgress.get(sub.id) || {
                  learned: 0,
                  total: sub.wordCount ?? 0,
                  percent: 0,
                };
                const progressStatus =
                  learningProgress.percent >= 100
                    ? t("vocab.common.completed")
                    : learningProgress.learned > 0
                      ? t("vocab.common.learning")
                      : t("vocab.common.notStarted");
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectSubtopic(sub)}
                    className={`group w-full rounded-lg border border-l-2 p-2.5 text-left transition-colors ${
                      isActive
                        ? "border-primary/45 border-l-primary bg-primary/10 shadow-sm ring-1 ring-primary/5"
                        : "border-border/70 border-l-transparent bg-card shadow-xs hover:border-primary/30 hover:bg-primary/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        #{sub.order + 1}
                      </span>
                      {sub.cefrLevel && (
                        <LanguageLevelBadge
                          level={sub.cefrLevel as LanguageLevel}
                          className="h-5 min-w-[1.8rem] px-1.5 text-[9px]"
                          hasBg
                        />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                      {sub.title}
                    </p>
                    {sub.titleVi && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {sub.titleVi}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                      {learningProgress.percent >= 100 ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {t("vocab.common.completed")}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "font-medium",
                            learningProgress.learned > 0
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {progressStatus}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {learningProgress.learned}/{learningProgress.total} từ
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${learningProgress.percent}%` }}
                      />
                    </div>
                  </button>
                );
              })}
          </div>
        </aside>

        <main
          className={`col-span-1 w-full rounded-2xl border bg-background ${learningMode ? "xl:col-span-12" : "xl:col-span-9"} xl:h-full xl:min-h-0 xl:overflow-hidden ${
            activeSubtopicId ? "block" : "hidden xl:block"
          }`}
        >
          {!activeSubtopicId ? (
            rightEmptyState
          ) : learningMode && activeSubtopic && words.length > 0 ? (
            <VocabLearningPanel
              subtopic={activeSubtopic}
              words={words}
              initialProgress={localProgress}
              onProgressChange={handleProgressChange}
              onSessionCommit={handleSessionCommit}
              onClose={() => setLearningMode(false)}
              learnAll={learnAllRemaining}
              studyPlan={studyPlan}
            />
          ) : (
            rightLearningState
          )}
        </main>
      </div>
    </div>
  );
}
