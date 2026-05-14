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

  return (
    <div className="h-fit min-w-0 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-base font-semibold" title={displayWord}>
              {displayWord}
            </span>

            <Badge variant="outline" className="shrink-0 text-xs">
              {entry.pos}
            </Badge>

            {entry.wordReady ? (
              <Badge variant="secondary" className="shrink-0 text-[11px] text-emerald-700">
                <CheckCircle2 size={12} className="mr-1" />
                Ready
              </Badge>
            ) : (
              <Badge variant="secondary" className="shrink-0 text-[11px] text-amber-700">
                <Clock size={12} className="mr-1" />
                Pending
              </Badge>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">#{entry.order + 1}</span>
            {entry.wordDetail?.phonetics?.us && (
              <span className="text-xs text-muted-foreground">{entry.wordDetail.phonetics.us}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
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
          >
            <Pencil size={14} className="mr-1" />
            Context
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {hasContext && (
          <div className="space-y-1.5 rounded-lg border bg-sky-50/40 p-3">
            <div className="text-xs font-semibold text-foreground">Context</div>
            {entry.contextMeaningVi && <div className="text-sm font-medium">{entry.contextMeaningVi}</div>}
            {entry.contextDefinition && (
              <div className="text-xs leading-relaxed text-muted-foreground">{entry.contextDefinition}</div>
            )}
            {entry.contextExample && (
              <div className="text-sm italic leading-relaxed text-muted-foreground">“{entry.contextExample}”</div>
            )}
            {entry.contextViExample && (
              <div className="text-sm italic leading-relaxed text-muted-foreground">“{entry.contextViExample}”</div>
            )}
            {entry.contextLevel && (
              <Badge variant="secondary" className="text-[11px]">
                {entry.contextLevel}
              </Badge>
            )}
          </div>
        )}

        {entry.wordDetail && (
          <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
            <div className="text-xs font-semibold text-foreground">Dictionary</div>
            <div className="flex flex-wrap items-center gap-2">
              {entry.wordDetail.cefrLevel && (
                <Badge variant="secondary" className="text-[11px]">
                  {entry.wordDetail.cefrLevel}
                </Badge>
              )}

              {entry.wordDetail.summaryVi && (
                <span className="text-sm font-medium">{entry.wordDetail.summaryVi}</span>
              )}
            </div>

            {!hasContext && entry.wordDetail.definitions?.[0] && (
              <>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  {entry.wordDetail.definitions[0].definition}
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  {entry.wordDetail.definitions[0].meaningVi}
                </div>
                {entry.wordDetail.definitions[0].example && (
                  <div className="text-sm italic leading-relaxed text-muted-foreground">
                    “{entry.wordDetail.definitions[0].example}”
                  </div>
                )}
                {entry.wordDetail.definitions[0].viExample && (
                  <div className="text-sm italic leading-relaxed text-muted-foreground">
                    “{entry.wordDetail.definitions[0].viExample}”
                  </div>
                )}
              </>
            )}
          </div>
        )}

        
      </div>
    </div>
  );
}
