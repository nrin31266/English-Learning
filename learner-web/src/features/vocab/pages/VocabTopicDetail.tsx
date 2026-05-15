import LanguageLevelBadge, { type LanguageLevel } from "@/components/LanguageLevel";
import { useAppDispatch, useAppSelector } from "@/store";
import { clearDetail, fetchSubTopics, fetchTopicDetail, fetchWords, setActiveSubtopic } from "@/store/vocabDetailSlide";
import type { IVocabSubTopic } from "@/types";
import {
  ArrowLeft,
  BookMarked,
  Headphones,
  Layers3,
  Link2,
  Loader2,
  Shuffle,
  SpellCheck,
  Languages,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type LearnMode = "combined" | "listening" | "quiz-vi" | "quiz-en" | "flashcard" | "match";

interface ModeItem {
  key: LearnMode;
  label: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  description: string;
}

const MODES: ModeItem[] = [
  { key: "combined", label: "Kết hợp", icon: Shuffle, tone: "text-indigo-600", description: "Luân phiên nhiều dạng bài để học toàn diện và bớt nhàm chán." },
  { key: "listening", label: "Nghe điền", icon: Headphones, tone: "text-cyan-600", description: "Nghe phát âm và điền từ còn thiếu để luyện nghe chính xác." },
  { key: "quiz-en", label: "Quiz Anh", icon: SpellCheck, tone: "text-blue-600", description: "Nhìn từ tiếng Anh và chọn nghĩa tiếng Việt đúng." },
  { key: "quiz-vi", label: "Quiz Việt", icon: Languages, tone: "text-violet-600", description: "Nhìn nghĩa tiếng Việt và chọn từ tiếng Anh phù hợp." },
  { key: "flashcard", label: "Flashcard", icon: Layers3, tone: "text-emerald-600", description: "Lật thẻ nhanh để ghi nhớ nghĩa, ví dụ và cách dùng của từ." },
  { key: "match", label: "Nối nghĩa", icon: Link2, tone: "text-amber-600", description: "Ghép từ và nghĩa theo cặp để tăng phản xạ nhận diện." },
];

const MODE_SET = new Set(MODES.map((m) => m.key));
const DEFAULT_MODE: LearnMode = "combined";

function normalizeMode(raw?: string): LearnMode {
  if (raw && MODE_SET.has(raw as LearnMode)) {
    return raw as LearnMode;
  }
  return DEFAULT_MODE;
}

export default function VocabTopicDetail() {
  const { id, subtopicId, mode: modeParam } = useParams<{ id: string; subtopicId?: string; mode?: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [previewMode, setPreviewMode] = useState<LearnMode>(normalizeMode(modeParam));

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

  useEffect(() => {
    setPreviewMode(normalizeMode(modeParam));
  }, [modeParam]);

  const handleSelectSubtopic = (sub: IVocabSubTopic) => {
    if (!id) return;
    dispatch(setActiveSubtopic(sub.id));
    setPreviewMode(DEFAULT_MODE);
    navigate(`/vocab/topics/${id}/subtopics/${sub.id}`);
  };

  const handleSelectMode = (nextMode: LearnMode) => {
    setPreviewMode(nextMode);
  };

  const handleStartMode = () => {
    if (!id || !activeSubtopicId) return;
    navigate(`/vocab/topics/${id}/subtopics/${activeSubtopicId}/${previewMode}`);
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
        <h2 className="text-2xl font-bold tracking-tight">Chọn 1 sub-topic để bắt đầu học</h2>
        <p className="mt-2 text-base text-muted-foreground">
          Khi bạn chọn bài ở danh sách bên trái, hệ thống sẽ hiện 6 chế độ học để luyện theo phong cách bạn muốn.
        </p>
      </div>
    </div>
  );

  const activeMode = MODES.find((m) => m.key === previewMode) ?? MODES[0];
  const rightLearningState = (
    <div className="flex flex-col p-4 xl:h-full xl:min-h-0 xl:overflow-y-auto">
      <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
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
          <div className="rounded-xl border bg-background px-3 py-2 text-right">
            <div className="text-xs text-muted-foreground">Số từ</div>
            <div className="text-lg font-bold">{activeSubtopic?.wordCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">trong bài này</div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Chọn chế độ học</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((item) => {
            const Icon = item.icon;
            const selected = item.key === previewMode;
            return (
              <button
                key={item.key}
                onClick={() => handleSelectMode(item.key)}
                className={`rounded-xl border px-3 py-3 text-left transition-all ${
                  selected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/70 bg-background hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${item.tone}`} />
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/70 bg-card p-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold">
          {activeMode.label}
        </div>
        <p className="text-sm text-muted-foreground">{activeMode.description}</p>
        <div className="mt-5">
          <button
            onClick={handleStartMode}
            disabled={wordsStatus === "loading" || words.length === 0}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {wordsStatus === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải dữ liệu...
              </>
            ) : (
              `Bắt đầu ${activeMode.label}`
            )}
          </button>
        </div>
      </div>

      {wordsStatus === "succeeded" && words.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Bài này chưa có từ vựng sẵn sàng để học. Vui lòng quay lại sau.
        </div>
      )}

      {modeParam && MODE_SET.has(modeParam as LearnMode) && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="text-sm font-semibold">Đã vào chế độ: {activeMode.label}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Khung học thực tế của chế độ này sẽ được cắm vào vùng này ở bước tiếp theo.
          </p>
        </div>
      )}

      {wordsStatus !== "loading" && wordsStatus !== "succeeded" && (
        <div className="mt-4 text-sm text-muted-foreground">
          Chọn bài và chế độ học để bắt đầu.
        </div>
      )}
    </div>
  );

  return (
    <div className="px-3 py-3 lg:px-4 xl:h-[calc(100vh-6rem)]">
      <div className="mb-3 rounded-2xl border bg-background px-3 py-2">
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

      <div className="grid grid-cols-1 gap-3 xl:h-[calc(100%-5.5rem)] xl:grid-cols-12">
        <aside
          className={`col-span-1 w-full flex-col overflow-hidden rounded-2xl border bg-background xl:col-span-4 xl:h-full xl:min-h-0 ${
            activeSubtopicId ? "hidden xl:flex" : "flex"
          }`}
        >
          <div className="border-b px-3 py-2.5 sm:px-4 sm:py-3">
            <h2 className="text-lg font-bold sm:text-xl">Sub-topics</h2>
            <p className="text-sm text-muted-foreground">Chọn bài để mở chế độ học.</p>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-2.5 sm:p-3">
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
                    className={`w-full rounded-xl border text-left transition-colors ${
                      isActive
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/70 bg-muted/20 hover:bg-muted/35"
                    } p-2.5 sm:p-3`}
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-2 sm:mb-2">
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
                        <p className="mt-0.5 truncate text-sm font-semibold sm:mt-1 sm:text-base">{sub.title}</p>
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
