import type { IVocabTopic } from "@/types"
import { BookMarked, Layers, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"

interface Props {
  topic: IVocabTopic
  onOpen: (topic: IVocabTopic) => void
  progress?: {
    learnedWords: number;
    totalWords: number;
    dueReviewWords: number;
    status: "IN_PROGRESS" | "COMPLETED";
    learningStatus?: "NOT_STARTED" | "LEARNING" | "LEARNED";
  }
}

const getProgressStatus = (progress: NonNullable<Props["progress"]>) => {
  if (progress.learningStatus === "NOT_STARTED" || progress.learnedWords === 0) return "notStarted";
  if (progress.learningStatus === "LEARNED" || progress.status === "COMPLETED") return "completed";
  return "learning";
};

const getProgressBadgeClass = (status: string) => {
  if (status === "completed")
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  if (status === "notStarted") return "bg-muted text-muted-foreground";
  return "bg-primary/10 text-primary";
};

export default function VocabTopicCard({ topic, onOpen, progress }: Props) {
  const { t } = useTranslation()
  const subtopicCount = topic.readySubtopicCount ?? 0
  const tags = topic.tags?.slice(0, 3) ?? []

  return (
    <button
      type="button"
      onClick={() => onOpen(topic)}
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      <div className="relative h-32 w-full overflow-hidden bg-muted/40">
        {topic.thumbnailUrl ? (
          <img
            src={topic.thumbnailUrl}
            alt={topic.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookMarked className="h-11 w-11 text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />

        {topic.cefrRange && (
          <span className="absolute right-2 top-2 rounded-md bg-black/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {topic.cefrRange}
          </span>
        )}

        <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Layers className="h-3.5 w-3.5 text-white/90" />
          <span>{subtopicCount > 0 ? t("vocab.catalog.subtopicCount", { count: subtopicCount }) : t("vocab.catalog.noSubtopics")}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {progress && (
          <div className="mb-2 flex items-center justify-between gap-3">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getProgressBadgeClass(getProgressStatus(progress))}`}
            >
              {t(`vocab.common.${getProgressStatus(progress)}`)}
            </span>
            <span className="text-xs font-semibold text-foreground/75">
              {progress.learnedWords}/{progress.totalWords} {t("vocab.common.words")}
            </span>
          </div>
        )}
        <h3 className="line-clamp-1 text-[17px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {topic.title}
        </h3>

        {topic.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {topic.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
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
            <span className="text-xs text-muted-foreground/70">{t("vocab.common.noTags")}</span>
          )}

          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <ChevronRight className="h-4.5 w-4.5" />
          </span>
        </div>
      </div>
    </button>
  )
}
