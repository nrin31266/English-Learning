import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWebSocket } from "@/features/ws/providers/WebSockerProvider";
import { useAppDispatch, useAppSelector } from "@/store";
import { showNotification } from "@/store/system/notificationSlice";
import {
  createVocabTopic,
  deleteVocabTopic,
  fetchSubTopics,
  fetchVocabTopics,
  generateSubTopics,
  onSubtopicsGenerated,
  setActiveTopicId,
  updateSubtopicFromWs,
  updateVocabTopic,
} from "@/store/vocab/vocabSlice";
import type {
  IVocabSubTopicReadyEvent,
  IVocabSubtopicsGeneratedEvent,
  IVocabTopic,
} from "@/types";
import {
  BookMarked,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CreateVocabTopicDialog, {
  type CreateTopicForm,
} from "../components/CreateVocabTopicDialog";
import DeleteVocabTopicDialog from "../components/DeleteVocabTopicDialog";
import EditVocabTopicDialog, {
  type EditTopicForm,
} from "../components/EditVocabTopicDialog";

const statusColor: Record<IVocabTopic["status"], string> = {
  DRAFT: "bg-slate-500",
  GENERATING_SUBTOPICS: "bg-yellow-500",
  READY_FOR_WORD_GEN: "bg-blue-500",
  PROCESSING: "bg-orange-500",
  READY: "bg-green-600",
};

const statusLabel: Record<IVocabTopic["status"], string> = {
  DRAFT: "Draft",
  GENERATING_SUBTOPICS: "Generating",
  READY_FOR_WORD_GEN: "Ready for words",
  PROCESSING: "Processing",
  READY: "Ready",
};

const runningStatuses: Set<IVocabTopic["status"]> = new Set([
  "GENERATING_SUBTOPICS",
  "PROCESSING",
]);

const defaultCreateForm: CreateTopicForm = {
  title: "",
  tags: "",
  cefrRange: "B1-B2",
  estimatedWordCount: 400,
};

export default function VocabTopicsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const stompClient = useWebSocket();
  const { topics } = useAppSelector((s) => s.vocab.vocab);

  const [createOpen, setCreateOpen] = useState(false);
  const [createData, setCreateData] = useState<CreateTopicForm>(defaultCreateForm);
  const [creating, setCreating] = useState(false);

  const [loadingGenIds, setLoadingGenIds] = useState<Set<string>>(new Set());

  const [editOpen, setEditOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<IVocabTopic | null>(null);
  const [editData, setEditData] = useState<EditTopicForm>({
    title: "",
    tags: "",
    cefrRange: "",
    description: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<IVocabTopic | null>(null);
  const [deleting, setDeleting] = useState(false);

  const topicCount = topics.data.length;
  const readyCount = topics.data.filter((t: IVocabTopic) => t.status === "READY").length;
  const runningCount = topics.data.filter((t: IVocabTopic) =>
    runningStatuses.has(t.status)
  ).length;

  useEffect(() => {
    if (topics.status === "idle") dispatch(fetchVocabTopics());
  }, [dispatch, topics.status]);

  useEffect(() => {
    if (!stompClient?.connected) return;

    const sub = stompClient.subscribe("/topic/vocab/subtopic-ready", (msg) => {
      const event: IVocabSubTopicReadyEvent = JSON.parse(msg.body);

      dispatch(updateSubtopicFromWs(event));

      if (event.topicReady) {
        dispatch(
          showNotification({
            message: `Topic "${event.topicTitle}" hoàn thành! Tất cả sub-topics đã READY.`,
            variant: "success",
          })
        );
      }
    });

    return () => sub.unsubscribe();
  }, [stompClient?.connected, dispatch]);

  useEffect(() => {
    if (!stompClient?.connected) return;

    const sub = stompClient.subscribe("/topic/vocab/subtopics-generated", (msg) => {
      const event: IVocabSubtopicsGeneratedEvent = JSON.parse(msg.body);

      dispatch(onSubtopicsGenerated(event));
      dispatch(
        showNotification({
          message: `Sub-topics đã gen xong cho "${event.topicTitle}" (${event.subtopicCount} sub-topics)`,
          variant: "success",
        })
      );

      dispatch(fetchSubTopics(event.topicId));
    });

    return () => sub.unsubscribe();
  }, [stompClient?.connected, dispatch]);

  const handleCreateTopic = async () => {
    if (!createData.title.trim()) return;

    setCreating(true);

    const tagsArr = createData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const res = await dispatch(
      createVocabTopic({
        title: createData.title.trim(),
        description: "",
        tags: tagsArr,
        cefrRange: createData.cefrRange,
        estimatedWordCount: createData.estimatedWordCount,
      })
    );

    if (!createVocabTopic.fulfilled.match(res)) {
      dispatch(showNotification({ message: "Tạo topic thất bại", variant: "error" }));
      setCreating(false);
      return;
    }

    dispatch(
      showNotification({
        message: `Topic "${res.payload.title}" đã tạo! Đang gen sub-topics...`,
        variant: "info",
      })
    );

    dispatch(generateSubTopics(res.payload.id));

    setCreateData(defaultCreateForm);
    setCreateOpen(false);
    setCreating(false);
  };

  const handleGenSubtopics = (topicId: string) => {
    setLoadingGenIds((prev) => new Set([...prev, topicId]));

    dispatch(showNotification({ message: "Bắt đầu gen sub-topics...", variant: "info" }));

    dispatch(generateSubTopics(topicId)).finally(() => {
      setLoadingGenIds((prev) => {
        const s = new Set(prev);
        s.delete(topicId);
        return s;
      });
    });
  };

  const handleViewSubtopics = (topicId: string) => {
    dispatch(setActiveTopicId(topicId));
    dispatch(fetchSubTopics(topicId));
    navigate(`/vocab/topics/${topicId}/subtopics`);
  };

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

    const tagsArr = editData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const body: Record<string, unknown> = {
      title: editData.title.trim(),
      description: editData.description.trim() || null,
      tags: tagsArr,
      cefrRange: editData.cefrRange,
    };

    if (editingTopic.thumbnailUrl) body.thumbnailUrl = editingTopic.thumbnailUrl;

    const res = await dispatch(updateVocabTopic({ topicId: editingTopic.id, body }));

    if (updateVocabTopic.fulfilled.match(res)) {
      dispatch(
        showNotification({
          message: `Đã cập nhật topic "${editData.title}"`,
          variant: "success",
        })
      );
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

      const baseUrl = import.meta.env.VITE_GATEWAY_URL || "";
      const resp = await fetch(
        `${baseUrl}/dictionaries/vocab/topics/${editingTopic.id}/upload-image`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!resp.ok) throw new Error("Upload failed");

      const data = await resp.json();
      const url = data.result;

      if (url) {
        setEditingTopic({ ...editingTopic, thumbnailUrl: url });
        dispatch(showNotification({ message: "Upload ảnh thành công", variant: "success" }));

        const tagsArr = editData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

        await dispatch(
          updateVocabTopic({
            topicId: editingTopic.id,
            body: {
              thumbnailUrl: url,
              title: editData.title.trim(),
              description: editData.description.trim() || null,
              tags: tagsArr,
              cefrRange: editData.cefrRange,
            },
          })
        );
      }
    } catch {
      dispatch(showNotification({ message: "Upload ảnh thất bại", variant: "error" }));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);

    const res = await dispatch(deleteVocabTopic(deleteConfirm.id));

    if (deleteVocabTopic.fulfilled.match(res)) {
      dispatch(
        showNotification({
          message: `Đã xóa topic "${deleteConfirm.title}"`,
          variant: "success",
        })
      );
    } else {
      dispatch(showNotification({ message: "Xóa thất bại", variant: "error" }));
    }

    setDeleting(false);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-5 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BookMarked size={22} className="text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">Vocab Topics</h1>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Tạo topic, quản lý sub-topics và theo dõi tiến độ xử lý từ vựng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border bg-card px-3 py-2 text-sm">
            <span className="text-muted-foreground">Total </span>
            <span className="font-semibold">{topicCount}</span>
          </div>

          <div className="rounded-lg border bg-card px-3 py-2 text-sm">
            <span className="text-muted-foreground">Ready </span>
            <span className="font-semibold">{readyCount}</span>
          </div>

          <div className="rounded-lg border bg-card px-3 py-2 text-sm">
            <span className="text-muted-foreground">Running </span>
            <span className="font-semibold">{runningCount}</span>
          </div>

          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} className="mr-1" />
            New topic
          </Button>
        </div>
      </div>

      {topics.status === "loading" && (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {topics.status !== "loading" && topics.data.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookMarked size={34} className="text-muted-foreground" />
            <div className="mt-3 text-sm font-medium">Chưa có topic nào</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Tạo topic đầu tiên để bắt đầu generate sub-topics.
            </div>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus size={15} className="mr-1" />
              New topic
            </Button>
          </CardContent>
        </Card>
      )}

      {topics.data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topics.data.map((topic: IVocabTopic) => {
            const hasSubtopics = topic.subtopicCount > 0;
            const isRunning = runningStatuses.has(topic.status);
            const isGeneratingThis = loadingGenIds.has(topic.id);

            return (
              <Card key={topic.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <div className="relative h-28 bg-muted">
                  {topic.thumbnailUrl ? (
                    <img
                      src={topic.thumbnailUrl}
                      alt={topic.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <BookMarked size={32} className="text-muted-foreground" />
                    </div>
                  )}

                  <div className="absolute left-3 top-3">
                    <Badge className={`text-white text-[11px] ${statusColor[topic.status]}`}>
                      {isRunning && <Loader2 size={10} className="mr-1 animate-spin" />}
                      {statusLabel[topic.status] ?? topic.status}
                    </Badge>
                  </div>
                </div>

                <CardContent className="space-y-3 p-4">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold" title={topic.title}>
                      {topic.title}
                    </div>

                    {topic.description ? (
                      <div
                        className="mt-1 line-clamp-2 min-h-[36px] text-xs leading-relaxed text-muted-foreground"
                        title={topic.description}
                      >
                        {topic.description}
                      </div>
                    ) : (
                      <div className="mt-1 min-h-[36px] text-xs text-muted-foreground">
                        No description
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {topic.tags?.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="px-1.5 py-0 text-[11px]">
                        {tag}
                      </Badge>
                    ))}

                    {(topic.tags?.length || 0) > 3 && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">
                        +{topic.tags.length - 3}
                      </Badge>
                    )}

                    {(!topic.tags || topic.tags.length === 0) && (
                      <span className="text-xs text-muted-foreground">No tags</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-muted/60 px-2 py-2">
                      <div className="text-muted-foreground">CEFR</div>
                      <div className="mt-0.5 font-medium">{topic.cefrRange || "—"}</div>
                    </div>

                    <div className="rounded-md bg-muted/60 px-2 py-2">
                      <div className="text-muted-foreground">Sub</div>
                      <div className="mt-0.5 font-medium">
                        {hasSubtopics ? `${topic.readySubtopicCount}/${topic.subtopicCount}` : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1">
                      {topic.status === "DRAFT" && topic.subtopicCount === 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loadingGenIds.size > 0}
                          onClick={() => handleGenSubtopics(topic.id)}
                          title={isGeneratingThis ? "Đang gen sub-topics" : "Gen sub-topics"}
                        >
                          {isGeneratingThis ? (
                            <Loader2 size={14} className="mr-1 animate-spin" />
                          ) : (
                            <RefreshCcw size={14} className="mr-1" />
                          )}
                          Gen
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant={hasSubtopics ? "default" : "outline"}
                        disabled={!hasSubtopics}
                        onClick={() => handleViewSubtopics(topic.id)}
                        title={hasSubtopics ? "Xem sub-topics" : "Chưa có sub-topics"}
                      >
                        <Layers3 size={14} className="mr-1" />
                        Open
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(topic)}
                        title="Sửa topic"
                      >
                        <Pencil size={14} />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(topic)}
                        title="Xóa topic"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateVocabTopicDialog
        open={createOpen}
        value={createData}
        loading={creating}
        onOpenChange={setCreateOpen}
        onChange={setCreateData}
        onSubmit={handleCreateTopic}
      />

      <EditVocabTopicDialog
        open={editOpen}
        topic={editingTopic}
        value={editData}
        saving={editSaving}
        uploadingImage={uploadingImage}
        fileInputRef={fileInputRef}
        onOpenChange={(open) => {
          if (!open) setEditOpen(false);
        }}
        onChange={setEditData}
        onSave={handleSaveEdit}
        onUploadImage={handleThumbnailUpload}
      />

      <DeleteVocabTopicDialog
        topic={deleteConfirm}
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}