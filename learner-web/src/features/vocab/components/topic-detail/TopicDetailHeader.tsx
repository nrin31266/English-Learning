import type { IVocabTopic } from "@/types";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function TopicDetailHeader({ topic, loading, completed, onBack }: { topic: IVocabTopic | null; loading: boolean; completed: boolean; onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <header className="mb-2 rounded-xl border bg-background px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
        <button onClick={onBack} title={t("vocab.common.back")} className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />{t("vocab.common.back")}</button>
        <span className="shrink-0 text-muted-foreground/40">|</span>
        <h1 className="max-w-[16rem] truncate text-base font-bold sm:max-w-md">{topic?.title || (loading ? t("vocab.detail.loadingTopic") : t("vocab.detail.topicFallback"))}</h1>
        {topic?.cefrRange && <span className="shrink-0 rounded-md border border-primary/20 bg-primary/[0.06] px-2 py-0.5 text-[11px] font-semibold text-primary">{topic.cefrRange}</span>}
        {completed && <div className="flex shrink-0 items-center gap-1 rounded-full border border-green-100 bg-green-50 px-1.5 py-0.5 text-green-600 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /><span className="text-[10px] font-bold">{t("vocab.common.completed")}</span></div>}
      </div>
    </header>
  );
}
