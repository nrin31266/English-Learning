// src/pages/DictationMode.tsx

import { useAppDispatch, useAppSelector } from "@/store"
import { 
    fetchLessonBySlugForDictation, 
    resetLessonState,
    submitDictationScore, 
    updateDictationCompletion 
} from "@/store/lessonForDictationSlide"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import type { ILessonSentenceDetailsResponse } from "@/types"
import { Button } from "@/components/ui/button"
import {
    ArrowLeft,
    CheckCircle2,
    Loader2,
    FileText
} from "lucide-react"

import AudioFileTag from "@/components/AudioFileTag"
import LanguageLevelBadge from "@/components/LanguageLevel"
import YouTubeTag from "@/components/YouTubeTag"

import KeyboardShortcutsHelp from "@/components/players/KeyboardShortcutsHelp"
import Player from "@/components/players/Player"
import type { PlayerRef } from "@/components/players/types/types"
import DictationTranscript from "../components/DictationTranscript"
import DictationPanel from "../components/DictationPanel"
import { cn } from "@/lib/utils"
import LessonProgressBar from "@/components/LessonProgressStrip"

const DictationMode = () => {
    const { slug } = useParams<{ slug: string }>()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    
    const [showHelp, setShowHelp] = useState(false)
    const lessonState = useAppSelector((state) => state.lessonForDictation.lesson)
    const { data: lesson, status, error } = lessonState

    // Nguồn dữ liệu hoàn thành từ Redux (Single Source of Truth)
    const dictationProgress = useMemo(() => lesson?.progressOverview?.dictation, [lesson])
    const completedIdsArray = useMemo(() => dictationProgress?.completedSentenceIds || [], [dictationProgress])
    const completedIdsSet = useMemo(() => new Set(completedIdsArray), [completedIdsArray])
    const isLessonCompleted = useMemo(() => dictationProgress?.status === 'COMPLETED', [dictationProgress])

    const [autoStop, setAutoStop] = useState(true)
    const [largeVideo, setLargeVideo] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const [autoPlayOnSentenceChange, setAutoPlayOnSentenceChange] = useState(true)
    const [userInteracted, setUserInteracted] = useState(false)
    const tempAnswersRef = useRef<Record<number, string>>({})

    const playerRef = useRef<PlayerRef | null>(null)
    const [playbackRate, setPlaybackRate] = useState<number>(1.0)
    const [isPlaying, setIsPlaying] = useState(false)
    
    // State điều khiển UI 
    const [showTranscriptToggle, setShowTranscriptToggle] = useState(false)
    const [showProgress, setShowProgress] = useState(true)
    const [isDesktop, setIsDesktop] = useState(true)

    // Theo dõi kích thước màn hình
    useEffect(() => {
        const checkDesktop = () => setIsDesktop(window.innerWidth >= 1280) // xl breakpoint
        checkDesktop()
        window.addEventListener("resize", checkDesktop)
        return () => window.removeEventListener("resize", checkDesktop)
    }, [])

    // Màn Desktop thì tuỳ ý, Mobile thì luôn bật Transcript cho rộng rãi
    const effectiveShowTranscript = isDesktop ? showTranscriptToggle : true

    const handleSelectSentence = useCallback((index: number) => {
        setAutoPlayOnSentenceChange(true)
        setActiveIndex(index)
    }, [])

    const handleBackToTopic = () => {
        if (lesson?.topic) {
            navigate(`/topics/${lesson.topic.slug}`)
        } else {
            navigate("/topics")
        }
    }

    // 👉 ĐÃ FIX CHUẨN: Chỉ gọi 1 lần khi có slug, dọn dẹp sạch sẽ khi unmount (Tránh spam API)
    useEffect(() => {
        if (slug) {
            dispatch(fetchLessonBySlugForDictation(slug))
        }
        return () => {
            dispatch(resetLessonState())
        }
    }, [dispatch, slug])

    useEffect(() => {
        setActiveIndex(0)
        setAutoPlayOnSentenceChange(true)
        setUserInteracted(false)
    }, [lesson?.id])

    const isLoading = status === "idle" || status === "loading"

    const sentences: ILessonSentenceDetailsResponse[] = useMemo(
        () => lesson?.sentences ?? [],
        [lesson]
    )

    const handlePrev = useCallback(() => {
        setAutoPlayOnSentenceChange(true)
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev))
    }, [])

    const handleNext = useCallback(() => {
        setAutoPlayOnSentenceChange(true)
        setActiveIndex((prev) =>
            prev < sentences.length - 1 ? prev + 1 : prev
        )
    }, [sentences.length])

    useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        
        // 1. Định nghĩa các phím chức năng ông muốn chiếm quyền điều khiển
        const isNavigationKey = e.key === "Tab" || e.key === "PageDown" || e.key === "PageUp";
        const isControlKey = e.code === "ControlLeft" || e.code === "ControlRight";

        // 2. Nếu là phím chức năng, xử lý NGAY VÀ LUÔN, bất kể đang ở đâu
        if (isNavigationKey || isControlKey) {
            e.preventDefault(); // Chặn đứng việc trình duyệt đi tìm Focus gây lag

            if (isControlKey) {
                playerRef.current?.playCurrentSegment();
            } else if (e.key === "PageDown" || e.key === "Tab") {
                handleNext();
            } else if (e.key === "PageUp") {
                handlePrev();
            }
            return; // Xử lý xong thì thoát
        }

        // 3. Nếu KHÔNG PHẢI phím tắt bên trên, mà đang gõ bài thì để yên cho người ta gõ
        const isEditable = target?.tagName === "INPUT" || 
                           target?.tagName === "TEXTAREA" || 
                           target?.isContentEditable;
        
        if (isEditable) return;

        // 4. Các logic phím tắt khác dành cho người dùng không focus vào ô input (nếu có)
        // Ví dụ: if (e.code === "Space") { ... }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
}, [handleNext, handlePrev]);

    const currentSentence = sentences[activeIndex]

    // Gửi điểm âm thầm
    const handleCompleteSentence = useCallback((sentenceId: number, score: number) => {
        if (lesson?.id) {
            dispatch(submitDictationScore({
                lessonId: lesson.id,
                sentenceId: sentenceId,
                score: score
            }))
            dispatch(updateDictationCompletion({ sentenceId }))
        }
    }, [dispatch, lesson?.id])

    return (
        <div className="flex min-h-[calc(100vh-64px)] flex-col gap-2 py-2 px-2 pb-8">
            
            {/* 👉 HEADER TỐI ƯU 1 HÀNG DUY NHẤT */}
            <div className="flex items-center justify-between gap-2 rounded-lg bg-card border px-2 sm:px-3 py-1.5 shadow-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 sm:hidden" onClick={handleBackToTopic}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hidden sm:flex shrink-0" onClick={handleBackToTopic}>
                        <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                    </Button>

                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 whitespace-nowrap pr-2">
                        <span className="text-[11px] sm:text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer shrink-0 transition-colors" onClick={() => navigate("/topics")}>
                            Topics
                        </span>
                        <span className="text-muted-foreground/40 shrink-0">/</span>
                        
                        {lesson?.topic && (
                            <>
                                <span className="text-[11px] sm:text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer truncate max-w-[100px] sm:max-w-[150px] shrink-0 transition-colors" onClick={() => navigate(`/topics/${lesson.topic?.slug}`)}>
                                    {lesson.topic.name}
                                </span>
                                <span className="text-muted-foreground/40 shrink-0">/</span>
                            </>
                        )}
                        
                        <span className="text-[11px] sm:text-xs font-bold text-foreground truncate max-w-[150px] sm:max-w-[200px] shrink-0">
                            {lesson?.title ?? "Loading..."}
                        </span>

                        {lesson && (
                            <div className="flex items-center gap-1.5 border-l border-border/50 pl-2 ml-1 shrink-0">
                                <LanguageLevelBadge level={lesson.languageLevel} />
                                {lesson.sourceType === "YOUTUBE" ? <YouTubeTag /> : <AudioFileTag />}
                                {isLessonCompleted && (
                                    <div className="flex items-center gap-1 text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100">
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span className="text-[10px] font-bold">Done</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="hidden xl:flex items-center shrink-0">
                    <Button 
                        variant={showTranscriptToggle ? "secondary" : "outline"} 
                        size="sm" 
                        className="h-7 px-2 text-xs" 
                        onClick={() => setShowTranscriptToggle((prev) => !prev)}
                    >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        <span>Transcript</span>
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading lesson for dictation...
                </div>
            ) : status === "failed" ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm">
                    <p className="text-destructive">Cannot load lesson. Please try again.</p>
                    {error?.message && (
                        <p className="max-w-md text-center text-xs text-destructive/80">{error.message}</p>
                    )}
                    {slug && (
                        <Button size="sm" variant="outline" onClick={() => dispatch(fetchLessonBySlugForDictation(slug))}>
                            Retry
                        </Button>
                    )}
                </div>
            ) : !lesson ? (
                <div className="flex flex-1 flex-col items-center justify-center text-sm text-muted-foreground">
                    Lesson not found.
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mt-1">
                    {/* Cột trái: Player + Panel Điền từ */}
                    <div className={cn("flex flex-col gap-3", effectiveShowTranscript ? "xl:col-span-8" : "xl:col-span-8 xl:col-start-3")}>
                        <div className="sticky top-2 z-49">
                            <Player
                                ref={playerRef}
                                lesson={lesson}
                                currentSentence={currentSentence}
                                autoStop={autoStop}
                                autoPlayOnSentenceChange={autoPlayOnSentenceChange}
                                onUserInteracted={setUserInteracted}
                                playbackRate={playbackRate}
                                isPlaying={isPlaying}
                                setIsPlaying={setIsPlaying}
                                largeVideo={largeVideo}
                                onPrev={handlePrev}
                                onNext={handleNext}
                                hasPrev={activeIndex > 0}
                                hasNext={activeIndex < sentences.length - 1}
                                onAutoStopChange={setAutoStop}
                                onLargeVideoChange={setLargeVideo}
                                onPlaybackRateChange={setPlaybackRate}
                                onShowShortcuts={() => setShowHelp(true)}
                                showProgress={showProgress}
                                onToggleProgress={() => setShowProgress(prev => !prev)}
                            />
                        </div>
                        
                        <KeyboardShortcutsHelp open={showHelp} onClose={() => setShowHelp(false)} />
                        
                        <DictationPanel
                            key="dictation-panel"
                            sentence={currentSentence}
                            onNext={handleNext}
                            onSubmit={(score) => handleCompleteSentence(currentSentence.id, score)}
                            completed={completedIdsSet.has(currentSentence.id)}
                            currentTemporaryAnswer={tempAnswersRef.current[currentSentence.id]}
                            onTemporaryAnswerChange={(val) => {
                                tempAnswersRef.current[currentSentence.id] = val
                            }}
                            userInteracted={userInteracted}
                        />
                    </div>

                    {/* Cột phải: Transcript */}
                    {effectiveShowTranscript && (
                        <div className="xl:col-span-4 h-full">
                            <DictationTranscript
                                sentences={sentences}
                                activeIndex={activeIndex}
                                onSelectSentence={handleSelectSentence}
                                visible={effectiveShowTranscript}
                                completedIds={completedIdsSet} 
                            />
                        </div>
                    )}
                </div>
            )}
            
            {showProgress && sentences.length > 0 && (
                <LessonProgressBar
                    sentences={sentences as { id: number }[]}
                    completedIds={completedIdsArray}
                    activeIndex={activeIndex}
                    onSelect={handleSelectSentence}
                />
            )}
        </div>
    )
}

export default DictationMode