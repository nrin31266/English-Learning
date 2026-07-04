import LanguageLevelBadge, { type LanguageLevel } from "@/components/LanguageLevel";
import { cn } from "@/lib/utils";
import type { IVocabSubTopic } from "@/types";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export type SubtopicProgress = { learned: number; total: number; percent: number };
export function TopicSubtopicSidebar({ subtopics, status, activeId, completedCount, hidden, progress, onSelect }: { subtopics: IVocabSubTopic[]; status: string; activeId: string | null; completedCount: number; hidden: boolean; progress: Map<string, SubtopicProgress>; onSelect: (subtopic: IVocabSubTopic) => void }) {
  const { t } = useTranslation();
  return (
    <aside className={`col-span-1 w-full flex-col overflow-hidden rounded-2xl border bg-muted/15 xl:col-span-3 xl:h-full xl:min-h-0 ${hidden ? "hidden" : activeId ? "hidden xl:flex" : "flex"}`}>
      <div className="border-b bg-card/80 px-3 py-2.5"><div className="flex items-center justify-between gap-2"><h2 className="text-base font-bold">{t("vocab.detail.subtopics")}</h2><span className="rounded-full border border-primary/15 bg-primary/[0.07] px-2 py-0.5 text-[10px] font-semibold text-primary">{t("vocab.detail.lessonSummary", { learned: completedCount, total: subtopics.length })}</span></div><p className="text-xs text-muted-foreground">{t("vocab.detail.chooseLesson")}</p></div>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {status === "loading" && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        {status === "succeeded" && !subtopics.length && <div className="py-12 text-center text-sm text-muted-foreground">{t("vocab.detail.emptySubtopics")}</div>}
        {status === "succeeded" && subtopics.map((subtopic) => {
          const item = progress.get(subtopic.id) || { learned: 0, total: subtopic.wordCount ?? 0, percent: 0 };
          const isActive = subtopic.id === activeId;
          const label = item.percent >= 100 ? t("vocab.common.completed") : item.learned ? t("vocab.common.learning") : t("vocab.common.notStarted");
          return <button key={subtopic.id} onClick={() => onSelect(subtopic)} className={`group w-full rounded-lg border border-l-2 p-2.5 text-left transition-colors ${isActive ? "border-primary/45 border-l-primary bg-primary/10 shadow-sm" : "border-border/70 border-l-transparent bg-card hover:border-primary/30"}`}>
            <div className="flex items-center gap-1.5"><span className="text-[11px] font-semibold text-muted-foreground">#{subtopic.order + 1}</span>{subtopic.cefrLevel && <LanguageLevelBadge level={subtopic.cefrLevel as LanguageLevel} className="h-5 min-w-[1.8rem] px-1.5 text-[9px]" hasBg />}</div>
            <p className="mt-1 line-clamp-2 text-sm font-semibold group-hover:text-primary">{subtopic.title}</p>{subtopic.titleVi && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{subtopic.titleVi}</p>}
            <div className="mt-2 flex justify-between text-[11px]"><span className={cn("font-medium", item.percent >= 100 ? "text-emerald-600" : item.learned ? "text-primary" : "text-muted-foreground")}>{label}</span><span className="text-muted-foreground">{item.learned}/{item.total} từ</span></div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${item.percent}%` }} /></div>
          </button>;
        })}
      </div>
    </aside>
  );
}
