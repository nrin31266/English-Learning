import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { IVocabTopic } from "@/types";
import { Loader2, Trash2 } from "lucide-react";

interface Props {
  topic: IVocabTopic | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteVocabTopicDialog({
  topic,
  deleting,
  onOpenChange,
  onConfirm,
}: Props) {
  return (
    <Dialog open={!!topic} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 size={18} />
            Xác nhận xóa
          </DialogTitle>

          <DialogDescription>
            Bạn có chắc muốn xóa topic <strong>"{topic?.title}"</strong>?
            {topic && topic.subtopicCount > 0 && (
              <span className="mt-2 block rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                Tất cả {topic.subtopicCount} sub-topics và từ vựng liên quan sẽ bị xóa vĩnh viễn.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Hủy
          </Button>

          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? (
              <>
                <Loader2 size={14} className="mr-1 animate-spin" />
                Đang xóa...
              </>
            ) : (
              "Xóa"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}