import { useAppDispatch, useAppSelector } from "@/store"
import { fetchLessonBySlug } from "@/store/lessonForShadowingSlide"
import  { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import YouTubeTag from "@/components/YouTubeTag"
import ActiveSentencePanel from "../components/ActiveSentencePanel"

import KeyboardShortcutsHelp from "@/components/players/KeyboardShortcutsHelp"
import Player from "@/components/players/Player"
import type { PlayerRef } from "@/components/players/types/types"
import ShadowingTranscript from "../components/ShadowingTranscript"
import { cn } from "@/lib/utils"

const ShadowingMode = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [showHelp, setShowHelp] = useState(false)
  const lessonState = useAppSelector((state) => state.lessonForShadowing.lesson)
  const { data: lesson, status, error } = lessonState

  const [autoStop, setAutoStop] = useState(true)
  const [largeVideo, setLargeVideo] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [autoPlayOnSentenceChange, setAutoPlayOnSentenceChange] = useState(true)
  const [userInteracted, setUserInteracted] = useState(false)
  const [showTranscript, setShowTranscript] = useState(true)

  // 👈 THÊM: state lưu các câu đã hoàn thành
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set())

  // 👈 THÊM: ref lưu completedIds để dùng trong callback không cần dependency
  const completedIdsRef = useRef(completedIds)
  useEffect(() => {
    completedIdsRef.current = completedIds
  }, [completedIds])

  const playerRef = useRef<PlayerRef | null>(null)
  const [playbackRate, setPlaybackRate] = useState<number>(1.0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (slug) {
      dispatch(fetchLessonBySlug(slug))
    }
  }, [dispatch, slug])

  useEffect(() => {
    setActiveIndex(0)
    setAutoPlayOnSentenceChange(true)
    setUserInteracted(false)
    // 👈 THÊM: reset completed khi chuyển bài
    setCompletedIds(new Set())
  }, [lesson?.id])

  const isLoading = status === "idle" || status === "loading"

  const sentences: ILessonSentenceDetailsResponse[] = useMemo(
    () => lesson?.sentences ?? [],
    [lesson]
  )

  const currentSentence = sentences[activeIndex]

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

  const handleReplay = () => {
    playerRef.current?.playCurrentSegment()
  }

  const handlePlay = () => {
    playerRef.current?.play()
  }

  const handlePause = () => {
    playerRef.current?.pause()
  }

  const handleSelectSentence = useCallback((index: number) => {
    setAutoPlayOnSentenceChange(true)
    setActiveIndex(index)
  }, [])

  // 👈 THÊM: hàm mark câu đã hoàn thành
  const handleCompleteSentence = useCallback((sentenceId: number) => {
    setCompletedIds(prev => {
      if (prev.has(sentenceId)) return prev
      const next = new Set(prev)
      next.add(sentenceId)
      return next
    })
  }, [])

  const handleBackToTopic = () => {
    if (lesson?.topic) {
      navigate(`/topics/${lesson.topic.slug}`)
    } else {
      navigate("/topics")
    }
  }

  // Keyboard shortcuts
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

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col gap-4 py-4 px-1">
      {/* Top bar: breadcrumb + right actions */}
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
            onClick={() => setShowTranscript((prev) => !prev)}
          >
            {showTranscript ? "Hide Transcript" : "Show Transcript"}
          </Button>
        </div>
      </div>

      {/* Content */}
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
      ) : (
        // 👈 SỬA: Grid layout 12 cột như dictation
        <div className={cn(
          "grid gap-4 mt-2",
          showTranscript 
            ? "grid-cols-1 lg:grid-cols-12" 
            : "grid-cols-1 lg:grid-cols-12"
        )}>
          {/* LEFT COLUMN: Player + ActiveSentencePanel */}
          <div className={cn(
            "flex flex-col gap-4",
            showTranscript 
              ? "lg:col-span-8"
              : "lg:col-span-8 lg:col-start-3"
          )}>
            <div className="sticky top-4">
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

            <ActiveSentencePanel
              lesson={lesson}
              activeIndex={activeIndex}
              handlePause={handlePause}
              onNext={handleNext}
              userInteracted={userInteracted}
              onComplete={handleCompleteSentence}  // 👈 THÊM: callback khi hoàn thành
            />

            <KeyboardShortcutsHelp
              open={showHelp}
              onClose={() => setShowHelp(false)}
            />
          </div>

          {/* RIGHT COLUMN: Transcript panel */}
          {showTranscript && (
            <div className="lg:col-span-4">
              <ShadowingTranscript
                sentences={sentences}
                activeIndex={activeIndex}
                onSelectSentence={handleSelectSentence}
                visible={showTranscript}
                completedIds={completedIds}  // 👈 THÊM: truyền completedIds
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ShadowingMode