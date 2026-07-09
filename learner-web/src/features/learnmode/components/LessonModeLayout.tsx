// src/features/lessons/components/LessonModeLayout.tsx

import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
} from "lucide-react"

import AudioFileTag from "@/components/AudioFileTag"
import LanguageLevelBadge from "@/components/LanguageLevel"
import LessonProgressBar from "@/components/LessonProgressStrip"
import YouTubeTag from "@/components/YouTubeTag"
import KeyboardShortcutsHelp from "@/components/players/KeyboardShortcutsHelp"
import Player from "@/components/players/Player"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAppDispatch } from "@/store"
import { openAuthDialog } from "@/store/uiSlice"

import type { useLessonMode } from "../hooks/useLessonMode"
import { LessonCompletionDialog } from "./LessonCompletionDialog"

interface LessonModeLayoutProps {
  mode: ReturnType<typeof useLessonMode>
  i18nPrefix: string
  panel: ReactNode
  transcript: ReactNode
  completionDetails?: ReactNode
  contentLayout?: "stacked" | "sideBySide"
  forceCompactPlayerControls?: boolean
}

const LessonModeLayout = ({
  mode,
  i18nPrefix,
  panel,
  transcript,
  completionDetails,
  contentLayout = "stacked",
  forceCompactPlayerControls = false,
}: LessonModeLayoutProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const tk = (key: string) => t(`${i18nPrefix}.${key}`)

  const {
    lessonId,
    lesson,
    sentences,
    currentSentence,
    isLoading,
    status,
    error,
    completedIdsArray,
    isLessonCompleted,

    playerRef,
    playbackRate,
    setPlaybackRate,
    isPlaying,
    setIsPlaying,
    autoStop,
    setAutoStop,
    largeVideo,
    setLargeVideo,
    hideVideo,
    setHideVideo,
    setPlayerCurrentTime,

    activeIndex,
    autoPlayOnSentenceChange,
    setUserInteracted,

    handlePrev,
    handleNext,
    handleSelectSentence,
    handleBackToTopic,
    handleRetry,

    showHelp,
    setShowHelp,
    showTranscriptToggle,
    setShowTranscriptToggle,
    effectiveShowTranscript,
    showProgress,
    setShowProgress,

    showCompletionModal,
    setShowCompletionModal,
    celebrateCompletion,

    profile,
  } = mode


  const openLoginDialog = () => {
    dispatch(openAuthDialog())
  }

  return (
    <div className="flex min-h-screen w-full flex-col gap-2 p-2 sm:p-4">
      <div className="flex items-center justify-between gap-2 rounded-lg border bg-card px-2 py-1.5 shadow-sm sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 sm:hidden"
            onClick={handleBackToTopic}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="hidden h-7 shrink-0 px-2 text-xs text-muted-foreground sm:flex"
            onClick={handleBackToTopic}
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            {tk("back")}
          </Button>

          <div className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap pr-2">
            <span
              className="shrink-0 cursor-pointer text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:text-xs"
              onClick={() => navigate("/topics")}
            >
              {tk("playlists")}
            </span>

            <span className="shrink-0 text-muted-foreground/40">/</span>

            {lesson?.topic && (
              <>
                <span
                  className="max-w-[100px] shrink-0 cursor-pointer truncate text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:max-w-[150px] sm:text-xs"
                  onClick={() => navigate(`/topics/${lesson.topic.slug}`)}
                >
                  {lesson.topic.name}
                </span>

                <span className="shrink-0 text-muted-foreground/40">/</span>
              </>
            )}

            <span className="max-w-[150px] shrink-0 truncate text-[11px] font-bold text-foreground sm:max-w-[200px] sm:text-xs">
              {lesson?.title ?? "Loading..."}
            </span>

            {lesson && (
              <div className="ml-1 flex shrink-0 items-center gap-1.5 border-l border-border/50 pl-2">
                <LanguageLevelBadge level={lesson.languageLevel} />

                {lesson.sourceType === "YOUTUBE" ? (
                  <YouTubeTag />
                ) : (
                  <AudioFileTag />
                )}

                {isLessonCompleted && (
                  <div className="flex items-center gap-1 rounded-full border border-green-100 bg-green-50 px-1.5 py-0.5 text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="text-[10px] font-bold">
                      {tk("done")}
                    </span>
                  </div>
                )}

                {!profile && (
                  <button
                    onClick={openLoginDialog}
                    className="ml-2 shrink-0 text-[11px] font-medium text-amber-600 underline-offset-2 transition-colors hover:text-amber-700 hover:underline dark:text-amber-400 dark:hover:text-amber-300 sm:text-xs"
                  >
                    {tk("signInToSave")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 items-center xl:flex">
          <Button
            variant={showTranscriptToggle ? "secondary" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setShowTranscriptToggle((prev) => !prev)}
          >
            <FileText className="mr-1 h-3.5 w-3.5" />
            <span>{tk("transcript")}</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          {tk("loadingLesson")}
        </div>
      ) : status === "failed" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm">
          <p className="text-destructive">{tk("cannotLoad")}</p>

          {error?.message && (
            <p className="max-w-md text-center text-xs text-destructive/80">
              {error.message}
            </p>
          )}

          {lessonId && (
            <Button size="sm" variant="outline" onClick={handleRetry}>
              {tk("retry")}
            </Button>
          )}
        </div>
      ) : !lesson ? (
        <div className="flex flex-1 flex-col items-center justify-center text-sm text-muted-foreground">
          {tk("lessonNotFound")}
        </div>
      ) : contentLayout === "sideBySide" ? (
        <div className="mt-1 grid grid-cols-1 items-stretch gap-3 xl:min-h-[calc(100vh-11rem)] xl:grid-cols-12">
          <div
            className={cn(
              "flex min-h-0 flex-col gap-3 xl:col-span-4",
              !effectiveShowTranscript && "xl:col-span-5"
            )}
          >
            <div className="top-18 z-40 h-full xl:sticky">
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
                largeVideo={largeVideo || !effectiveShowTranscript}
                hideVideo={hideVideo}
                onPrev={handlePrev}
                onNext={handleNext}
                hasPrev={activeIndex > 0}
                hasNext={activeIndex < sentences.length - 1}
                onAutoStopChange={setAutoStop}
                onLargeVideoChange={setLargeVideo}
                onHideVideoChange={setHideVideo}
                onPlaybackRateChange={setPlaybackRate}
                onCurrentTimeChange={setPlayerCurrentTime}
                onShowShortcuts={() => setShowHelp(true)}
                showProgress={showProgress}
                onToggleProgress={() => setShowProgress((prev) => !prev)}
                forceCompactControls={forceCompactPlayerControls}
                className="h-full"
              />
            </div>

            <KeyboardShortcutsHelp
              open={showHelp}
              onClose={() => setShowHelp(false)}
            />
          </div>

          <div
            className={cn(
              "min-h-0 min-w-0 xl:col-span-5",
              !effectiveShowTranscript && "xl:col-span-7"
            )}
          >
            {panel}
          </div>

          {effectiveShowTranscript && (
            <div className="min-h-0 xl:col-span-3">{transcript}</div>
          )}
        </div>
      ) : (
        <div className="mt-1 grid grid-cols-1 gap-3 xl:grid-cols-12">
          <div
            className={cn(
              "flex flex-col gap-3",
              effectiveShowTranscript
                ? "xl:col-span-9"
                : "xl:col-span-12"
            )}
          >
            <div className="sticky top-18 z-40">
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
                hideVideo={hideVideo}
                onPrev={handlePrev}
                onNext={handleNext}
                hasPrev={activeIndex > 0}
                hasNext={activeIndex < sentences.length - 1}
                onAutoStopChange={setAutoStop}
                onLargeVideoChange={setLargeVideo}
                onHideVideoChange={setHideVideo}
                onPlaybackRateChange={setPlaybackRate}
                onCurrentTimeChange={setPlayerCurrentTime}
                onShowShortcuts={() => setShowHelp(true)}
                showProgress={showProgress}
                onToggleProgress={() => setShowProgress((prev) => !prev)}
                forceCompactControls={forceCompactPlayerControls}
              />
            </div>

            <KeyboardShortcutsHelp
              open={showHelp}
              onClose={() => setShowHelp(false)}
            />

            {panel}
          </div>

          {effectiveShowTranscript && (
            <div className="h-full xl:col-span-3">{transcript}</div>
          )}
        </div>
      )}

      <LessonCompletionDialog
        open={showCompletionModal}
        lessonId={lessonId}
        celebrate={celebrateCompletion}
        expectReward={Boolean(profile)}
  
        onBack={handleBackToTopic}
        onContinue={() => setShowCompletionModal(false)}
      >
        {completionDetails}
      </LessonCompletionDialog>

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

export default LessonModeLayout
