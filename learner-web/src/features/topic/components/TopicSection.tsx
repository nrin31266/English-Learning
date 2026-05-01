// src/pages/components/TopicSection.tsx

import type { IHomeLessonResponse, IHomeTopicResponse } from "@/types"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"

import LessonCard from "./LessonCard"

type TopicSectionProps = {
  topic: IHomeTopicResponse
  onLessonClick: (lesson: IHomeLessonResponse, topic: IHomeTopicResponse) => void
  totalLessons: number
}

const TopicSection = ({
  topic,
  onLessonClick,
  totalLessons,
}: TopicSectionProps) => {
  if (!topic.lessons?.length) return null

  const formattedCount =
    totalLessons < 10 ? `0${totalLessons}` : totalLessons

  return (
    <section className="mb-12 flex flex-col gap-5">
      
      {/* ===== HEADER ===== */}
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-border/50 pb-4">
        
        {/* LEFT: Title */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-6 w-1 shrink-0 rounded-full bg-primary" />

          <Link
            to={`/topics/${topic.slug}`}
            className="min-w-0 flex-1"
          >
            <h2 className="truncate text-lg font-black tracking-tight text-foreground transition-colors hover:text-primary sm:text-xl">
              {topic.name}
            </h2>
          </Link>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2">
          
          {/* Lesson count */}
          <div className="hidden md:flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5">
            <span className="font-mono text-[11px] font-bold text-primary">
              {formattedCount}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
              lessons
            </span>
          </div>

          {/* Explore button */}
          <Link
            to={`/topics/${topic.slug}`}
            className="group flex h-7 items-center gap-1 rounded-full bg-foreground px-3 text-[11px] font-bold text-background transition-all hover:bg-foreground/90 active:scale-95 sm:h-8 sm:px-4 sm:text-[12px]"
          >
            <span>Explore</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* ===== LESSON GRID ===== */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {topic.lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            onClick={() => onLessonClick(lesson, topic)}
          />
        ))}
      </div>
    </section>
  )
}

export default TopicSection