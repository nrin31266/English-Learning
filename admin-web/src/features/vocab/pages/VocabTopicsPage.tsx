import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWebSocket } from "@/features/ws/providers/WebSockerProvider";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  createVocabTopic,
  fetchVocabTopics,
  generateSubTopics,
  fetchSubTopics,
  setActiveTopicId,
  updateSubtopicFromWs,
  onSubtopicsGenerated,
} from "@/store/vocab/vocabSlice";
import { showNotification } from "@/store/system/notificationSlice";
import type { IVocabSubTopicReadyEvent, IVocabSubtopicsGeneratedEvent, IVocabTopic } from "@/types";
import { BookOpen, CheckCircle2, ChevronRight, Loader2, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const statusColor: Record<IVocabTopic["status"], string> = {
  DRAFT: "bg-slate-500",
  GENERATING_SUBTOPICS: "bg-yellow-500",
  READY_FOR_WORD_GEN: "bg-blue-500",
  PROCESSING: "bg-orange-500",
  READY: "bg-green-600",
};

export default function VocabTopicsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const stompClient = useWebSocket();
  const { topics } = useAppSelector((s) => s.vocab.vocab);

  const [inline, setInline] = useState({ title: "", tags: "", cefrRange: "B1-B2" });
  const [inlineRunning, setInlineRunning] = useState(false);
  const [loadingGenIds, setLoadingGenIds] = useState<Set<string>>(new Set());

  const handleInlineSubmit = async () => {
    if (!inline.title.trim()) return;
    setInlineRunning(true);
    const tagsArr = inline.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const res = await dispatch(createVocabTopic({
      title: inline.title, description: "",
      tags: tagsArr, cefrRange: inline.cefrRange, estimatedWordCount: 400,
    }));
    if (!createVocabTopic.fulfilled.match(res)) {
      dispatch(showNotification({ message: "Tạo topic thất bại", variant: "error" }));
      setInlineRunning(false); return;
    }
    dispatch(showNotification({ message: `Topic "${res.payload.title}" đã tạo! Đang gen sub-topics...`, variant: "info" }));
    dispatch(generateSubTopics(res.payload.id));
    setInline({ title: "", tags: "", cefrRange: "B1-B2" });
    setInlineRunning(false);
  };

  useEffect(() => {
    if (topics.status === "idle") dispatch(fetchVocabTopics());
  }, [dispatch]);

  // WS: subtopic word processing complete
  useEffect(() => {
    if (!stompClient?.connected) return;
    const sub = stompClient.subscribe("/topic/vocab/subtopic-ready", (msg) => {
      const event: IVocabSubTopicReadyEvent = JSON.parse(msg.body);
      dispatch(updateSubtopicFromWs(event));
      dispatch(showNotification({
        message: `Sub-topic "${event.subtopicTitle}" READY${event.topicReady ? ` — Topic "${event.topicTitle}" hoàn thành!` : ""}`,
        variant: event.topicReady ? "success" : "info",
      }));
    });
    return () => sub.unsubscribe();
  }, [stompClient?.connected]);

  // WS: subtopics generation done — update topic status + fetch subtopics for active topic
  useEffect(() => {
    if (!stompClient?.connected) return;
    const sub = stompClient.subscribe("/topic/vocab/subtopics-generated/*", (msg) => {
      const event: IVocabSubtopicsGeneratedEvent = JSON.parse(msg.body);
      dispatch(onSubtopicsGenerated(event));
      dispatch(showNotification({ message: `Sub-topics đã gen xong cho "${event.topicTitle}" (${event.subtopicCount} sub-topics)`, variant: "success" }));
      dispatch(fetchSubTopics(event.topicId));
    });
    return () => sub.unsubscribe();
  }, [stompClient?.connected]);

  const handleGenSubtopics = (topicId: string) => {
    setLoadingGenIds((prev) => new Set([...prev, topicId]));
    dispatch(showNotification({ message: "Bắt đầu gen sub-topics...", variant: "info" }));
    dispatch(generateSubTopics(topicId)).finally(() => {
      setLoadingGenIds((prev) => { const s = new Set(prev); s.delete(topicId); return s; });
    });
  };

  const handleViewSubtopics = (topicId: string) => {
    dispatch(setActiveTopicId(topicId));
    dispatch(fetchSubTopics(topicId));
    navigate(`/vocab/topics/${topicId}/subtopics`);
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><BookOpen size={20} /> Vocab Topics</h1>
        <p className="text-sm text-muted-foreground">Quản lý chủ đề từ vựng</p>
      </div>

      {/* Flow guide */}
      <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-4 py-2">
        <span className="flex items-center gap-1.5 font-medium"><span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>Tạo Topic</span>
        <ChevronRight size={14} className="text-muted-foreground" />
        <span className="flex items-center gap-1.5 font-medium"><span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>AI gen Sub-topics</span>
        <ChevronRight size={14} className="text-muted-foreground" />
        <span className="flex items-center gap-1.5 font-medium"><span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>AI gen Từ vựng cho từng sub-topic</span>
        <ChevronRight size={14} className="text-muted-foreground" />
        <span className="flex items-center gap-1.5 text-green-600 font-medium"><CheckCircle2 size={14} />Hoàn thành</span>
      </div>

      {/* Inline test form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Wand2 size={15} /> Tạo Topic mới &amp; Gen Sub-topics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-52">
              <Label className="text-xs">Tên topic (VD: Office Vocabulary, Travel, TOEIC Part 5)</Label>
              <Input
                className="mt-1"
                placeholder="Nhập tên chủ đề..."
                value={inline.title}
                disabled={inlineRunning}
                onChange={(e) => setInline({ ...inline, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleInlineSubmit()}
              />
            </div>
            <div className="w-52">
              <Label className="text-xs">Tags (VD: TOEIC, B1, Office)</Label>
              <Input
                className="mt-1"
                placeholder="TOEIC, B1"
                value={inline.tags}
                disabled={inlineRunning}
                onChange={(e) => setInline({ ...inline, tags: e.target.value })}
              />
            </div>
            <div className="w-28">
              <Label className="text-xs">CEFR</Label>
              <Input
                className="mt-1"
                placeholder="B1-B2"
                value={inline.cefrRange}
                disabled={inlineRunning}
                onChange={(e) => setInline({ ...inline, cefrRange: e.target.value })}
              />
            </div>
            <Button onClick={handleInlineSubmit} disabled={inlineRunning || !inline.title.trim()}>
              {inlineRunning
                ? <><Loader2 size={14} className="animate-spin mr-1" />Đang chạy...</>
                : <><Wand2 size={14} className="mr-1" />Tạo &amp; Gen</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {topics.status === "loading" && <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tiêu đề</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>CEFR</TableHead>
            <TableHead>Sub-topics</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {topics.data.map((topic: IVocabTopic) => (
            <TableRow key={topic.id}>
              <TableCell>
                <div className="font-medium">{topic.title}</div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {topic.tags?.map((tag: string) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                </div>
              </TableCell>
              <TableCell className="text-sm">{topic.cefrRange}</TableCell>
              <TableCell className="text-sm">
                {topic.readySubtopicCount}/{topic.subtopicCount}
              </TableCell>
              <TableCell>
                <Badge className={`text-white text-xs ${statusColor[topic.status]}`}>{topic.status}</Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                {topic.status === "DRAFT" && topic.subtopicCount === 0 && (
                  <Button size="sm" variant="outline"
                    disabled={loadingGenIds.size > 0}
                    onClick={() => handleGenSubtopics(topic.id)}>
                    {loadingGenIds.has(topic.id)
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Wand2 size={14} />}
                    <span className="ml-1">{loadingGenIds.has(topic.id) ? "Đang gen..." : "Gen Sub-topics"}</span>
                  </Button>
                )}
                <Button size="sm" onClick={() => handleViewSubtopics(topic.id)}>
                  <ChevronRight size={14} /><span className="ml-1">Sub-topics</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

    </div>
  );
}
