// src/features/vocab/components/VocabWordsDialog.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store";
import { showNotification } from "@/store/system/notificationSlice";
import {
  deleteAllWordsInSubTopic,
  fetchWords,
  updateEntryContextManual,
  generateSingleMeaningSync,
} from "@/store/vocab/vocabSlice";
import type { IWordDefinition, IVocabSubTopic, IVocabWordEntry } from "@/types";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
  Volume2,
} from "lucide-react";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

function getWordDisplay(entry: IVocabWordEntry) {
  return entry.wordText || entry.wordKey.replace(/_/g, " ");
}

function getUsAudioUrl(entry: IVocabWordEntry): string | undefined {
  return entry.wordDetail?.phonetics?.usAudioUrl;
}

export default function VocabWordsDialog({ open, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { words, subtopics, activeSubtopicId } = useAppSelector((s) => s.vocab.vocab);
  const subtopic = subtopics.data.find((s: IVocabSubTopic) => s.id === activeSubtopicId);

  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const readyCount = subtopic?.readyWordCount ?? words.data.filter((w) => w.wordReady).length;
  const totalCount = subtopic?.wordCount ?? words.data.length;

  const handleReload = async () => {
    if (!activeSubtopicId) return;

    setReloading(true);
    const res = await dispatch(fetchWords(activeSubtopicId));

    if (fetchWords.fulfilled.match(res)) {
      dispatch(showNotification({ message: "Đã reload danh sách từ", variant: "success" }));
    } else {
      dispatch(showNotification({ message: "Reload danh sách từ thất bại", variant: "error" }));
    }

    setReloading(false);
  };

  const handleDeleteAllWords = async () => {
    if (!activeSubtopicId) return;

    setDeletingAll(true);

    const res = await dispatch(deleteAllWordsInSubTopic(activeSubtopicId));

    if (deleteAllWordsInSubTopic.fulfilled.match(res)) {
      dispatch(
        showNotification({
          message: `Đã xóa tất cả từ trong "${subtopic?.title ?? activeSubtopicId}"`,
          variant: "success",
        })
      );

      dispatch(fetchWords(activeSubtopicId));
      setDeleteConfirmOpen(false);
    } else {
      dispatch(showNotification({ message: "Xóa từ thất bại", variant: "error" }));
    }

    setDeletingAll(false);
  };

  const handlePickDefinition = async (
    entryId: string,
    def: IWordDefinition
  ) => {
    const res = await dispatch(
      updateEntryContextManual({
        entryId,
        body: {
          definition: def.definition,
          meaningVi: def.meaningVi,
          example: def.example ?? "",
          viExample: def.viExample ?? "",
          level: def.level ?? "B1",
        },
      })
    );
    if (updateEntryContextManual.fulfilled.match(res)) {
      dispatch(showNotification({ message: "Đã cập nhật ngữ cảnh", variant: "success" }));
      setEditEntryId(null);
    } else {
      dispatch(showNotification({ message: "Cập nhật ngữ cảnh thất bại", variant: "error" }));
    }
  };

  const handleGenerateMeaning = async (entryId: string) => {
    setGeneratingId(entryId);
    const res = await dispatch(generateSingleMeaningSync(entryId));
    setGeneratingId(null);
    if (generateSingleMeaningSync.fulfilled.match(res)) {
      dispatch(showNotification({ message: "Đã tạo nghĩa mới từ AI", variant: "success" }));
      setEditEntryId(null);
    } else {
      dispatch(showNotification({ message: "Tạo nghĩa từ AI thất bại", variant: "error" }));
    }
  };

  const handlePlayUsAudio = async (entry: IVocabWordEntry) => {
    const audioUrl = getUsAudioUrl(entry);
    const word = getWordDisplay(entry);

    if (!audioUrl) {
      dispatch(
        showNotification({
          message: `Chưa có audio US cho "${word}"`,
          variant: "warning",
        })
      );
      return;
    }

    try {
      setPlayingId(entry.id);

      const audio = new Audio(audioUrl);

      audio.onended = () => setPlayingId(null);

      audio.onerror = () => {
        setPlayingId(null);
        dispatch(
          showNotification({
            message: `Không phát được audio US cho "${word}"`,
            variant: "error",
          })
        );
      };

      await audio.play();
    } catch {
      setPlayingId(null);
      dispatch(
        showNotification({
          message: `Không phát được audio US cho "${word}"`,
          variant: "error",
        })
      );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent
          className="!w-[98vw] !max-w-[1600px] h-[92vh] max-h-[92vh] overflow-hidden flex flex-col p-5"
          showCloseButton
        >
          <DialogHeader className="shrink-0">
            <div className="flex flex-col gap-3 pr-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg">
                  {subtopic?.title ?? "Words"}
                </DialogTitle>

                <DialogDescription className="line-clamp-2">
                  {subtopic?.titleVi && <span>{subtopic.titleVi} — </span>}
                  <span>
                    {readyCount}/{totalCount} từ đã sẵn sàng
                  </span>
                </DialogDescription>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={reloading || !activeSubtopicId}
                  onClick={handleReload}
                  title="Reload danh sách từ"
                >
                  {reloading ? (
                    <Loader2 size={14} className="mr-1 animate-spin" />
                  ) : (
                    <RefreshCw size={14} className="mr-1" />
                  )}
                  Reload
                </Button>

                {subtopic && words.data.length > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deletingAll}
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Xóa tất cả
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-2">
            {words.status === "loading" && (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin" />
              </div>
            )}

            {words.status !== "loading" && words.data.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Chưa có từ nào trong sub-topic này.
              </div>
            )}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-3">
              {words.data.map((entry: IVocabWordEntry) => {
                const hasContext =
                  entry.contextDefinition ||
                  entry.contextMeaningVi ||
                  entry.contextExample ||
                  entry.contextViExample;

                const displayWord = getWordDisplay(entry);
                const audioUrl = getUsAudioUrl(entry);
                const isPlaying = playingId === entry.id;

                return (
                  <div
                    key={entry.id}
                    className="h-fit min-w-0 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="truncate text-base font-semibold"
                            title={displayWord}
                          >
                            {displayWord}
                          </span>

                          <Badge variant="outline" className="shrink-0 text-xs">
                            {entry.pos}
                          </Badge>

                          {entry.wordReady ? (
                            <CheckCircle2 size={16} className="shrink-0 text-green-500" />
                          ) : (
                            <Clock size={16} className="shrink-0 text-orange-400" />
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            #{entry.order + 1}
                          </span>

                          {entry.wordDetail?.phonetics?.us && (
                            <span className="text-xs text-muted-foreground">
                              {entry.wordDetail.phonetics.us}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 shrink-0"
                        disabled={!audioUrl || isPlaying}
                        onClick={() => handlePlayUsAudio(entry)}
                        title={audioUrl ? "Phát audio US" : "Chưa có audio US"}
                      >
                        {isPlaying ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Volume2 size={14} />
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 shrink-0 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditEntryId(entry.id)}
                        title="Sửa ngữ cảnh"
                      >
                        <Pencil size={14} className="mr-1" />
                        Sửa ngữ cảnh
                      </Button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {hasContext && (
                        <div className="space-y-1.5 border-l-2 border-blue-400 pl-3">
                          {entry.contextMeaningVi && (
                            <div className="text-sm font-medium text-blue-700 dark:text-blue-400">
                              {entry.contextMeaningVi}
                            </div>
                          )}

                          {entry.contextDefinition && (
                            <div className="text-xs leading-relaxed text-muted-foreground">
                              {entry.contextDefinition}
                            </div>
                          )}

                          {entry.contextExample && (
                            <div className="text-sm italic leading-relaxed text-muted-foreground">
                              “{entry.contextExample}”
                            </div>
                          )}

                          {entry.contextViExample && (
                            <div className="text-sm italic leading-relaxed text-muted-foreground">
                              “{entry.contextViExample}”
                            </div>
                          )}

                          {entry.contextLevel && (
                            <Badge variant="secondary" className="text-[11px]">
                              {entry.contextLevel}
                            </Badge>
                          )}
                        </div>
                      )}

                      {entry.wordDetail && (
                        <div
                          className={`space-y-1 border-l-2 pl-3 ${
                            hasContext ? "border-muted opacity-70" : "border-green-400"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            {entry.wordDetail.cefrLevel && (
                              <Badge variant="secondary" className="text-[11px]">
                                {entry.wordDetail.cefrLevel}
                              </Badge>
                            )}

                            {entry.wordDetail.summaryVi && (
                              <span className="text-sm font-medium">
                                {entry.wordDetail.summaryVi}
                              </span>
                            )}
                          </div>

                          {!hasContext && entry.wordDetail.definitions?.[0] && (
                            <>
                              <div className="text-xs leading-relaxed text-muted-foreground">
                                {entry.wordDetail.definitions[0].definition}
                              </div>

                              <div className="text-xs leading-relaxed text-muted-foreground">
                                {entry.wordDetail.definitions[0].meaningVi}
                              </div>

                              {entry.wordDetail.definitions[0].example && (
                                <div className="text-sm italic leading-relaxed text-muted-foreground">
                                  “{entry.wordDetail.definitions[0].example}”
                                </div>
                              )}

                              {entry.wordDetail.definitions[0].viExample && (
                                <div className="text-sm italic leading-relaxed text-muted-foreground">
                                  “{entry.wordDetail.definitions[0].viExample}”
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {!entry.wordDetail && !hasContext && (
                        <div className="pl-1 text-xs italic text-muted-foreground">
                          {entry.wordReady ? "Đã tra cứu" : "Đang chờ tra cứu…"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="mt-3 shrink-0">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── EDIT CONTEXT DIALOG ─────────────────────────────────────────── */}
      <Dialog open={!!editEntryId} onOpenChange={(v) => !v && setEditEntryId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {(() => {
            const entry = words.data.find((w) => w.id === editEntryId);
            if (!entry) return null;
            const defs = entry.wordDetail?.definitions ?? [];
            const isGenerating = generatingId === entry.id;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className="truncate">Sửa ngữ cảnh — {getWordDisplay(entry)}</span>
                    <Badge variant="outline">{entry.pos}</Badge>
                  </DialogTitle>
                  <DialogDescription>
                    Chọn một nghĩa có sẵn hoặc yêu cầu AI tạo nghĩa mới phù hợp ngữ cảnh.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                  {/* Existing definitions */}
                  {defs.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        Các nghĩa có sẵn ({defs.length})
                      </h4>
                      {defs.map((def, idx) => (
                        <div
                          key={idx}
                          className="rounded-md border bg-card p-3 space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              {def.meaningVi && (
                                <div className="text-sm font-medium">{def.meaningVi}</div>
                              )}
                              <div className="text-xs leading-relaxed text-muted-foreground">
                                {def.definition}
                              </div>
                              {def.example && (
                                <div className="text-xs italic text-muted-foreground">
                                  “{def.example}”
                                </div>
                              )}
                              {def.viExample && (
                                <div className="text-xs italic text-muted-foreground">
                                  “{def.viExample}”
                                </div>
                              )}
                              {def.level && (
                                <Badge variant="secondary" className="text-[11px]">
                                  {def.level}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handlePickDefinition(entry.id, def)}
                          >
                            <CheckCircle2 size={14} className="mr-1" />
                            Chọn nghĩa này
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {defs.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground">
                      Không có nghĩa nào được tra cứu. Bạn có thể yêu cầu AI tạo nghĩa mới.
                    </div>
                  )}

                  {/* AI generate button */}
                  <div className="border-t pt-4">
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={isGenerating}
                      onClick={() => handleGenerateMeaning(entry.id)}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={14} className="mr-1 animate-spin" />
                          Đang sinh nghĩa qua AI…
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} className="mr-1" />
                          ✨ Generate Contextual Meaning via AI
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa tất cả từ</DialogTitle>

            <DialogDescription>
              Bạn có chắc muốn xóa tất cả{" "}
              <strong>{subtopic?.wordCount ?? words.data.length}</strong> từ trong sub-topic{" "}
              <strong>"{subtopic?.title ?? activeSubtopicId}"</strong> không?
              <span className="mt-1 block text-destructive">
                Hành động này sẽ xóa toàn bộ word entries của sub-topic hiện tại.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deletingAll}
            >
              Hủy
            </Button>

            <Button
              variant="destructive"
              onClick={handleDeleteAllWords}
              disabled={deletingAll}
            >
              {deletingAll ? (
                <>
                  <Loader2 size={14} className="mr-1 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                <>
                  <Trash2 size={14} className="mr-1" />
                  Xóa tất cả
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}