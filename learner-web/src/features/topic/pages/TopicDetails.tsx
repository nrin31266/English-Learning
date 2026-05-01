// src/pages/TopicDetails.tsx

import { useEffect, useMemo, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store"
import { fetchTopicBySlug } from "@/store/topicSlide"

import type { IHomeLessonResponse } from "@/types"
import { cefrLevelOptions } from "@/types"

import LessonCard from "../components/LessonCard"
import LessonModeDialog from "../components/LessonModeDialog"

import { 
  ArrowLeft, 
  Loader2, 
  Library, 
  Calendar,
  Filter,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"

const TopicDetails = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const topicState = useAppSelector((state) => state.topic.topic)
  const { data: topic, status } = topicState

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<IHomeLessonResponse | null>(null)
  const [levelFilter, setLevelFilter] = useState<(typeof cefrLevelOptions)[number] | "all">("all")

  useEffect(() => {
    if (slug) dispatch(fetchTopicBySlug(slug))
  }, [dispatch, slug])

  const filteredLessons = useMemo(() => {
    if (!topic) return []
    const lessons = topic.lessons || []
    if (levelFilter === "all") return lessons
    return lessons.filter((l) => l.languageLevel === levelFilter)
  }, [topic, levelFilter])

  const handleLessonClick = (lesson: IHomeLessonResponse) => {
    setSelectedLesson(lesson)
    setDialogOpen(true)
  }

  const handleNavigate = (mode: "listening" | "shadowing" | "dictation") => {
    if (!selectedLesson) return
    const base = `/learn/lessons/${selectedLesson.id}/${selectedLesson.slug}`
    const url = mode === "listening" ? base : `${base}/${mode}`
    navigate(url)
    setDialogOpen(false)
  }

  const isLoading = status === "loading" || status === "idle"

  return (
    <div className="mx-auto w-full  flex flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      
      {/* --- HEADER --- */}
      <header className="flex flex-col gap-4">
        <button 
          onClick={() => navigate("/topics")}
          className="group flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-all hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
          Back to Topics
        </button>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-primary" />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {topic?.name || "Loading..."}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {/* Lessons Count - NHẸ HƠN */}
            <div className="flex items-center gap-1.5">
              <Library className="h-4 w-4 text-primary/70" />
              <span className="font-medium">
                {topic?.totalLessons || 0} lessons
              </span>
            </div>
            
            {topic?.updatedAt && (
              <>
                <span className="text-border">•</span>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-xs">
                    Updated {new Date(topic.updatedAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
              </>
            )}

            {/* Thêm badge nếu có nhiều bài */}
            {(topic?.totalLessons || 0) >= 10 && (
              <>
                <span className="text-border">•</span>
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    Popular
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* --- FILTER BAR --- */}
      <div className="flex flex-col gap-3 border-t border-border/30 pt-6">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Filter by level
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setLevelFilter("all")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              levelFilter === "all" 
                ? "bg-foreground text-background" 
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            All
          </button>
          {cefrLevelOptions.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                levelFilter === lvl 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* --- LESSONS GRID --- */}
      <main className="min-h-[40vh] mt-2">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed bg-muted/10">
            <Library className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium text-muted-foreground/60">No lessons found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-16">
            {filteredLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onClick={() => handleLessonClick(lesson)}
              />
            ))}
          </div>
        )}
      </main>

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