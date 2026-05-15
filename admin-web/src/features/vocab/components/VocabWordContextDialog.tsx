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

function normalizeText(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/["'“”‘’`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isCurrentContextDefinition(entry: IVocabWordEntry, def: IWordDefinition): boolean {
  const hasCurrentContext = !!(entry.contextDefinition || entry.contextMeaningVi || entry.contextExample || entry.contextViExample);
  if (!hasCurrentContext) return false;

  const sameDefinition = normalizeText(def.definition) !== "" &&
    normalizeText(def.definition) === normalizeText(entry.contextDefinition);
  const sameMeaning = normalizeText(def.meaningVi) !== "" &&
    normalizeText(def.meaningVi) === normalizeText(entry.contextMeaningVi);
  const sameExample = normalizeText(def.example) !== "" &&
    normalizeText(def.example) === normalizeText(entry.contextExample);
  const sameViExample = normalizeText(def.viExample) !== "" &&
    normalizeText(def.viExample) === normalizeText(entry.contextViExample);

  // Ưu tiên match chặt để tránh trùng nghĩa nhưng khác ngữ cảnh.
  if (sameDefinition && sameMeaning) return true;
  if (sameDefinition && (sameExample || sameViExample)) return true;
  if (sameMeaning && sameExample && sameViExample) return true;
  return false;
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
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-border/60">
        {!entry ? null : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[22px] font-semibold">
                <span className="truncate">{getWordDisplay(entry)}</span>
                <Badge variant="outline" className="px-2 py-0.5 text-sm">{entry.pos}</Badge>
              </DialogTitle>
              <DialogDescription className="text-[15px]">
                Pick a definition or generate new meaning with AI.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {defs.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-base font-semibold text-muted-foreground">
                    Candidate meanings ({defs.length})
                  </h4>

                  {defs.map((def, idx) => {
                    const isCurrent = isCurrentContextDefinition(entry, def);
                    return (
                    <div
                      key={idx}
                      className={`space-y-2 rounded-xl border p-4 ${
                        isCurrent
                          ? "border-emerald-200 bg-emerald-50/35"
                          : "border-border/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {def.meaningVi ? (
                          <div className="text-[19px] font-semibold leading-snug">{def.meaningVi}</div>
                        ) : (
                          <div />
                        )}
                        {def.level ? (
                          <Badge variant="outline" className="shrink-0 px-2 py-0.5 text-sm">{def.level}</Badge>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <div className="text-base leading-relaxed text-foreground/90">
                          {def.definition}
                        </div>
                        {def.example && (
                          <div className="text-sm italic text-muted-foreground">
                            "{def.example}"
                          </div>
                        )}
                        {def.viExample && (
                          <div className="text-sm italic text-muted-foreground">
                            "{def.viExample}"
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {isCurrent ? (
                          <Badge className="bg-emerald-600 px-2 py-0.5 text-sm text-white">In use</Badge>
                        ) : (
                          <span />
                        )}
                        {!isCurrent && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 text-sm"
                            onClick={() => onPickDefinition(entry.id, def)}
                          >
                            <CheckCircle2 size={15} className="mr-1" />
                            Use
                          </Button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              {defs.length === 0 && (
                <div className="rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                  No dictionary meanings found.
                </div>
              )}

              <div className="border-t pt-4">
                <Button
                  size="sm"
                  className="h-9 w-full bg-violet-600 text-white hover:bg-violet-700"
                  disabled={isGenerating}
                  onClick={() => onGenerateMeaning(entry.id)}
                >
                  {isGenerating ? (
                    <><Loader2 size={14} className="mr-1 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles size={14} className="mr-1" /> Generate with AI</>
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
