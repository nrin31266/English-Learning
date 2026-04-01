import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useAppDispatch, useAppSelector } from "@/store"
import { fetchLessonBySlug } from "@/store/lessonForShadowingSlide"
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
import { useIsMobile } from "@/hooks/use-mobile"
import DictationTranscript from "../components/DictationTranscript"
import { cn } from "@/lib/utils"


const DictationMode = () => {
    const { slug } = useParams<{ slug: string }>()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const [showHelp, setShowHelp] = useState(false)
    const lessonState = useAppSelector((state) => state.lessonForShadowing.lesson)
    const { data: lesson, status, error } = lessonState

    const [autoStop, setAutoStop] = useState(true)
    const [largeVideo, setLargeVideo] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const [shouldAutoPlay, setShouldAutoPlay] = useState(false)
    const [userInteracted, setUserInteracted] = useState(false)

    const playerRef = useRef<PlayerRef | null>(null)
    const [playbackRate, setPlaybackRate] = useState<number>(1.0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [showTranscript, setShowTranscript] = useState(true)

    const handleSelectSentence = (index: number) => {
        setShouldAutoPlay(false)
        setActiveIndex(index)
    }

    const isMobile = useIsMobile()

    const handleBackToTopic = () => {
        if (lesson?.topic) {
            navigate(`/topics/${lesson.topic.slug}`)
        } else {
            navigate("/topics")
        }
    }

    useEffect(() => {
        if (slug) {
            dispatch(fetchLessonBySlug(slug))
        }
    }, [dispatch, slug])

    useEffect(() => {
        setActiveIndex(0)
        setShouldAutoPlay(true)
        setUserInteracted(false)
    }, [lesson?.id])

    const isLoading = status === "idle" || status === "loading"

    const sentences: ILessonSentenceDetailsResponse[] = useMemo(
        () => lesson?.sentences ?? [],
        [lesson]
    )

    const handlePrev = useCallback(() => {
        setShouldAutoPlay(true)
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev))
    }, [])

    const handleNext = useCallback(() => {
        setShouldAutoPlay(true)
        setActiveIndex((prev) =>
            prev < sentences.length - 1 ? prev + 1 : prev
        )
    }, [sentences.length])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            const tag = target?.tagName
            const isEditable =
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                target?.isContentEditable

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

    return (
        <div className="flex min-h-[calc(100vh-64px)] flex-col gap-4 py-4 px-1">
            {/* HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink
                                    className="cursor-pointer"
                                    onClick={() => navigate("/topics")}
                                >
                                    Topics
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            {lesson?.topic && (
                                <>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink
                                            className="cursor-pointer"
                                            onClick={() =>
                                                navigate(`/topics/${lesson.topic.slug}`)
                                            }
                                        >
                                            {lesson.topic.name}
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                </>
                            )}
                            <BreadcrumbItem>
                                <BreadcrumbPage>
                                    {lesson?.title ?? "Loading..."}
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>Shadowing Mode</span>
                        {lesson && (
                            <>
                                <span>·</span>
                                <LanguageLevelBadge level={lesson.languageLevel} />
                                <span>·</span>
                                {lesson.sourceType === "YOUTUBE" ? (
                                    <YouTubeTag />
                                ) : (
                                    <AudioFileTag />
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="hidden gap-2 sm:flex"
                        onClick={handleBackToTopic}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Topic
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setShowTranscript(!showTranscript)}
                    >
                        {showTranscript ? "Hide Transcript" : "Show Transcript"}
                    </Button>
                </div>
            </div>

            {/* BODY */}
            {isLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading lesson for shadowing...
                </div>
            ) : status === "failed" ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm">
                    <p className="text-destructive">
                        Cannot load lesson. Please try again.
                    </p>
                    {error?.message && (
                        <p className="max-w-md text-center text-xs text-destructive/80">
                            {error.message}
                        </p>
                    )}
                    {slug && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => dispatch(fetchLessonBySlug(slug))}
                        >
                            Retry
                        </Button>
                    )}
                </div>
            ) : !lesson ? (
                <div className="flex flex-1 flex-col items-center justify-center text-sm text-muted-foreground">
                    Lesson not found.
                </div>
            ) : isMobile ? (
                // MOBILE LAYOUT
                <div className="flex flex-col gap-3">
                    <div className="p-1">
                        <Player
                            ref={playerRef}
                            lesson={lesson}
                            currentSentence={currentSentence}
                            autoStop={autoStop}
                            shouldAutoPlay={shouldAutoPlay}
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

                        <KeyboardShortcutsHelp
                            open={showHelp}
                            onClose={() => setShowHelp(false)}
                        />
                    </div>

                    <div className="flex gap-2 px-2">
                        <Button
                            variant={!showTranscript ? "default" : "outline"}
                            className="flex-1"
                            onClick={() => setShowTranscript(false)}
                        >
                            Content
                        </Button>
                        <Button
                            variant={showTranscript ? "default" : "outline"}
                            className="flex-1"
                            onClick={() => setShowTranscript(true)}
                        >
                            Transcript
                        </Button>
                    </div>

                    <div className="relative">
                        <div className={cn(showTranscript && "hidden")}>
                            <div className="flex h-full items-center justify-center p-6">
                                <span className="font-semibold">Content</span>
                            </div>
                        </div>

                        <div className={cn(!showTranscript && "hidden")}>
                            <DictationTranscript
                                sentences={sentences}
                                activeIndex={activeIndex}
                                onSelectSentence={handleSelectSentence}
                                visible={showTranscript}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                // DESKTOP LAYOUT (GIỮ NGUYÊN)
                <ResizablePanelGroup orientation="horizontal">
                    <ResizablePanel defaultSize={"30"} minSize={"28%"}>
                        <div className="flex h-full items-start justify-center p-1">
                            <Player
                                ref={playerRef}
                                lesson={lesson}
                                currentSentence={currentSentence}
                                autoStop={autoStop}
                                shouldAutoPlay={shouldAutoPlay}
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

                            <KeyboardShortcutsHelp
                                open={showHelp}
                                onClose={() => setShowHelp(false)}
                            />
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    <ResizablePanel defaultSize="100%" minSize={"40%"}>
                        <div className="flex h-full items-center justify-center p-6">
                            <span className="font-semibold">Content</span>
                        </div>
                    </ResizablePanel>

                    {showTranscript && (
                        <>
                            <ResizableHandle withHandle />
                            <ResizablePanel defaultSize="25%" minSize={"25%"}>
                                <div className="flex h-full items-start justify-center p-1">
                                    <div className="mt-2 w-full shrink-0 lg:mt-0">
                                        <DictationTranscript
                                            sentences={sentences}
                                            activeIndex={activeIndex}
                                            onSelectSentence={handleSelectSentence}
                                            visible={showTranscript}
                                        />
                                    </div>
                                </div>
                            </ResizablePanel>
                        </>
                    )}
                </ResizablePanelGroup>
            )}
        </div>
    )
}

export default DictationMode