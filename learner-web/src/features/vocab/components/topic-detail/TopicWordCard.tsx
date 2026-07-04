import { cn } from "@/lib/utils";
import type { IVocabWordEntry } from "@/types";
import { getPartOfSpeechI18nKey } from "@/utils/partOfSpeech";
import { Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProgressMap } from "../learning/vocabLearningUtils";
import { getAudioUrl, getPhonetic, getWordDefinition, getWordExample, getWordMeaning, getWordStatus, getWordViExample, playWordAudio } from "./vocabTopicDetailUtils";

export function TopicWordCard({ word, progress }: { word: IVocabWordEntry; progress?: ProgressMap[string] }) {
  const { t } = useTranslation();
  const definition = getWordDefinition(word), meaning = getWordMeaning(word);
  const example = getWordExample(word), viExample = getWordViExample(word);
  const audioUrl = getAudioUrl(word), phonetic = getPhonetic(word);
  const posLabel = t(getPartOfSpeechI18nKey(word.pos));
  const status = getWordStatus(progress);
  return (
    <article className="rounded-lg border border-border/70 bg-card px-2.5 py-2">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><h3 className="text-lg font-bold leading-tight">{word.wordText}</h3>{phonetic && <span className="text-sm text-muted-foreground">/{phonetic.replace(/^\/+|\/+$/g, "")}/</span>}<span className="inline-flex h-6 items-center rounded-md border bg-muted px-2 text-xs font-semibold" title={posLabel}>{posLabel}</span></div></div>
        <div className="flex shrink-0 items-center gap-2"><span title={status.titleKey ? t(status.titleKey) : undefined} className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", status.className)}>{t(status.labelKey)}</span>{audioUrl && <button onClick={() => playWordAudio(word)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground" title={t("vocab.detail.playAudio")}><Volume2 className="h-4 w-4" /></button>}</div>
      </div>
      {meaning && <p className="mt-0.5 text-[15px] font-semibold leading-snug text-primary">{meaning}</p>}
      {definition && <p className="mt-0.5 text-sm leading-snug text-foreground/90">{definition}</p>}
      {(example || viExample) && <div className="mt-1.5 border-t border-border/60 pt-1.5 text-sm leading-snug">{example && <p className="italic text-foreground/90">“{example}”</p>}{viExample && <p className="mt-0.5 text-muted-foreground">{viExample}</p>}</div>}
    </article>
  );
}
