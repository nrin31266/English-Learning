import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/store";
import { showNotification } from "@/store/system/notificationSlice";
import {
  clearWordDetail,
  createAdminWord,
  deleteAdminWord,
  fetchAdminWords,
  fetchWordUsages,
  getAdminWordDetail,
  regenerateAdminWord,
  updateAdminWord,
  updateWordDefinitions,
  type IFetchAdminWordsParams,
} from "@/store/dictionary/dictionarySlice";
import type { IAdminWord, IAdminWordDefinition, IWordEntryUsage } from "@/types";
import { extractError } from "@/utils/reduxUtils";
import { formatDate } from "@/utils/timeUtils";
import {
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const POS_OPTIONS = [
  "NOUN",
  "VERB",
  "ADJ",
  "ADV",
  "PHRASE",
  "PHRASAL_VERB",
  "COLLOCATION",
  "IDIOM",
  "FIXED_EXPRESSION",
] as const;

const statusBadgeClass: Record<IAdminWord["status"], string> = {
  PENDING: "bg-amber-500 text-white",
  PROCESSING: "bg-slate-500 text-white",
  READY: "bg-emerald-600 text-white",
  FAILED: "bg-red-600 text-white",
};

function emptyDefinition(): IAdminWordDefinition {
  return {
    definition: "",
    meaningVi: "",
    example: "",
    viExample: "",
    level: "B1",
  };
}

function getRejectMessage(payload: unknown, fallback: string): string {
  const err = extractError(payload);
  return err.message ?? fallback;
}

export default function AdminDictionaryWordsPage() {
  const dispatch = useAppDispatch();
  const { words, detail, usages } = useAppSelector((s) => s.dictionary.dictionary);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [usedFilter, setUsedFilter] = useState<"all" | "used" | "unused">("all");
  const [deepFields, setDeepFields] = useState(true);
  const [sort, setSort] = useState("updatedDesc");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    wordText: "",
    pos: "NOUN",
    context: "",
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [savingBasic, setSavingBasic] = useState(false);
  const [savingDefinitions, setSavingDefinitions] = useState(false);
  const [syncUsedEntries, setSyncUsedEntries] = useState(true);
  const [editableDefinitions, setEditableDefinitions] = useState<IAdminWordDefinition[]>([]);

  const [basicForm, setBasicForm] = useState({
    text: "",
    summaryVi: "",
    cefrLevel: "",
    context: "",
    status: "PENDING",
    phoneticsUk: "",
    phoneticsUs: "",
    isPhrase: false,
    phraseType: "",
    isValid: true,
  });

  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [usageOnlyReady, setUsageOnlyReady] = useState<boolean | null>(null);
  const [usagePage, setUsagePage] = useState(0);
  const [deleteInUseInfo, setDeleteInUseInfo] = useState<{ message: string; wordId: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchParams: IFetchAdminWordsParams = useMemo(
    () => ({
      q: query || undefined,
      pos: posFilter,
      status: statusFilter,
      used: usedFilter,
      deepFields,
      page,
      size,
      sort,
    }),
    [query, posFilter, statusFilter, usedFilter, deepFields, page, size, sort]
  );

  useEffect(() => {
    dispatch(fetchAdminWords(fetchParams));
  }, [dispatch, fetchParams]);

  useEffect(() => {
    if (!detail.data) return;
    setBasicForm({
      text: detail.data.text ?? "",
      summaryVi: detail.data.summaryVi ?? "",
      cefrLevel: detail.data.cefrLevel ?? "",
      context: detail.data.context ?? "",
      status: detail.data.status ?? "PENDING",
      phoneticsUk: detail.data.phonetics?.uk ?? "",
      phoneticsUs: detail.data.phonetics?.us ?? "",
      isPhrase: !!detail.data.isPhrase,
      phraseType: detail.data.phraseType ?? "",
      isValid: detail.data.isValid ?? true,
    });
    setEditableDefinitions(
      (detail.data.definitions ?? []).map((d) => ({
        definition: d.definition ?? "",
        meaningVi: d.meaningVi ?? "",
        example: d.example ?? "",
        viExample: d.viExample ?? "",
        level: d.level ?? "B1",
        exampleContainsExactWord: d.exampleContainsExactWord,
      }))
    );
  }, [detail.data]);

  useEffect(() => {
    if (!usageDialogOpen || !selectedWordId) return;
    dispatch(fetchWordUsages({ wordId: selectedWordId, page: usagePage, size: 10, onlyReady: usageOnlyReady }));
  }, [dispatch, selectedWordId, usageDialogOpen, usagePage, usageOnlyReady]);

  const refreshList = () => dispatch(fetchAdminWords(fetchParams));

  const openWordDetail = (wordId: string) => {
    setSelectedWordId(wordId);
    setDetailOpen(true);
    dispatch(getAdminWordDetail(wordId));
  };

  const handleCreateWord = async () => {
    if (!createForm.wordText.trim()) {
      dispatch(showNotification({ message: "Word text is required", variant: "warning" }));
      return;
    }
    setCreating(true);
    const res = await dispatch(createAdminWord(createForm));
    setCreating(false);
    if (createAdminWord.fulfilled.match(res)) {
      setCreateOpen(false);
      setCreateForm({ wordText: "", pos: "NOUN", context: "" });
      dispatch(showNotification({ message: `Created "${res.payload.text}"`, variant: "success" }));
      openWordDetail(res.payload.id);
      refreshList();
      return;
    }
    dispatch(showNotification({ message: getRejectMessage(res.payload, "Create word failed"), variant: "error" }));
  };

  const handleSaveBasic = async () => {
    if (!selectedWordId) return;
    setSavingBasic(true);
    const res = await dispatch(
      updateAdminWord({
        wordId: selectedWordId,
        body: {
          text: basicForm.text,
          summaryVi: basicForm.summaryVi,
          cefrLevel: basicForm.cefrLevel || undefined,
          context: basicForm.context,
          status: basicForm.status,
          isPhrase: basicForm.isPhrase,
          phraseType: basicForm.phraseType,
          isValid: basicForm.isValid,
          phonetics: {
            uk: basicForm.phoneticsUk || undefined,
            us: basicForm.phoneticsUs || undefined,
          },
        },
      })
    );
    setSavingBasic(false);
    if (updateAdminWord.fulfilled.match(res)) {
      dispatch(showNotification({ message: "Word updated", variant: "success" }));
      refreshList();
      return;
    }
    dispatch(showNotification({ message: getRejectMessage(res.payload, "Update failed"), variant: "error" }));
  };

  const handleSaveDefinitions = async () => {
    if (!selectedWordId) return;
    setSavingDefinitions(true);
    const res = await dispatch(
      updateWordDefinitions({
        wordId: selectedWordId,
        body: {
          definitions: editableDefinitions,
          syncUsedEntries,
        },
      })
    );
    setSavingDefinitions(false);
    if (updateWordDefinitions.fulfilled.match(res)) {
      dispatch(showNotification({ message: "Definitions saved", variant: "success" }));
      refreshList();
      return;
    }
    dispatch(showNotification({ message: getRejectMessage(res.payload, "Save definitions failed"), variant: "error" }));
  };

  const handleDeleteWord = async (word: IAdminWord) => {
    if (!confirm(`Delete "${word.text}"?`)) return;
    const res = await dispatch(deleteAdminWord(word.id));
    if (deleteAdminWord.fulfilled.match(res)) {
      dispatch(showNotification({ message: "Word deleted", variant: "success" }));
      refreshList();
      return;
    }
    const err = extractError(res.payload);
    if (err.code === 2014) {
      setDeleteInUseInfo({ message: err.message ?? "Word is in use", wordId: word.id });
    } else {
      dispatch(showNotification({ message: err.message ?? "Delete failed", variant: "error" }));
    }
  };

  const handleRegenerate = async (word: IAdminWord) => {
    const ok = confirm(`Đưa "${word.text}" về PENDING để worker generate lại?`);
    if (!ok) return;
    const clearDefinitions = confirm("Clear definitions trước khi regenerate?");
    const res = await dispatch(regenerateAdminWord({ wordId: word.id, clearDefinitions }));
    if (regenerateAdminWord.fulfilled.match(res)) {
      dispatch(showNotification({ message: "Word moved to PENDING", variant: "success" }));
      refreshList();
      if (selectedWordId === word.id) dispatch(getAdminWordDetail(word.id));
      return;
    }
    dispatch(showNotification({ message: getRejectMessage(res.payload, "Regenerate failed"), variant: "error" }));
  };

  const renderPagination = () => {
    const current = words.page + 1;
    const total = Math.max(1, words.totalPages);
    const pages = new Set<number>([1, total, current - 1, current, current + 1]);
    const pageList = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const tokens: Array<number | string> = [];
    let prev = 0;
    for (const p of pageList) {
      if (prev !== 0 && p - prev > 1) {
        tokens.push(`ellipsis-${prev}-${p}`);
      }
      tokens.push(p);
      prev = p;
    }

    return (
      <Pagination className="mx-0 w-auto justify-start">
        <PaginationContent className="flex-nowrap">
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (words.hasPrevious) setPage((p) => Math.max(0, p - 1));
              }}
            />
          </PaginationItem>
          {tokens.map((token) => {
            if (typeof token === "string") {
              return (
                <PaginationItem key={token}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }
            return (
              <PaginationItem key={token}>
                <PaginationLink
                  href="#"
                  isActive={token === current}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(token - 1);
                  }}
                >
                  {token}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (words.hasNext) setPage((p) => p + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="space-y-4 p-4">
      <Card className="border-border/60">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-semibold">Dictionary Words</h1>
              <p className="text-sm text-muted-foreground">Manage shared dictionary words and synced vocab contexts.</p>
            </div>
            <Button className="h-9 gap-1.5 bg-slate-800 text-white hover:bg-slate-900" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              Add word
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t pt-3 lg:flex-nowrap">
            <div className="flex min-w-[360px] flex-1 items-center gap-2 lg:max-w-[620px]">
              <div className="relative min-w-[300px] flex-1">
              <Search size={14} className="pointer-events-none absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(0);
                }}
                className="pl-8"
                placeholder="Search word, definition, example..."
              />
              </div>
              <label className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border/70 px-2 py-1.5 text-sm">
                <Switch checked={deepFields} onCheckedChange={(v) => { setDeepFields(!!v); setPage(0); }} />
                <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">Deep search</span>
              </label>
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={posFilter}
              onValueChange={(v) => {
                setPosFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Part of Speech" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All POS</SelectItem>
                {POS_OPTIONS.map((pos) => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select
              value={usedFilter}
              onValueChange={(v: "all" | "used" | "unused") => {
                setUsedFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[145px]"><SelectValue placeholder="Usage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All words</SelectItem>
                <SelectItem value="used">Used in vocab</SelectItem>
                <SelectItem value="unused">Not used yet</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sort}
              onValueChange={(v) => {
                setSort(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedDesc">Updated newest</SelectItem>
                <SelectItem value="updatedAsc">Updated oldest</SelectItem>
                <SelectItem value="createdDesc">Created newest</SelectItem>
                <SelectItem value="createdAsc">Created oldest</SelectItem>
                <SelectItem value="wordAsc">Word A-Z</SelectItem>
                <SelectItem value="wordDesc">Word Z-A</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto text-sm whitespace-nowrap text-muted-foreground">
              {words.totalElements} words
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[24%]">Word</TableHead>
                <TableHead className="w-[8%]">POS</TableHead>
                <TableHead className="w-[10%]">Status</TableHead>
                <TableHead className="w-[24%]">Summary</TableHead>
                <TableHead className="w-[7%]">Defs</TableHead>
                <TableHead className="w-[10%]">Used</TableHead>
                <TableHead className="w-[10%]">Updated</TableHead>
                <TableHead className="w-[7%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {words.status === "loading" && words.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {words.status !== "loading" && words.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No words found.
                  </TableCell>
                </TableRow>
              )}
              {words.data.map((word) => (
                <TableRow key={word.id}>
                  <TableCell className="whitespace-normal align-top">
                    <div className="break-words font-semibold">{word.text}</div>
                    <div className="break-all text-xs text-muted-foreground">{word.key}</div>
                  </TableCell>
                  <TableCell className="align-top">
                    <span className="break-words">{word.pos}</span>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge className={statusBadgeClass[word.status]}>{word.status}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal align-top text-sm text-muted-foreground">
                    <span className="break-words">{word.summaryVi || "—"}</span>
                  </TableCell>
                  <TableCell className="align-top">{word.definitionCount}</TableCell>
                  <TableCell className="align-top">
                    <span className="font-medium">{word.usedEntryCount}</span>
                    <span className="text-xs text-muted-foreground"> / ready {word.readyEntryCount}</span>
                  </TableCell>
                  <TableCell className="align-top text-xs text-muted-foreground">
                    {word.updatedAt ? formatDate(word.updatedAt) : "—"}
                  </TableCell>
                  <TableCell className="align-top text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openWordDetail(word.id)}>
                        <Pencil size={14} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRegenerate(word)}>
                        <RefreshCw size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteWord(word)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Select
          value={String(size)}
          onValueChange={(v) => {
            setSize(Number(v));
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[10, 20, 50].map((n) => <SelectItem key={n} value={String(n)}>{n} per page</SelectItem>)}
          </SelectContent>
        </Select>
        {renderPagination()}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add word</DialogTitle>
            <DialogDescription>Create a new dictionary word in PENDING status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="mb-1 text-sm font-medium">Word text</div>
              <Input value={createForm.wordText} onChange={(e) => setCreateForm((p) => ({ ...p, wordText: e.target.value }))} />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium">POS</div>
              <Select value={createForm.pos} onValueChange={(v) => setCreateForm((p) => ({ ...p, pos: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POS_OPTIONS.map((pos) => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1 text-sm font-medium">Context (optional)</div>
              <Textarea rows={4} value={createForm.context} onChange={(e) => setCreateForm((p) => ({ ...p, context: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateWord} disabled={creating}>
              {creating && <Loader2 size={14} className="mr-1 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) {
            setSelectedWordId(null);
            dispatch(clearWordDetail());
          }
        }}
      >
        <DialogContent className="!h-[92vh] !max-w-[1200px] overflow-y-auto border-border/60">
          <DialogHeader>
            <DialogTitle className="text-[22px] font-semibold">
              {detail.data?.text || "Word detail"}
            </DialogTitle>
            <DialogDescription>Edit basic fields, definitions, and usage.</DialogDescription>
          </DialogHeader>

          {detail.status === "loading" && !detail.data && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              Loading word detail...
            </div>
          )}

          {detail.data && (
            <div className="space-y-4">
              <Card className="border-border/60">
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{detail.data.key}</Badge>
                    <Badge variant="outline">{detail.data.pos}</Badge>
                    <Badge className={statusBadgeClass[detail.data.status]}>{detail.data.status}</Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-sm font-medium">Text</div>
                      <Input value={basicForm.text} onChange={(e) => setBasicForm((p) => ({ ...p, text: e.target.value }))} />
                    </div>
                    <div>
                      <div className="mb-1 text-sm font-medium">Status</div>
                      <Select value={basicForm.status} onValueChange={(v) => setBasicForm((p) => ({ ...p, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["PENDING", "PROCESSING", "READY", "FAILED"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="mb-1 text-sm font-medium">Summary VI</div>
                      <Input value={basicForm.summaryVi} onChange={(e) => setBasicForm((p) => ({ ...p, summaryVi: e.target.value }))} />
                    </div>
                    <div>
                      <div className="mb-1 text-sm font-medium">CEFR</div>
                      <Select value={basicForm.cefrLevel || "none"} onValueChange={(v) => setBasicForm((p) => ({ ...p, cefrLevel: v === "none" ? "" : v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {["A1", "A2", "B1", "B2", "C1", "C2"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="mb-1 text-sm font-medium">Phonetics UK</div>
                      <Input value={basicForm.phoneticsUk} onChange={(e) => setBasicForm((p) => ({ ...p, phoneticsUk: e.target.value }))} />
                    </div>
                    <div>
                      <div className="mb-1 text-sm font-medium">Phonetics US</div>
                      <Input value={basicForm.phoneticsUs} onChange={(e) => setBasicForm((p) => ({ ...p, phoneticsUs: e.target.value }))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={basicForm.isPhrase} onCheckedChange={(v) => setBasicForm((p) => ({ ...p, isPhrase: !!v }))} />
                      <span className="text-sm">isPhrase</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={basicForm.isValid} onCheckedChange={(v) => setBasicForm((p) => ({ ...p, isValid: !!v }))} />
                      <span className="text-sm">isValid</span>
                    </div>
                    <div className="md:col-span-2">
                      <div className="mb-1 text-sm font-medium">Phrase type</div>
                      <Input value={basicForm.phraseType} onChange={(e) => setBasicForm((p) => ({ ...p, phraseType: e.target.value }))} />
                    </div>
                    <div className="md:col-span-2">
                      <div className="mb-1 text-sm font-medium">Context</div>
                      <Textarea rows={3} value={basicForm.context} onChange={(e) => setBasicForm((p) => ({ ...p, context: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button className="h-9" onClick={handleSaveBasic} disabled={savingBasic}>
                      {savingBasic && <Loader2 size={14} className="mr-1 animate-spin" />}
                      Save basic
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Definitions</h3>
                    <Button size="sm" variant="outline" onClick={() => setEditableDefinitions((prev) => [...prev, emptyDefinition()])}>
                      <Plus size={13} className="mr-1" />
                      Add definition
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {editableDefinitions.map((def, idx) => (
                      <div key={idx} className="rounded-lg border border-border/70 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold">#{idx}</div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={def.level || "B1"}
                              onValueChange={(v) =>
                                setEditableDefinitions((prev) =>
                                  prev.map((d, i) => (i === idx ? { ...d, level: v } : d))
                                )
                              }
                            >
                              <SelectTrigger className="h-8 w-[90px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["A1", "A2", "B1", "B2", "C1", "C2"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setEditableDefinitions((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Input
                            placeholder="Meaning VI"
                            value={def.meaningVi}
                            onChange={(e) =>
                              setEditableDefinitions((prev) =>
                                prev.map((d, i) => (i === idx ? { ...d, meaningVi: e.target.value } : d))
                              )
                            }
                          />
                          <Textarea
                            rows={2}
                            placeholder="Definition EN"
                            value={def.definition}
                            onChange={(e) =>
                              setEditableDefinitions((prev) =>
                                prev.map((d, i) => (i === idx ? { ...d, definition: e.target.value } : d))
                              )
                            }
                          />
                          <Textarea
                            rows={2}
                            placeholder="Example EN"
                            value={def.example}
                            onChange={(e) =>
                              setEditableDefinitions((prev) =>
                                prev.map((d, i) => (i === idx ? { ...d, example: e.target.value } : d))
                              )
                            }
                          />
                          <Textarea
                            rows={2}
                            placeholder="Example VI"
                            value={def.viExample}
                            onChange={(e) =>
                              setEditableDefinitions((prev) =>
                                prev.map((d, i) => (i === idx ? { ...d, viExample: e.target.value } : d))
                              )
                            }
                          />
                        </div>
                        {detail.data?.definitions?.[idx]?.exampleContainsExactWord === false && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
                            <TriangleAlert size={12} />
                            Example may not contain exact word token.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={syncUsedEntries} onCheckedChange={(v) => setSyncUsedEntries(!!v)} />
                      Sync used vocab entries
                    </label>
                    <Button onClick={handleSaveDefinitions} disabled={savingDefinitions}>
                      {savingDefinitions && <Loader2 size={14} className="mr-1 animate-spin" />}
                      Save definitions
                    </Button>
                  </div>
                  {detail.data.syncSummary && (
                    <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                      Synced: updated {detail.data.syncSummary.updatedEntryCount}, rescored {detail.data.syncSummary.rescoredEntryCount}, skipped {detail.data.syncSummary.skippedEntryCount}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold">Usage</h3>
                    {(detail.data.usedEntryCount ?? 0) > (detail.data.entriesPreview?.length ?? 0) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setUsagePage(0);
                          setUsageDialogOpen(true);
                        }}
                      >
                        View all usages
                      </Button>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Used entries: <span className="font-medium text-foreground">{detail.data.usedEntryCount}</span>, ready entries:{" "}
                    <span className="font-medium text-foreground">{detail.data.readyEntryCount}</span>
                  </div>
                  <div className="space-y-2">
                    {(detail.data.entriesPreview ?? []).slice(0, 6).map((entry) => (
                      <div key={entry.entryId} className="rounded-md border border-border/70 p-2 text-sm">
                        <div className="font-medium">{entry.topicTitle} / {entry.subtopicTitle}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {entry.contextMeaningVi || entry.contextDefinition || "No cached context"}
                        </div>
                      </div>
                    ))}
                    {(detail.data.entriesPreview ?? []).length === 0 && (
                      <div className="text-sm text-muted-foreground">No usage entries.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
        <DialogContent className="!max-w-[1100px]">
          <DialogHeader>
            <DialogTitle>Word usages</DialogTitle>
            <DialogDescription>Vocab entries currently referencing this word.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Select
              value={usageOnlyReady === null ? "all" : usageOnlyReady ? "ready" : "notReady"}
              onValueChange={(v) => {
                setUsagePage(0);
                setUsageOnlyReady(v === "all" ? null : v === "ready");
              }}
            >
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entries</SelectItem>
                <SelectItem value="ready">Only ready</SelectItem>
                <SelectItem value="notReady">Only not ready</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic/Subtopic</TableHead>
                  <TableHead>Word</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Context</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usages.data?.data ?? []).map((entry: IWordEntryUsage) => (
                  <TableRow key={entry.entryId}>
                    <TableCell className="whitespace-normal">
                      <div>{entry.topicTitle}</div>
                      <div className="text-xs text-muted-foreground">{entry.subtopicTitle}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.wordText}</div>
                      <div className="text-xs text-muted-foreground">{entry.wordKey}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.wordReady ? "default" : "secondary"}>
                        {entry.wordReady ? "READY" : "PENDING"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[420px] whitespace-normal text-sm text-muted-foreground">
                      {entry.contextMeaningVi || entry.contextDefinition || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="justify-between">
            <div className="text-xs text-muted-foreground">
              {(usages.data?.totalElements ?? 0)} entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!usages.data?.hasPrevious}
                onClick={() => setUsagePage((p) => Math.max(0, p - 1))}
              >
                Prev
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {(usages.data?.page ?? 0) + 1}/{Math.max(1, usages.data?.totalPages ?? 1)}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={!usages.data?.hasNext}
                onClick={() => setUsagePage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteInUseInfo} onOpenChange={(v) => !v && setDeleteInUseInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Không thể xóa từ</DialogTitle>
            <DialogDescription>{deleteInUseInfo?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteInUseInfo(null)}>Đóng</Button>
            <Button
              onClick={() => {
                if (deleteInUseInfo?.wordId) {
                  setSelectedWordId(deleteInUseInfo.wordId);
                  setUsagePage(0);
                  setUsageOnlyReady(null);
                  setUsageDialogOpen(true);
                }
                setDeleteInUseInfo(null);
              }}
            >
              Xem usages ngay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
