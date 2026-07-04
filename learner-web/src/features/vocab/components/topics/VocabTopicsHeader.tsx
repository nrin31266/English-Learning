import { BookMarked } from "lucide-react";
import { useTranslation } from "react-i18next";

export function VocabTopicsHeader() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="group relative flex items-center gap-2">
        <BookMarked className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">
          {t("vocab.catalog.title")}
        </h1>
      </div>
    </div>
  );
}
