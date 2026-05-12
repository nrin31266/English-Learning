import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle2, FileText, Loader2 } from "lucide-react"
import AudioFileTag from "@/components/AudioFileTag"
import LanguageLevelBadge from "@/components/LanguageLevel"
import YouTubeTag from "@/components/YouTubeTag"
import KeyboardShortcutsHelp from "@/components/players/KeyboardShortcutsHelp"
import Player from "@/components/players/Player"
import LessonProgressBar from "@/components/LessonProgressStrip"
import { CompletionModal, LoginIncentiveModal } from "@/components/ModeModals"
import { cn } from "@/lib/utils"
import type { useLessonMode } from "../hooks/useLessonMode"

interface LessonModeLayoutProps {
  mode: ReturnType<typeof useLessonMode>
  i18nPrefix: string
  panel: ReactNode
  transcript: ReactNode
}

const LessonModeLayout = ({ mode, i18nPrefix, panel, transcript }: LessonModeLayoutProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
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
    activeIndex,
    autoPlayOnSentenceChange,
    setUserInteracted,
    handlePrev,
    handleNext,
    handleSelectSentence,
    showHelp,
    setShowHelp,
    showTranscriptToggle,
    setShowTranscriptToggle,
    effectiveShowTranscript,
    showProgress,
    setShowProgress,
    showLoginModal,
    setShowLoginModal,
    showCompletionModal,
    setShowCompletionModal,
    handleBackToTopic,
    handleLoginIncentive,
    handleRetry,
    profile,
  } = mode

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col gap-2 py-2 px-2 pb-8">

      <div className="flex items-center justify-between gap-2 rounded-lg bg-card border px-2 sm:px-3 py-1.5 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 sm:hidden" onClick={handleBackToTopic}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hidden sm:flex shrink-0" onClick={handleBackToTopic}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> {tk("back")}
          </Button>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 whitespace-nowrap pr-2">
            <span
              className="text-[11px] sm:text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer shrink-0 transition-colors"
              onClick={() => navigate("/topics")}
            >
              {tk("playlists")}
            </span>
            <span className="text-muted-foreground/40 shrink-0">/</span>

            {lesson?.topic && (
              <>
                <span
                  className="text-[11px] sm:text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer truncate max-w-[100px] sm:max-w-[150px] shrink-0 transition-colors"
                  onClick={() => navigate(`/topics/${lesson.topic.slug}`)}
                >
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
                    <span className="text-[10px] font-bold">{tk("done")}</span>
                  </div>
                )}

                {!profile && (
                  <button
                    onClick={handleLoginIncentive}
                    className="ml-2 text-[11px] sm:text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline underline-offset-2 transition-colors shrink-0"
                  >
                    {tk("signInToSave")}
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
            <p className="max-w-md text-center text-xs text-destructive/80">{error.message}</p>
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
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mt-1">
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
                onToggleProgress={() => setShowProgress((prev) => !prev)}
              />
            </div>

            <KeyboardShortcutsHelp open={showHelp} onClose={() => setShowHelp(false)} />

            {panel}
          </div>

          {effectiveShowTranscript && (
            <div className="xl:col-span-4 h-full">
              {transcript}
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
        onReview={() => setShowCompletionModal(false)}
      />
    </div>
  )
}

export default LessonModeLayout
