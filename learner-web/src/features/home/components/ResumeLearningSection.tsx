import { useState, useCallback } from "react"
import type { IResumeLearningResponse, IResumeLessonDto } from "@/types"
import ResumeLessonItem from "./ResumeLessonItem"
import handleAPI from "@/apis/handleAPI"
import { Button } from "@/components/ui/button"
import { ChevronDown, Loader2 } from "lucide-react"

type ResumeLearningSectionProps = {
  data: IResumeLearningResponse
  onContinueLesson: (lesson: IResumeLessonDto) => void
}

const PAGE_SIZE = 10

const ResumeLearningSection = ({ data, onContinueLesson }: ResumeLearningSectionProps) => {
  const [lessons, setLessons] = useState<IResumeLessonDto[]>(data.recentLessons)
  const [hasMore, setHasMore] = useState(data.hasMore)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const nextPage = page + 1
      const result = await handleAPI<IResumeLearningResponse>({
        endpoint: "/learning-contents/lessons/resume",
        method: "GET",
        isAuth: true,
        params: { page: nextPage, size: PAGE_SIZE },
      })
      setLessons((prev) => [...prev, ...result.recentLessons])
      setHasMore(result.hasMore)
      setPage(nextPage)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [page, hasMore, loading])

  if (!lessons.length) return null

  const formattedCount =
    data.totalInProgress < 10 ? `0${data.totalInProgress}` : data.totalInProgress

  return (
    <section className="flex flex-col gap-4">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-border/50 pb-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 shrink-0 rounded-full bg-amber-500" />
          <h2 className="text-base font-bold tracking-tight text-foreground">
            Continue Learning
          </h2>
        </div>
        <div className="flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5">
          <span className="font-mono text-[11px] font-bold text-amber-500">
            {formattedCount}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
            in progress
          </span>
        </div>
      </div>

      {/* Grid: 1 col on mobile, 2 cols on large screens */}
      <div className="grid gap-2 lg:grid-cols-2">
        {lessons.map((lesson) => (
          <ResumeLessonItem
            key={`${lesson.id}-${lesson.mode}`}
            lesson={lesson}
            onContinue={onContinueLesson}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full px-5 text-xs font-bold"
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {loading ? "Loading..." : "Xem thêm"}
          </Button>
        </div>
      )}
    </section>
  )
}

export default ResumeLearningSection
