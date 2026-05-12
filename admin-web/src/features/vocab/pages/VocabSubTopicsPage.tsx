import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWebSocket } from "@/features/ws/providers/WebSockerProvider";
import { useAppDispatch, useAppSelector } from "@/store";
import { showNotification } from "@/store/system/notificationSlice";
import {
  fetchSubTopics,
  fetchVocabTopics,
  fetchWords,
  generateWords,
  setActiveSubtopicId,
  updateSubtopicFromWs,
} from "@/store/vocab/vocabSlice";
import type { IVocabSubTopic, IVocabSubTopicReadyEvent, IVocabTopic } from "@/types";
import { ChevronRight, Loader2, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import VocabWordsDrawer from "../components/VocabWordsDrawer";

const subtopicStatusColor: Record<IVocabSubTopic["status"], string> = {
  PENDING_WORDS: "bg-slate-500",
  GENERATING_WORDS: "bg-yellow-500",
  PROCESSING_WORDS: "bg-orange-500",
  READY: "bg-green-600",
};

export default function VocabSubTopicsPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const dispatch = useAppDispatch();
  const stompClient = useWebSocket();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingSubIds, setLoadingSubIds] = useState<Set<string>>(new Set());

  const { topics, subtopics } = useAppSelector((s) => s.vocab.vocab);
  const topic = topics.data.find((t: IVocabTopic) => t.id === topicId);

  useEffect(() => {
    if (topics.status === "idle") dispatch(fetchVocabTopics());
  }, [dispatch]);

  useEffect(() => {
    if (topicId) dispatch(fetchSubTopics(topicId));
  }, [topicId, dispatch]);

  // WS: word processing progress
  useEffect(() => {
    if (!stompClient?.connected) return;
    const sub = stompClient.subscribe("/topic/vocab/subtopic-ready", (msg) => {
      const event: IVocabSubTopicReadyEvent = JSON.parse(msg.body);
      dispatch(updateSubtopicFromWs(event));
    });
    return () => sub.unsubscribe();
  }, [stompClient?.connected]);

  const handleGenWords = (subtopicId: string) => {
    setLoadingSubIds((prev) => new Set([...prev, subtopicId]));
    dispatch(showNotification({ message: "Bắt đầu gen danh sách từ...", variant: "info" }));
    dispatch(generateWords(subtopicId)).finally(() => {
      setLoadingSubIds((prev) => { const s = new Set(prev); s.delete(subtopicId); return s; });
    });
  };

  const handleViewWords = (subtopicId: string) => {
    dispatch(setActiveSubtopicId(subtopicId));
    dispatch(fetchWords(subtopicId));
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4 p-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><Link to="/vocab/topics" className="text-muted-foreground hover:text-foreground">Vocab Topics</Link></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{topic?.title ?? topicId}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {topic && (
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold">{topic.title}</h1>
            <p className="text-sm text-muted-foreground">{topic.cefrRange}</p>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            Sub-topics: {topic.readySubtopicCount}/{topic.subtopicCount} READY
          </div>
        </div>
      )}

      {subtopics.status === "loading" && (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Sub-topic</TableHead>
            <TableHead>CEFR</TableHead>
            <TableHead>Từ (Ready/Total)</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subtopics.data.map((sub: IVocabSubTopic) => (
            <TableRow key={sub.id}>
              <TableCell className="text-muted-foreground text-sm">{sub.order + 1}</TableCell>
              <TableCell className="max-w-[220px]">
                <div className="font-medium truncate">{sub.title}</div>
                <div className="text-xs text-muted-foreground truncate">{sub.description}</div>
              </TableCell>
              <TableCell><Badge variant="outline">{sub.cefrLevel}</Badge></TableCell>
              <TableCell className="text-sm">{sub.readyWordCount}/{sub.wordCount}</TableCell>
              <TableCell className="w-28">
                <Progress
                  value={sub.wordCount > 0 ? (sub.readyWordCount / sub.wordCount) * 100 : 0}
                  className="h-2"
                />
              </TableCell>
              <TableCell>
                <Badge className={`text-white text-xs ${subtopicStatusColor[sub.status]}`}>{sub.status}</Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                {(sub.status === "PENDING_WORDS") && (
                  <Button size="sm" variant="outline"
                    disabled={loadingSubIds.size > 0}
                    onClick={() => handleGenWords(sub.id)}>
                    {loadingSubIds.has(sub.id)
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Wand2 size={14} />}
                    <span className="ml-1">{loadingSubIds.has(sub.id) ? "Đang gen..." : "Gen Từ"}</span>
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => handleViewWords(sub.id)}>
                  <ChevronRight size={14} /><span className="ml-1">Xem từ</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <VocabWordsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
