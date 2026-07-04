import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookMarked, LayoutGrid, List, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { VocabViewMode } from "../../hooks/useVocabTopicsCatalog";

type Props = {
  searchInput: string;
  onSearchChange: (value: string) => void;
  selectedTags: Set<string>;
  tagOptions: string[];
  showAllTags: boolean;
  onShowAllTagsChange: (value: boolean) => void;
  onToggleTag: (tag: string) => void;
  onClear: () => void;
  sort: string;
  onSortChange: (value: string) => void;
  viewMode: VocabViewMode;
  onViewModeChange: (value: VocabViewMode) => void;
};

export function VocabTopicsFilters(props: Props) {
  const { t } = useTranslation();
  return (
    <>
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-2.5 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-auto flex items-center gap-2 pr-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookMarked className="h-4 w-4" /></span>
              <h1 className="text-lg font-bold">{t("vocab.catalog.title")}</h1>
            </div>
          <div className="relative min-w-48 flex-1 sm:max-w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input value={props.searchInput} onChange={(event) => props.onSearchChange(event.target.value)} placeholder={t("vocab.catalog.search")} className="h-9 pl-9 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Select value={props.sort} onValueChange={props.onSortChange}>
              <SelectTrigger className="h-9 w-[130px] text-sm"><SelectValue placeholder={t("vocab.catalog.sort")} /></SelectTrigger>
              <SelectContent><SelectItem value="newest">{t("vocab.catalog.newest")}</SelectItem><SelectItem value="oldest">{t("vocab.catalog.oldest")}</SelectItem></SelectContent>
            </Select>
            <div className="flex items-center gap-0.5 rounded-lg border bg-background p-0.5">
              <Button size="icon" variant={props.viewMode === "card" ? "default" : "ghost"} className="h-8 w-8" onClick={() => props.onViewModeChange("card")} aria-label="Card view"><LayoutGrid size={15} /></Button>
              <Button size="icon" variant={props.viewMode === "list" ? "default" : "ghost"} className="h-8 w-8" onClick={() => props.onViewModeChange("list")} aria-label="List view"><List size={15} /></Button>
            </div>
          </div>
          </div>
          {!!props.tagOptions.length && (
            <div className="flex flex-wrap items-center gap-1 border-t pt-2">
              {(props.showAllTags ? props.tagOptions : props.tagOptions.slice(0, 30)).map((tag) => (
                <Badge key={tag} variant={props.selectedTags.has(tag) ? "default" : "outline"} className="h-7 cursor-pointer px-3 text-sm" onClick={() => props.onToggleTag(tag)}>{tag}</Badge>
              ))}
              {props.tagOptions.length > 30 && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => props.onShowAllTagsChange(!props.showAllTags)}>{props.showAllTags ? t("vocab.catalog.less") : t("vocab.catalog.more", { count: props.tagOptions.length - 30 })}</Button>}
            </div>
          )}
        </CardContent>
      </Card>
      {!!props.selectedTags.size && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{t("vocab.catalog.filters")}</span>
          {Array.from(props.selectedTags).map((tag) => <Badge key={tag} variant="secondary">{tag}<X size={11} className="ml-1 cursor-pointer" onClick={() => props.onToggleTag(tag)} /></Badge>)}
          <Button variant="ghost" size="sm" className="h-6" onClick={props.onClear}>{t("vocab.catalog.clearAll")}</Button>
        </div>
      )}
    </>
  );
}
