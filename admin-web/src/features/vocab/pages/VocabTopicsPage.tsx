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
  toggleTopicActive,
  updateSubtopicFromWs,
  updateVocabTopic,
} from "@/store/vocab/vocabSlice";
import type {
  IVocabSubTopicReadyEvent,
  IVocabSubtopicsGeneratedEvent,
  IVocabTopic,
} from "@/types";
import { BookMarked, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CreateVocabTopicDialog, {
  type CreateTopicForm,
} from "../components/CreateVocabTopicDialog";
import DeleteVocabTopicDialog from "../components/DeleteVocabTopicDialog";
import EditVocabTopicDialog, {
  type EditTopicForm,
} from "../components/EditVocabTopicDialog";
import VocabTopicCard from "../components/VocabTopicCard";

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
  const [loadingToggleIds, setLoadingToggleIds] = useState<Set<string>>(new Set());

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

  const handleToggleTopic = async (topic: IVocabTopic) => {
    setLoadingToggleIds((prev) => new Set([...prev, topic.id]));

    const res = await dispatch(toggleTopicActive(topic.id));

    if (toggleTopicActive.fulfilled.match(res)) {
      const isActive = res.payload.isActive ?? res.payload.active ?? false;
      const next = isActive ? "hiển thị" : "ẩn";
      dispatch(
        showNotification({
          message: `Topic "${res.payload.title}" đã ${next}`,
          variant: "success",
        })
      );
    } else {
      dispatch(showNotification({ message: "Cập nhật active thất bại", variant: "error" }));
    }

    setLoadingToggleIds((prev) => {
      const next = new Set(prev);
      next.delete(topic.id);
      return next;
    });
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
          <Button className="h-8 px-3 text-xs" onClick={() => setCreateOpen(true)}>
            Create
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
            <Button className="mt-4 h-8 px-3 text-xs" onClick={() => setCreateOpen(true)}>
              Create
            </Button>
          </CardContent>
        </Card>
      )}

      {topics.data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topics.data.map((topic: IVocabTopic) => {
            const isRunning = runningStatuses.has(topic.status);
            const isGeneratingThis = loadingGenIds.has(topic.id);
            const isTogglingThis = loadingToggleIds.has(topic.id);

            return (
              <VocabTopicCard
                key={topic.id}
                topic={topic}
                statusColor={statusColor}
                statusLabel={statusLabel}
                isRunning={isRunning}
                isGenerating={isGeneratingThis}
                isToggling={isTogglingThis}
                isBusyGeneratingAny={loadingGenIds.size > 0}
                onGenerate={handleGenSubtopics}
                onOpen={handleViewSubtopics}
                onToggle={handleToggleTopic}
                onEdit={handleOpenEdit}
                onDelete={setDeleteConfirm}
              />
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
