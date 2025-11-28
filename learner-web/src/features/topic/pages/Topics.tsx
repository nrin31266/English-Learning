// src/pages/Topics.tsx

import { ScrollArea } from "@/components/ui/scroll-area"
import { useAppDispatch, useAppSelector } from "@/store"
import { fetchTopics } from "@/store/topicsSlide"
import type {
  IActiveTopicMinimalResponse,
  ILHomeLessonResponse,
  ILHomeTopicResponse,
} from "@/types"
import {
  BookOpen,
  Headphones,
  Loader2
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import TopicSection from "../components/TopicSection"
import LessonModeDialog from "../components/LessonModeDialog"


// ===== Main Page =====

const Topics = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const homeState = useAppSelector((state) => state.topics.topics)
  const { data, status } = homeState

  const [activeTopicSlug, setActiveTopicSlug] = useState<string | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<ILHomeLessonResponse | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<ILHomeTopicResponse | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    dispatch(fetchTopics({ limitLessonsPerTopic: 4, limitTopics: 10 }))
  }, [dispatch])

  const allTopics: IActiveTopicMinimalResponse[] = data?.allTopics ?? []
  const homeTopics: ILHomeTopicResponse[] = data?.topics ?? []

  // Chỉ giữ topic có lesson
  const topicsWithLessons = useMemo(
    () => homeTopics.filter((t) => t.lessons && t.lessons.length > 0),
    [homeTopics]
  )

  // Nếu chưa chọn topic nào → mặc định topic đầu tiên (có lesson)
  useEffect(() => {
    if (!activeTopicSlug && topicsWithLessons.length > 0) {
      setActiveTopicSlug(topicsWithLessons[0].slug)
    }
  }, [topicsWithLessons, activeTopicSlug])

  const handleLessonClick = (lesson: ILHomeLessonResponse, topic: ILHomeTopicResponse) => {
    setSelectedLesson(lesson)
    setSelectedTopic(topic)
    setDialogOpen(true)
  }

  const handleNavigate = (mode: "listening" | "shadowing" | "dictation") => {
    if (!selectedLesson) return

    const base = `/learn/lessons/${selectedLesson.slug}` // chỉnh route nếu bạn muốn
    let url = base

    if (mode === "shadowing") {
      url = `${base}/shadowing`
    } else if (mode === "dictation") {
      url = `${base}/dictation`
    }

    navigate(url)
    setDialogOpen(false)
  }

  const isLoading = status === "loading" || status === "idle"

  return (
    <div className="flex flex-col gap-10 px-4 py-8">
      {/* SECTION 1: ALL TOPICS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <BookOpen className="h-5 w-5 text-primary" />
            Topics
          </h2>
          <p className="text-xs text-muted-foreground">
            {allTopics.length} topic{allTopics.length !== 1 && "s"}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading topics...
          </div>
        ) : allTopics.length === 0 ? (
          <div className="py-4 text-sm text-muted-foreground">
            No topics available yet.
          </div>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 py-2">
              {allTopics.map((topic) => {
                const active = topic.slug === activeTopicSlug
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => {
                      setActiveTopicSlug(topic.slug)
                      // Điều hướng sang trang topic nếu bạn có
                      navigate(`/topics/${topic.slug}`)
                    }}
                    className={[
                      "flex hover:cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-all",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background hover:bg-muted",
                    ].join(" ")}
                  >
                    <span className="text-base font-semibold ">#</span>
                    <span className="font-medium underline">{topic.name}</span>
                    <span className="text-[14px] text-muted-foreground">
                      {topic.totalLessons || 0} lesson{topic.totalLessons !== 1 && "s"}
                    </span>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </section>

      {/* SECTION 2: TOPICS + LESSONS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Headphones className="h-5 w-5 text-primary" />
            Lessons by topic
          </h2>
          <p className="text-xs text-muted-foreground">
            Up to 4 latest lessons per topic
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading lessons...
          </div>
        ) : topicsWithLessons.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No lessons available yet.
          </div>
        ) : (
          <div className="space-y-6">
            {topicsWithLessons.map((topic) => (
              <TopicSection
                key={topic.id}
                topic={topic}
                active={topic.slug === activeTopicSlug}
                onLessonClick={handleLessonClick}
                totalLessons={data.allTopics.find(t => t.slug === topic.slug)?.totalLessons || 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* DIALOG chọn chế độ lesson */}
      <LessonModeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lesson={selectedLesson}
        topic={selectedTopic}
        onNavigate={handleNavigate}
      />
    </div>
  )
}

export default Topics

// ===== Child components =====



