import type { IVocabTopic } from "@/types"
import { BookMarked } from "lucide-react"

interface Props {
  topic: IVocabTopic
  onOpen: (topic: IVocabTopic) => void
}

export default function VocabTopicCard({ topic, onOpen }: Props) {
  const subtopicCount = topic.readySubtopicCount ?? 0

  return (
    <button
      type="button"
      onClick={() => onOpen(topic)}
      className="group flex w-full flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      {/* Thumbnail - aspect-video like YouTube */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted/50">
        {topic.thumbnailUrl ? (
          <img
            src={topic.thumbnailUrl}
            alt={topic.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookMarked className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* CEFR badge - top right */}
        {topic.cefrRange && (
          <div className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            {topic.cefrRange}
          </div>
        )}

        {/* Subtopic count - bottom left */}
        <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {subtopicCount > 0 ? `${subtopicCount} topic${subtopicCount > 1 ? "s" : ""}` : "No topics"}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {topic.title}
        </h3>

        {topic.description && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {topic.description}
          </p>
        )}

        {/* Tags - muted style */}
        {topic.tags && topic.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {topic.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}
