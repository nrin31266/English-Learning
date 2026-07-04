import type { VocabProgressDashboard as Dashboard } from "@/store/vocabProgressSlice";
import HeatMap from "@uiw/react-heat-map";
import "@uiw/react-heat-map/dist.css";
import {
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { VocabProgressSkeleton } from "./topics/VocabTopicsSkeleton";

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const formatDate = (value: unknown, locale: string) => {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  )
    return null;
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const progressStatus = (topic: Dashboard["topics"][number]) => {
  if (topic.learningStatus === "NOT_STARTED" || topic.learnedWords === 0)
    return "notStarted";
  if (topic.learningStatus === "LEARNED" || topic.status === "COMPLETED")
    return "completed";
  return "learning";
};

export default function VocabProgressDashboard({
  data,
}: {
  data: Dashboard | null;
}) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [paintReady, setPaintReady] = useState(false);
  useEffect(() => {
    if (!data) return;
    setPaintReady(false);
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setPaintReady(true));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [data]);
  if (!data)
    return (
      <div className="rounded-2xl border p-10 text-center text-sm text-muted-foreground">
        {t("vocab.progress.loading")}
      </div>
    );

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);
  const studiedToday = data.activityByDate[localDateKey(today)] || 0;
  const nextTopic =
    data.topics.find((topic) => topic.learningStatus === "LEARNING") ??
    data.topics.find((topic) => topic.status === "IN_PROGRESS") ??
    data.topics[0];
  const heatMapValues = Object.entries(data.activityByDate).map(
    ([date, count]) => ({
      date,
      count,
      content: `${formatDate(date, i18n.language) ?? date}: ${count} ${t("vocab.common.words")}`,
    }),
  );

  const handleTodayAction = () => {
    if (data.dueReviewWords > 0) navigate("/vocab/review");
    else if (nextTopic) navigate(`/vocab/topics/${nextTopic.topicId}`);
    else navigate("/vocab/topics");
  };

  return (
    <div className="relative min-h-[32rem]">
      {!paintReady && <div className="absolute inset-0 z-10 bg-background"><VocabProgressSkeleton /></div>}
      <div
        className={`grid min-w-0 gap-4 transition-opacity duration-150 xl:grid-cols-[minmax(0,1fr)_360px] ${paintReady ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!paintReady}
      >
      <main className="min-w-0 space-y-4">
        <section className="rounded-2xl border border-primary/25 bg-linear-to-r from-primary/15 via-primary/5 to-card p-5 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="shrink-0 rounded-xl bg-primary p-3 text-primary-foreground shadow-sm">
                {data.dueReviewWords > 0 ? (
                  <RotateCcw className="h-5 w-5" />
                ) : (
                  <BookOpenCheck className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold">
                  {data.dueReviewWords > 0
                    ? t("vocab.progress.reviewToday")
                    : t("vocab.progress.noReview")}
                </h2>
                <p className="mt-1 text-sm text-foreground/80">
                  {data.dueReviewWords > 0
                    ? t("vocab.progress.dueSubtitle", { count: data.dueReviewWords })
                    : t("vocab.progress.cleanSubtitle")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.dueReviewWords > 0
                    ? t("vocab.progress.dueHelper")
                    : t("vocab.progress.cleanHelper")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTodayAction}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm"
            >
              {data.dueReviewWords > 0
                ? t("vocab.progress.startReview")
                : nextTopic
                  ? t("vocab.progress.continue")
                  : t("vocab.progress.explore")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <div>
              <h2 className="font-bold">{t("vocab.progress.activity")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("vocab.progress.activitySubtitle")}
              </p>
            </div>
          </div>
          <div className="no-scrollbar overflow-x-auto pb-2">
            <HeatMap
              value={heatMapValues}
              startDate={startDate}
              endDate={today}
              width={920}
              rectSize={13}
              space={3}
              weekLabels={["CN", "T2", "T3", "T4", "T5", "T6", "T7"]}
              monthLabels={[
                "Th1",
                "Th2",
                "Th3",
                "Th4",
                "Th5",
                "Th6",
                "Th7",
                "Th8",
                "Th9",
                "Th10",
                "Th11",
                "Th12",
              ]}
              panelColors={{
                0: "var(--muted)",
                2: "color-mix(in oklab, var(--primary) 28%, transparent)",
                5: "color-mix(in oklab, var(--primary) 50%, transparent)",
                9: "color-mix(in oklab, var(--primary) 75%, transparent)",
                15: "var(--primary)",
              }}
              rectRender={(props, item) => {
                const formattedDate = formatDate(item?.date, i18n.language);
                const content =
                  item?.content ||
                  (formattedDate
                    ? `${formattedDate}: ${item?.count ?? 0} ${t("vocab.common.words")}`
                    : t("vocab.progress.noActivity"));
                return (
                  <rect {...props}>
                    <title>{content}</title>
                  </rect>
                );
              }}
              style={
                {
                  color: "var(--muted-foreground)",
                  fontSize: 10,
                  "--rhm-rect-hover-stroke": "var(--primary)",
                } as React.CSSProperties
              }
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("vocab.progress.activityHint")}
          </p>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">{t("vocab.progress.learningTopics")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("vocab.progress.learningTopicsSubtitle")}
              </p>
            </div>
          </div>
          {data.topics.length ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {data.topics.map((topic) => {
                const status = progressStatus(topic);
                return (
                  <button
                    type="button"
                    key={topic.topicId}
                    onClick={() => navigate(`/vocab/topics/${topic.topicId}`)}
                    className="group flex min-h-28 w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left transition hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-1 font-semibold group-hover:text-primary">
                        {topic.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span
                          className={
                            status === "completed"
                              ? "font-semibold text-emerald-600"
                              : "font-semibold text-primary"
                          }
                        >
                          {t(`vocab.common.${status}`)}
                        </span>
                        {` · ${topic.learnedWords}/${topic.totalWords} ${t("vocab.common.words")}`}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {topic.dueReviewWords > 0
                          ? t("vocab.detail.dueWords", { count: topic.dueReviewWords })
                          : t("vocab.progress.noDue")}
                      </p>
                    </div>
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border bg-card py-10 text-center text-sm text-muted-foreground">
              {t("vocab.progress.noTopics")}
            </div>
          )}
        </section>
      </main>

      <aside className="min-w-0 space-y-4">
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="font-bold">{t("vocab.progress.overview")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <CompactStat value={data.totalLearnedWords} label={t("vocab.common.learned")} />
            <CompactStat value={data.totalMasteredWords} label={t("vocab.common.mastered")} />
            <CompactStat value={studiedToday} label={t("vocab.progress.today")} />
            <CompactStat value={data.dueReviewWords} label={t("vocab.progress.reviewDue")} />
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            <h2 className="font-bold">{t("vocab.progress.guide")}</h2>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            {t("vocab.progress.guideSubtitle")}
          </p>
          <div className="mt-3 space-y-1 text-sm">
            {[
              [t("vocab.progress.again"), t("vocab.progress.oneDay")],
              [t("vocab.progress.hard"), t("vocab.progress.threeDays")],
              [t("vocab.progress.medium"), t("vocab.progress.sevenDays")],
              [t("vocab.progress.easy"), t("vocab.progress.fourteenDays")],
              [t("vocab.common.mastered"), t("vocab.progress.removeSchedule")],
            ].map(([label, interval]) => (
              <div key={label} className="flex items-center justify-between gap-3 px-1 py-1.5">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{interval}</span>
              </div>
            ))}
          </div>
        </section>

      </aside>
      </div>
    </div>
  );
}

function CompactStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-muted/55 p-3">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
