// src/pages/DictationMode.tsx

import { useAppDispatch, useAppSelector } from "@/store"
import {
    fetchLessonByIdForDictation,
    resetLessonState,
    submitBatchDictationScore,
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
import KeycloakClient from "@/features/keycloak/keycloak"
import { useAuth } from "@/features/keycloak/providers/AuthProvider"
import { clearGuestProgress, getGuestProgress, saveGuestProgress } from "@/utils/guestStorage"
import { CompletionModal, LoginIncentiveModal } from "@/components/ModeModals"

const MODE_NAME = "DICTATION";

const DictationMode = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const { profile } = useAuth();
    const keycloak = KeycloakClient.getInstance();

    const [showHelp, setShowHelp] = useState(false)
    const lessonState = useAppSelector((state) => state.lessonForDictation.lesson)
    const { data: lesson, status, error } = lessonState

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

    const [showTranscriptToggle, setShowTranscriptToggle] = useState(false)
    const [showProgress, setShowProgress] = useState(true)
    const [isDesktop, setIsDesktop] = useState(true)

    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const syncRef = useRef(false);

    useEffect(() => {
        const checkDesktop = () => setIsDesktop(window.innerWidth >= 1280)
        checkDesktop()
        window.addEventListener("resize", checkDesktop)
        return () => window.removeEventListener("resize", checkDesktop)
    }, [])

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

    useEffect(() => {
        if (id) {
            dispatch(fetchLessonByIdForDictation(Number(id)))
        }
        return () => {
            dispatch(resetLessonState())
        }
    }, [dispatch, id])

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
            const isNavigationKey = e.key === "Tab" || e.key === "PageDown" || e.key === "PageUp";
            const isControlKey = e.code === "ControlLeft" || e.code === "ControlRight";

            if (isNavigationKey || isControlKey) {
                e.preventDefault();
                if (isControlKey) {
                    playerRef.current?.playCurrentSegment();
                } else if (e.key === "PageDown" || e.key === "Tab") {
                    handleNext();
                } else if (e.key === "PageUp") {
                    handlePrev();
                }
                return;
            }

            const isEditable = target?.tagName === "INPUT" ||
                target?.tagName === "TEXTAREA" ||
                target?.isContentEditable;

            if (isEditable) return;
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [handleNext, handlePrev]);

    const currentSentence = sentences[activeIndex]

    // 1. Logic xử lý khi hoàn thành 1 câu
    const handleCompleteSentence = useCallback((sentenceId: number, score: number) => {
        if (!lesson?.id) return;

        dispatch(updateDictationCompletion({ sentenceId }));

        if (profile) {
            dispatch(submitDictationScore({
                lessonId: lesson.id,
                sentenceId,
                score
            }));
        } else {
            // 👉 Truyền thêm mode
            const currentLocal = getGuestProgress(id!, MODE_NAME);
            if (!currentLocal.includes(sentenceId)) {
                const nextLocal = [...currentLocal, sentenceId];
                saveGuestProgress(id!, MODE_NAME, nextLocal);

                setShowLoginModal(true);
            }
        }
    }, [dispatch, lesson?.id, profile, id]);

    useEffect(() => {
        if (lesson && isLessonCompleted) {
            setShowCompletionModal(true);
        }
    }, [isLessonCompleted, lesson]);

    // 🚀 LOGIC 0: Tái hiện tiến độ cho Guest khi F5
    useEffect(() => {
        if (!profile && status === "succeeded" && id) {
            // 👉 Truyền thêm mode
            const localData = getGuestProgress(id, MODE_NAME);
            if (localData.length > 0) {
                console.log("Hydrating guest progress from localStorage...");
                localData.forEach(sId => {
                    dispatch(updateDictationCompletion({ sentenceId: sId }));
                });
            }
        }
    }, [profile, status, id, dispatch]);

    // 🚀 LOGIC SYNC: Chạy khi Guest quyết định Login
    useEffect(() => {
        const performBatchSync = async () => {
            // 👉 Đảm bảo sentences đã load xong mới nhảy index
            if (profile && lesson?.id && id && sentences.length > 0 && !syncRef.current) {
                // 👉 Truyền thêm mode
                const localData = getGuestProgress(id, MODE_NAME);

                if (localData.length > 0) {
                    syncRef.current = true;

                    const pendingIds = localData.filter(sId => !completedIdsSet.has(sId));

                    if (pendingIds.length > 0) {
                        console.log(`🚀 Fluenrin: Launching batch sync for ${pendingIds.length} sentences...`);

                        try {
                            await dispatch(submitBatchDictationScore({
                                lessonId: lesson.id,
                                sentenceIds: pendingIds,
                                score: 100
                            })).unwrap();

                            pendingIds.forEach(sId => {
                                dispatch(updateDictationCompletion({ sentenceId: sId }));
                            });

                            // 👉 LOGIC MỚI: Nhảy index đến câu cuối cùng trong danh sách sync
                            const lastSyncedId = pendingIds[pendingIds.length - 1];
                            const targetIndex = sentences.findIndex(s => s.id === lastSyncedId);

                            if (targetIndex !== -1) {
                                setActiveIndex(targetIndex);
                                setAutoPlayOnSentenceChange(false); // Tránh giật âm thanh ngay khi vừa load
                            }

                            console.log("✅ Sync successful. Progress preserved.");
                        } catch (error) {
                            console.error("❌ Batch sync failed:", error);
                            syncRef.current = false;
                            return;
                        }
                    }

                    // 👉 Truyền thêm mode
                    clearGuestProgress(id, MODE_NAME);
                }
            }
        };

        performBatchSync();
    }, [profile, lesson?.id, id, dispatch, completedIdsSet, sentences]);

    // 3. Hàm Login kết hợp lưu trữ
    const handleLoginIncentive = () => {
        // 👉 Truyền thêm mode
        saveGuestProgress(id!, MODE_NAME, completedIdsArray);
        keycloak.login();
    };

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

                                {/* 👉 LOGIC MỚI: Nhắc nhở Guest Mode - Tối giản, thanh lịch */}
                                {!profile && (
                                    <button
                                        onClick={handleLoginIncentive}
                                        className="ml-2 text-[11px] sm:text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline underline-offset-2 transition-colors shrink-0"
                                    >
                                        Sign in to save
                                    </button>
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
                    {id && (
                        <Button size="sm" variant="outline" onClick={() => dispatch(fetchLessonByIdForDictation(Number(id)))}>
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
            <LoginIncentiveModal
                open={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onLogin={handleLoginIncentive}
            />

            <CompletionModal
                open={showCompletionModal}
                onBack={handleBackToTopic}
                onReview={() => {
                    setShowCompletionModal(false);
                }}
            />
        </div>
    )
}

export default DictationMode