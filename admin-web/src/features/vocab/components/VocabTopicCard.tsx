import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { IVocabTopic } from "@/types";
import { BookMarked, Loader2, Trash2 } from "lucide-react";
import VocabActionButton from "./VocabActionButton";

interface VocabTopicCardProps {
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

export default function VocabTopicCard({
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
}: VocabTopicCardProps) {
  const hasSubtopics = topic.subtopicCount > 0;
  const isTopicActive = topic.isActive ?? topic.active ?? false;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative h-28 bg-muted">
        {topic.thumbnailUrl ? (
          <img
            src={topic.thumbnailUrl}
            alt={topic.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookMarked size={32} className="text-muted-foreground" />
          </div>
        )}

        <div className="absolute left-3 top-3">
          <Badge className={`px-2.5 py-1 text-sm font-semibold text-white ${statusColor[topic.status]}`}>
            {isRunning && <Loader2 size={12} className="mr-1 animate-spin" />}
            {statusLabel[topic.status] ?? topic.status}
          </Badge>
        </div>
      </div>

      <CardContent className="space-y-3 p-4">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold" title={topic.title}>
            {topic.title}
          </div>

          {topic.description ? (
            <div
              className="mt-1 line-clamp-2 min-h-[36px] text-xs leading-relaxed text-muted-foreground"
              title={topic.description}
            >
              {topic.description}
            </div>
          ) : (
            <div className="mt-1 min-h-[36px] text-xs text-muted-foreground">
              No description
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {topic.tags?.map((tag: string) => (
            <Badge key={tag} variant="outline" className="px-1.5 py-0 text-[11px]">
              {tag}
            </Badge>
          ))}

          {(!topic.tags || topic.tags.length === 0) && (
            <span className="text-xs text-muted-foreground">No tags</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-muted/60 px-2 py-2">
            <div className="text-muted-foreground">CEFR</div>
            <div className="mt-0.5 font-medium">{topic.cefrRange || "—"}</div>
          </div>

          <div className="rounded-md bg-muted/60 px-2 py-2">
            <div className="text-muted-foreground">Sub</div>
            <div className="mt-0.5 font-medium">
              {hasSubtopics ? `${topic.readySubtopicCount}/${topic.subtopicCount}` : "—"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {topic.status === "DRAFT" && topic.subtopicCount === 0 && (
            <VocabActionButton
              label="Generate"
              loading={isGenerating}
              loadingLabel="Generating"
              tone="magic"
              disabled={isBusyGeneratingAny}
              onClick={() => onGenerate(topic.id)}
              title={isGenerating ? "Generating sub-topics" : "Generate sub-topics"}
            />
          )}

          <VocabActionButton
            label="Open"
            variant={hasSubtopics ? "default" : "outline"}
            disabled={!hasSubtopics}
            onClick={() => onOpen(topic.id)}
            title={hasSubtopics ? "Open sub-topics" : "No sub-topics yet"}
          />

          <VocabActionButton
            label={isTopicActive ? "Active" : "Inactive"}
            loading={isToggling}
            loadingLabel="Saving"
            tone={isTopicActive ? "active" : "inactive"}
            onClick={() => onToggle(topic)}
            disabled={isToggling}
            title={isTopicActive ? "Topic is active" : "Topic is inactive"}
          />

          <VocabActionButton
            label="Edit"
            variant="ghost"
            onClick={() => onEdit(topic)}
            title="Edit topic"
          />

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(topic)}
            title="Delete topic"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
