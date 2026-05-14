import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IVocabTopic } from "@/types";
import { ImagePlus, Loader2, Pencil, X } from "lucide-react";
import { useMemo, useState, type RefObject } from "react";

export type EditTopicForm = {
  title: string;
  tags: string;
  cefrRange: string;
  description: string;
};

interface Props {
  open: boolean;
  topic: IVocabTopic | null;
  value: EditTopicForm;
  tagOptions: string[];
  saving: boolean;
  uploadingImage: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onOpenChange: (open: boolean) => void;
  onChange: (value: EditTopicForm) => void;
  onSave: () => void;
  onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function EditVocabTopicDialog({
  open,
  topic,
  value,
  tagOptions,
  saving,
  uploadingImage,
  fileInputRef,
  onOpenChange,
  onChange,
  onSave,
  onUploadImage,
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

  // Detect if any field actually changed vs the original topic
  const hasChanges = useMemo(() => {
    if (!topic) return false;
    const originalTags = (topic.tags ?? []).join(", ");
    return (
      value.title.trim() !== (topic.title ?? "").trim() ||
      value.description.trim() !== (topic.description ?? "").trim() ||
      value.tags.trim() !== originalTags.trim() ||
      value.cefrRange.trim() !== (topic.cefrRange ?? "").trim()
    );
  }, [topic, value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil size={18} />
            Sửa topic
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          <div className="rounded-lg border bg-muted/20 p-5">
            <div>
              <Label className="text-xs">Tên topic</Label>
              <Input
                className="mt-1"
                value={value.title}
                onChange={(e) => onChange({ ...value, title: e.target.value })}
              />
            </div>

            <div className="mt-3">
              <Label className="text-xs">Description</Label>
              <Input
                className="mt-1"
                placeholder="Mô tả ngắn cho topic..."
                value={value.description}
                onChange={(e) => onChange({ ...value, description: e.target.value })}
              />
            </div>

            <div className="mt-3">
              <Label className="text-xs">Tags</Label>
              <Input
                className="mt-1"
                placeholder="TOEIC, B1"
                value={value.tags}
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

            <div className="mt-3">
              <Label className="text-xs">CEFR Range</Label>
              <Input
                className="mt-1"
                placeholder="B1-B2"
                value={value.cefrRange}
                onChange={(e) => onChange({ ...value, cefrRange: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Ảnh đại diện</Label>

            <div className="mt-2 flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
              {topic?.thumbnailUrl ? (
                <img
                  src={topic.thumbnailUrl}
                  alt="thumbnail"
                  className="h-16 w-24 rounded-md border object-cover"
                />
              ) : (
                <div className="flex h-16 w-24 items-center justify-center rounded-md border bg-background text-xs text-muted-foreground">
                  No image
                </div>
              )}

              <div className="min-w-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onUploadImage}
                />

                <Button
                  size="sm"
                  variant="outline"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 size={14} className="mr-1 animate-spin" />
                      Đang upload...
                    </>
                  ) : (
                    <>
                      <ImagePlus size={14} className="mr-1" />
                      Chọn ảnh
                    </>
                  )}
                </Button>

                <p className="mt-1 text-xs text-muted-foreground">
                  Ảnh dùng để hiển thị topic trong danh sách.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>

          <Button onClick={onSave} disabled={saving || !value.title.trim() || !hasChanges}>
            {saving ? (
              <>
                <Loader2 size={14} className="mr-1 animate-spin" />
                Đang lưu...
              </>
            ) : (
              "Lưu thay đổi"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
