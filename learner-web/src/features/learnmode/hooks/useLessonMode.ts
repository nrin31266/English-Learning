import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector, type RootState } from "@/store"
import type { IAsyncState, ILessonDetailsResponse, ILessonSentenceDetailsResponse } from "@/types"
import type { PlayerRef } from "@/components/players/types/types"
import KeycloakClient from "@/features/keycloak/keycloak"
import { useAuth } from "@/features/keycloak/providers/AuthProvider"
import { clearGuestProgress, getGuestProgress, saveGuestProgress } from "@/utils/guestStorage"
import type { UnknownAction } from "@reduxjs/toolkit"

export interface UseLessonModeConfig {
  lessonId: string | undefined
  selector: (state: RootState) => IAsyncState<ILessonDetailsResponse | null>
  fetchAction: (id: number) => any
  resetAction: () => UnknownAction
  submitScore: (args: { lessonId: number; sentenceId: number; score: number }) => any
  submitBatchScore: (args: { lessonId: number; sentenceIds: number[]; score: number }) => any
  updateCompletion: (sentenceId: number) => UnknownAction
  progressKey: "shadowing" | "dictation"
  modeName: string
  captureKeysInEditable?: boolean
}

export function useLessonMode(config: UseLessonModeConfig) {
  const {
    lessonId,
    selector,
    fetchAction,
    resetAction,
    submitScore,
    submitBatchScore,
    updateCompletion,
    progressKey,
    modeName,
    captureKeysInEditable = false,
  } = config

  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { profile } = useAuth()
  const keycloak = KeycloakClient.getInstance()

  const [showHelp, setShowHelp] = useState(false)
  const lessonState = useAppSelector(selector)
  const { data: lesson, status, error } = lessonState

  const progress = useMemo(() => lesson?.progressOverview?.[progressKey], [lesson, progressKey])
  const completedIdsArray = useMemo(() => progress?.completedSentenceIds || [], [progress])
  const completedIdsSet = useMemo(() => new Set(completedIdsArray), [completedIdsArray])
  const isLessonCompleted = useMemo(() => progress?.status === "COMPLETED", [progress])

  const [autoStop, setAutoStop] = useState(true)
  const [largeVideo, setLargeVideo] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [autoPlayOnSentenceChange, setAutoPlayOnSentenceChange] = useState(true)
  const [userInteracted, setUserInteracted] = useState(false)

  const [showTranscriptToggle, setShowTranscriptToggle] = useState(false)
  const [showProgress, setShowProgress] = useState(true)
  const [isDesktop, setIsDesktop] = useState(true)

  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const syncRef = useRef(false)

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
    if (lessonId) {
      dispatch(fetchAction(Number(lessonId)) as any)
    }
    return () => {
      dispatch(resetAction())
    }
  }, [dispatch, lessonId, fetchAction, resetAction])

  const isLoading = status === "idle" || status === "loading"

  const sentences: ILessonSentenceDetailsResponse[] = useMemo(
    () => lesson?.sentences ?? [],
    [lesson]
  )

  useEffect(() => {
    if (sentences.length > 0 && completedIdsSet.size > 0) {
      const firstUnfinished = sentences.findIndex((s) => !completedIdsSet.has(s.id))
      setActiveIndex(firstUnfinished > 0 ? firstUnfinished : 0)
    } else {
      setActiveIndex(0)
    }
    setAutoPlayOnSentenceChange(true)
    setUserInteracted(false)
  }, [lesson?.id])

  const currentSentence = sentences[activeIndex]

  const handlePrev = useCallback(() => {
    setAutoPlayOnSentenceChange(true)
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }, [])

  const handleNext = useCallback(() => {
    setAutoPlayOnSentenceChange(true)
    setActiveIndex((prev) => (prev < sentences.length - 1 ? prev + 1 : prev))
  }, [sentences.length])

  const handlePause = useCallback(() => {
    playerRef.current?.pause()
  }, [])

  const handleSelectSentence = useCallback((index: number) => {
    setAutoPlayOnSentenceChange(true)
    setActiveIndex(index)
  }, [])

  const handleCompleteSentence = useCallback(
    (sentenceId: number, score: number) => {
      if (!lesson?.id) return

      dispatch(updateCompletion(sentenceId))

      if (profile) {
        dispatch(submitScore({ lessonId: lesson.id, sentenceId, score }) as any)
      } else {
        const currentLocal = getGuestProgress(lessonId!, modeName)
        if (!currentLocal.includes(sentenceId)) {
          saveGuestProgress(lessonId!, modeName, [...currentLocal, sentenceId])
          setTimeout(() => setShowLoginModal(true), 600)
        }
      }
    },
    [dispatch, lesson?.id, profile, lessonId, updateCompletion, submitScore, modeName]
  )

  useEffect(() => {
    if (lesson && isLessonCompleted) {
      const timer = setTimeout(() => setShowCompletionModal(true), 800)
      return () => clearTimeout(timer)
    }
  }, [isLessonCompleted, lesson])

  useEffect(() => {
    if (!profile && status === "succeeded" && lessonId) {
      const localData = getGuestProgress(lessonId, modeName)
      if (localData.length > 0) {
        console.log("Hydrating guest progress from localStorage...")
        localData.forEach((sId) => {
          dispatch(updateCompletion(sId))
        })
      }
    }
  }, [profile, status, lessonId, dispatch, modeName, updateCompletion])

  useEffect(() => {
    const performBatchSync = async () => {
      if (profile && lesson?.id && lessonId && sentences.length > 0 && !syncRef.current) {
        const localData = getGuestProgress(lessonId, modeName)

        if (localData.length > 0) {
          syncRef.current = true
          const pendingIds = localData.filter((sId) => !completedIdsSet.has(sId))

          if (pendingIds.length > 0) {
            console.log(`🚀 Fluenrin: Launching batch sync for ${pendingIds.length} sentences...`)
            try {
              await dispatch(
                submitBatchScore({ lessonId: lesson.id, sentenceIds: pendingIds, score: 100 }) as any
              ).unwrap()

              pendingIds.forEach((sId) => dispatch(updateCompletion(sId)))

              const lastSyncedId = pendingIds[pendingIds.length - 1]
              const targetIndex = sentences.findIndex((s) => s.id === lastSyncedId)
              if (targetIndex !== -1) {
                setActiveIndex(targetIndex)
                setAutoPlayOnSentenceChange(false)
              }
              console.log("✅ Sync successful. Progress preserved.")
            } catch (err) {
              console.error("❌ Batch sync failed:", err)
              syncRef.current = false
              return
            }
          }

          clearGuestProgress(lessonId, modeName)
        }
      }
    }

    performBatchSync()
  }, [profile, lesson?.id, lessonId, dispatch, completedIdsSet, sentences, modeName, submitBatchScore, updateCompletion])

  const handleBackToTopic = useCallback(() => {
    if (lesson?.topic) {
      navigate(`/topics/${lesson.topic.slug}`)
    } else {
      navigate("/topics")
    }
  }, [lesson, navigate])

  const handleLoginIncentive = useCallback(() => {
    saveGuestProgress(lessonId!, modeName, completedIdsArray)
    keycloak.login()
  }, [lessonId, modeName, completedIdsArray, keycloak])

  const handleRetry = useCallback(() => {
    if (lessonId) dispatch(fetchAction(Number(lessonId)) as any)
  }, [dispatch, fetchAction, lessonId])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isNavKey = e.key === "Tab" || e.key === "PageDown" || e.key === "PageUp"
      const isCtrlKey = e.code === "ControlLeft" || e.code === "ControlRight"

      if (captureKeysInEditable) {
        if (isNavKey || isCtrlKey) {
          e.preventDefault()
          if (isCtrlKey) playerRef.current?.playCurrentSegment()
          else if (e.key === "PageDown" || e.key === "Tab") handleNext()
          else if (e.key === "PageUp") handlePrev()
        }
      } else {
        const isEditable =
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.isContentEditable
        if (isEditable) return
        if (isCtrlKey) { e.preventDefault(); playerRef.current?.playCurrentSegment() }
        else if (e.key === "PageDown" || e.key === "Tab") { e.preventDefault(); handleNext() }
        else if (e.key === "PageUp") { e.preventDefault(); handlePrev() }
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleNext, handlePrev, captureKeysInEditable])

  return {
    lessonId,
    lesson,
    sentences,
    currentSentence,
    isLoading,
    status,
    error,
    completedIdsArray,
    completedIdsSet,
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
    userInteracted,
    setUserInteracted,
    handlePrev,
    handleNext,
    handlePause,
    handleSelectSentence,
    handleCompleteSentence,
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
  }
}
