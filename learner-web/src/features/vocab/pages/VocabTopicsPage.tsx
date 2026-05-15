import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  fetchVocabTags,
  fetchVocabTopics,
  type IFetchVocabTopicsParams,
} from "@/store/vocabSlide";
import type { IVocabTopic } from "@/types";
import { BookMarked, LayoutGrid, List, X, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import VocabTopicCard from "../components/VocabTopicCard";
import VocabTopicListCard from "../components/VocabTopicListCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function VocabTopicsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { data, status, totalPages: tp, page: cp, hasNext, hasPrevious, totalElements } =
    useAppSelector((s) => s.vocab);

  // ── URL‑synced filter state ──────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") || "");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    () => new Set(searchParams.get("tags")?.split(",").filter(Boolean) || [])
  );
  const [sort, setSort] = useState(() => searchParams.get("sort") || "newest");
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 0);
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  
  // Giữ params hiện tại để biết cái gì thay đổi
  const currentParamsRef = useRef({ searchInput, selectedTags, sort, page });

  // Load tags once
  useEffect(() => {
    dispatch(fetchVocabTags()).unwrap().then((res) => {
      setTagOptions(res.map((t) => t.name?.trim()).filter(Boolean));
    }).catch(() => {});
  }, [dispatch]);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const doFetch = useCallback(
    (params: IFetchVocabTopicsParams) => {
      dispatch(fetchVocabTopics(params));
    },
    [dispatch]
  );

  // Sync URL mỗi khi state thay đổi
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set("q", searchInput.trim());
    if (selectedTags.size > 0) params.set("tags", Array.from(selectedTags).join(","));
    if (sort !== "newest") params.set("sort", sort);
    if (page > 0) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [searchInput, selectedTags, sort, page, setSearchParams]);

  // Fetch data
  useEffect(() => {
    const prev = currentParamsRef.current;
    
    // Lần đầu mount -> fetch ngay
    if (!mountedRef.current) {
      mountedRef.current = true;
      currentParamsRef.current = { searchInput, selectedTags, sort, page };
      const tagsArr = selectedTags.size > 0 ? Array.from(selectedTags) : undefined;
      doFetch({
        q: searchInput.trim() || undefined,
        tags: tagsArr,
        page,
        size: 12,
        sort,
      });
      return;
    }

    // Nếu search thay đổi -> debounce 500ms
    if (searchInput !== prev.searchInput) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        currentParamsRef.current = { searchInput, selectedTags, sort, page };
        const tagsArr = selectedTags.size > 0 ? Array.from(selectedTags) : undefined;
        doFetch({
          q: searchInput.trim() || undefined,
          tags: tagsArr,
          page,
          size: 12,
          sort,
        });
      }, 500);
      return;
    }

    // Còn lại tags, sort, page thay đổi -> fetch ngay lập tức
    if (
      selectedTags !== prev.selectedTags ||
      sort !== prev.sort ||
      page !== prev.page
    ) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      currentParamsRef.current = { searchInput, selectedTags, sort, page };
      const tagsArr = selectedTags.size > 0 ? Array.from(selectedTags) : undefined;
      doFetch({
        q: searchInput.trim() || undefined,
        tags: tagsArr,
        page,
        size: 12,
        sort,
      });
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, selectedTags, sort, page, doFetch]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
    setPage(0);
  }, []);

  const handleSortChange = useCallback((value: string) => {
    setSort(value);
    setPage(0);
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedTags(new Set());
    setSearchInput("");
    setPage(0);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleOpenTopic = useCallback((topic: IVocabTopic) => {
    navigate(`/vocab/topics/${topic.id}`);
  }, [navigate]);

  // Pagination helpers
  const totalPages = tp ?? 0;
  const currentPage = cp ?? 0;

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

  const isLoading = status === "loading";

  return (
    <div className="mx-auto w-full space-y-6 px-4 py-8 lg:px-8 h-[calc(100vh-8vh)]">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <BookMarked className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Vocabulary</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Browse vocabulary topics and start learning new words.
        </p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        {/* Search with icon */}
        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="Search topics..."
            className="h-10 pl-10 text-sm"
          />
        </div>

        {/* Sort */}
        <Select value={sort} onValueChange={handleSortChange}>
          <SelectTrigger className="h-10 w-[130px] text-xs">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
          <Button
            size="icon"
            variant={viewMode === "card" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() => setViewMode("card")}
          >
            <LayoutGrid size={15} />
          </Button>
          <Button
            size="icon"
            variant={viewMode === "list" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() => setViewMode("list")}
          >
            <List size={15} />
          </Button>
        </div>

        {/* Tags */}
        {tagOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(showAllTags ? tagOptions : tagOptions.slice(0, 30)).map((tag) => {
              const isSelected = selectedTags.has(tag);
              return (
                <Badge
                  key={tag}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer text-sm px-3 py-1.5 ${
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

      {/* Selected tags summary */}
      {selectedTags.size > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>Filters:</span>
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
            onClick={handleClearAll}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Content */}
            {/* Loading skeleton */}
      {isLoading && viewMode === "card" && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-40 w-full rounded-none" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading && viewMode === "list" && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </Card>
          ))}
        </div>
      )}
      {/* Empty */}
      {!isLoading && data.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <BookMarked size={34} className="text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No vocabulary topics yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Topics will appear here once they are created and published.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results count */}
      {!isLoading && data.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {totalElements} topic{totalElements !== 1 ? "s" : ""}
          {totalPages > 1 && ` — Page ${currentPage + 1}/${totalPages}`}
        </div>
      )}

      {/* Card view - YouTube style grid */}
      {!isLoading && data.length > 0 && viewMode === "card" && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((topic) => (
            <VocabTopicCard
              key={topic.id}
              topic={topic}
              onOpen={handleOpenTopic}
            />
          ))}
        </div>
      )}

      {/* List view - compact row items */}
      {!isLoading && data.length > 0 && viewMode === "list" && (
        <div className="space-y-2">
          {data.map((topic) => (
            <VocabTopicListCard key={topic.id} topic={topic} onOpen={handleOpenTopic} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !isLoading && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => hasPrevious && handlePageChange(currentPage - 1)}
                className={!hasPrevious ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
                onClick={() => hasNext && handlePageChange(currentPage + 1)}
                className={!hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
