import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWebSocket } from "@/features/ws/providers/WebSockerProvider";
import { useAppDispatch, useAppSelector } from "@/store";
import { showNotification } from "@/store/system/notificationSlice";
import {
  deleteSubTopic,
  fetchSubTopics,
  fetchVocabTopics,
  fetchWords,
  generateWords,
  setActiveSubtopicId,
  toggleTopicActive,
  toggleSubtopicActive,
  updateSubtopicFromWs,
  updateSubtopicProgress
} from "@/store/vocab/vocabSlice";
import type {
  IVocabSubTopic,
  IVocabSubTopicProgressEvent,
  IVocabSubTopicReadyEvent,
  IVocabTopic,
} from "@/types";
import {
  ArrowLeft,
  CheckCircle2,
  Layers3,
  Loader2,
  Trash2
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import VocabWordsDialog from "../components/VocabWordsDialog";
import VocabActionButton from "../components/VocabActionButton";

const subtopicStatusColor: Record<IVocabSubTopic["status"], string> = {
  PENDING_WORDS: "bg-slate-500",
  GENERATING_WORDS: "bg-yellow-500",
  PROCESSING_WORDS: "bg-orange-500",
  READY: "bg-green-600",
};

const subtopicStatusLabel: Record<IVocabSubTopic["status"], string> = {
  PENDING_WORDS: "Pending",
  GENERATING_WORDS: "Generating",
  PROCESSING_WORDS: "Processing",
  READY: "Ready",
};

/** Statuses that should pulse/glow while background work is in progress */
const animatedStatuses: Set<IVocabSubTopic["status"]> = new Set([
  "GENERATING_WORDS",
  "PROCESSING_WORDS",
]);

export default function VocabSubTopicsPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const dispatch = useAppDispatch();
  const stompClient = useWebSocket();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingSubIds, setLoadingSubIds] = useState<Set<string>>(new Set());
  const [loadingToggleSubIds, setLoadingToggleSubIds] = useState<Set<string>>(new Set());
  const [togglingTopicActive, setTogglingTopicActive] = useState(false);

  // Delete subtopic confirm
  const [deleteConfirm, setDeleteConfirm] = useState<IVocabSubTopic | null>(null);
  const [deletingSub, setDeletingSub] = useState(false);

  const { topics, subtopics } = useAppSelector((s) => s.vocab.vocab);
  const topic = topics.data.find((t: IVocabTopic) => t.id === topicId);
  const isTopicActive = topic ? (topic.isActive ?? topic.active ?? false) : false;

  const readySubtopics = topic?.readySubtopicCount ?? 0;
  const totalSubtopics = topic?.subtopicCount ?? subtopics.data.length;
  const topicProgress =
    totalSubtopics > 0 ? Math.round((readySubtopics / totalSubtopics) * 100) : 0;
  const topicCompleted =
    (topic?.status === "READY") ||
    (totalSubtopics > 0 && readySubtopics >= totalSubtopics);

  useEffect(() => {
    if (topics.status === "idle") dispatch(fetchVocabTopics());
  }, [dispatch, topics.status]);

  useEffect(() => {
    if (topicId) dispatch(fetchSubTopics(topicId));
  }, [topicId, dispatch]);

  // WS: subtopic word processing progress (live updates for every word-ready event)
  useEffect(() => {
    if (!stompClient?.connected) return;

    const sub = stompClient.subscribe("/topic/vocab/subtopic-progress", (msg) => {
      const event: IVocabSubTopicProgressEvent = JSON.parse(msg.body);
      dispatch(updateSubtopicProgress(event));
    });

    return () => sub.unsubscribe();
  }, [stompClient?.connected, dispatch]);

  // WS: subtopic ready (completion event, fires only on READY transition)
  useEffect(() => {
    if (!stompClient?.connected) return;

    const sub = stompClient.subscribe("/topic/vocab/subtopic-ready", (msg) => {
      const event: IVocabSubTopicReadyEvent = JSON.parse(msg.body);
      dispatch(updateSubtopicFromWs(event));
    });

    return () => sub.unsubscribe();
  }, [stompClient?.connected, dispatch]);

  const handleGenWords = (subtopicId: string) => {
    setLoadingSubIds((prev) => new Set([...prev, subtopicId]));

    dispatch(showNotification({ message: "Bắt đầu gen danh sách từ...", variant: "info" }));

    dispatch(generateWords(subtopicId)).finally(() => {
      setLoadingSubIds((prev) => {
        const s = new Set(prev);
        s.delete(subtopicId);
        return s;
      });
    });
  };

  const handleViewWords = (subtopicId: string) => {
    dispatch(setActiveSubtopicId(subtopicId));
    dispatch(fetchWords(subtopicId));
    setDialogOpen(true);
  };

  const handleDeleteSubTopic = async () => {
    if (!deleteConfirm) return;

    setDeletingSub(true);

    const res = await dispatch(deleteSubTopic(deleteConfirm.id));

    if (deleteSubTopic.fulfilled.match(res)) {
      dispatch(
        showNotification({
          message: `Đã xóa sub-topic "${deleteConfirm.title}"`,
          variant: "success",
        })
      );

      if (topicId) {
        dispatch(fetchSubTopics(topicId));
        dispatch(fetchVocabTopics());
      }
    } else {
      dispatch(showNotification({ message: "Xóa sub-topic thất bại", variant: "error" }));
    }

    setDeletingSub(false);
    setDeleteConfirm(null);
  };

  const handleToggleSubTopic = async (sub: IVocabSubTopic) => {
    setLoadingToggleSubIds((prev) => new Set([...prev, sub.id]));

    const res = await dispatch(toggleSubtopicActive(sub.id));

    if (toggleSubtopicActive.fulfilled.match(res)) {
      const isActive = res.payload.isActive ?? res.payload.active ?? false;
      const next = isActive ? "hiển thị" : "ẩn";
      dispatch(
        showNotification({
          message: `Sub-topic "${res.payload.title}" đã ${next}`,
          variant: "success",
        })
      );
    } else {
      dispatch(showNotification({ message: "Cập nhật active thất bại", variant: "error" }));
    }

    setLoadingToggleSubIds((prev) => {
      const next = new Set(prev);
      next.delete(sub.id);
      return next;
    });
  };

  const handleToggleTopicActive = async () => {
    if (!topic) return;

    setTogglingTopicActive(true);
    const res = await dispatch(toggleTopicActive(topic.id));

    if (toggleTopicActive.fulfilled.match(res)) {
      const nextActive = res.payload.isActive ?? res.payload.active ?? false;
      dispatch(
        showNotification({
          message: `Topic "${res.payload.title}" is now ${nextActive ? "active" : "inactive"}`,
          variant: "success",
        })
      );
    } else {
      dispatch(showNotification({ message: "Update topic active failed", variant: "error" }));
    }

    setTogglingTopicActive(false);
  };


  return (
    <div className="space-y-4 p-4">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link
              to="/vocab/topics"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={13} />
              Vocab Topics
            </Link>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[320px] truncate">
              {topic?.title ?? topicId}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <Card>
        <CardContent className="space-y-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 overflow-hidden">
              <Layers3 size={18} />
              <h1 className="truncate text-lg font-bold">
                {topic?.title ?? "Sub-topics"}
              </h1>
              {topic?.cefrRange && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {topic.cefrRange}
                </Badge>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {topicCompleted && (
                <Badge className="bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">
                  <CheckCircle2 size={12} className="mr-1" />
                  Completed
                </Badge>
              )}
              {topic && (
                <VocabActionButton
                  label={isTopicActive ? "Active" : "Inactive"}
                  loading={togglingTopicActive}
                  loadingLabel="Saving"
                  tone={isTopicActive ? "active" : "inactive"}
                  onClick={handleToggleTopicActive}
                  disabled={togglingTopicActive}
                  title={isTopicActive ? "Topic is active" : "Topic is inactive"}
                />
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              {topic?.tags?.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="shrink-0 text-xs">
                  {tag}
                </Badge>
              ))}
              {(topic?.tags?.length || 0) > 3 && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  +{topic!.tags.length - 3}
                </Badge>
              )}
              {topic?.description && (
                <p className="truncate text-sm text-muted-foreground">
                  {topic.description}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-semibold">
                {readySubtopics}/{totalSubtopics}
              </span>
              <Progress value={topicProgress} className="h-1 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {subtopics.status === "loading" && (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[56px]">#</TableHead>
                <TableHead className="w-[34%]">Sub-topic</TableHead>
                <TableHead className="w-[10%]">CEFR</TableHead>
                <TableHead className="w-[12%]">Words</TableHead>
                <TableHead className="w-[18%]">Progress</TableHead>
                <TableHead className="w-[12%]">Status</TableHead>
                <TableHead className="w-[14%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {subtopics.data.map((sub: IVocabSubTopic) => {
                const isAnimating = animatedStatuses.has(sub.status);
                const isGeneratingThis = loadingSubIds.has(sub.id);
                const isTogglingThis = loadingToggleSubIds.has(sub.id);
                const isSubtopicActive = sub.isActive ?? sub.active ?? false;
                const canToggleSubtopicActive = sub.status === "READY";
                const wordProgress =
                  sub.wordCount > 0 ? Math.round((sub.readyWordCount / sub.wordCount) * 100) : 0;
                const hasWords = sub.wordCount > 0;

                return (
                  <TableRow key={sub.id} className="align-top">
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.order + 1}
                    </TableCell>

                    <TableCell>
                      <div className="max-w-[520px] min-w-0">
                        <div className="truncate font-medium" title={sub.title}>
                          {sub.title}
                        </div>

                        {sub.titleVi && (
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {sub.titleVi}
                          </div>
                        )}

                        {sub.description ? (
                          <div
                            className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground"
                            title={sub.description}
                          >
                            {sub.description}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-muted-foreground">
                            No description
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="whitespace-nowrap text-xs">
                        {sub.cefrLevel}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="whitespace-nowrap text-sm">
                        <span className="font-medium">{sub.readyWordCount}</span>
                        <span className="text-muted-foreground">/{sub.wordCount}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="min-w-[130px] space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{wordProgress}%</span>
                          {hasWords && (
                            <span className="text-muted-foreground">
                              {sub.readyWordCount} ready
                            </span>
                          )}
                        </div>

                        <Progress value={wordProgress} className="h-2" />
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        className={`inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-1 text-sm font-semibold text-white ${
                          subtopicStatusColor[sub.status]
                        } ${isAnimating ? "animate-pulse" : ""}`}
                      >
                        {isAnimating && <Loader2 size={12} className="animate-spin" />}
                        {subtopicStatusLabel[sub.status] ?? sub.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {sub.status === "PENDING_WORDS" && (
                          <VocabActionButton
                            label="Generate"
                            loading={isGeneratingThis}
                            loadingLabel="Generating"
                            tone="magic"
                            disabled={loadingSubIds.size > 0}
                            onClick={() => handleGenWords(sub.id)}
                            title={isGeneratingThis ? "Generating words" : "Generate words"}
                          />
                        )}

                        <VocabActionButton
                          label="View"
                          variant={hasWords ? "default" : "outline"}
                          onClick={() => handleViewWords(sub.id)}
                          title={hasWords ? "View words" : "No words yet"}
                        />

                        <VocabActionButton
                          label={isSubtopicActive ? "Active" : "Inactive"}
                          loading={isTogglingThis}
                          loadingLabel="Saving"
                          tone={
                            !canToggleSubtopicActive
                              ? "inactive"
                              : isSubtopicActive
                                ? "active"
                                : "inactive"
                          }
                          className={canToggleSubtopicActive ? "" : "!border-slate-200 !bg-slate-100 !text-slate-400"}
                          disabled={isTogglingThis || !canToggleSubtopicActive}
                          onClick={() => handleToggleSubTopic(sub)}
                          title={
                            canToggleSubtopicActive
                              ? (isSubtopicActive ? "Sub-topic is active" : "Sub-topic is inactive")
                              : "Only READY sub-topics can change state"
                          }
                        />

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(sub)}
                          title="Delete sub-topic"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {subtopics.status !== "loading" && subtopics.data.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    Chưa có sub-topic nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <VocabWordsDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />

      {/* ─── Delete Subtopic Confirm Dialog ──────────────────────────────────── */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(v) => {
          if (!v) setDeleteConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa sub-topic</DialogTitle>

            <DialogDescription>
              Bạn có chắc muốn xóa sub-topic{" "}
              <strong>"{deleteConfirm?.title}"</strong>?

              {deleteConfirm && deleteConfirm.wordCount > 0 && (
                <span className="mt-1 block text-destructive">
                  Tất cả {deleteConfirm.wordCount} từ vựng trong sub-topic này sẽ bị xóa vĩnh viễn.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={deletingSub}
            >
              Hủy
            </Button>

            <Button
              variant="destructive"
              onClick={handleDeleteSubTopic}
              disabled={deletingSub}
            >
              {deletingSub ? (
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
    </div>
  );
}
