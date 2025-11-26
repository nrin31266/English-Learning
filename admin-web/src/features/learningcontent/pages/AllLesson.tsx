import SkeletonComponent from '@/components/SkeletonComponent';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector, type RootState } from '@/store';
import { fetchLessons } from '@/store/learningcontent/lessonSlice';
import type { ILessonDto } from '@/types';
import { SquarePlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LessonDataTable from '../components/LessonDataTable';
import LessonFilterPanel from '../components/LessonFilterPanel';
import PaginationBar from '../components/PaginationBar';

const FILTER_KEYS = [
    "search",
    "status",
    "topicSlug",
    "lessonType",
    "languageLevel",
    "sourceType",
    "enableDictation",
    "enableShadowing",
    "page",
    "size",
    "sort",
];


export const mockLessons: ILessonDto[] = [
    {
        id: 1,
        topic: { id: 1, name: "Daily English Conversation", slug: "daily-english-conversation" },
        title: "Ordering Coffee at a Café",
        thumbnailUrl: null,
        slug: "ordering-coffee-at-a-cafe",
        description: "Basic A1 conversation for ordering drinks.",
        lessonType: "AI_ASSISTED",
        processingStep: "NONE",
        languageLevel: "A1",
        sourceType: "YOUTUBE",
        sourceUrl: "https://www.youtube.com/watch?v=coffee-a1",
        audioUrl: null,
        sourceReferenceId: null,
        sourceLanguage: "en-US",
        durationSeconds: 120,
        totalSentences: 12,
        status: "DRAFT",
        aiJobId: null,
        enableDictation: true,
        enableShadowing: true,
        createdAt: "2025-11-20T08:00:00.000Z",
        updatedAt: "2025-11-20T08:10:00.000Z",
        publishedAt: null,
    },
    {
        id: 2,
        topic: { id: 1, name: "Daily English Conversation", slug: "daily-english-conversation" },
        title: "Small Talk with a Neighbor",
        thumbnailUrl: null,
        slug: "small-talk-with-a-neighbor",
        description: null,
        lessonType: "AI_ASSISTED",
        processingStep: "PROCESSING_STARTED",
        languageLevel: "A2",
        sourceType: "YOUTUBE",
        sourceUrl: "https://www.youtube.com/watch?v=neighbor-a2",
        audioUrl: null,
        sourceReferenceId: null,
        sourceLanguage: "en-UK",
        durationSeconds: null,
        totalSentences: null,
        status: "PROCESSING",
        aiJobId: "job-2",
        enableDictation: true,
        enableShadowing: false,
        createdAt: "2025-11-20T09:00:00.000Z",
        updatedAt: "2025-11-20T09:05:00.000Z",
        publishedAt: null,
    },
    {
        id: 3,
        topic: { id: 2, name: "Business English", slug: "business-english" },
        title: "Scheduling a Meeting via Email",
        thumbnailUrl: null,
        slug: "scheduling-a-meeting-via-email",
        description: "Formal business email expressions.",
        lessonType: "TRADITIONAL",
        processingStep: "SOURCE_FETCHED",
        languageLevel: "B1",
        sourceType: "AUDIO_FILE",
        sourceUrl: "https://cdn.example.com/audio/meeting-b1.mp3",
        audioUrl: null,
        sourceReferenceId: "file-3",
        sourceLanguage: "en-US",
        durationSeconds: 180,
        totalSentences: 18,
        status: "PROCESSING",
        aiJobId: "job-3",
        enableDictation: false,
        enableShadowing: true,
        createdAt: "2025-11-19T10:00:00.000Z",
        updatedAt: "2025-11-19T10:20:00.000Z",
        publishedAt: null,
    },
    {
        id: 4,
        topic: { id: 2, name: "Business English", slug: "business-english" },
        title: "Giving a Project Status Update",
        thumbnailUrl: "https://picsum.photos/seed/lesson-4/400/200",
        slug: "giving-a-project-status-update",
        description: null,
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
        status: "READY",
        aiJobId: "job-4",
        enableDictation: true,
        enableShadowing: true,
        createdAt: "2025-11-18T12:00:00.000Z",
        updatedAt: "2025-11-18T12:30:00.000Z",
        publishedAt: "2025-11-18T13:00:00.000Z",
    },
    {
        id: 5,
        topic: { id: 3, name: "IELTS Listening", slug: "ielts-listening" },
        title: "IELTS Listening Section 2 – Campus Tour",
        thumbnailUrl: "https://picsum.photos/seed/lesson-5/400/200",
        slug: "ielts-listening-campus-tour",
        description: "Practice for IELTS band 6.0+",
        lessonType: "TRADITIONAL",
        processingStep: "NLP_ANALYZED",
        languageLevel: "B2",
        sourceType: "OTHER",
        sourceUrl: "https://ielts.example.com/audio/campus-tour.mp3",
        audioUrl: null,
        sourceReferenceId: "ielts-2",
        sourceLanguage: "en-UK",
        durationSeconds: 360,
        totalSentences: 30,
        status: "READY",
        aiJobId: "job-5",
        enableDictation: false,
        enableShadowing: false,
        createdAt: "2025-11-17T14:00:00.000Z",
        updatedAt: "2025-11-17T14:40:00.000Z",
        publishedAt: "2025-11-17T15:00:00.000Z",
    },
    {
        id: 6,
        topic: { id: 3, name: "IELTS Listening", slug: "ielts-listening" },
        title: "IELTS Listening Section 3 – Group Discussion",
        thumbnailUrl: null,
        slug: "ielts-listening-group-discussion",
        description: null,
        lessonType: "AI_ASSISTED",
        processingStep: "NONE",
        languageLevel: "C1",
        sourceType: "YOUTUBE",
        sourceUrl: "https://www.youtube.com/watch?v=ielts-section3",
        audioUrl: null,
        sourceReferenceId: "yt-6",
        sourceLanguage: "en-UK",
        durationSeconds: 420,
        totalSentences: 35,
        status: "READY",
        aiJobId: "job-6",
        enableDictation: true,
        enableShadowing: false,
        createdAt: "2025-11-16T09:30:00.000Z",
        updatedAt: "2025-11-16T09:50:00.000Z",
        publishedAt: "2025-11-16T10:00:00.000Z",
    },
    {
        id: 7,
        topic: { id: 4, name: "TOEIC Listening", slug: "toeic-listening" },
        title: "TOEIC Part 3 – Office Conversation",
        thumbnailUrl: null,
        slug: "toeic-part-3-office-conversation",
        description: null,
        lessonType: "TRADITIONAL",
        processingStep: "COMPLETED",
        languageLevel: "B1",
        sourceType: "AUDIO_FILE",
        sourceUrl: "https://cdn.example.com/toeic/office-conversation.mp3",
        audioUrl: null,
        sourceReferenceId: "toeic-7",
        sourceLanguage: "en-US",
        durationSeconds: 300,
        totalSentences: 25,
        status: "READY",
        aiJobId: "job-7",
        enableDictation: true,
        enableShadowing: true,
        createdAt: "2025-11-15T11:00:00.000Z",
        updatedAt: "2025-11-15T11:20:00.000Z",
        publishedAt: "2025-11-15T11:30:00.000Z",
    },
    {
        id: 8,
        topic: { id: 4, name: "TOEIC Listening", slug: "toeic-listening" },
        title: "TOEIC Part 4 – Talk about New Policy",
        thumbnailUrl: "https://picsum.photos/seed/lesson-8/400/200",
        slug: "toeic-part-4-new-policy",
        description: null,
        lessonType: "AI_ASSISTED",
        processingStep: "FAILED",
        languageLevel: "B2",
        sourceType: "OTHER",
        sourceUrl: "https://cdn.example.com/toeic/new-policy.mp3",
        audioUrl: null,
        sourceReferenceId: "toeic-8",
        sourceLanguage: "en-US",
        durationSeconds: null,
        totalSentences: null,
        status: "ERROR",
        aiJobId: "job-8",
        enableDictation: false,
        enableShadowing: true,
        createdAt: "2025-11-15T13:00:00.000Z",
        updatedAt: "2025-11-15T13:10:00.000Z",
        publishedAt: null,
    },
    {
        id: 9,
        topic: { id: 5, name: "Kids English", slug: "kids-english" },
        title: "Animals in the Zoo",
        thumbnailUrl: null,
        slug: "animals-in-the-zoo",
        description: "Fun A1 story about animals.",
        lessonType: "AI_ASSISTED",
        processingStep: "TRANSCRIBED",
        languageLevel: "A1",
        sourceType: "YOUTUBE",
        sourceUrl: "https://www.youtube.com/watch?v=animals-a1",
        audioUrl: null,
        sourceReferenceId: null,
        sourceLanguage: "en-US",
        durationSeconds: 150,
        totalSentences: 14,
        status: "DRAFT",
        aiJobId: "job-9",
        enableDictation: false,
        enableShadowing: false,
        createdAt: "2025-11-14T08:00:00.000Z",
        updatedAt: "2025-11-14T08:05:00.000Z",
        publishedAt: null,
    },
    {
        id: 10,
        topic: { id: 5, name: "Kids English", slug: "kids-english" },
        title: "At the Supermarket",
        thumbnailUrl: "https://picsum.photos/seed/lesson-10/400/200",
        slug: "at-the-supermarket",
        description: null,
        lessonType: "TRADITIONAL",
        processingStep: "NLP_ANALYZED",
        languageLevel: "A2",
        sourceType: "AUDIO_FILE",
        sourceUrl: "https://cdn.example.com/kids/supermarket.mp3",
        audioUrl: null,
        sourceReferenceId: null,
        sourceLanguage: "en-UK",
        durationSeconds: 200,
        totalSentences: 16,
        status: "PROCESSING",
        aiJobId: "job-10",
        enableDictation: true,
        enableShadowing: false,
        createdAt: "2025-11-13T10:00:00.000Z",
        updatedAt: "2025-11-13T10:10:00.000Z",
        publishedAt: null,
    },
    {
        id: 11,
        topic: { id: 6, name: "Advanced Listening", slug: "advanced-listening" },
        title: "Investing in Stocks: A Long-Term Strategy",
        thumbnailUrl: "https://assets.parroto.app/assets/categories/68281f883f0ac569b357bdf6/thumbnail-vtZD5V_Z-ID5DDGDShpGV.webp",
        slug: "investing-in-stocks-a-long-term-strategy",
        description: null,
        lessonType: "AI_ASSISTED",
        processingStep: "NONE",
        languageLevel: "C1",
        sourceType: "AUDIO_FILE",
        sourceUrl: "https://assets.parroto.app/assets/lessons/68889c0e8aa91b55140c4f71/lesson-yzSb6u6a_ItQLOupmQ_Yd.mp3",
        audioUrl: null,
        sourceReferenceId: null,
        sourceLanguage: "en-UK",
        durationSeconds: null,
        totalSentences: null,
        status: "DRAFT",
        aiJobId: null,
        enableDictation: true,
        enableShadowing: true,
        createdAt: "2025-11-24T04:51:07.268Z",
        updatedAt: "2025-11-24T04:51:07.268Z",
        publishedAt: null,
    },
    {
        id: 12,
        topic: { id: 6, name: "Advanced Listening", slug: "advanced-listening" },
        title: "Global Warming and Climate Policy",
        thumbnailUrl: null,
        slug: "global-warming-and-climate-policy",
        description: "C2 lecture-style listening.",
        lessonType: "TRADITIONAL",
        processingStep: "COMPLETED",
        languageLevel: "C2",
        sourceType: "OTHER",
        sourceUrl: "https://cdn.example.com/advanced/climate-policy.mp3",
        audioUrl: null,
        sourceReferenceId: "adv-12",
        sourceLanguage: "en-US",
        durationSeconds: 600,
        totalSentences: 40,
        status: "READY",
        aiJobId: "job-12",
        enableDictation: false,
        enableShadowing: true,
        createdAt: "2025-11-10T15:00:00.000Z",
        updatedAt: "2025-11-10T15:30:00.000Z",
        publishedAt: "2025-11-10T16:00:00.000Z",
    },
]

const AllLesson = () => {

    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [hydrating, setHydrating] = useState(true);
    useEffect(() => {
        const id = setTimeout(() => setHydrating(false), 50); // 10–120ms
        return () => clearTimeout(id);
    }, []);

    const prevParamsRef = useRef<string | null>(null);   // null = chưa có lần trước
    const dispatch = useAppDispatch();
    const { status, data } = useAppSelector((state: RootState) => state.learningContent.lessons.lessons);
    const loading = status === "loading";

    useEffect(() => {
        const currStr = searchParams.toString();
        const curr = new URLSearchParams(currStr);

        // 👉 LẦN ĐẦU TIÊN: luôn gọi API
        if (prevParamsRef.current === null) {
            // TODO: fetchLessons(curr)
            handleFetchLessons(curr);
            prevParamsRef.current = currStr;
            return;
        }

        // 👉 Các lần sau: so sánh chỉ FILTER_KEYS
        const prev = new URLSearchParams(prevParamsRef.current);

        let shouldRefetch = false;

        for (const key of FILTER_KEYS) {
            if (prev.get(key) !== curr.get(key)) {
                shouldRefetch = true;
                break;
            }
        }

        if (shouldRefetch) {
            handleFetchLessons(curr);

        } else {
            console.log("⚪ Only UI params changed → no API:", currStr);
        }

        prevParamsRef.current = currStr;
    }, [searchParams.toString()]);

    const handleChangeSearchParam = (key: string, value: any, resetPage: boolean = true) => {
        const newParams = new URLSearchParams(searchParams);

        const shouldDelete =
            value === null ||
            value === undefined ||
            value === "" ||
            (typeof value === "string" && value.trim() === "");

        if (shouldDelete) {
            newParams.delete(key);
        } else {
            newParams.set(key, String(value));
        }

        if (resetPage) {
            newParams.set("page", "1");
        }
        setSearchParams(newParams);
    };
    const handleFetchLessons = (uRLSearchParams: URLSearchParams) => {
        const filters = Object.fromEntries(uRLSearchParams.entries());
        // Has page: page -= 1;
        filters.page = filters.page ? String(Number(filters.page) - 1) : "0";
        filters.size = filters.size || "5";
        filters.sort = filters.sort || "id,desc";

        dispatch(fetchLessons(filters));

    };

    if (hydrating) {
        return <SkeletonComponent />;
    }
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center h-6">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem >
                            <BreadcrumbPage>{t("appMenu.learningContent")}</BreadcrumbPage>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />

                        <BreadcrumbItem>
                            <BreadcrumbPage>{t("appMenu.allLessons")}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <Button
                    onClick={() => navigate('/generate-lessons')}
                    variant="outline"
                    className="h-6 text-xs"
                >
                    <SquarePlus />
                    Add Lesson
                </Button>
            </div>

            {/* Filter Panel */}
            <LessonFilterPanel
                searchParams={searchParams}
                setSearchParams={setSearchParams}
            />

            <div>
                <LessonDataTable data={data?.content || []} loading={loading} />

                {data && (
                    <PaginationBar
                        page={data.number}
                        size={data.size}
                        totalElements={data.totalElements}
                        totalPages={data.totalPages}
                        numberOfElements={data.numberOfElements}
                        onPageChange={(newPage) => {
                            handleChangeSearchParam("page", newPage + 1, false);
                        }}
                        hasBorderTop={true}
                    />
                )}

            </div>
        </div>
    )
};

export default AllLesson;
