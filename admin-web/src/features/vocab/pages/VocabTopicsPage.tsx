import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import handleAPI from "@/apis/handleAPI";
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
  type IFetchVocabTopicsParams,
} from "@/store/vocab/vocabSlice";
import type {
  IVocabSubTopicReadyEvent,
  IVocabSubtopicsGeneratedEvent,
  IVocabTag,
  IVocabTopic,
} from "@/types";
import { BookMarked, LayoutGrid, List, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

const ALL_STATUSES: IVocabTopic["status"][] = [
  "DRAFT",
  "GENERATING_SUBTOPICS",
  "READY_FOR_WORD_GEN",
  "PROCESSING",
  "READY",
];

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
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  // ── URL‑synced filter state ──────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") || "");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    () => new Set(searchParams.get("tags")?.split(",").filter(Boolean) || [])
  );
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "");
  const [sort, setSort] = useState(() => searchParams.get("sort") || "newest");
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 0);

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

  const [showAllTags, setShowAllTags] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMount = useRef(true);
  const prevSearchInput = useRef(searchInput);

  // Load tags once
  useEffect(() => {
    const loadTags = async () => {
      try {
        const res = await handleAPI<IVocabTag[]>({
          endpoint: "/dictionaries/vocab-tags",
        });
        setTagOptions(
          res
            .map((t) => t.name?.trim())
            .filter((t): t is string => !!t)
        );
      } catch {
        // keep page usable even if tag list fails
      }
    };
    loadTags();
  }, []);

  // ── Fetch + URL sync (debounced, except first mount) ─────────────────────
  const doFetch = useCallback(
    (params: IFetchVocabTopicsParams) => {
      dispatch(fetchVocabTopics(params));
    },
    [dispatch]
  );

  // Sync filter state → URL (immediate, no debounce)
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set("q", searchInput.trim());
    if (selectedTags.size > 0) params.set("tags", Array.from(selectedTags).join(","));
    if (statusFilter) params.set("status", statusFilter);
    if (sort !== "newest") params.set("sort", sort);
    if (page > 0) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [searchInput, selectedTags, statusFilter, sort, page, setSearchParams]);

  // Fetch: search debounced 500ms, other filters fire immediately
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const fire = () => {
      const tagsArr = selectedTags.size > 0 ? Array.from(selectedTags) : undefined;
      doFetch({
        q: searchInput.trim() || undefined,
        tags: tagsArr,
        status: statusFilter || undefined,
        page,
        size: 12,
        sort,
      });
    };

    if (isFirstMount.current) {
      isFirstMount.current = false;
      prevSearchInput.current = searchInput;
      fire();
    } else if (searchInput !== prevSearchInput.current) {
      // Only search changed → debounce
      prevSearchInput.current = searchInput;
      debounceRef.current = setTimeout(fire, 500);
    } else {
      // Other filter (sort, status, tags, page) changed → fire immediately
      fire();
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, selectedTags, statusFilter, sort, page, doFetch]);

  // Reset page to 0 when filters change
  const handleFilterChange = useCallback(() => {
    setPage(0);
  }, []);

  // Tag toggle
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
    handleFilterChange();
  };

  // Handle status change
  const handleStatusChange = (value: string) => {
    setStatusFilter(value === "all" ? "" : value);
    handleFilterChange();
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    setSort(value);
    handleFilterChange();
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // WebSocket subscriptions
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

  // Pagination helpers
  const totalPages = topics.totalPages ?? 0;
  const currentPage = topics.page ?? 0;

  const renderPageNumbers = () => {
    const pages: (number | "...")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages - 2, currentPage + 1);

      if (start > 1) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 2) pages.push("...");
      pages.push(totalPages - 1);
    }
    return pages;
  };

  return (
    <div className="space-y-5 p-4">
      {/* Header */}
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
          <div className="flex items-center gap-1 rounded-md border bg-background p-1">
            <Button
              size="icon"
              variant={viewMode === "card" ? "default" : "ghost"}
              className="h-7 w-7"
              onClick={() => setViewMode("card")}
              title="Card view"
            >
              <LayoutGrid size={14} />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "list" ? "default" : "ghost"}
              className="h-7 w-7"
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <List size={14} />
            </Button>
          </div>
          <Button className="h-8 px-3 text-xs" onClick={() => setCreateOpen(true)}>
            Create
          </Button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        {/* Search input - debounced 500ms */}
        <Input
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            handleFilterChange();
          }}
          placeholder="Search topics..."
          className="h-9 w-full lg:w-[260px]"
        />

        {/* Sort dropdown */}
        <Select value={sort} onValueChange={handleSortChange}>
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={statusFilter || "all"} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-9 w-[160px] text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Multi-tag filter - expanded as badges, max 30 then More */}
        {tagOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(showAllTags ? tagOptions : tagOptions.slice(0, 30)).map((tag) => {
              const isSelected = selectedTags.has(tag);
              return (
                <Badge
                  key={tag}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer text-xs px-2.5 py-1 transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground hover:bg-primary/80"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              );
            })}
            {tagOptions.length > 30 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => setShowAllTags((v) => !v)}
              >
                {showAllTags ? "Less" : `+${tagOptions.length - 30} more`}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Selected filters summary */}
      {(selectedTags.size > 0 || statusFilter) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>Filters:</span>
          {statusFilter && (
            <Badge variant="secondary" className="text-[11px]">
              Status: {statusLabel[statusFilter as IVocabTopic["status"]] ?? statusFilter}
              <X
                size={11}
                className="ml-1 cursor-pointer"
                onClick={() => handleStatusChange("all")}
              />
            </Badge>
          )}
          {Array.from(selectedTags).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[11px]">
              {tag}
              <X size={11} className="ml-1 cursor-pointer" onClick={() => toggleTag(tag)} />
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[11px]"
            onClick={() => {
              setSelectedTags(new Set());
              setStatusFilter("");
              setSearchInput("");
              setPage(0);
            }}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Loading state */}
      {topics.status === "loading" && (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {/* Empty state */}
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

      {/* Results count */}
      {topics.data.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Showing {topics.data.length} of {topics.totalElements} topics
          {totalPages > 1 && ` — Page ${currentPage + 1}/${totalPages}`}
        </div>
      )}

      {/* Card view */}
      {topics.data.length > 0 && viewMode === "card" && (
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

      {/* List view */}
      {topics.data.length > 0 && viewMode === "list" && (
        <div className="space-y-3">
          {topics.data.map((topic: IVocabTopic) => {
            const isRunning = runningStatuses.has(topic.status);
            const isGeneratingThis = loadingGenIds.has(topic.id);
            const isTogglingThis = loadingToggleIds.has(topic.id);
            const isTopicActive = topic.isActive ?? topic.active ?? false;
            const hasSubtopics = topic.subtopicCount > 0;

            return (
              <Card key={topic.id}>
                <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-base font-semibold">{topic.title}</div>
                      <Badge className={`text-white text-[11px] ${statusColor[topic.status]}`}>
                        {isRunning && <Loader2 size={10} className="mr-1 animate-spin" />}
                        {statusLabel[topic.status] ?? topic.status}
                      </Badge>
                      {topic.cefrRange && (
                        <Badge variant="outline" className="text-[11px]">
                          {topic.cefrRange}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {topic.readySubtopicCount}/{topic.subtopicCount || 0}
                      </span>
                    </div>

                    {topic.description && (
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {topic.description}
                      </p>
                    )}

                    {topic.tags && topic.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {topic.tags.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="px-1.5 py-0 text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {topic.status === "DRAFT" && topic.subtopicCount === 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs"
                        disabled={loadingGenIds.size > 0}
                        onClick={() => handleGenSubtopics(topic.id)}
                      >
                        {isGeneratingThis ? "Generating" : "Generate"}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant={hasSubtopics ? "default" : "outline"}
                      className="h-8 px-2 text-xs"
                      disabled={!hasSubtopics}
                      onClick={() => handleViewSubtopics(topic.id)}
                    >
                      Open
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-8 px-2 text-xs ${
                        isTopicActive
                          ? "!border-blue-900 !bg-blue-900 !text-white hover:!border-blue-800 hover:!bg-blue-800"
                          : "!border-slate-300 !bg-slate-200 !text-slate-700 hover:!border-slate-400 hover:!bg-slate-300"
                      }`}
                      onClick={() => handleToggleTopic(topic)}
                      disabled={isTogglingThis}
                    >
                      {isTogglingThis ? "Saving" : isTopicActive ? "Active" : "Inactive"}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      onClick={() => handleOpenEdit(topic)}
                    >
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(topic)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => topics.hasPrevious && handlePageChange(currentPage - 1)}
                className={
                  !topics.hasPrevious ? "pointer-events-none opacity-50" : "cursor-pointer"
                }
              />
            </PaginationItem>

            {renderPageNumbers().map((p, idx) =>
              p === "..." ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === currentPage}
                    onClick={() => handlePageChange(p as number)}
                    className="cursor-pointer"
                  >
                    {(p as number) + 1}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                onClick={() => topics.hasNext && handlePageChange(currentPage + 1)}
                className={
                  !topics.hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Dialogs */}
      <CreateVocabTopicDialog
        open={createOpen}
        value={createData}
        tagOptions={tagOptions}
        loading={creating}
        onOpenChange={setCreateOpen}
        onChange={setCreateData}
        onSubmit={handleCreateTopic}
      />

      <EditVocabTopicDialog
        open={editOpen}
        topic={editingTopic}
        value={editData}
        tagOptions={tagOptions}
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
