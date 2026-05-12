import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAppSelector } from "@/store";
import type { IVocabSubTopic, IVocabWordEntry } from "@/types";
import { CheckCircle2, Clock } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function VocabWordsDrawer({ open, onClose }: Props) {
  const { words, subtopics, activeSubtopicId } = useAppSelector((s) => s.vocab.vocab);
  const subtopic = subtopics.data.find((s: IVocabSubTopic) => s.id === activeSubtopicId);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{subtopic?.title ?? "Words"}</SheetTitle>
          <p className="text-sm text-muted-foreground">{subtopic?.titleVi}</p>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {words.data.map((entry: IVocabWordEntry) => (
            <div key={entry.id} className="border rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{entry.wordKey.replace(/_/g, " ")}</span>
                  <Badge variant="outline" className="text-xs">{entry.pos}</Badge>
                  {entry.wordReady
                    ? <CheckCircle2 size={14} className="text-green-500" />
                    : <Clock size={14} className="text-orange-400" />}
                </div>
                <span className="text-xs text-muted-foreground">#{entry.order + 1}</span>
              </div>

              {entry.wordDetail && (
                <div className="text-xs text-muted-foreground space-y-1 pl-1">
                  <div>{entry.wordDetail.summaryVi}</div>
                  {entry.wordDetail.definitions?.[0] && (
                    <div className="italic">"{entry.wordDetail.definitions[0].example}"</div>
                  )}
                  <Badge variant="secondary" className="text-xs">{entry.wordDetail.cefrLevel}</Badge>
                </div>
              )}
            </div>
          ))}

          {words.data.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Chưa có từ nào</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
