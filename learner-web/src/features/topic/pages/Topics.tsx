import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/features/keycloak/providers/AuthProvider";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  fetchExploreLessons,
  fetchResumeLearning,
  fetchTopicOptions,
  type LessonExplorerFilters,
} from "@/store/topicsSlide";
import type { IHomeLessonResponse, IResumeLessonDto } from "@/types";
import { Library, Loader2, Search, X } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LessonCard from "../components/LessonCard";
import LessonModeDialog from "../components/LessonModeDialog";
import { useTranslation } from "react-i18next";
import CollapsibleResumeLearningSection from "../components/CollapsibleResumeLearningSection";
import ScrollableChipRail from "../components/ScrollableChipRail";

const LEVEL_META: Record<string, { label: string; color: string }> = {
  ALL: { label: "Trình độ", color: "#6b7280" },
  BEGINNER: { label: "Beginner A1–A2", color: "#22c55e" },
  INTERMEDIATE: { label: "Intermediate B1–B2", color: "#3b82f6" },
  ADVANCED: { label: "Advanced C1–C2", color: "#a855f7" },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  ALL: { label: "Trạng thái", color: "#6b7280" },
  NOT_STARTED: { label: "Chưa học", color: "#9ca3af" },
  IN_PROGRESS: { label: "Đang học", color: "#f59e0b" },
  COMPLETED: { label: "Đã xong", color: "#22c55e" },
};

export default function Topics() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const state = useAppSelector((s) => s.topics);
  const [search, setSearch] = useState(params.get("q") || "");
  const [selectedLesson, setSelectedLesson] = useState<IHomeLessonResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const queryKey = params.toString();

  const filters = useMemo<LessonExplorerFilters>(() => ({
    q: params.get("q") || undefined,
    topicSlug: params.get("topic") || undefined,
    levelGroup: (params.get("levelGroup") as LessonExplorerFilters["levelGroup"]) || "ALL",
    status: (params.get("status") as LessonExplorerFilters["status"]) || "ALL",
    sort: (params.get("sort") as LessonExplorerFilters["sort"]) || "newest",
    page: Number(params.get("page") || 0), size: Number(params.get("size") || 12),
  }), [params]);

  useEffect(() => { void dispatch(fetchTopicOptions()); }, [dispatch]);
  useEffect(() => { if (profile) void dispatch(fetchResumeLearning()); }, [dispatch, profile]);
  useEffect(() => { void dispatch(fetchExploreLessons(filters)); }, [dispatch, filters]);
  useEffect(() => { setSearch(params.get("q") || ""); }, [params, queryKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = params.get("q") || "";
      if (search.trim() === current) return;
      const next = new URLSearchParams(params);
      if (search.trim()) next.set("q", search.trim());
      else next.delete("q");
      next.delete("page"); setParams(next, { replace: true });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search, params, setParams]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== "ALL" && value !== "newest") next.set(key, value);
    else next.delete(key);
    next.delete("page"); setParams(next);
  };
  const setPage = (page: number) => {
    const next = new URLSearchParams(params);
    if (page > 0) next.set("page", String(page));
    else next.delete("page");
    setParams(next);
    filterRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const clearFilters = () => { setSearch(""); setParams({}); };
  const navigateMode = (mode: string) => {
    if (!selectedLesson) return;
    const base = `/learn/lessons/${selectedLesson.id}/${selectedLesson.slug}`;
    navigate(mode === "listening" ? base : `${base}/${mode}`); setDialogOpen(false);
  };
  const continueLesson = (lesson: IResumeLessonDto) => {
    navigate(`/learn/lessons/${lesson.id}/${lesson.slug}/${lesson.mode.toLowerCase()}`);
  };
  const activeFilters = Boolean(filters.q || filters.topicSlug || filters.levelGroup !== "ALL" || filters.status !== "ALL" || filters.sort !== "newest");
  const topicChips = useMemo(
    () => [
      { value: "ALL", label: t("topics.all") },
      ...state.topics.map((topic) => ({ value: topic.slug, label: topic.name, color: topic.color })),
    ],
    [state.topics, t],
  );

  return (
    <div className="w-full space-y-4">
      {/* Resume Learning — above filter card */}
      {profile && state.resumeLearning?.recentLessons?.length ? (
        <CollapsibleResumeLearningSection data={state.resumeLearning} onContinueLesson={continueLesson} />
      ) : null}

      <div ref={filterRef} className="space-y-3 rounded-2xl border bg-card p-3.5">
        {/* Top row: Title + Search + Dropdowns */}
        {/* Mobile: search full row, dropdowns row 2. Desktop: all 1 row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Row 1 (mobile) / part of row (desktop): Title + Search */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1 className="flex shrink-0 items-center gap-1.5 text-sm font-bold">
              <Library className="h-4 w-4 text-primary" />
              {t("topics.explorerTitle")}
            </h1>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("topics.lessonSearch")}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          {/* Row 2 (mobile) / rest of row (desktop): Dropdowns */}
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            <Select value={filters.sort || "newest"} onValueChange={(v) => setFilter("sort", v)}>
              <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("topics.newest")}</SelectItem>
                <SelectItem value="shortest">{t("topics.shortest")}</SelectItem>
                <SelectItem value="longest">{t("topics.longest")}</SelectItem>
                <SelectItem value="title_asc">A → Z</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.levelGroup}
              onValueChange={(v) => setFilter("levelGroup", v)}
            >
              <SelectTrigger
                className="h-8 w-full sm:w-[150px] text-xs"
                style={filters.levelGroup !== "ALL" ? { color: LEVEL_META[filters.levelGroup ?? "ALL"]?.color } : undefined}
              ><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LEVEL_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    <span style={value !== "ALL" ? { color: meta.color } : undefined} className="font-semibold">
                      {meta.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {profile && (
              <Select value={filters.status || "ALL"} onValueChange={(v) => setFilter("status", v)}>
                <SelectTrigger
                  className="h-8 w-full sm:w-[130px] text-xs"
                  style={filters.status !== "ALL" ? { color: STATUS_META[filters.status ?? "ALL"]?.color } : undefined}
                ><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_META).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      <span style={value !== "ALL" ? { color: meta.color } : undefined} className="font-semibold">
                        {meta.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {activeFilters && (
              <Button variant="ghost" size="sm" className="col-span-3 h-8 w-full px-2 text-xs sm:col-auto sm:w-auto" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" />{t("topics.clearFilters")}
              </Button>
            )}
          </div>
        </div>

        {/* Topic chip rail */}
        <div className="border-t pt-2.5">
          <ScrollableChipRail items={topicChips} selectedValue={filters.topicSlug || "ALL"} onSelect={(value) => setFilter("topic", value)} />
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-baseline gap-2">
          <h2 className="text-sm font-bold">{t("topics.allLessons")}</h2>
          <span className="text-xs text-muted-foreground">{t("topics.matchingLessons", { count: state.totalElements })}</span>
        </div>
        {state.status === "loading" ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : state.lessons.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{state.lessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} onClick={() => { setSelectedLesson(lesson); setDialogOpen(true); }} />)}</div> : <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-muted/10 py-20"><div className="rounded-full bg-muted/30 p-4"><Search className="h-6 w-6 text-muted-foreground/40" /></div><div className="text-center"><h3 className="font-bold text-foreground">{t("topics.emptyLessons")}</h3><p className="mt-1 text-sm text-muted-foreground">{t("topics.emptyHint")}</p></div><Button variant="outline" size="sm" className="rounded-full" onClick={clearFilters}>{t("topics.clearFilters")}</Button></div>}
        {state.totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); setPage(state.page - 1); }}
                   aria-disabled={state.page === 0}
                    className={state.page === 0 ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>
                {Array.from({ length: state.totalPages }, (_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      isActive={i === state.page}
                      onClick={(e) => { e.preventDefault(); setPage(i); }}
                      className="text-xs"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => { e.preventDefault(); setPage(state.page + 1); }}
                    aria-disabled={state.page + 1 >= state.totalPages}
                    className={state.page + 1 >= state.totalPages ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </section>
      <LessonModeDialog open={dialogOpen} onOpenChange={setDialogOpen} lesson={selectedLesson} topicName={selectedLesson?.topicName} onNavigate={navigateMode} />
    </div>
  );
}
