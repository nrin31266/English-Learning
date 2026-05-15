import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
  const subtopicTitleVi = subtopic?.titleVi?.trim() || "";
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
      dispatch(showNotification({ message: `Đã xóa tất cả từ`, variant: "success" }));
      dispatch(fetchWords(activeSubtopicId));
      setDeleteConfirmOpen(false);
    } else {
      dispatch(showNotification({ message: "Xóa từ thất bại", variant: "error" }));
    }
    setDeletingAll(false);
  };

  const handlePickDefinition = async (entryId: string, def: IWordDefinition) => {
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
      dispatch(showNotification({ message: `Chưa có audio US cho "${word}"`, variant: "warning" }));
      return;
    }
    try {
      setPlayingId(entry.id);
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        setPlayingId(null);
        dispatch(showNotification({ message: `Không phát được audio`, variant: "error" }));
      };
      await audio.play();
    } catch {
      setPlayingId(null);
      dispatch(showNotification({ message: `Không phát được audio`, variant: "error" }));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="!h-[92vh] !w-[98vw] !max-w-[1600px] overflow-hidden border-border/60 p-3">
          <DialogHeader className="shrink-0">
            <DialogTitle className="sr-only">Sub-topic words</DialogTitle>
            
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-lg font-semibold">{subtopicTitleEn}</h2>
                  {subtopic?.cefrLevel && (
                    <Badge variant="outline" className="shrink-0 px-2 py-0.5 text-xs">{subtopic.cefrLevel}</Badge>
                  )}
                  <Badge variant="outline" className="shrink-0 px-2 py-0.5 text-xs font-medium">
                    {readyCount}/{totalCount} Ready
                  </Badge>
                </div>
                {subtopicTitleVi && (
                  <p className="truncate text-sm text-muted-foreground">{subtopicTitleVi}</p>
                )}
                {subtopic?.description && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">{subtopic.description}</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={reloading || !activeSubtopicId}
                  onClick={handleReload}
                >
                  <RefreshCw size={14} className={reloading ? "animate-spin" : ""} />
                </Button>

                {subtopic && words.data.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive hover:text-destructive"
                    disabled={deletingAll}
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Delete all
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            {words.status === "loading" && words.data.length === 0 && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {words.status !== "loading" && words.data.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Chưa có từ nào trong sub-topic này.
              </div>
            )}

            <div className="grid auto-rows-fr gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
            <Button size="sm" variant="outline" className="h-8" onClick={onClose}>
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
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)} disabled={deletingAll}>
              Hủy
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteAllWords} disabled={deletingAll}>
              {deletingAll ? (
                <><Loader2 size={12} className="mr-1 animate-spin" /> Đang xóa...</>
              ) : (
                <><Trash2 size={12} className="mr-1" /> Xóa tất cả</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
