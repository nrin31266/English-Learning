import LanguageLevelBadge, { type LanguageLevel } from "@/components/LanguageLevel";
import { useAppDispatch, useAppSelector } from "@/store";
import { clearDetail, fetchSubTopics, fetchTopicDetail, fetchWords, setActiveSubtopic } from "@/store/vocabDetailSlide";
import type { IVocabSubTopic, IVocabWordEntry } from "@/types";
import { getPartOfSpeechI18nKey } from "@/utils/partOfSpeech";
import {
  ArrowLeft,
  BookMarked,
  Loader2,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

function getWordDefinition(word: IVocabWordEntry) {
  return word.contextDefinition || word.wordDetail?.definitions?.[0]?.definition || "";
}

function getWordMeaning(word: IVocabWordEntry) {
  return word.contextMeaningVi || word.wordDetail?.summaryVi || word.wordDetail?.definitions?.[0]?.meaningVi || "";
}

function getWordExample(word: IVocabWordEntry) {
  return word.contextExample || word.wordDetail?.definitions?.[0]?.example || "";
}

function getWordViExample(word: IVocabWordEntry) {
  return word.contextViExample || word.wordDetail?.definitions?.[0]?.viExample || "";
}

function getAudioUrl(word: IVocabWordEntry) {
  return word.wordDetail?.phonetics?.usAudioUrl || word.wordDetail?.phonetics?.ukAudioUrl || "";
}

function getPhonetic(word: IVocabWordEntry) {
  return word.wordDetail?.phonetics?.us || word.wordDetail?.phonetics?.uk || "";
}

function playWordAudio(word: IVocabWordEntry) {
  const audioUrl = getAudioUrl(word);
  if (!audioUrl) return;
  void new Audio(audioUrl).play();
}

export default function VocabTopicDetail() {
  const { t } = useTranslation();
  const { id, subtopicId } = useParams<{ id: string; subtopicId?: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { topic, topicStatus, subtopics, subtopicsStatus, words, wordsStatus, activeSubtopicId } = useAppSelector((s) => s.vocabDetail);

  const activeSubtopics = useMemo(
    () => subtopics.filter((s) => s.isActive === true || s.active === true),
    [subtopics]
  );

  const activeSubtopic = useMemo(
    () => activeSubtopics.find((s) => s.id === activeSubtopicId),
    [activeSubtopics, activeSubtopicId]
  );

  useEffect(() => {
    if (!id) return;
    dispatch(fetchTopicDetail(id));
    dispatch(fetchSubTopics(id));

    return () => {
      dispatch(clearDetail());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (!subtopicId) {
      if (activeSubtopicId) dispatch(setActiveSubtopic(null));
      return;
    }
    if (activeSubtopicId !== subtopicId) {
      dispatch(setActiveSubtopic(subtopicId));
    }
  }, [activeSubtopicId, dispatch, subtopicId]);

  useEffect(() => {
    if (!activeSubtopicId) return;
    dispatch(fetchWords(activeSubtopicId));
  }, [dispatch, activeSubtopicId]);

  const handleSelectSubtopic = (sub: IVocabSubTopic) => {
    if (!id) return;
    dispatch(setActiveSubtopic(sub.id));
    navigate(`/vocab/topics/${id}/subtopics/${sub.id}`);
  };

  const handleHeaderBack = () => {
    if (!id) return;
    const isCompactLayout = window.matchMedia("(max-width: 1279px)").matches;
    if (isCompactLayout && activeSubtopicId) {
      dispatch(setActiveSubtopic(null));
      navigate(`/vocab/topics/${id}`);
      return;
    }
    navigate("/vocab/topics");
  };

  const rightEmptyState = (
    <div className="flex h-full items-center justify-center p-10">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <BookMarked className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Chọn 1 sub-topic để xem từ vựng</h2>
        <p className="mt-2 text-base text-muted-foreground">
          Khi bạn chọn bài ở danh sách bên trái, hệ thống sẽ hiển thị toàn bộ từ vựng trong sub-topic đó.
        </p>
      </div>
    </div>
  );

  const rightLearningState = (
    <div className="flex flex-col p-2.5 sm:p-3 xl:h-full xl:min-h-0 xl:overflow-y-auto">
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-bold">{activeSubtopic?.title}</h2>
              {activeSubtopic?.cefrLevel && (
                <LanguageLevelBadge
                  level={activeSubtopic.cefrLevel as LanguageLevel}
                  className="h-6 min-w-[2.1rem] px-2 text-[10px]"
                  hasBg
                />
              )}
            </div>
            {activeSubtopic?.titleVi && (
              <p className="mt-1 text-sm text-muted-foreground">{activeSubtopic.titleVi}</p>
            )}
          </div>
          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:min-w-36">
            <div className="inline-flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">Tổng số từ</span>
              <span className="text-base font-bold">{words.length || activeSubtopic?.wordCount || 0}</span>
            </div>
            <button
              disabled
              title="Vocabulary practice is coming soon"
              className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sắp ra mắt
            </button>
          </div>
        </div>
      </div>

      {wordsStatus === "loading" && (
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {wordsStatus === "succeeded" && words.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Sub-topic này chưa có từ vựng sẵn sàng. Vui lòng quay lại sau.
        </div>
      )}

      {wordsStatus === "failed" && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được danh sách từ vựng. Vui lòng thử lại.
        </div>
      )}

      {wordsStatus === "succeeded" && words.length > 0 && (
        <div className="mt-3 grid items-start gap-2">
          {words
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((word) => {
              const definition = getWordDefinition(word);
              const meaning = getWordMeaning(word);
              const example = getWordExample(word);
              const viExample = getWordViExample(word);
              const audioUrl = getAudioUrl(word);
              const phonetic = getPhonetic(word);
              const posLabel = t(getPartOfSpeechI18nKey(word.pos));

              return (
                <article key={word.id} className="rounded-lg border border-border/70 bg-card px-2.5 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="text-lg font-bold leading-tight">{word.wordText}</h3>
                        {phonetic && <span className="text-sm text-muted-foreground">/{phonetic.replace(/^\/+|\/+$/g, "")}/</span>}
                        <span
                          className="inline-flex h-6 items-center rounded-md border border-border bg-muted px-2 text-xs font-semibold text-foreground"
                          title={posLabel}
                        >
                          {posLabel}
                        </span>
                      </div>
                    </div>
                    {audioUrl && (
                      <button
                        onClick={() => playWordAudio(word)}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:text-foreground"
                        title="Nghe phát âm"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {meaning && <p className="mt-0.5 text-[15px] font-semibold leading-snug text-primary">{meaning}</p>}
                  {definition && <p className="mt-0.5 text-sm leading-snug text-foreground/90">{definition}</p>}

                  {(example || viExample) && (
                    <div className="mt-1.5 border-t border-border/60 pt-1.5 text-sm leading-snug">
                      {example && <p className="italic text-foreground/90">“{example}”</p>}
                      {viExample && <p className="mt-0.5 text-muted-foreground">{viExample}</p>}
                    </div>
                  )}
                </article>
              );
            })}
        </div>
      )}
    </div>
  );

  return (
    <div className="py-2 xl:h-[calc(100vh-6rem)]">
      <div className="mb-2 rounded-xl border bg-background px-2.5 py-1.5">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
          <button
            onClick={handleHeaderBack}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại
          </button>

          <span className="shrink-0 text-muted-foreground/50">/</span>
          <h1 className="max-w-[16rem] truncate text-base font-bold sm:max-w-[28rem]">
            {topic?.title || (topicStatus === "loading" ? "Đang tải topic..." : "Vocab Topic")}
          </h1>

          {topic?.cefrRange && (
            <span className="shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold">{topic.cefrRange}</span>
          )}
          <span className="shrink-0 text-xs text-muted-foreground">{activeSubtopics.length} sub-topics</span>
          {topic?.estimatedWordCount ? (
            <span className="shrink-0 text-xs text-muted-foreground">~{topic.estimatedWordCount} từ</span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 xl:h-[calc(100%-4.75rem)] xl:grid-cols-12">
        <aside
          className={`col-span-1 w-full flex-col overflow-hidden rounded-2xl border bg-background xl:col-span-4 xl:h-full xl:min-h-0 ${
            activeSubtopicId ? "hidden xl:flex" : "flex"
          }`}
        >
          <div className="border-b px-3 py-2">
            <h2 className="text-lg font-bold">Sub-topics</h2>
            <p className="text-sm text-muted-foreground">Chọn bài để xem danh sách từ vựng.</p>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
            {subtopicsStatus === "loading" && (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {subtopicsStatus === "succeeded" && activeSubtopics.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">Chưa có sub-topic đang active.</div>
            )}

            {subtopicsStatus === "succeeded" &&
              activeSubtopics.map((sub) => {
                const isActive = sub.id === activeSubtopicId;
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectSubtopic(sub)}
                    className={`group w-full rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                      isActive
                        ? "border-primary/40 bg-primary/10 hover:border-primary/60"
                        : "border-border/70 bg-muted/20 hover:border-primary/30 hover:bg-background"
                    } p-2.5`}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">#{sub.order + 1}</span>
                          {sub.cefrLevel && (
                            <LanguageLevelBadge
                              level={sub.cefrLevel as LanguageLevel}
                              className="h-6 min-w-[2.1rem] px-2 text-[10px]"
                              hasBg
                            />
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-sm font-semibold transition-colors group-hover:text-primary sm:mt-1 sm:text-base">{sub.title}</p>
                        {sub.titleVi && (
                          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{sub.titleVi}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{sub.wordCount ?? 0} từ</div>
                  </button>
                );
              })}
          </div>
        </aside>

        <main
          className={`col-span-1 w-full rounded-2xl border bg-background xl:col-span-8 xl:h-full xl:min-h-0 xl:overflow-hidden ${
            activeSubtopicId ? "block" : "hidden xl:block"
          }`}
        >
          {!activeSubtopicId ? rightEmptyState : rightLearningState}
        </main>
      </div>
    </div>
  );
}
