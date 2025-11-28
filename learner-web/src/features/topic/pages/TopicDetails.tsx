// src/pages/TopicDetails.tsx

import { useEffect, useMemo, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store"
import { fetchTopicBySlug } from "@/store/topicSlide"

import type { ILHomeLessonResponse } from "@/types"
import { cefrLevelOptions } from "@/types"

import LessonCard from "../components/LessonCard"
import LessonModeDialog from "../components/LessonModeDialog"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

import {
  ArrowLeft,
  Headphones,
  Loader2,
} from "lucide-react"

// ===================== Topic Details Page =====================

const TopicDetails = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const topicState = useAppSelector((state) => state.topic.topic)
  const { data: topic, status, error } = topicState

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<ILHomeLessonResponse | null>(null)

  // Filter theo CEFR level
  const [levelFilter, setLevelFilter] =
    useState<(typeof cefrLevelOptions)[number] | "all">("all")

  useEffect(() => {
    if (slug) {
      dispatch(fetchTopicBySlug(slug))
    }
  }, [dispatch, slug])

  const isLoading = status === "idle" || status === "loading"

  const filteredLessons = useMemo(() => {
    if (!topic) return []
    let lessons = topic.lessons || []
    if (levelFilter !== "all") {
      lessons = lessons.filter((l) => l.languageLevel === levelFilter)
    }
    return lessons
  }, [topic, levelFilter])

  const totalLessons = topic?.totalLessons ?? topic?.lessons.length ?? 0

  const handleLessonClick = (lesson: ILHomeLessonResponse) => {
    setSelectedLesson(lesson)
    setDialogOpen(true)
  }

  const handleNavigate = (mode: "listening" | "shadowing" | "dictation") => {
    if (!selectedLesson) return

    const base = `/learn/lessons/${selectedLesson.slug}`
    let url = base
    if (mode === "shadowing") url = `${base}/shadowing`
    if (mode === "dictation") url = `${base}/dictation`

    navigate(url)
    setDialogOpen(false)
  }

  // Nếu không có slug hoặc lỗi route
  if (!slug) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-muted-foreground">
          Topic slug không hợp lệ.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/topics")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại Topics
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-8">
      {/* Breadcrumb + Back */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                className="cursor-pointer"
                onClick={() => navigate("/topics")}
              >
                Topics
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {topic?.name ?? "Loading..."}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => navigate("/topics")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to topics
        </Button>
      </div>

      {/* Header Topic */}
      <section className="rounded-xl border bg-card p-4 shadow-sm lg:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold leading-tight tracking-tight">
                {topic?.name ?? "Topic"}
              </h1>
              {totalLessons > 0 && (
                <Badge variant="outline" className="text-xs">
                  {totalLessons} lesson{totalLessons !== 1 && "s"}
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              /{topic?.slug ?? slug}
              {topic?.updatedAt && (
                <>
                  {" · "}Last updated{" "}
                  {new Date(topic.updatedAt).toLocaleDateString()}
                </>
              )}
            </p>
          </div>

          {/* Nhỏ nhỏ hint nghe */}
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Headphones className="h-4 w-4 text-primary" />
            <span>
              Select a lesson to choose a practice mode (Listening / Shadowing / Dictation)
            </span>
          </div>
        </div>
      </section>

      {/* Body: Lessons */}
      {isLoading ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải dữ liệu topic...
        </div>
      ) : status === "failed" ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">
            Không thể tải topic.
          </p>
          {error?.message && (
            <p className="mt-1 text-xs text-destructive/80">
              {error.message}
            </p>
          )}
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => dispatch(fetchTopicBySlug(slug))}
          >
            Thử lại
          </Button>
        </div>
      ) : !topic ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          Topic không tồn tại hoặc đã bị xoá.
        </div>
      ) : (
        <section className="space-y-4">
          {/* Filter line */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Headphones className="h-5 w-5 text-primary" />
              Lessons in this topic
            </h2>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                Filter by level:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={levelFilter === "all" ? "default" : "outline"}
                  className="h-7 px-3 text-xs"
                  onClick={() => setLevelFilter("all")}
                >
                  All
                </Button>
                {cefrLevelOptions.map((lvl) => (
                  <Button
                    key={lvl}
                    size="sm"
                    variant={levelFilter === lvl ? "default" : "outline"}
                    className="h-7 px-3 text-xs"
                    onClick={() => setLevelFilter(lvl)}
                  >
                    {lvl}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {filteredLessons.length === 0 ? (
            <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              Hiện không có lesson nào với filter hiện tại.
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-220px)] pr-1">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 pb-4">
                {filteredLessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onClick={() => handleLessonClick(lesson)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </section>
      )}

      {/* Dialog chọn mode luyện */}
      <LessonModeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lesson={selectedLesson}
        topic={topic ?? null}
        onNavigate={handleNavigate}
      />
    </div>
  )
}

export default TopicDetails
