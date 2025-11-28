import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store"
import { fetchLessonBySlug } from "@/store/lessonSlide"

import type { ILLessonDetailsDto, ILLessonSentence } from "@/types"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  Loader2,
  Play,
  Pause,
  StepBack,
  StepForward,
  RotateCcw,
  Mic,
  Volume2,
} from "lucide-react"
import ShadowingTranscript from "../components/ShadowingTranscript"
import YouTubeTag from "@/components/YouTubeTag"
import AudioFileTag from "@/components/AudioFileTag"
import LanguageLevelBadge from "@/components/LanguageLevel"


const ShadowingMode = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const lessonState = useAppSelector((state) => state.lesson.lesson)
  const { data: lesson, status, error } = lessonState

  const [autoStop, setAutoStop] = useState(true)
  const [largeVideo, setLargeVideo] = useState(false)
  const [showTranscript, setShowTranscript] = useState(true)

  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (slug) {
      dispatch(fetchLessonBySlug(slug))
    }
  }, [dispatch, slug])

  // reset index khi lesson đổi
  useEffect(() => {
    setActiveIndex(0)
  }, [lesson?.id])

  const isLoading = status === "idle" || status === "loading"

  const sentences: ILLessonSentence[] = useMemo(
    () => lesson?.sentences ?? [],
    [lesson]
  )

  const currentSentence = sentences[activeIndex] as ILLessonSentence | undefined

  const videoHeightClass = largeVideo ? "h-[420px]" : "h-[280px]"

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }

  const handleNext = () => {
    setActiveIndex((prev) =>
      prev < sentences.length - 1 ? prev + 1 : prev
    )
  }

  const handleReplay = () => {
    // TODO: sau này gắn logic audio
    if (currentSentence) {
      console.log("Replay sentence", currentSentence.orderIndex)
    }
  }

  const handlePlay = () => {
    // TODO: audio play logic
    if (currentSentence) {
      console.log("Play sentence", currentSentence.orderIndex)
    }
  }

  const handlePause = () => {
    // TODO: audio pause logic
    console.log("Pause")
  }

  const handleSelectSentence = (index: number) => {
    setActiveIndex(index)
  }

  const handleBackToLesson = () => {
    if (!lesson) {
      navigate("/topics")
      return
    }
    navigate(`/learn/lessons/${lesson.slug}`)
  }

  // helper chuyển youtube url -> embed url
  const getYoutubeEmbedUrl = (url: string | null | undefined): string | null => {
    if (!url) return null
    try {
      const u = new URL(url)
      if (u.hostname.includes("youtu.be")) {
        return `https://www.youtube.com/embed${u.pathname}`
      }
      if (u.hostname.includes("youtube.com")) {
        const v = u.searchParams.get("v")
        if (v) return `https://www.youtube.com/embed/${v}`
      }
      return url
    } catch {
      return url
    }
  }

  const embedUrl =
    lesson?.sourceType === "YOUTUBE"
      ? getYoutubeEmbedUrl(lesson.sourceUrl)
      : null

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col gap-4 py-4 px-1">
      {/* Top bar: breadcrumb + right actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Breadcrumb>
            <BreadcrumbList className="">
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
                <span className="truncate">
                  {lesson.sourceType === "YOUTUBE" ? <YouTubeTag /> : <AudioFileTag/>}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-2 sm:flex"
            onClick={handleBackToLesson}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to lesson
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
          {/* LEFT: video + active sentence */}
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {/* Video */}
            <div
              className={`w-full overflow-hidden rounded-xl border bg-black ${videoHeightClass}`}
            >
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={lesson.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                  No video available for this lesson.
                </div>
              )}
            </div>

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
                <div className="flex items-center gap-2">
                  <Switch
                    id="large-video"
                    checked={largeVideo}
                    onCheckedChange={setLargeVideo}
                  />
                  <Label htmlFor="large-video" className="text-xs">
                    Large-sized video
                  </Label>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Volume2 className="h-4 w-4" />
                <span>1x</span>
              </div>
            </div>

            {/* Active sentence + controls */}
            <ScrollArea className="min-h-0 flex-1 rounded-xl border bg-card">
              <div className="flex min-h-[220px] flex-col items-center justify-between gap-4 px-4 py-4">
                {/* Sentence text */}
                <div className="space-y-2 text-center">
                  <p className="text-lg font-semibold leading-relaxed">
                    {currentSentence
                      ? currentSentence.textDisplay ?? currentSentence.textRaw
                      : "No sentence selected."}
                  </p>
                  {currentSentence?.phoneticUk && (
                    <p className="text-sm italic text-muted-foreground">
                      {currentSentence.phoneticUk}
                    </p>
                  )}
                </div>

                {/* Transport controls */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={activeIndex === 0}
                      onClick={handlePrev}
                    >
                      <StepBack className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleReplay}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      className="shadow"
                      onClick={handlePlay}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handlePause}
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={activeIndex === sentences.length - 1}
                      onClick={handleNext}
                    >
                      <StepForward className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Record buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="gap-2"
                    >
                      <Volume2 className="h-4 w-4" />
                      Play recorded audio
                    </Button>
                    <Button size="sm" className="gap-2">
                      <Mic className="h-4 w-4" />
                      Record
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT: Transcript panel */}
          {showTranscript && (
            <div className="mt-2 w-full shrink-0 lg:mt-0 lg:w-[340px] xl:w-[380px]">
              <ShadowingTranscript
                sentences={sentences}
                activeIndex={activeIndex}
                onSelectSentence={handleSelectSentence}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ShadowingMode
