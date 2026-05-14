import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { IWordDefinition, IVocabWordEntry } from "@/types";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

interface VocabWordContextDialogProps {
  open: boolean;
  entry: IVocabWordEntry | null;
  isGenerating: boolean;
  onOpenChange: (open: boolean) => void;
  onPickDefinition: (entryId: string, def: IWordDefinition) => void;
  onGenerateMeaning: (entryId: string) => void;
}

function getWordDisplay(entry: IVocabWordEntry) {
  return entry.wordText || entry.wordKey.replace(/_/g, " ");
}

export default function VocabWordContextDialog({
  open,
  entry,
  isGenerating,
  onOpenChange,
  onPickDefinition,
  onGenerateMeaning,
}: VocabWordContextDialogProps) {
  const defs = entry?.wordDetail?.definitions ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        {!entry ? null : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="truncate">Context for {getWordDisplay(entry)}</span>
                <Badge variant="outline">{entry.pos}</Badge>
              </DialogTitle>
              <DialogDescription>
                Pick one definition below or generate a new contextual meaning with AI.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {defs.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    Candidate meanings ({defs.length})
                  </h4>

                  {defs.map((def, idx) => (
                    <div
                      key={idx}
                      className="space-y-2 rounded-lg border bg-card p-3 shadow-sm"
                    >
                      <div className="space-y-1">
                        {def.meaningVi && <div className="text-sm font-semibold">{def.meaningVi}</div>}
                        <div className="text-xs leading-relaxed text-muted-foreground">
                          {def.definition}
                        </div>
                        {def.example && (
                          <div className="text-xs italic text-muted-foreground">
                            “{def.example}”
                          </div>
                        )}
                        {def.viExample && (
                          <div className="text-xs italic text-muted-foreground">
                            “{def.viExample}”
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {def.level ? (
                          <Badge variant="secondary" className="text-[11px]">
                            {def.level}
                          </Badge>
                        ) : (
                          <span />
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onPickDefinition(entry.id, def)}
                        >
                          <CheckCircle2 size={14} className="mr-1" />
                          Use
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {defs.length === 0 && (
                <div className="rounded-md border bg-muted/30 p-3 text-center text-sm text-muted-foreground">
                  No dictionary meanings found for this word.
                </div>
              )}

              <div className="border-t pt-4">
                <Button
                  size="sm"
                  className="w-full"
                  disabled={isGenerating}
                  onClick={() => onGenerateMeaning(entry.id)}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={14} className="mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="mr-1" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
