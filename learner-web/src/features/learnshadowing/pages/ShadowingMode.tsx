import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store"
import { fetchLessonBySlug } from "@/store/lessonSlide"

import type { ILLessonDetailsDto, ILLessonSentence } from "@/types"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

import {
  ArrowLeft,
  Keyboard,
  Loader2,
  Volume2,
} from "lucide-react"

import YouTubeTag from "@/components/YouTubeTag"
import AudioFileTag from "@/components/AudioFileTag"
import LanguageLevelBadge from "@/components/LanguageLevel"
import type { ShadowingPlayerRef } from "../components/ShadowingPlayer.types"
import AudioShadowing from "../components/AudioShadowing"
import YouTubeShadowing from "../components/YoutubeShadowing"
import ShadowingTranscript from "../components/ShadowingTranscript"
import ActiveSentencePanel from "../components/ActiveSentencePanel" // Import component mới
import KeyboardShortcutsHelp from "../components/KeyboardShortcutsHelp"
import { Badge } from "@/components/ui/badge"

const ShadowingMode = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [showHelp, setShowHelp] = useState(false)
  const lessonState = useAppSelector((state) => state.lesson.lesson)
  const { data: lesson, status, error } = lessonState

  const [autoStop, setAutoStop] = useState(true)
  const [largeVideo, setLargeVideo] = useState(false)
  const [showTranscript, setShowTranscript] = useState(true)

  const [activeIndex, setActiveIndex] = useState(0)

  const playerRef = useRef<ShadowingPlayerRef | null>(null)

  useEffect(() => {
    if (slug) {
      dispatch(fetchLessonBySlug(slug))
    }
  }, [dispatch, slug])

  useEffect(() => {
    setActiveIndex(0)
  }, [lesson?.id])

  const isLoading = status === "idle" || status === "loading"

  const sentences: ILLessonSentence[] = useMemo(
    () => lesson?.sentences ?? [],
    [lesson]
  )

  const currentSentence = sentences[activeIndex]

  // prev/next với guard
  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }, [])

  const handleNext = useCallback(() => {
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

  const handleSelectSentence = (index: number) => {
    setActiveIndex(index)
  }

  const handleBackToTopic = () => {
    if (lesson?.topic) {
      navigate(`/topics/${lesson.topic.slug}`)
    } else {
      navigate("/topics")
    }
  }

  // Keyboard shortcuts: Space = replay current segment, Tab = next sentence
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
  }, [handleNext])

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
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* LEFT: media + active sentence */}
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {/* Media player */}
            {lesson.sourceType === "YOUTUBE" ? (
              <YouTubeShadowing
                ref={playerRef}
                lesson={lesson as ILLessonDetailsDto}
                currentSentence={currentSentence}
                autoStop={autoStop}
                largeVideo={largeVideo}
              />
            ) : (
              <AudioShadowing
                ref={playerRef}
                lesson={lesson as ILLessonDetailsDto}
                currentSentence={currentSentence}
                autoStop={autoStop}
              />
            )}

            {/* Toggles row */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-stop"
                    checked={autoStop}
                    onCheckedChange={setAutoStop}
                  />
                  <Label htmlFor="auto-stop" className="text-xs">
                    Auto Stop
                  </Label>
                </div>
                {
                  lesson.sourceType === "YOUTUBE" && <div className="flex items-center gap-2">
                    <Switch
                      id="large-video"
                      checked={largeVideo}
                      onCheckedChange={setLargeVideo}
                    />
                    <Label htmlFor="large-video" className="text-xs">
                      Large-sized video
                    </Label>
                  </div>
                }
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">

                {/* Nút shortcuts với badge */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-2 px-2 text-xs"
                  onClick={() => setShowHelp(true)}
                >
                  <Keyboard className=""/>
                  Shortcuts
                </Button>
                <Volume2 className="h-4 w-4" />
                <span>1x</span>
              </div>
            </div>

            {/* Active sentence + controls - SỬ DỤNG COMPONENT MỚI */}
            <ActiveSentencePanel
              lesson={lesson}
              activeIndex={activeIndex}
              onPrev={handlePrev}
              onNext={handleNext}
              onReplay={handleReplay}
              onPlay={handlePlay}
              onPause={handlePause}
            />
            {/* Keyboard Shortcuts Dialog */}
            <KeyboardShortcutsHelp
              open={showHelp}
              onClose={() => setShowHelp(false)}
            />
          </div>

          {/* RIGHT: Transcript panel */}
          {showTranscript && (
            <div className="mt-2 w-full shrink-0 lg:mt-0 lg:w-[340px] xl:w-[380px]">
              <ShadowingTranscript
                sentences={sentences}
                activeIndex={activeIndex}
                onSelectSentence={handleSelectSentence}
                visible={showTranscript}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ShadowingMode