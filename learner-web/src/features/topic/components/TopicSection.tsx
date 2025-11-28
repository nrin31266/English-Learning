// src/pages/Topics.tsx

import type {
  ILHomeLessonResponse,
  ILHomeTopicResponse
} from "@/types"
import { Link } from "react-router-dom"
import LessonCard from "./LessonCard"

type TopicSectionProps = {
  topic: ILHomeTopicResponse
  active: boolean
  onLessonClick: (lesson: ILHomeLessonResponse, topic: ILHomeTopicResponse) => void
  totalLessons: number
}

const TopicSection = ({ topic, active, onLessonClick , totalLessons}: TopicSectionProps) => {
  const hasLessons = topic.lessons && topic.lessons.length > 0
  if (!hasLessons) return null

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div className={`
            ${active ? "text-primary" : "text-muted-foreground"}
          `}>
          <Link
            to={`/topics/${topic.slug}`}
            className={[
              "text-base font-semibold underline",
             ,
            ].join(" ")}
          >
           # {topic.name}
           
          </Link>
          <span className="text-[14px] text-muted-foreground">
            / {topic.slug}
          </span>
          
        </div>
        <span className="text-[14px] text-muted-foreground">
          {totalLessons} lesson{totalLessons > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {topic.lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            onClick={() => onLessonClick(lesson, topic)}
          />
        ))}
      </div>
    </div>
  )
}
export default TopicSection