import { Card, CardContent } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import type { IVocabTopic } from "@/types";
import { BookMarked } from "lucide-react";
import { useTranslation } from "react-i18next";
import VocabTopicCard from "../VocabTopicCard";
import VocabTopicListCard from "../VocabTopicListCard";
import type { VocabProgressDashboard } from "@/store/vocabProgressSlice";
import type { VocabViewMode } from "../../hooks/useVocabTopicsCatalog";
import { VocabTopicsSkeleton } from "./VocabTopicsSkeleton";

type TopicProgress = VocabProgressDashboard["topics"][number];
type Props = {
  topics: IVocabTopic[]; status: string; viewMode: VocabViewMode;
  topicProgress: Map<string, TopicProgress>; totalElements: number; totalPages: number;
  currentPage: number; hasNext: boolean; hasPrevious: boolean;
  onOpen: (topic: IVocabTopic) => void; onPageChange: (page: number) => void;
};

const pageNumbers = (current: number, total: number) => {
  const pages: (number | "...")[] = [];
  if (total <= 7) for (let page = 0; page < total; page++) pages.push(page);
  else {
    pages.push(0);
    const start = Math.max(1, current - 1), end = Math.min(total - 2, current + 1);
    if (start > 1) pages.push("...");
    for (let page = start; page <= end; page++) pages.push(page);
    if (end < total - 2) pages.push("...");
    pages.push(total - 1);
  }
  return pages;
};

export function VocabTopicsResults(props: Props) {
  const { t } = useTranslation();
  if (props.status === "loading") return <VocabTopicsSkeleton viewMode={props.viewMode} />;
  if (!props.topics.length) return <Card><CardContent className="flex flex-col items-center py-20 text-center"><BookMarked size={34} className="text-muted-foreground" /><p className="mt-3 text-sm font-medium">{t("vocab.catalog.emptyTitle")}</p><p className="mt-1 text-xs text-muted-foreground">{t("vocab.catalog.emptyText")}</p></CardContent></Card>;
  return (
    <>
      <div className="px-1 text-xs font-medium text-muted-foreground">
        {t("vocab.catalog.resultCount", { count: props.totalElements })}
      </div>
      <div className={props.viewMode === "card" ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-2"}>
        {props.topics.map((topic) => props.viewMode === "card" ? <VocabTopicCard key={topic.id} topic={topic} progress={props.topicProgress.get(topic.id)} onOpen={props.onOpen} /> : <VocabTopicListCard key={topic.id} topic={topic} progress={props.topicProgress.get(topic.id)} onOpen={() => props.onOpen(topic)} />)}
      </div>
      {props.totalPages > 1 && <Pagination><PaginationContent>
        <PaginationItem><PaginationPrevious onClick={() => props.hasPrevious && props.onPageChange(props.currentPage - 1)} className={!props.hasPrevious ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
        {pageNumbers(props.currentPage, props.totalPages).map((page, index) => page === "..." ? <PaginationItem key={`ellipsis-${index}`}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={page}><PaginationLink isActive={page === props.currentPage} onClick={() => props.onPageChange(page)} className="cursor-pointer">{page + 1}</PaginationLink></PaginationItem>)}
        <PaginationItem><PaginationNext onClick={() => props.hasNext && props.onPageChange(props.currentPage + 1)} className={!props.hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
      </PaginationContent></Pagination>}
    </>
  );
}
