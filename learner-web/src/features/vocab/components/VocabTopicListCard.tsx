import type { IVocabTopic } from "@/types"
import { BookMarked, ChevronRight, Layers } from "lucide-react"

interface Props {
  topic: IVocabTopic
  onOpen: (topic: IVocabTopic) => void
}

export default function VocabTopicListCard({ topic, onOpen }: Props) {
  const subtopicCount = topic.readySubtopicCount ?? 0
  const tags = topic.tags?.slice(0, 4) ?? []

  return (
    <button
      type="button"
      onClick={() => onOpen(topic)}
      className="group flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-muted/40 sm:h-24 sm:w-40">
        {topic.thumbnailUrl ? (
          <img
            src={topic.thumbnailUrl}
            alt={topic.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookMarked className="h-7 w-7 text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/45 via-black/5 to-transparent" />

        {topic.cefrRange && (
          <span className="absolute right-1.5 top-1.5 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
            {topic.cefrRange}
          </span>
        )}

        <div className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          <Layers className="h-3 w-3 text-white/90" />
          <span>{subtopicCount}</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {topic.title}
          </h3>
        </div>

        {topic.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {topic.description}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-3">
          {tags.length > 0 ? (
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-muted/70 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/70">No tags</span>
          )}

          <span className="text-xs font-medium text-muted-foreground">
            {subtopicCount} subtopic{subtopicCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <ChevronRight className="h-4.5 w-4.5" />
      </span>
    </button>
  )
}
