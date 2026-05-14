// src/features/vocab/components/VocabWordsDialog.tsx
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
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import VocabWordCard from "./VocabWordCard";
import VocabWordContextDialog from "./VocabWordContextDialog";

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
  const subtopicTitleEn = subtopic?.title?.trim() || "Words";
  const subtopicTitleVi = subtopic?.titleVi?.trim() || "Chưa có tiêu đề tiếng Việt";
  const editingEntry = words.data.find((w) => w.id === editEntryId) ?? null;

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
            <DialogTitle className="sr-only">Sub-topic words</DialogTitle>
            <div className="flex flex-col gap-3 pr-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="text-lg font-semibold">Words</div>
                <DialogDescription className="space-y-1 text-sm">
                  <div className="truncate">
                    <span className="font-semibold text-foreground">EN:</span>{" "}
                    <span className="text-foreground">{subtopicTitleEn}</span>
                  </div>
                  <div className="line-clamp-2">
                    <span className="font-semibold text-foreground">VI:</span>{" "}
                    <span>{subtopicTitleVi}</span>
                  </div>
                  <div className="text-xs">
                    Ready <span className="font-semibold">{readyCount}</span> /{" "}
                    <span className="font-semibold">{totalCount}</span>
                  </div>
                </DialogDescription>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  size="icon"
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
                const displayWord = getWordDisplay(entry);
                const audioUrl = getUsAudioUrl(entry);
                const isPlaying = playingId === entry.id;

                return (
                  <VocabWordCard
                    key={entry.id}
                    entry={entry}
                    displayWord={displayWord}
                    isPlaying={isPlaying}
                    audioAvailable={!!audioUrl}
                    onPlayAudio={() => handlePlayUsAudio(entry)}
                    onOpenContext={() => setEditEntryId(entry.id)}
                  />
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

      <VocabWordContextDialog
        open={!!editEntryId}
        entry={editingEntry}
        isGenerating={!!(editingEntry && generatingId === editingEntry.id)}
        onOpenChange={(v) => {
          if (!v) setEditEntryId(null);
        }}
        onPickDefinition={handlePickDefinition}
        onGenerateMeaning={handleGenerateMeaning}
      />

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
