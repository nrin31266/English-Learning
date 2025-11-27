import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ILessonDetailsDto, ILessonProcessingStepNotifyEvent } from "@/types"
import { formatDate, formatDuration } from "@/utils/timeUtils"
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  FileAudio2,
  FileQuestion,
  Languages,
  Loader2,
  Sparkles,
  User2,
  Youtube
} from "lucide-react"
import React, { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"
import DictationBadge from "../components/DictationBadge"
import ProcessingSection from "../components/ProcessingSection"
import ShadowingBadge from "../components/ShadowingBadge"
import { useAppDispatch, useAppSelector } from "@/store"
import { cancelAiProcessing, fetchLessonDetails, publishLesson, reloadLessonDetails, retryLessonGeneration, unpublishLesson, updateLessonDetailsFromProcessingEvent } from "@/store/learningcontent/lessonDetailsSlide"
import SkeletonComponent from "@/components/SkeletonComponent"
import { useWebSocket } from "@/features/ws/providers/WebSockerProvider"
import SentencesTab from "../components/SentencesTab"
import LessonSitting from "../components/LessonSitting"
import { showNotification } from "@/store/system/notificationSlice"

// ───────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────



const renderSourceIcon = (sourceType: ILessonDetailsDto["sourceType"]) => {
  switch (sourceType) {
    case "YOUTUBE":
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border bg-red-50/70 px-2 py-0.5 text-[11px] text-red-600">
          <Youtube className="h-3.5 w-3.5" />
          <span>YouTube</span>
        </div>
      )
    case "AUDIO_FILE":
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border bg-slate-50 px-2 py-0.5 text-[11px]">
          <FileAudio2 className="h-3.5 w-3.5" />
          <span>Audio file</span>
        </div>
      )
    default:
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border bg-slate-50 px-2 py-0.5 text-[11px]">
          <FileQuestion className="h-3.5 w-3.5" />
          <span>Other</span>
        </div>
      )
  }
}

const renderLessonType = (type: ILessonDetailsDto["lessonType"]) => {
  if (type === "AI_ASSISTED") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-purple-300/70 bg-purple-50/60 px-2 py-0 text-[11px] text-purple-700"
      >
        <Sparkles className="h-3 w-3" />
        AI Assisted
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 border-sky-300/70 bg-sky-50/60 px-2 py-0 text-[11px] text-sky-700"
    >
      <User2 className="h-3 w-3" />
      Traditional
    </Badge>
  )
}

const renderStatusBadge = (status: ILessonDetailsDto["status"]) => {
  if (status === "READY") {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-400/60 px-2 py-0 text-[11px] text-emerald-600">
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </Badge>
    )
  }

  if (status === "PROCESSING") {
    return (
      <Badge variant="outline" className="gap-1 border-amber-400/60 px-2 py-0 text-[11px] text-amber-600">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </Badge>
    )
  }

  if (status === "ERROR") {
    return (
      <Badge variant="outline" className="gap-1 border-red-400/60 px-2 py-0 text-[11px] text-red-600">
        <AlertTriangle className="h-3 w-3" />
        Error
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1 border-slate-300 px-2 py-0 text-[11px] text-slate-600">
      <CircleDot className="h-3 w-3" />
      Draft
    </Badge>
  )
}



// ───────────────────────────────────────────
// Mock data để test UI
// ───────────────────────────────────────────

const mockLessonDetails: ILessonDetailsDto = {
  id: 4,
  topic: { id: 2, name: "Business English", slug: "business-english" },
  title: "Giving a Project Status Update",
  thumbnailUrl: "https://picsum.photos/seed/lesson-detail/640/320",
  slug: "giving-a-project-status-update",
  description: "Learn useful phrases and structures to give clear project status updates in English.",
  lessonType: "AI_ASSISTED",
  processingStep: "TRANSCRIBED",
  languageLevel: "B2",
  sourceType: "AUDIO_FILE",
  sourceUrl: "https://cdn.example.com/audio/status-b2.mp3",
  audioUrl: null,
  sourceReferenceId: "file-4",
  sourceLanguage: "en-UK",
  durationSeconds: 240,
  totalSentences: 22,
  status: "PROCESSING",
  aiJobId: "job-4",
  aiMessage: null,
  enableDictation: true,
  enableShadowing: true,
  createdAt: "2025-11-18T12:00:00.000Z",
  updatedAt: "2025-11-18T12:30:00.000Z",
  publishedAt: null,
  sentences: [
    {
      id: 1,
      lessonId: 4,
      orderIndex: 1,
      textRaw: "Hi everyone, thanks for joining the meeting today.",
      textDisplay: "Hi everyone, thanks for joining the meeting today.",
      translationVi: "Chào mọi người, cảm ơn đã tham gia buổi họp hôm nay.",
      phoneticUk: null,
      phoneticUs: null,
      audioStartMs: 0,
      audioEndMs: 3200,
      audioSegmentUrl: null,
      aiMetadataJson: null,
      isActive: true,
      createdAt: "2025-11-18T12:00:00.000Z",
      updatedAt: "2025-11-18T12:00:00.000Z",
      lessonWords: [
        {
          id: 11,
          sentenceId: 1,
          orderIndex: 1,
          wordText: "Hi",
          wordLower: "hi",
          wordNormalized: "hi",
          wordSlug: "hi",
          startCharIndex: 0,
          endCharIndex: 2,
          audioStartMs: 0,
          audioEndMs: 400,
          isPunctuation: false,
          isClickable: true,
          createdAt: "2025-11-18T12:00:00.000Z",
          updatedAt: "2025-11-18T12:00:00.000Z",
        },
        {
          id: 12,
          sentenceId: 1,
          orderIndex: 2,
          wordText: "everyone,",
          wordLower: "everyone,",
          wordNormalized: "everyone",
          wordSlug: "everyone",
          startCharIndex: 3,
          endCharIndex: 12,
          audioStartMs: 400,
          audioEndMs: 1000,
          isPunctuation: false,
          isClickable: true,
          createdAt: "2025-11-18T12:00:00.000Z",
          updatedAt: "2025-11-18T12:00:00.000Z",
        },
      ],
    },
    {
      id: 2,
      lessonId: 4,
      orderIndex: 2,
      textRaw: "Today I'll give you a quick update on our marketing project.",
      textDisplay: "Today I'll give you a quick update on our marketing project.",
      translationVi: "Hôm nay tôi sẽ cập nhật nhanh cho mọi người về dự án marketing.",
      phoneticUk: null,
      phoneticUs: null,
      audioStartMs: 3300,
      audioEndMs: 7100,
      audioSegmentUrl: null,
      aiMetadataJson: null,
      isActive: true,
      createdAt: "2025-11-18T12:00:00.000Z",
      updatedAt: "2025-11-18T12:00:00.000Z",
      lessonWords: [],
    },
    {
      id: 3,
      lessonId: 4,
      orderIndex: 3,
      textRaw: "Overall, the project is slightly behind schedule but still on track for launch next month.",
      textDisplay:
        "Overall, the project is slightly behind schedule but still on track for launch next month.",
      translationVi:
        "Nhìn chung, dự án hơi chậm so với kế hoạch nhưng vẫn đúng tiến độ để ra mắt vào tháng sau.",
      phoneticUk: null,
      phoneticUs: null,
      audioStartMs: 7200,
      audioEndMs: 13000,
      audioSegmentUrl: null,
      aiMetadataJson: null,
      isActive: true,
      createdAt: "2025-11-18T12:00:00.000Z",
      updatedAt: "2025-11-18T12:00:00.000Z",
      lessonWords: [],
    },
  ],
}






// ───────────────────────────────────────────
// Main page
// ───────────────────────────────────────────

const LessonDetails: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const dispatch = useAppDispatch();
  // Mock: luôn dùng mockLessonDetails, chỉ chỉnh slug cho vui
  const [hydrating, setHydrating] = React.useState(true);
  useEffect(() => {
    const id = setTimeout(() => setHydrating(false), 50); // 10–120ms
    return () => clearTimeout(id);
  }, []);
  const { t } = useTranslation()

  const {  data, status, error } = useAppSelector(state => state.learningContent.lessonDetails.lessonDetails);
  const { status: mutationStatus, type: mutationType } = useAppSelector(state => state.learningContent.lessonDetails.lessonDetailsMutation);
    //  const data = mockLessonDetails;
  const [ lesson ] = useMemo(() => {
    if (data && data.slug === slug) {
      return [data];
    }
    return [null];
  }, [data?.id, slug]);
  const stompClient = useWebSocket();
  useEffect(() => {
      if (!stompClient) return;
      if (lesson === null) return;
  
      const destination = `/topic/learning-contents/lessons/${lesson.id}/processing-step`;
      console.log("📡 Subscribing:", destination);
  
      const subscription = stompClient.subscribe(destination, (msg) => {
        try {
          const event: ILessonProcessingStepNotifyEvent = JSON.parse(msg.body);
          console.log("LessonDetailsPage received event:", event);
          
          // If completed, reload full lesson details
          if(event.processingStep === "COMPLETED" ) {dispatch(reloadLessonDetails({ slug: lesson.slug }))} else{
            dispatch(updateLessonDetailsFromProcessingEvent(event));
          }
        } catch (e) {
          console.error("Failed to parse WS event for lesson", lesson.id, e);
        }
      });
  
      return () => {
        console.log("❌ Unsubscribing:", destination);
        subscription.unsubscribe();
      };
    }, [stompClient?.ws, dispatch, lesson?.id]);

  useEffect(() => {
    if (slug) {
      dispatch(fetchLessonDetails({ slug: slug }));
    }
  }, [dispatch, slug]);
  if (hydrating || status === "loading" || !data || data.slug !== slug) {
    return <SkeletonComponent />;
  }
  return (
    <div className="space-y-4">
      {/* Header / Breadcrumb */}
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem >
                <BreadcrumbPage>{t("appMenu.learningContent")}</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />

              <BreadcrumbItem >
                <Link to="/all-lessons" className="flex underline items-center gap-1  text-muted-foreground">
                  {t("lessonDetails.breadcrumb.lessons")}
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{data.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>


          <h1 className="mt-1 line-clamp-2 text-base font-semibold">
            {data.title}
          </h1>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {renderStatusBadge(data.status)}
            {renderLessonType(data.lessonType)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t("lessonDetails.topicLabel")}{" "}
            <span className="font-medium">{data.topic.name}</span>
          </p>
        </div>
      </div>

    
      {/* Tabs: transcript / meta */}
      <Tabs defaultValue="summary" className="space-y-3">
        <TabsList className="h-8">
          <TabsTrigger value="summary" className="h-7 px-3 text-xs">
            {t("lessonDetails.tabs.summary")}
          </TabsTrigger>
          <TabsTrigger value="transcript" className="h-7 px-3 text-xs">
            {t("lessonDetails.tabs.transcript")}
          </TabsTrigger>
          <TabsTrigger value="meta" className="h-7 px-3 text-xs">
            {t("lessonDetails.tabs.metadata")}
          </TabsTrigger>
          <TabsTrigger value="sitting" className="h-7 px-3 text-xs">
            {t("lessonDetails.tabs.settings")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="mt-0">
            {/* Thumbnail + meta */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="overflow-hidden">
          <div className="h-64 w-full bg-slate-100">
              <img
                src={data.thumbnailUrl || '/default_thumbnail.png'}
                alt={data.title}
                className="h-full w-full object-contain"
              />
            </div>
          <CardContent className="space-y-3 p-4">
            {data.description && (
              <p className="text-sm text-muted-foreground">{data.description}</p>
            )}

            <div className="grid gap-3 text-[11px] md:grid-cols-12">

              <div className="space-y-1 col-span-6 ">
                <p className="flex items-center gap-1.5 font-medium">
                  <FileAudio2 className="h-3.5 w-3.5" />
                  {t("lessonDetails.summary.source")}
                </p>
                <div className="text-muted-foreground">
                  {renderSourceIcon(data.sourceType)}
                </div>
                <p className="truncate text-muted-foreground">
                  <span className="font-medium">{t("lessonDetails.summary.sourceUrl")} </span>
                  <a
                    href={data.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-[11px] text-blue-600 underline"
                  >
                    {data.sourceUrl}
                  </a>
                </p>
                <p className="truncate text-muted-foreground">
                  <span className="font-medium">{t("lessonDetails.summary.audioUrl")} </span>
                  <a
                    href={data.audioUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-[11px] text-blue-600 underline"
                  >
                    {data.audioUrl || "#"}
                  </a>
                </p>
                 <p className="truncate text-muted-foreground">
                  <span className="font-medium">{t("lessonDetails.summary.aiMetadataUrl")} </span>
                  <a
                    href={data.aiMetadataUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-[11px] text-blue-600 underline"
                  >
                    {data.aiMetadataUrl || "#"}
                  </a>
                </p>
              </div>
              <div className="space-y-1 col-span-3">
                <p className="flex items-center gap-1.5 font-medium">
                  <Languages className="h-3.5 w-3.5" />
                  {t("lessonDetails.summary.levelLanguage")}
                </p>
                <p className="text-muted-foreground">
                  {t("lessonDetails.summary.level")} <span className="font-medium">{data.languageLevel}</span>
                </p>
                <p className="text-muted-foreground">
                  {t("lessonDetails.summary.sourceLanguage")} <span className="font-medium">{data.sourceLanguage}</span>
                </p>
              </div>

              <div className="space-y-1 col-span-3">
                <p className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  {t("lessonDetails.summary.duration")}
                </p>
                <p className="text-muted-foreground">
                  {formatDuration(data.durationSeconds)}
                </p>
                <p className="text-muted-foreground">
                  {t("lessonDetails.summary.sentences")}{" "}
                  <span className="font-medium">{data.totalSentences || (data.sentences && data.sentences.length) || 0}</span>
                </p>
              </div>

            </div>

            <Separator className="my-2" />

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <DictationBadge enabled={data.enableDictation} />
              <ShadowingBadge enabled={data.enableShadowing} />
            </div>

            <Separator className="my-2" />

            <div className="grid gap-3 text-[11px] md:grid-cols-3">
              <div>
                <p className="font-medium">{t("lessonDetails.summary.createdAt")}</p>
                <p className="text-muted-foreground">{formatDate(data.createdAt)}</p>
              </div>
              <div>
                <p className="font-medium">{t("lessonDetails.summary.updatedAt")}</p>
                <p className="text-muted-foreground">{formatDate(data.updatedAt)}</p>
              </div>
              <div>
                <p className="font-medium">{t("lessonDetails.summary.published")}</p>
                <p className="text-muted-foreground">
                  {data.publishedAt ? formatDate(data.publishedAt) : t("lessonDetails.summary.unpublished")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <ProcessingSection lesson={data} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4" />
                {t("lessonDetails.actions.title")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("lessonDetails.actions.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {/* <Button size="sm" variant="default">
                Preview learner view
              </Button> */}
              <Button onClick={()=>{
                if(!data.publishedAt){
                  dispatch(publishLesson({id: data.id}));
                }else{
                  dispatch(unpublishLesson({id: data.id}));
                }
                
              }} className={`${data.publishedAt ? "bg-gray-500 text-white hover:bg-gray-500/90 hover:text-white" : "bg-blue-500 text-white hover:bg-blue-500/90 hover:text-white"}`} disabled={data.status !== "READY" || mutationStatus === "loading"} size="sm" variant="outline">
                { mutationStatus === "loading" && mutationType === "publish" &&
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                }
                {data.publishedAt ? t("lessonDetails.actions.unpublishLesson") : t("lessonDetails.actions.publishLesson")}
              </Button>
              <Button onClick={()=>{
                dispatch(retryLessonGeneration({ id: data.id , isRestart: false }));
              }} disabled={(data.status !== "ERROR" && data.status !== "DRAFT") || data.publishedAt != null || mutationStatus === "loading"} size="sm" variant="outline">
                {
                  mutationStatus === "loading" && mutationType === "re-try" &&
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                }
                {t("lessonDetails.actions.regenerate")}
              </Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white hover:text-white" onClick={()=>{
                dispatch(retryLessonGeneration({ id: data.id , isRestart: true }));
              }} disabled={(data.status !== "ERROR" && data.status !== "DRAFT") || data.publishedAt != null || mutationStatus === "loading"} size="sm" variant="outline">
                {
                  mutationStatus === "loading" && mutationType === "re-try" &&
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                }
                {t("lessonDetails.actions.restart")}
              </Button>
              {/* Red button */}
              <Button onClick={()=>{
                dispatch(cancelAiProcessing({id: data.id}))
              }} size="sm" variant="destructive" disabled={data.status !== "PROCESSING" || mutationStatus === "loading"}>
                {
                  mutationStatus === "loading" && mutationType === "stop-ai-processing" &&
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                }
                {t("lessonDetails.actions.stopProcessing")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

        </TabsContent>
        <TabsContent value="transcript" className="mt-0">
          <SentencesTab lesson={data} />
        </TabsContent>

        <TabsContent value="meta" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("lessonDetails.metadata.title")}</CardTitle>
              <CardDescription className="text-xs">
                {t("lessonDetails.metadata.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[480px] overflow-auto rounded bg-slate-950/95 p-3 text-[11px] text-slate-100">
                {JSON.stringify(lesson, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sitting" className="mt-0">
          <LessonSitting lesson={data} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default LessonDetails
