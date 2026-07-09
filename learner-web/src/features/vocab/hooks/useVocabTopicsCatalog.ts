import { useAppDispatch, useAppSelector } from "@/store";
import {
  fetchVocabTags,
  fetchVocabTopics,
  type IFetchVocabTopicsParams,
} from "@/store/vocabSlide";
import { fetchScopedVocabProgress } from "@/store/vocabProgressSlice";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/keycloak/providers/AuthProvider";

export type VocabCatalogTab = "topics" | "progress";
export type VocabViewMode = "card" | "list";

export function useVocabTopicsCatalog() {
  const dispatch = useAppDispatch();
  const { profile } = useAuth();
  const vocab = useAppSelector((state) => state.vocab);
  const topicSummaries = useAppSelector(
    (state) => state.vocabProgress.topicSummaries,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: VocabCatalogTab = "topics";
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("q") || "",
  );
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    () => new Set(searchParams.get("tags")?.split(",").filter(Boolean) || []),
  );
  const [sort, setSort] = useState(() => searchParams.get("sort") || "newest");
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 0);
  const [viewMode, setViewMode] = useState<VocabViewMode>("list");
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  const tagsLoadedRef = useRef(false);
  const lastTopicsRequestRef = useRef("");
  const lastScopedRequestRef = useRef("");

  const tagsKey = Array.from(selectedTags).sort().join(",");
  const visibleTopicIds = vocab.data.map((topic) => topic.id).join(",");

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set("q", searchInput.trim());
    if (selectedTags.size)
      params.set("tags", Array.from(selectedTags).join(","));
    if (sort !== "newest") params.set("sort", sort);
    if (page > 0) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [page, searchInput, selectedTags, sort, setSearchParams]);

  useEffect(() => {
    if (activeTab !== "topics" || tagsLoadedRef.current) return;
    tagsLoadedRef.current = true;
    void dispatch(fetchVocabTags())
      .unwrap()
      .then((tags) =>
        setTagOptions(
          tags
            .map((tag) => tag.name?.trim())
            .filter((name): name is string => Boolean(name)),
        ),
      )
      .catch(() => {
        tagsLoadedRef.current = false;
      });
  }, [activeTab, dispatch]);

  const fetchTopics = useCallback(
    (params: IFetchVocabTopicsParams) => void dispatch(fetchVocabTopics(params)),
    [dispatch],
  );

  useEffect(() => {
    if (activeTab !== "topics") return;

    const requestKey = JSON.stringify({
      q: searchInput.trim(),
      tags: tagsKey,
      page,
      sort,
    });

    if (lastTopicsRequestRef.current === requestKey) return;

    const run = () => {
      lastTopicsRequestRef.current = requestKey;
      fetchTopics({
        q: searchInput.trim() || undefined,
        tags: selectedTags.size ? Array.from(selectedTags) : undefined,
        page,
        size: 12,
        sort,
      });
    };

    if (!mountedRef.current) {
      mountedRef.current = true;
      run();
    } else {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(run, 350);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeTab, fetchTopics, page, searchInput, tagsKey, sort, selectedTags]);

  useEffect(() => {
    if (!profile) return;
    if (
      activeTab !== "topics" ||
      !visibleTopicIds ||
      lastScopedRequestRef.current === visibleTopicIds
    ) return;
    lastScopedRequestRef.current = visibleTopicIds;
    void dispatch(fetchScopedVocabProgress(visibleTopicIds.split(",")));
  }, [activeTab, dispatch, profile, visibleTopicIds]);

  const topicProgress = useMemo(
    () => new Map(topicSummaries.map((item) => [item.topicId, item])),
    [topicSummaries],
  );

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
    setPage(0);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTags(new Set());
    setSearchInput("");
    setPage(0);
  }, []);

  return {
    ...vocab,
    searchInput,
    setSearchInput,
    selectedTags,
    sort,
    setSort,
    page,
    setPage,
    viewMode,
    setViewMode,
    tagOptions,
    showAllTags,
    setShowAllTags,
    topicProgress,
    toggleTag,
    clearFilters,
  };
}