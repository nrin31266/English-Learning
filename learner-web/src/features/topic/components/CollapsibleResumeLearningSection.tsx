import handleAPI from "@/apis/handleAPI";
import { Button } from "@/components/ui/button";
import type { IResumeLearningResponse, IResumeLessonDto } from "@/types";
import { ChevronDown, ChevronUp, Loader2, Play, PlayCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import ResumeLessonItem from "@/features/topic/components/ResumeLessonItem";

const PAGE_SIZE = 10;

export default function CollapsibleResumeLearningSection({
  data,
  onContinueLesson,
}: {
  data: IResumeLearningResponse;
  onContinueLesson: (lesson: IResumeLessonDto) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [lessons, setLessons] = useState(data.recentLessons);
  const [hasMore, setHasMore] = useState(data.hasMore);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const result = await handleAPI<IResumeLearningResponse>({
        endpoint: "/learning-contents/lessons/resume",
        method: "GET",
        isAuth: true,
        params: { page: nextPage, size: PAGE_SIZE },
      });
      setLessons((current) => [...current, ...result.recentLessons]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch {
      // Keep the expanded list usable if a later page temporarily fails.
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, page]);

  if (!lessons.length) return null;

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-3 px-3 py-2.5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PlayCircle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold">{t("resume.continueLearning")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("topics.inProgressCount", { count: data.totalInProgress })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" className="h-8 gap-1.5" onClick={() => onContinueLesson(lessons[0])}>
            <Play className="h-3.5 w-3.5" /> {t("resume.continueLearning")}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => setExpanded((value) => !value)}>
            {expanded ? t("topics.hideResume") : t("topics.viewResume")}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-muted/10 p-2.5">
          <div className="grid gap-2 lg:grid-cols-2">
            {lessons.map((lesson) => (
              <ResumeLessonItem key={`${lesson.id}-${lesson.mode}`} lesson={lesson} onContinue={onContinueLesson} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full px-4 text-xs" onClick={handleLoadMore} disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {loading ? t("resume.loading") : t("resume.loadMore")}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
