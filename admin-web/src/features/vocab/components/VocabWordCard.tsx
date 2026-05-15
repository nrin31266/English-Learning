import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IVocabWordEntry } from "@/types";
import { CheckCircle2, Clock, Loader2, Pencil, Volume2 } from "lucide-react";

interface VocabWordCardProps {
  entry: IVocabWordEntry;
  displayWord: string;
  isPlaying: boolean;
  audioAvailable: boolean;
  onPlayAudio: () => void;
  onOpenContext: () => void;
}

export default function VocabWordCard({
  entry,
  displayWord,
  isPlaying,
  audioAvailable,
  onPlayAudio,
  onOpenContext,
}: VocabWordCardProps) {
  const hasContext =
    entry.contextDefinition ||
    entry.contextMeaningVi ||
    entry.contextExample ||
    entry.contextViExample;
  const contextPrimary = entry.contextMeaningVi || entry.contextDefinition || "Chưa có ngữ cảnh";
  const dictPrimary =
    entry.wordDetail?.summaryVi ||
    entry.wordDetail?.definitions?.[0]?.meaningVi ||
    entry.wordDetail?.definitions?.[0]?.definition ||
    "Chưa có dữ liệu từ điển";

  return (
    <div className="h-full min-w-0 rounded-lg border border-border/60 bg-card p-3 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-start gap-1.5">
            <h3
              className="min-w-0 flex-1 text-[17px] font-semibold leading-snug break-all"
              title={displayWord}
            >
              {displayWord}
            </h3>
            <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[11px]">
              {entry.pos}
            </Badge>
            {entry.wordReady ? (
              <Badge variant="secondary" className="shrink-0 bg-emerald-50 px-1.5 py-0 text-[11px] text-emerald-700">
                <CheckCircle2 size={11} className="mr-1" />
                Ready
              </Badge>
            ) : (
              <Badge variant="secondary" className="shrink-0 bg-amber-50 px-1.5 py-0 text-[11px] text-amber-700">
                <Clock size={11} className="mr-1" />
                Pending
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">#{entry.order + 1}</span>
            {entry.wordDetail?.phonetics?.us && (
              <span className="text-xs text-muted-foreground">{entry.wordDetail.phonetics.us}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 shrink-0"
            disabled={!audioAvailable || isPlaying}
            onClick={onPlayAudio}
            title={audioAvailable ? "Play US audio" : "No US audio"}
          >
            {isPlaying ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onOpenContext}
            disabled={!entry.wordReady}
            title="Context"
            className="h-8 gap-1.5 px-2.5"
          >
            <Pencil size={13} className="mr-1" />
            Context
          </Button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div
          className={`rounded-md border p-2 ${
            hasContext ? "border-sky-100 bg-sky-50/25" : "border-border/60 bg-muted/15"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <span>Context</span>
            {entry.contextLevel && (
              <Badge variant="outline" className="px-1.5 py-0 text-[11px]">
                {entry.contextLevel}
              </Badge>
            )}
          </div>
          <div className="mt-1 min-h-[42px] text-sm font-medium leading-relaxed text-foreground/90 line-clamp-2">
            {contextPrimary}
          </div>
        </div>

        <div className="rounded-md border border-border/60 bg-muted/15 p-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <span>Dictionary</span>
            {entry.wordDetail?.cefrLevel && (
              <Badge variant="outline" className="px-1.5 py-0 text-[11px]">
                {entry.wordDetail.cefrLevel}
              </Badge>
            )}
          </div>
          <div className="mt-1 min-h-[42px] text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
            {dictPrimary}
          </div>
        </div>
      </div>
    </div>
  );
}
