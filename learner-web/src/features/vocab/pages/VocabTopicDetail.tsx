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
import type { IVocabSubTopic } from "@/types";
import VocabLearningPanel from "../components/learning/VocabLearningPanel";
import {
  type ProgressMap,
  type VocabStudyPlan,
} from "../components/learning/vocabLearningUtils";
import { CheckCircle2, Loader2 } from "lucide-react";
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
import { isDueProgress, STUDY_PLAN_ICONS, STUDY_PLANS } from "../components/topic-detail/vocabTopicDetailUtils";
import { TopicDetailEmptyState } from "../components/topic-detail/TopicDetailEmptyState";
import { TopicDetailHeader } from "../components/topic-detail/TopicDetailHeader";
import { TopicSubtopicSidebar } from "../components/topic-detail/TopicSubtopicSidebar";
import { TopicWordCard } from "../components/topic-detail/TopicWordCard";

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
          <div className="w-full max-w-xl shrink-0 xl:w-[34rem]">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("vocab.detail.studyMode")}
            </p>
            <div className="relative grid h-14 grid-cols-5 overflow-hidden rounded-xl border bg-muted/50 p-1">
              <span
                className="absolute bottom-1 left-1 top-1 w-[calc((100%-0.5rem)/5)] rounded-lg border border-primary/30 bg-background shadow-sm ring-1 ring-primary/10 transition-transform duration-300"
                style={{ transform: `translateX(${activeStudyPlanIndex * 100}%)` }}
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
                      "relative z-10 flex flex-col items-center justify-center gap-1 rounded-lg transition-colors",
                      active
                        ? "text-primary drop-shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn("h-4 w-4", active && "drop-shadow-sm")}
                    />
                    <span className="whitespace-nowrap text-[11px] font-semibold leading-none sm:text-xs">
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
            .map((word) => <TopicWordCard key={word.id} word={word} progress={localProgress[word.id]} />)}
        </div>
      )}
    </div>
  );

  return (
    <div className="py-2 xl:h-[calc(100vh-6rem)]">
      <TopicDetailHeader topic={topic} loading={topicStatus === "loading"} completed={topicCompleted} onBack={handleHeaderBack} />

      <div className="grid grid-cols-1 gap-2 xl:h-[calc(100%-4.75rem)] xl:grid-cols-12">
        <TopicSubtopicSidebar
          subtopics={activeSubtopics}
          status={subtopicsStatus}
          activeId={activeSubtopicId}
          completedCount={completedSubtopicCount}
          hidden={learningMode}
          progress={subtopicProgress}
          onSelect={handleSelectSubtopic}
        />

        <main
          className={`col-span-1 w-full rounded-2xl border bg-background ${learningMode ? "xl:col-span-12" : "xl:col-span-9"} xl:h-full xl:min-h-0 xl:overflow-hidden ${
            activeSubtopicId ? "block" : "hidden xl:block"
          }`}
        >
          {!activeSubtopicId ? (
            <TopicDetailEmptyState />
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
