import { BookMarked } from "lucide-react";
import { useTranslation } from "react-i18next";

export function TopicDetailEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden p-10">
      <div className="pointer-events-none absolute -right-16 top-16 h-56 w-56 rounded-full bg-primary/[0.04] blur-2xl" />
      <div className="relative max-w-xl text-center">
        <div className="relative mx-auto mb-6 h-28 w-48" aria-hidden="true">
          <div className="absolute left-1 top-5 h-20 w-36 -rotate-6 rounded-xl border border-primary/10 bg-primary/[0.04]" />
          <div className="absolute inset-x-4 top-0 h-24 rounded-2xl border border-primary/25 bg-card p-3 shadow-sm">
            <div className="mt-3 flex items-center gap-3 text-left"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookMarked className="h-5 w-5" /></span><div className="flex-1 space-y-2"><div className="h-2.5 w-3/4 rounded-full bg-primary/20" /><div className="h-2 w-full rounded-full bg-muted" /><div className="h-2 w-2/3 rounded-full bg-muted" /></div></div>
          </div>
        </div>
        <span className="mb-3 inline-flex rounded-full border border-primary/15 bg-primary/[0.06] px-3 py-1 text-xs font-semibold text-primary"><span className="xl:hidden">{t("vocab.detail.chooseAbove")}</span><span className="hidden xl:inline">{t("vocab.detail.chooseLeft")}</span></span>
        <h2 className="text-2xl font-bold tracking-tight">{t("vocab.detail.chooseTitle")}</h2>
        <p className="mt-2 text-base text-muted-foreground">{t("vocab.detail.chooseText")}</p>
      </div>
    </div>
  );
}
