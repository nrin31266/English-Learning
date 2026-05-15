import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { IVocabTopic } from "@/types";
import { BookMarked, Layers, Loader2 } from "lucide-react";

interface VocabTopicListCardProps {
  topic: IVocabTopic;
  statusColor: Record<IVocabTopic["status"], string>;
  statusLabel: Record<IVocabTopic["status"], string>;
  isRunning: boolean;
  isGenerating: boolean;
  isToggling: boolean;
  isBusyGeneratingAny: boolean;
  onGenerate: (topicId: string) => void;
  onOpen: (topicId: string) => void;
  onToggle: (topic: IVocabTopic) => void;
  onEdit: (topic: IVocabTopic) => void;
  onDelete: (topic: IVocabTopic) => void;
}

export default function VocabTopicListCard({
  topic,
  statusColor,
  statusLabel,
  isRunning,
  isGenerating,
  isToggling,
  isBusyGeneratingAny,
  onGenerate,
  onOpen,
  onToggle,
  onEdit,
  onDelete,
}: VocabTopicListCardProps) {
  const hasSubtopics = topic.subtopicCount > 0;
  const isTopicActive = topic.isActive ?? topic.active ?? false;
  const tags = topic.tags?.slice(0, 6) ?? [];

  return (
    <Card className="overflow-hidden border-border/60 transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          <div className="relative h-36 w-full shrink-0 overflow-hidden bg-muted/40 lg:h-auto lg:w-60">
            {topic.thumbnailUrl ? (
              <img
                src={topic.thumbnailUrl}
                alt={topic.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BookMarked size={34} className="text-muted-foreground/40" />
              </div>
            )}

            <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />

            <div className="absolute left-2 top-2">
              <Badge className={`px-2.5 py-1 text-sm font-semibold text-white ${statusColor[topic.status]}`}>
                {isRunning && <Loader2 size={12} className="mr-1 animate-spin" />}
                {statusLabel[topic.status] ?? topic.status}
              </Badge>
            </div>

            {topic.cefrRange && (
              <Badge
                variant="secondary"
                className="absolute right-2 top-2 border border-white/20 bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm"
              >
                {topic.cefrRange}
              </Badge>
            )}

            <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <Layers size={12} />
              <span>
                {hasSubtopics ? `${topic.readySubtopicCount}/${topic.subtopicCount}` : "No subtopics"}
              </span>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
            <div className="min-w-0">
              <h3 className="truncate text-[17px] font-semibold">{topic.title}</h3>
              {topic.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{topic.description}</p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No description</p>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="px-2 py-0.5 text-xs">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No tags</span>
              )}
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-2">
              {topic.status === "DRAFT" && topic.subtopicCount === 0 && (
                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-violet-600 text-white hover:bg-violet-700"
                  disabled={isBusyGeneratingAny}
                  onClick={() => onGenerate(topic.id)}
                >
                  {isGenerating && <Loader2 size={14} className="animate-spin" />}
                  {isGenerating ? "Generating" : "Generate"}
                </Button>
              )}

              <Button
                size="sm"
                variant={hasSubtopics ? "default" : "outline"}
                disabled={!hasSubtopics}
                onClick={() => onOpen(topic.id)}
                className="h-8"
              >
                Open
              </Button>

              <Button
                size="sm"
                onClick={() => onToggle(topic)}
                disabled={isToggling}
                className={`h-8 gap-1.5 ${
                  isTopicActive
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                {isToggling && <Loader2 size={14} className="animate-spin" />}
                {isToggling ? "Saving" : isTopicActive ? "Active" : "Inactive"}
              </Button>

              <Button size="sm" variant="ghost" className="h-8" onClick={() => onEdit(topic)}>
                Edit
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(topic)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
