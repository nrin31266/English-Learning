// src/pages/ShadowingMode.tsx

import { useAppDispatch, useAppSelector } from "@/store"
import {
  fetchLessonBySlugForShadowing,
  resetLessonState,
  submitBatchShadowingScore, // 👉 Đừng quên tạo Thunk này ở Slide nhé
  submitShadowingScore,
  updateSentenceCompletion,

} from "@/store/lessonForShadowingSlide"
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
import ActiveSentencePanel from "../components/ActiveSentencePanel"

import KeyboardShortcutsHelp from "@/components/players/KeyboardShortcutsHelp"
import Player from "@/components/players/Player"
import type { PlayerRef } from "@/components/players/types/types"
import ShadowingTranscript from "../components/ShadowingTranscript"
import { cn } from "@/lib/utils"
import LessonProgressBar from "@/components/LessonProgressStrip" 
import KeycloakClient from "@/features/keycloak/keycloak"
import { useAuth } from "@/features/keycloak/providers/AuthProvider"
import { clearGuestProgress, getGuestProgress, saveGuestProgress } from "@/utils/guestStorage"
import { CompletionModal, LoginIncentiveModal } from "@/components/ModeModals"

const MODE_NAME = "SHADOWING";

const ShadowingMode = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { profile } = useAuth();
  const keycloak = KeycloakClient.getInstance();

  const [showHelp, setShowHelp] = useState(false)
  const lessonState = useAppSelector((state) => state.lessonForShadowing.lesson)
  const { data: lesson, status, error } = lessonState

  // 👉 Đồng bộ cơ chế Set/Array giống Dictation
  const shadowingProgress = useMemo(() => lesson?.progressOverview?.shadowing, [lesson])
  const completedIdsArray = useMemo(() => shadowingProgress?.completedSentenceIds || [], [shadowingProgress])
  const completedIdsSet = useMemo(() => new Set(completedIdsArray), [completedIdsArray])
  const isLessonCompleted = useMemo(() => shadowingProgress?.status === 'COMPLETED', [shadowingProgress])

  const [autoStop, setAutoStop] = useState(true)
  const [largeVideo, setLargeVideo] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [autoPlayOnSentenceChange, setAutoPlayOnSentenceChange] = useState(true)
  const [userInteracted, setUserInteracted] = useState(false)
  
  // State điều khiển UI
  const [showTranscriptToggle, setShowTranscriptToggle] = useState(false)
  const [showProgress, setShowProgress] = useState(true)
  const [isDesktop, setIsDesktop] = useState(true)

  // 👉 Thêm State cho Modals & Sync
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const syncRef = useRef(false);

  const playerRef = useRef<PlayerRef | null>(null)
  const [playbackRate, setPlaybackRate] = useState<number>(1.0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1280)
    checkDesktop()
    window.addEventListener("resize", checkDesktop)
    return () => window.removeEventListener("resize", checkDesktop)
  }, [])

  const effectiveShowTranscript = isDesktop ? showTranscriptToggle : true

  useEffect(() => {
    if (slug) {
      dispatch(fetchLessonBySlugForShadowing(slug))
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

  const handlePause = () => {
    playerRef.current?.pause()
  }

  const handleSelectSentence = useCallback((index: number) => {
    setAutoPlayOnSentenceChange(true)
    setActiveIndex(index)
  }, [])

  // 🚀 1. Logic xử lý khi hoàn thành 1 câu (Hỗ trợ Guest & User)
  const handleCompleteSentence = useCallback((sentenceId: number, _fluency: number, score: number) => {
    if (!lesson?.id) return;

    dispatch(updateSentenceCompletion({ sentenceId, completed: true }));

    if (profile) {
      dispatch(submitShadowingScore({
        lessonId: lesson.id,
        sentenceId,
        score
      }));
    } else {
      const currentLocal = getGuestProgress(slug!, MODE_NAME);
      if (!currentLocal.includes(sentenceId)) {
        const nextLocal = [...currentLocal, sentenceId];
        saveGuestProgress(slug!, MODE_NAME, nextLocal);
        setShowLoginModal(true);
      }
    }
  }, [dispatch, lesson?.id, profile, slug]);

  // 🚀 2. Hiển thị Modal khi hoàn thành toàn bộ bài
  useEffect(() => {
    if (lesson && isLessonCompleted) {
        setShowCompletionModal(true);
    }
  }, [isLessonCompleted, lesson]);

  // 🚀 3. LOGIC 0: Tái hiện tiến độ cho Guest khi F5
  useEffect(() => {
    if (!profile && status === "succeeded" && slug) {
        const localData = getGuestProgress(slug, MODE_NAME);
        if (localData.length > 0) {
            console.log("Hydrating guest progress from localStorage...");
            localData.forEach(sId => {
                dispatch(updateSentenceCompletion({ sentenceId: sId, completed: true }));
            });
        }
    }
  }, [profile, status, slug, dispatch]);

  // 🚀 4. LOGIC SYNC: Chạy khi Guest quyết định Login
  useEffect(() => {
    const performBatchSync = async () => {
        if (profile && lesson?.id && slug && sentences.length > 0 && !syncRef.current) {
            const localData = getGuestProgress(slug, MODE_NAME);

            if (localData.length > 0) {
                syncRef.current = true;

                const pendingIds = localData.filter(sId => !completedIdsSet.has(sId));

                if (pendingIds.length > 0) {
                    console.log(`🚀 Fluenrin: Launching batch sync for ${pendingIds.length} shadowing sentences...`);

                    try {
                        await dispatch(submitBatchShadowingScore({
                            lessonId: lesson.id,
                            sentenceIds: pendingIds,
                            score: 100 // Thay bằng điểm mặc định ông muốn cho Shadowing
                        })).unwrap();

                        pendingIds.forEach(sId => {
                            dispatch(updateSentenceCompletion({ sentenceId: sId, completed: true }));
                        });

                        const lastSyncedId = pendingIds[pendingIds.length - 1];
                        const targetIndex = sentences.findIndex(s => s.id === lastSyncedId);

                        if (targetIndex !== -1) {
                            setActiveIndex(targetIndex);
                            setAutoPlayOnSentenceChange(false);
                        }

                        console.log("✅ Sync successful. Progress preserved.");
                    } catch (error) {
                        console.error("❌ Batch sync failed:", error);
                        syncRef.current = false;
                        return;
                    }
                }

                clearGuestProgress(slug, MODE_NAME);
            }
        }
    };

    performBatchSync();
  }, [profile, lesson?.id, slug, dispatch, completedIdsSet, sentences]);

  const handleBackToTopic = () => {
    if (lesson?.topic) {
      navigate(`/topics/${lesson.topic.slug}`)
    } else {
      navigate("/topics")
    }
  }

  // 🚀 5. Hàm Login kết hợp lưu trữ
  const handleLoginIncentive = () => {
    saveGuestProgress(slug!, MODE_NAME, completedIdsArray);
    keycloak.login();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isEditable = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable

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
    <div className="flex min-h-[calc(100vh-64px)] flex-col gap-2 py-2 px-2 pb-8">
      
      {/* 👉 HEADER TỐI ƯU 1 HÀNG DUY NHẤT (SIÊU ÉP) */}
      <div className="flex items-center justify-between gap-2 rounded-lg bg-card border px-2 sm:px-3 py-1.5 shadow-sm">
        
        {/* Nửa trái: Nút Back + Nội dung (Cho phép scroll ngang nếu quá dài) */}
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
                <span className="text-[11px] sm:text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer truncate max-w-[100px] sm:max-w-[150px] shrink-0 transition-colors" onClick={() => navigate(`/topics/${lesson.topic.slug}`)}>
                  {lesson.topic.name}
                </span>
                <span className="text-muted-foreground/40 shrink-0">/</span>
              </>
            )}
            
            <span className="text-[11px] sm:text-xs font-bold text-foreground truncate max-w-[150px] sm:max-w-[200px] shrink-0">
              {lesson?.title ?? "Loading..."}
            </span>

            {/* Các thẻ Tags được nhét vào cùng 1 dòng luôn */}
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

                {/* 👉 Nút Nhắc nhở Guest Mode tối giản */}
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

        {/* Nửa phải: Nút Toggle Transcript (CHỈ HIỆN TRÊN DESKTOP) */}
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
          Loading lesson for shadowing...
        </div>
      ) : status === "failed" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm">
          <p className="text-destructive">Cannot load lesson. Please try again.</p>
          {error?.message && <p className="max-w-md text-center text-xs text-destructive/80">{error.message}</p>}
          {slug && <Button size="sm" variant="outline" onClick={() => dispatch(fetchLessonBySlugForShadowing(slug))}>Retry</Button>}
        </div>
      ) : !lesson ? (
        <div className="flex flex-1 flex-col items-center justify-center text-sm text-muted-foreground">Lesson not found.</div>
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
                onToggleProgress={() => setShowProgress(prev => !prev)}
              />
            </div>

            <ActiveSentencePanel
              lesson={lesson}
              activeIndex={activeIndex}
              handlePause={handlePause}
              onNext={handleNext}
              userInteracted={userInteracted}
              onComplete={handleCompleteSentence}
            />

            <KeyboardShortcutsHelp open={showHelp} onClose={() => setShowHelp(false)} />
          </div>

          {/* Render Transcript dựa trên effectiveShowTranscript */}
          {effectiveShowTranscript && (
            <div className="xl:col-span-4 h-full">
              <ShadowingTranscript
                sentences={sentences}
                activeIndex={activeIndex}
                onSelectSentence={handleSelectSentence}
                visible={effectiveShowTranscript}
                completedIds={completedIdsSet} // 👉 Đã đổi sang Set để đồng bộ giống Dictation
              />
            </div>
          )}
        </div>
      )}
      
      {showProgress && sentences.length > 0 && (
        <LessonProgressBar
          sentences={sentences as { id: number; }[]}
          completedIds={completedIdsArray} // 👉 ProgressBar xài Array
          activeIndex={activeIndex}
          onSelect={handleSelectSentence}
        />
      )}

      {/* 🚀 Render Modals */}
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

export default ShadowingMode