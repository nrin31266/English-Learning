import { useAppDispatch, useAppSelector } from "@/store"
import { fetchLessonBySlug } from "@/store/lessonForDictationSlide"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import type { ILessonSentenceDetailsResponse } from "@/types"

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
    ArrowLeft,
    Loader2
} from "lucide-react"

import AudioFileTag from "@/components/AudioFileTag"
import LanguageLevelBadge from "@/components/LanguageLevel"

import KeyboardShortcutsHelp from "@/components/players/KeyboardShortcutsHelp"
import Player from "@/components/players/Player"
import type { PlayerRef } from "@/components/players/types/types"
import YouTubeTag from "@/components/YouTubeTag"
import DictationTranscript from "../components/DictationTranscript"
import DictationPanel from "../components/DictationPanel"
import { cn } from "@/lib/utils"

const DictationMode = () => {
    const { slug } = useParams<{ slug: string }>()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const [showHelp, setShowHelp] = useState(false)
    const lessonState = useAppSelector((state) => state.lessonForDictation.lesson)
    const { data: lesson, status, error } = lessonState

    const [autoStop, setAutoStop] = useState(true)
    const [largeVideo, setLargeVideo] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const [autoPlayOnSentenceChange, setAutoPlayOnSentenceChange] = useState(true)
    const [userInteracted, setUserInteracted] = useState(false)
    const tempAnswersRef = useRef<Record<number, string>>({})
    const [completedIds, setCompletedIds] = useState<Set<number>>(new Set())

    const playerRef = useRef<PlayerRef | null>(null)
    const [playbackRate, setPlaybackRate] = useState<number>(1.0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [showTranscript, setShowTranscript] = useState(true)

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
        if (slug && slug !== lesson?.slug) {
            dispatch(fetchLessonBySlug(slug))
        }
    }, [dispatch, slug, lesson?.slug])

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
            const target = e.target as HTMLElement | null
            const tag = target?.tagName
            const isEditable = tag === "INPUT" || target?.isContentEditable

            if (isEditable) return

            if (e.code === "ControlLeft" || e.code === "ControlRight") {
                e.preventDefault()
                playerRef.current?.playCurrentSegment()
            } else if (e.key === "PageDown" || e.key === "Tab") {
                e.preventDefault()
                handleNext()
            } else if (e.key === "PageUp") {
                e.preventDefault()
                handlePrev()
            }
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [handleNext, handlePrev])

    const currentSentence = sentences[activeIndex]

    const handleCompleteSentence = useCallback((sentenceId: number) => {
        setCompletedIds(prev => {
            if (prev.has(sentenceId)) return prev
            const next = new Set(prev)
            next.add(sentenceId)
            return next
        })
    }, [])

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading lesson for dictation...</span>
            </div>
        )
    }

    if (status === "failed") {
        return (
            <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-3 text-sm">
                <p className="text-destructive">Cannot load lesson. Please try again.</p>
                {error?.message && (
                    <p className="max-w-md text-center text-xs text-destructive/80">{error.message}</p>
                )}
                {slug && (
                    <Button size="sm" variant="outline" onClick={() => dispatch(fetchLessonBySlug(slug))}>
                        Retry
                    </Button>
                )}
            </div>
        )
    }

    if (!lesson) {
        return (
            <div className="flex min-h-[calc(100vh-64px)] items-center justify-center text-sm text-muted-foreground">
                Lesson not found.
            </div>
        )
    }

    return (
        <div className="min-h-[calc(100vh-64px)] flex flex-col gap-4 py-4 px-2 md:px-4">
            {/* HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink className="cursor-pointer" onClick={() => navigate("/topics")}>
                                    Topics
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            {lesson.topic && (
                                <>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink
                                            className="cursor-pointer"
                                            onClick={() => navigate(`/topics/${lesson.topic?.slug}`)}
                                        >
                                            {lesson.topic.name}
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                </>
                            )}
                            <BreadcrumbItem>
                                <BreadcrumbPage>{lesson.title ?? "Loading..."}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>Dictation Mode</span>
                        <span>·</span>
                        <LanguageLevelBadge level={lesson.languageLevel} />
                        <span>·</span>
                        {lesson.sourceType === "YOUTUBE" ? <YouTubeTag /> : <AudioFileTag />}
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowTranscript(!showTranscript)}
                >
                    {showTranscript ? "Hide Transcript" : "Show Transcript"}
                </Button>
            </div>

            {/* MAIN CONTENT - 12 columns grid */}
            <div className={cn(
                "grid gap-4 mt-2",
                showTranscript
                    ? "grid-cols-1 lg:grid-cols-12"
                    : "grid-cols-1 lg:grid-cols-12" // vẫn grid 12 cột
            )}>
                {/* Left Column: Player + Dictation Panel */}
                <div className={cn(
                    "flex flex-col gap-4",
                    showTranscript
                        ? "lg:col-span-8"      // có transcript: chiếm 8 cột
                        : "lg:col-span-8 lg:col-start-3" // không transcript: col-start-3 (căn giữa 8 cột)
                )}><div className="sticky top-4">
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
                        />
                </div>
                    
                        <KeyboardShortcutsHelp open={showHelp} onClose={() => setShowHelp(false)} />
                    <DictationPanel
                        key="dictation-panel"
                        sentence={currentSentence}
                        onNext={handleNext}
                        onSubmit={() => handleCompleteSentence(currentSentence.id)}
                        completed={completedIds.has(currentSentence.id)}
                        currentTemporaryAnswer={tempAnswersRef.current[currentSentence.id]}
                        onTemporaryAnswerChange={(val) => {
                            tempAnswersRef.current[currentSentence.id] = val
                        }}
                    />
                </div>

                {/* Right Column: Transcript (chỉ hiện khi showTranscript = true) */}
                {showTranscript && (
                    <div className="lg:col-span-4">
                        <DictationTranscript
                            sentences={sentences}
                            activeIndex={activeIndex}
                            onSelectSentence={handleSelectSentence}
                            visible={showTranscript}
                            completedIds={completedIds}
                        />
                    </div>
                )}
            </div>

         
        </div>
    )
}

export default DictationMode