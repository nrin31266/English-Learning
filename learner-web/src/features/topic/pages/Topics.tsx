// src/pages/Topics.tsx

import { useAppDispatch, useAppSelector } from "@/store"
import { fetchTopics } from "@/store/topicsSlide"
import type {
  ITopicSummaryResponse,
  IHomeLessonResponse,
  IHomeTopicResponse,
  IResumeLessonDto,
} from "@/types"
import { Loader2, Library, RefreshCw } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import TopicSection from "../components/TopicSection"
import LessonModeDialog from "../components/LessonModeDialog"
import TopicFilterPanel from "../components/TopicFilterPanel"
import ResumeLearningSection from "@/features/home/components/ResumeLearningSection"

const Topics = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const homeState = useAppSelector((state) => state.topics.topics)
  const { data, status } = homeState

  const [selectedLesson, setSelectedLesson] = useState<IHomeLessonResponse | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<IHomeTopicResponse | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    dispatch(fetchTopics({ limitLessonsPerTopic: 4, limitTopics: 10 }))
  }, [dispatch])

  const allTopics: ITopicSummaryResponse[] = data?.allTopics ?? []
  const homeTopics: IHomeTopicResponse[] = data?.topics ?? []
  const resumeLearning = data?.resumeLearning

  const topicsWithLessons = useMemo(
    () => homeTopics.filter((t) => t.lessons && t.lessons.length > 0),
    [homeTopics]
  )

  const handleLessonClick = (lesson: IHomeLessonResponse, topic: IHomeTopicResponse) => {
    setSelectedLesson(lesson)
    setSelectedTopic(topic)
    setDialogOpen(true)
  }

  const handleNavigate = (mode: "listening" | "shadowing" | "dictation") => {
    if (!selectedLesson) return
    const base = `/learn/lessons/${selectedLesson.id}/${selectedLesson.slug}`
    const url = mode === "listening" ? base : `${base}/${mode}`
    navigate(url)
    setDialogOpen(false)
  }

  const handleContinueResumeLesson = (lesson: IResumeLessonDto) => {
    const mode = lesson.mode?.toLowerCase() || "shadowing"
    const base = `/learn/lessons/${lesson.id}/${lesson.slug}`
    const url = mode === "shadowing" || mode === "dictation"
      ? `${base}/${mode}`
      : base
    navigate(url)
  }

  const isLoading = status === "loading" || status === "idle"

  return (
    <div className="mx-auto w-full flex flex-col gap-12 px-4 py-10 lg:px-8">
      
      {/* --- HEADER --- */}
      <header className="flex flex-col gap-4 border-b pb-8">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Library className="h-6 w-6 text-primary" />
            Playlists
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse playlists and pick up where you left off.
          </p>
        </div>
        
        <div className="mt-2">
           {isLoading ? (
             <div className="flex h-16 items-center justify-center rounded-xl border border-dashed">
               <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
             </div>
           ) : (
             <TopicFilterPanel topics={allTopics} />
           )}
        </div>
      </header>

      {/* --- RESUME LEARNING --- */}
      {!isLoading && resumeLearning && resumeLearning.recentLessons?.length > 0 && (
        <ResumeLearningSection
          data={resumeLearning}
          onContinueLesson={handleContinueResumeLesson}
        />
      )}

      {/* --- PLAYLISTS --- */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            Recently Updated
          </h2>
          <p className="text-sm text-muted-foreground">
            New lessons added across playlists.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mb-2" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : topicsWithLessons.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
            No playlists available.
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {topicsWithLessons.map((topic) => (
              <TopicSection
                key={topic.id}
                topic={topic}
                onLessonClick={handleLessonClick}
                totalLessons={allTopics.find(t => t.slug === topic.slug)?.totalLessons || 0}
              />
            ))}
          </div>
        )}
      </section>

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
