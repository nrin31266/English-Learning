import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

export type CreateTopicForm = {
  title: string;
  tags: string;
  cefrRange: string;
  estimatedWordCount: number;
};

interface Props {
  open: boolean;
  value: CreateTopicForm;
  tagOptions: string[];
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: CreateTopicForm) => void;
  onSubmit: () => void;
}

export default function CreateVocabTopicDialog({
  open,
  value,
  tagOptions,
  loading,
  onOpenChange,
  onChange,
  onSubmit,
}: Props) {
  const [tagSearch, setTagSearch] = useState("");

  const filteredTags = useMemo(
    () =>
      tagOptions
        .filter((t) => t.toLowerCase().includes(tagSearch.toLowerCase()))
        .slice(0, 20),
    [tagOptions, tagSearch]
  );

  const addTagToInput = (tag: string) => {
    const current = value.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (current.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    onChange({ ...value, tags: [...current, tag].join(", ") });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus size={18} />
            Tạo topic mới
          </DialogTitle>
          <DialogDescription>
            Nhập thông tin cơ bản. Sau khi tạo, hệ thống sẽ tự generate sub-topics.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto rounded-lg border bg-muted/20 p-5">
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

            {/* Selected tags as removable chips */}
            {(() => {
              const currentTags = value.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
              return currentTags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {currentTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        const next = currentTags.filter((t) => t.toLowerCase() !== tag.toLowerCase());
                        onChange({ ...value, tags: next.join(", ") });
                      }}
                    >
                      {tag}
                      <X size={10} className="ml-1" />
                    </Badge>
                  ))}
                </div>
              ) : null;
            })()}

            {/* Tag picker – visually separated from form */}
            <div className="mt-3 rounded-md border border-dashed bg-background p-2">
              <Input
                className="h-7 border-0 bg-transparent px-1 text-xs shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
                placeholder="Tìm tag để thêm..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
              />
              <div className="mt-1.5 flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                {filteredTags.length === 0 ? (
                  <span className="px-1 text-[11px] text-muted-foreground/60">
                    Không tìm thấy tag
                  </span>
                ) : (
                  filteredTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer text-xs hover:bg-primary hover:text-primary-foreground"
                      onClick={() => addTagToInput(tag)}
                    >
                      + {tag}
                    </Badge>
                  ))
                )}
              </div>
            </div>
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
