import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";

export type CreateTopicForm = {
  title: string;
  tags: string;
  cefrRange: string;
  estimatedWordCount: number;
};

interface Props {
  open: boolean;
  value: CreateTopicForm;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: CreateTopicForm) => void;
  onSubmit: () => void;
}

export default function CreateVocabTopicDialog({
  open,
  value,
  loading,
  onOpenChange,
  onChange,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus size={18} />
            Tạo topic mới
          </DialogTitle>
          <DialogDescription>
            Nhập thông tin cơ bản. Sau khi tạo, hệ thống sẽ tự generate sub-topics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
          <div>
            <Label className="text-xs">Tên topic</Label>
            <Input
              className="mt-1"
              placeholder="VD: Daily Activities"
              value={value.title}
              disabled={loading}
              onChange={(e) => onChange({ ...value, title: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
          </div>

          <div>
            <Label className="text-xs">Tags</Label>
            <Input
              className="mt-1"
              placeholder="A1, Daily Life, Beginner"
              value={value.tags}
              disabled={loading}
              onChange={(e) => onChange({ ...value, tags: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">CEFR</Label>
              <Input
                className="mt-1"
                placeholder="B1-B2"
                value={value.cefrRange}
                disabled={loading}
                onChange={(e) => onChange({ ...value, cefrRange: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-xs">Số từ ước tính</Label>
              <Input
                className="mt-1"
                type="number"
                min={20}
                max={2000}
                step={10}
                value={value.estimatedWordCount}
                disabled={loading}
                onChange={(e) =>
                  onChange({
                    ...value,
                    estimatedWordCount: Number(e.target.value) || 400,
                  })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Hủy
          </Button>

          <Button onClick={onSubmit} disabled={loading || !value.title.trim()}>
            {loading ? (
              <>
                <Loader2 size={14} className="mr-1 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Plus size={14} className="mr-1" />
                Tạo topic
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}