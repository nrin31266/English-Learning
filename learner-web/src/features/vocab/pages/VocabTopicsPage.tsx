import type { IVocabTopic } from "@/types";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { VocabTopicsFilters } from "../components/topics/VocabTopicsFilters";
import { VocabTopicsResults } from "../components/topics/VocabTopicsResults";
import { useVocabTopicsCatalog } from "../hooks/useVocabTopicsCatalog";

export default function VocabTopicsPage() {
  const navigate = useNavigate();
  const catalog = useVocabTopicsCatalog();
  const { setPage } = catalog;
  const openTopic = useCallback((topic: IVocabTopic) => navigate(`/vocab/topics/${topic.id}`), [navigate]);
  const changePage = useCallback((page: number) => {
    setPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setPage]);

  return (
    <div className="mx-auto min-h-[calc(100vh-8vh)] w-full space-y-4">
          <VocabTopicsFilters
            searchInput={catalog.searchInput}
            onSearchChange={(value) => { catalog.setSearchInput(value); catalog.setPage(0); }}
            selectedTags={catalog.selectedTags}
            tagOptions={catalog.tagOptions}
            showAllTags={catalog.showAllTags}
            onShowAllTagsChange={catalog.setShowAllTags}
            onToggleTag={catalog.toggleTag}
            onClear={catalog.clearFilters}
            sort={catalog.sort}
            onSortChange={(value) => { catalog.setSort(value); catalog.setPage(0); }}
            viewMode={catalog.viewMode}
            onViewModeChange={catalog.setViewMode}
          />
          <VocabTopicsResults
            topics={catalog.data}
            status={catalog.status}
            viewMode={catalog.viewMode}
            topicProgress={catalog.topicProgress}
            totalElements={catalog.totalElements}
            totalPages={catalog.totalPages ?? 0}
            currentPage={catalog.page ?? 0}
            hasNext={catalog.hasNext}
            hasPrevious={catalog.hasPrevious}
            onOpen={openTopic}
            onPageChange={changePage}
          />
    </div>
  );
}
