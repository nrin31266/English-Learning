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
  Eye,
  Layers3,
  Loader2,
  Sparkles,
  Trash2
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import VocabWordsDialog from "../components/VocabWordsDialog";

const subtopicStatusColor: Record<IVocabSubTopic["status"], string> = {
  PENDING_WORDS: "bg-slate-600",
  GENERATING_WORDS: "bg-amber-500",
  PROCESSING_WORDS: "bg-orange-500",
  READY: "bg-emerald-600",
};

const subtopicStatusLabel: Record<IVocabSubTopic["status"], string> = {
  PENDING_WORDS: "Pending",
  GENERATING_WORDS: "Generating",
  PROCESSING_WORDS: "Processing",
  READY: "Ready",
};

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
  const [deleteConfirm, setDeleteConfirm] = useState<IVocabSubTopic | null>(null);
  const [deletingSub, setDeletingSub] = useState(false);

  const { topics, subtopics } = useAppSelector((s) => s.vocab.vocab);
  const topic = topics.data.find((t: IVocabTopic) => t.id === topicId);
  const isTopicActive = topic ? (topic.isActive ?? topic.active ?? false) : false;

  const readySubtopics = topic?.readySubtopicCount ?? 0;
  const totalSubtopics = topic?.subtopicCount ?? subtopics.data.length;
  const topicProgress = totalSubtopics > 0 ? Math.round((readySubtopics / totalSubtopics) * 100) : 0;
  const topicCompleted = (topic?.status === "READY") || (totalSubtopics > 0 && readySubtopics >= totalSubtopics);

  useEffect(() => {
    if (topics.status === "idle") dispatch(fetchVocabTopics());
  }, [dispatch, topics.status]);

  useEffect(() => {
    if (topicId) dispatch(fetchSubTopics(topicId));
  }, [topicId, dispatch]);

  useEffect(() => {
    if (!stompClient?.connected) return;
    const sub = stompClient.subscribe("/topic/vocab/subtopic-progress", (msg) => {
      const event: IVocabSubTopicProgressEvent = JSON.parse(msg.body);
      dispatch(updateSubtopicProgress(event));
    });
    return () => sub.unsubscribe();
  }, [stompClient, dispatch]);

  useEffect(() => {
    if (!stompClient?.connected) return;
    const sub = stompClient.subscribe("/topic/vocab/subtopic-ready", (msg) => {
      const event: IVocabSubTopicReadyEvent = JSON.parse(msg.body);
      dispatch(updateSubtopicFromWs(event));
    });
    return () => sub.unsubscribe();
  }, [stompClient, dispatch]);

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
      dispatch(showNotification({ message: `Đã xóa sub-topic "${deleteConfirm.title}"`, variant: "success" }));
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
      dispatch(showNotification({ message: `Sub-topic "${res.payload.title}" đã ${isActive ? "hiển thị" : "ẩn"}`, variant: "success" }));
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
      dispatch(showNotification({ message: `Topic "${res.payload.title}" is now ${nextActive ? "active" : "inactive"}`, variant: "success" }));
    } else {
      dispatch(showNotification({ message: "Update topic active failed", variant: "error" }));
    }
    setTogglingTopicActive(false);
  };

  return (
    <div className="mx-auto w-full space-y-4 p-4">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link to="/vocab/topics" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
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

      {/* Header Card - full width */}
      <Card className="w-full overflow-hidden border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Layers3 size={18} className="shrink-0" />
              <h1 className="truncate text-[20px] font-semibold">{topic?.title ?? "Sub-topics"}</h1>
              {topic?.cefrRange && (
                <Badge variant="outline" className="shrink-0 px-2 py-0.5 text-xs">{topic.cefrRange}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {topicCompleted && (
                <Badge className="bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">
                  <CheckCircle2 size={12} className="mr-1" /> Completed
                </Badge>
              )}
              {topic && (
                <Button
                  size="sm"
                  variant={isTopicActive ? "default" : "outline"}
                  disabled={togglingTopicActive}
                  onClick={handleToggleTopicActive}
                  className={`h-8 shrink-0 ${
                    isTopicActive
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {togglingTopicActive && <Loader2 size={12} className="mr-1 animate-spin" />}
                  {isTopicActive ? "Active" : "Inactive"}
                </Button>
              )}
            </div>
          </div>

          {topic?.description && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {topic.description}
            </p>
          )}

          {/* Tags + Progress */}
          {!topicCompleted && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {topic?.tags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="px-2 py-0.5 text-xs">{tag}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {readySubtopics}/{totalSubtopics}
                </span>
                <Progress value={topicProgress} className="h-1.5 w-16" />
              </div>
            </div>
          )}

          {topicCompleted && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {topic?.tags?.map((tag) => (
                <Badge key={tag} variant="outline" className="px-2 py-0.5 text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {subtopics.status === "loading" && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {subtopics.status !== "loading" && subtopics.data.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Chưa có sub-topic nào.
          </CardContent>
        </Card>
      )}

      {/* Sub-topic Cards Grid 2 columns */}
      {subtopics.status !== "loading" && subtopics.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {subtopics.data.map((sub: IVocabSubTopic) => {
            const isAnimating = animatedStatuses.has(sub.status);
            const isGeneratingThis = loadingSubIds.has(sub.id);
            const isTogglingThis = loadingToggleSubIds.has(sub.id);
            const isSubtopicActive = sub.isActive ?? sub.active ?? false;
            const canToggleSubtopicActive = sub.status === "READY";
            const wordProgress = sub.wordCount > 0 ? Math.round((sub.readyWordCount / sub.wordCount) * 100) : 0;
            const hasWords = sub.wordCount > 0;
            const isCompleted = sub.status === "READY" && sub.readyWordCount >= sub.wordCount;

            return (
              <Card key={sub.id} className="overflow-hidden border-border/60 transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    {/* Row 1: # + Title + Status Badge */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[11px] font-medium text-muted-foreground">
                        #{sub.order + 1}
                      </Badge>
                      <h3 className="min-w-0 flex-1 truncate text-[17px] font-semibold" title={sub.title}>
                        {sub.title}
                      </h3>
                      <Badge
                        className={`shrink-0 px-2.5 py-0.5 text-xs font-semibold text-white ${subtopicStatusColor[sub.status]} ${isAnimating ? "animate-pulse" : ""}`}
                      >
                        {isAnimating && <Loader2 size={11} className="mr-1 inline animate-spin" />}
                        {subtopicStatusLabel[sub.status]}
                      </Badge>
                    </div>

                    {/* Row 2: TitleVi */}
                    {sub.titleVi && (
                      <p className="truncate text-sm text-muted-foreground">{sub.titleVi}</p>
                    )}

                    {/* Row 3: Description */}
                    {sub.description && (
                      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground" title={sub.description}>
                        {sub.description}
                      </p>
                    )}

                    {/* Row 4: CEFR + Word count + Progress */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0 px-2 py-0.5 text-xs font-medium">{sub.cefrLevel}</Badge>
                      
                      {isCompleted ? (
                        <Badge className="shrink-0 bg-emerald-600 px-2 py-0.5 text-xs text-white">
                          <CheckCircle2 size={11} className="mr-1" />
                          Completed
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {sub.readyWordCount}/{sub.wordCount}
                          </span>
                          <Progress value={wordProgress} className="h-1.5 flex-1" />
                        </div>
                      )}
                    </div>

                    {/* Row 5: Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      {sub.status === "PENDING_WORDS" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100"
                          disabled={isGeneratingThis || loadingSubIds.size > 0}
                          onClick={() => handleGenWords(sub.id)}
                        >
                          {isGeneratingThis ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Sparkles size={13} />
                          )}
                          Generate
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant={hasWords ? "default" : "outline"}
                        className="h-8 gap-1.5"
                        onClick={() => handleViewWords(sub.id)}
                      >
                        <Eye size={13} />
                        View
                      </Button>

                      <Button
                        size="sm"
                        variant="default"
                        disabled={isTogglingThis || !canToggleSubtopicActive}
                        onClick={() => handleToggleSubTopic(sub)}
                        className={`h-8 gap-1.5 ${
                          isSubtopicActive
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-muted text-foreground hover:bg-muted/80"
                        } ${canToggleSubtopicActive ? "" : "text-slate-400"}`}
                      >
                        {isTogglingThis && <Loader2 size={13} className="animate-spin" />}
                        {isSubtopicActive ? "Active" : "Inactive"}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="ml-auto h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(sub)}
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

      {/* Words Dialog */}
      <VocabWordsDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa sub-topic</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa sub-topic <strong>"{deleteConfirm?.title}"</strong>?
              {deleteConfirm && deleteConfirm.wordCount > 0 && (
                <span className="mt-1 block text-destructive">
                  Tất cả {deleteConfirm.wordCount} từ vựng trong sub-topic này sẽ bị xóa vĩnh viễn.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deletingSub}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteSubTopic} disabled={deletingSub}>
              {deletingSub ? (
                <><Loader2 size={14} className="mr-1 animate-spin" /> Đang xóa...</>
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
