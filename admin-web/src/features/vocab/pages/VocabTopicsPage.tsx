import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWebSocket } from "@/features/ws/providers/WebSockerProvider";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  createVocabTopic,
  deleteVocabTopic,
  fetchVocabTopics,
  generateSubTopics,
  fetchSubTopics,
  setActiveTopicId,
  updateSubtopicFromWs,
  onSubtopicsGenerated,
  updateVocabTopic,
} from "@/store/vocab/vocabSlice";
import { showNotification } from "@/store/system/notificationSlice";
import type { IVocabSubTopicReadyEvent, IVocabSubtopicsGeneratedEvent, IVocabTopic } from "@/types";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const statusColor: Record<IVocabTopic["status"], string> = {
  DRAFT: "bg-slate-500",
  GENERATING_SUBTOPICS: "bg-yellow-500",
  READY_FOR_WORD_GEN: "bg-blue-500",
  PROCESSING: "bg-orange-500",
  READY: "bg-green-600",
};

/** Statuses that should pulse/glow — indicating background work is happening */
const animatedStatuses: Set<IVocabTopic["status"]> = new Set([
  "GENERATING_SUBTOPICS",
  "PROCESSING",
]);

export default function VocabTopicsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const stompClient = useWebSocket();
  const { topics } = useAppSelector((s) => s.vocab.vocab);

  const [inline, setInline] = useState({ title: "", tags: "", cefrRange: "B1-B2", estimatedWordCount: 400 });
  const [inlineRunning, setInlineRunning] = useState(false);
  const [loadingGenIds, setLoadingGenIds] = useState<Set<string>>(new Set());

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<IVocabTopic | null>(null);
  const [editData, setEditData] = useState({ title: "", tags: "", cefrRange: "", description: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm dialog
  const [deleteConfirm, setDeleteConfirm] = useState<IVocabTopic | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleInlineSubmit = async () => {
    if (!inline.title.trim()) return;
    setInlineRunning(true);
    const tagsArr = inline.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const res = await dispatch(createVocabTopic({
      title: inline.title, description: "",
      tags: tagsArr, cefrRange: inline.cefrRange, estimatedWordCount: inline.estimatedWordCount,
    }));
    if (!createVocabTopic.fulfilled.match(res)) {
      dispatch(showNotification({ message: "Tạo topic thất bại", variant: "error" }));
      setInlineRunning(false); return;
    }
    dispatch(showNotification({ message: `Topic "${res.payload.title}" đã tạo! Đang gen sub-topics...`, variant: "info" }));
    dispatch(generateSubTopics(res.payload.id));
    setInline({ title: "", tags: "", cefrRange: "B1-B2", estimatedWordCount: 400 });
    setInlineRunning(false);
  };

  useEffect(() => {
    if (topics.status === "idle") dispatch(fetchVocabTopics());
  }, [dispatch]);

  // WS: subtopic word processing complete
  useEffect(() => {
    if (!stompClient?.connected) return;
    const sub = stompClient.subscribe("/topic/vocab/subtopic-ready", (msg) => {
      const event: IVocabSubTopicReadyEvent = JSON.parse(msg.body);
      dispatch(updateSubtopicFromWs(event));
      dispatch(showNotification({
        message: `Sub-topic "${event.subtopicTitle}" READY${event.topicReady ? ` — Topic "${event.topicTitle}" hoàn thành!` : ""}`,
        variant: event.topicReady ? "success" : "info",
      }));
    });
    return () => sub.unsubscribe();
  }, [stompClient?.connected]);

  // WS: subtopics generation done
  useEffect(() => {
    if (!stompClient?.connected) return;
    const sub = stompClient.subscribe("/topic/vocab/subtopics-generated", (msg) => {
      const event: IVocabSubtopicsGeneratedEvent = JSON.parse(msg.body);
      dispatch(onSubtopicsGenerated(event));
      dispatch(showNotification({ message: `Sub-topics đã gen xong cho "${event.topicTitle}" (${event.subtopicCount} sub-topics)`, variant: "success" }));
      dispatch(fetchSubTopics(event.topicId));
    });
    return () => sub.unsubscribe();
  }, [stompClient?.connected]);

  const handleGenSubtopics = (topicId: string) => {
    setLoadingGenIds((prev) => new Set([...prev, topicId]));
    dispatch(showNotification({ message: "Bắt đầu gen sub-topics...", variant: "info" }));
    dispatch(generateSubTopics(topicId)).finally(() => {
      setLoadingGenIds((prev) => { const s = new Set(prev); s.delete(topicId); return s; });
    });
  };

  const handleViewSubtopics = (topicId: string) => {
    dispatch(setActiveTopicId(topicId));
    dispatch(fetchSubTopics(topicId));
    navigate(`/vocab/topics/${topicId}/subtopics`);
  };

  // ─── Edit Dialog Handlers ─────────────────────────────────────────────────
  const handleOpenEdit = (topic: IVocabTopic) => {
    setEditingTopic(topic);
    setEditData({
      title: topic.title,
      tags: topic.tags?.join(", ") || "",
      cefrRange: topic.cefrRange || "B1-B2",
      description: topic.description || "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTopic || !editData.title.trim()) return;
    setEditSaving(true);
    const tagsArr = editData.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const body: Record<string, unknown> = {
      title: editData.title.trim(),
      description: editData.description.trim() || null,
      tags: tagsArr,
      cefrRange: editData.cefrRange,
    };
    if (editingTopic.thumbnailUrl) body.thumbnailUrl = editingTopic.thumbnailUrl;

    const res = await dispatch(updateVocabTopic({ topicId: editingTopic.id, body }));
    if (updateVocabTopic.fulfilled.match(res)) {
      dispatch(showNotification({ message: `Đã cập nhật topic "${editData.title}"`, variant: "success" }));
      setEditOpen(false);
    } else {
      dispatch(showNotification({ message: "Cập nhật thất bại", variant: "error" }));
    }
    setEditSaving(false);
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingTopic) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
      const resp = await fetch(`${baseUrl}/language-processing/internal/upload/image?public_id=vocab_topic_${editingTopic.id}`, {
        method: "POST",
        body: formData,
        headers: { "X-Worker-Key": "dev-key" },
      });
      if (!resp.ok) throw new Error("Upload failed");
      const data = await resp.json();
      const url = data.url || data.result?.url;
      if (url) {
        setEditingTopic({ ...editingTopic, thumbnailUrl: url });
        dispatch(showNotification({ message: "Upload ảnh thành công", variant: "success" }));
        const tagsArr = editData.tags.split(",").map((t) => t.trim()).filter(Boolean);
        await dispatch(updateVocabTopic({
          topicId: editingTopic.id,
          body: { thumbnailUrl: url, title: editData.title.trim(), description: editData.description.trim() || null, tags: tagsArr, cefrRange: editData.cefrRange },
        }));
      }
    } catch {
      dispatch(showNotification({ message: "Upload ảnh thất bại", variant: "error" }));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Delete Handler ───────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    const res = await dispatch(deleteVocabTopic(deleteConfirm.id));
    if (deleteVocabTopic.fulfilled.match(res)) {
      dispatch(showNotification({ message: `Đã xóa topic "${deleteConfirm.title}"`, variant: "success" }));
    } else {
      dispatch(showNotification({ message: "Xóa thất bại", variant: "error" }));
    }
    setDeleting(false);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-3 p-4">
      {/* Compact flow guide — now inline with heading */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen size={18} />
          <h1 className="text-lg font-bold">Vocab Topics</h1>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
          <span className="flex items-center gap-1"><span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">1</span>Tạo</span>
          <ChevronRight size={10} />
          <span className="flex items-center gap-1"><span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">2</span>Gen Sub</span>
          <ChevronRight size={10} />
          <span className="flex items-center gap-1"><span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">3</span>Gen Words</span>
          <ChevronRight size={10} />
          <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle2 size={12} />Done</span>
        </div>
      </div>

      {/* Inline create form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Wand2 size={15} /> Tạo Topic mới & Gen Sub-topics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-52">
              <Label className="text-xs">Tên topic (VD: Office Vocabulary, Travel, TOEIC Part 5)</Label>
              <Input
                className="mt-1"
                placeholder="Nhập tên chủ đề..."
                value={inline.title}
                disabled={inlineRunning}
                onChange={(e) => setInline({ ...inline, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleInlineSubmit()}
              />
            </div>
            <div className="w-52">
              <Label className="text-xs">Tags (VD: TOEIC, B1, Office)</Label>
              <Input
                className="mt-1"
                placeholder="TOEIC, B1"
                value={inline.tags}
                disabled={inlineRunning}
                onChange={(e) => setInline({ ...inline, tags: e.target.value })}
              />
            </div>
            <div className="w-28">
              <Label className="text-xs">CEFR</Label>
              <Input
                className="mt-1"
                placeholder="B1-B2"
                value={inline.cefrRange}
                disabled={inlineRunning}
                onChange={(e) => setInline({ ...inline, cefrRange: e.target.value })}
              />
            </div>
            <div className="w-28">
              <Label className="text-xs">Số từ ước tính</Label>
              <Input
                className="mt-1"
                type="number"
                min={20}
                max={2000}
                step={10}
                placeholder="400"
                value={inline.estimatedWordCount}
                disabled={inlineRunning}
                onChange={(e) => setInline({ ...inline, estimatedWordCount: Number(e.target.value) || 400 })}
              />
            </div>
            <Button onClick={handleInlineSubmit} disabled={inlineRunning || !inline.title.trim()}>
              {inlineRunning
                ? <><Loader2 size={14} className="animate-spin mr-1" />Đang chạy...</>
                : <><Wand2 size={14} className="mr-1" />Tạo & Gen</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {topics.status === "loading" && <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tiêu đề</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>CEFR</TableHead>
            <TableHead>Sub-topics</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {topics.data.map((topic: IVocabTopic) => {
            const hasSubtopics = topic.subtopicCount > 0;
            const isAnimating = animatedStatuses.has(topic.status);

            return (
              <TableRow key={topic.id}>
                <TableCell>
                  <div className="font-medium">{topic.title}</div>
                  {topic.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{topic.description}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {topic.tags?.map((tag: string) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{topic.cefrRange}</TableCell>
                <TableCell className="text-sm">
                  {hasSubtopics
                    ? <span>{topic.readySubtopicCount}/{topic.subtopicCount}</span>
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`text-white text-xs ${statusColor[topic.status]} ${isAnimating ? "animate-pulse" : ""} inline-flex items-center gap-1`}
                  >
                    {isAnimating && <Loader2 size={10} className="animate-spin" />}
                    {topic.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {topic.status === "DRAFT" && topic.subtopicCount === 0 && (
                    <Button size="sm" variant="outline"
                      disabled={loadingGenIds.size > 0}
                      onClick={() => handleGenSubtopics(topic.id)}>
                      {loadingGenIds.has(topic.id)
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Sparkles size={14} />}
                      <span className="ml-1">{loadingGenIds.has(topic.id) ? "Đang gen..." : "Gen Sub-topics"}</span>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleOpenEdit(topic)}>
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant={hasSubtopics ? "outline" : "default"}
                    disabled={!hasSubtopics}
                    onClick={() => handleViewSubtopics(topic.id)}
                    title={hasSubtopics ? `Xem ${topic.subtopicCount} sub-topics` : "Chưa có sub-topics"}
                  >
                    <ChevronRight size={14} /><span className="ml-1">Sub-topics</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirm(topic)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* ─── Edit Topic Dialog ─────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={(v) => { if (!v) setEditOpen(false); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Sửa Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Tên topic</Label>
              <Input
                className="mt-1"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input
                className="mt-1"
                placeholder="AI sẽ tự gen description khi gen sub-topics..."
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tags</Label>
                <Input
                  className="mt-1"
                  placeholder="TOEIC, B1"
                  value={editData.tags}
                  onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">CEFR Range</Label>
                <Input
                  className="mt-1"
                  placeholder="B1-B2"
                  value={editData.cefrRange}
                  onChange={(e) => setEditData({ ...editData, cefrRange: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Ảnh đại diện (Thumbnail)</Label>
              <div className="flex items-center gap-3 mt-1">
                {editingTopic?.thumbnailUrl ? (
                  <img src={editingTopic.thumbnailUrl} alt="thumbnail" className="w-20 h-14 object-cover rounded border" />
                ) : (
                  <div className="w-20 h-14 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">No img</div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailUpload}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingImage
                      ? <><Loader2 size={14} className="animate-spin mr-1" />Đang upload...</>
                      : <><Upload size={14} className="mr-1" />Upload ảnh</>}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Hủy</Button>
            <Button onClick={handleSaveEdit} disabled={editSaving || !editData.title.trim()}>
              {editSaving ? <><Loader2 size={14} className="animate-spin mr-1" />Đang lưu...</> : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa topic <strong>"{deleteConfirm?.title}"</strong>?
              {deleteConfirm && deleteConfirm.subtopicCount > 0 && (
                <span className="block mt-1 text-destructive">
                  Tất cả {deleteConfirm.subtopicCount} sub-topics và từ vựng liên quan sẽ bị xóa vĩnh viễn.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleting}>Hủy</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? <><Loader2 size={14} className="animate-spin mr-1" />Đang xóa...</> : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
