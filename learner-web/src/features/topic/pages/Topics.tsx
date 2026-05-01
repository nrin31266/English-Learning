// src/pages/Topics.tsx

import { useAppDispatch, useAppSelector } from "@/store"
import { fetchTopics } from "@/store/topicsSlide"
import type {
  ITopicSummaryResponse,
  IHomeLessonResponse,
  IHomeTopicResponse,
} from "@/types"
import { Compass, Loader2, Sparkles } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import TopicSection from "../components/TopicSection"
import LessonModeDialog from "../components/LessonModeDialog"
import TopicFilterPanel from "../components/TopicFilterPanel"

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

  const isLoading = status === "loading" || status === "idle"

  return (
    <div className="mx-auto w-full flex flex-col gap-16 px-4 py-12 lg:px-8">
      
      {/* --- HERO HEADER --- */}
      <header className="flex flex-col gap-4 border-b pb-10">
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-3 text-4xl font-black tracking-tight text-foreground">
            <Compass className="h-9 w-9 text-primary" />
            Learning Paths
          </h1>
          <p className="max-w-2xl text-[16px] font-medium leading-relaxed text-muted-foreground">
            Master English skills through curated collections. Explore specialized 
            topics and start your practice journey with our latest lessons.
          </p>
        </div>
        
        {/* Local Search Component */}
        <div className="mt-4">
           {isLoading ? (
             <div className="flex h-20 items-center justify-center rounded-xl border border-dashed">
               <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
             </div>
           ) : (
             <TopicFilterPanel topics={allTopics} />
           )}
        </div>
      </header>

      {/* --- CURATED LESSONS SECTION --- */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-1.5">
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Sparkles className="h-6 w-6 text-amber-500" />
            Recently Updated
          </h2>
          <p className="text-[14px] font-medium text-muted-foreground">
            Freshly added lessons across your favorite categories.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mb-3" />
            <span className="text-sm font-semibold">Assembling your universe...</span>
          </div>
        ) : topicsWithLessons.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-sm font-medium text-muted-foreground">
            No lessons available at the moment.
          </div>
        ) : (
          <div className="flex flex-col gap-12">
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