import { Button } from "@/components/ui/button";
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
import { ImagePlus, Loader2, Pencil } from "lucide-react";
import type { RefObject } from "react";

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
  saving,
  uploadingImage,
  fileInputRef,
  onOpenChange,
  onChange,
  onSave,
  onUploadImage,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil size={18} />
            Sửa topic
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-4">
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

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tags</Label>
                <Input
                  className="mt-1"
                  placeholder="TOEIC, B1"
                  value={value.tags}
                  onChange={(e) => onChange({ ...value, tags: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs">CEFR Range</Label>
                <Input
                  className="mt-1"
                  placeholder="B1-B2"
                  value={value.cefrRange}
                  onChange={(e) => onChange({ ...value, cefrRange: e.target.value })}
                />
              </div>
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

          <Button onClick={onSave} disabled={saving || !value.title.trim()}>
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