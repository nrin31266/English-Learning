// src/features/learnmode/hooks/useLessonMode.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector, type RootState } from "@/store"
import type { IAsyncState, ILessonDetailsResponse, ILessonSentenceDetailsResponse } from "@/types"
import type { LearningMode, ProgressUpdateResponse } from "@/types/lessonProgress"
import type { PlayerRef } from "@/components/players/types/types"
import KeycloakClient from "@/features/keycloak/keycloak"
import { useAuth } from "@/features/keycloak/providers/AuthProvider"
import { clearGuestProgress, getGuestProgress, saveGuestProgress } from "@/utils/guestStorage"
import type { UnknownAction } from "@reduxjs/toolkit"


/**
 * Cấu hình tham số đầu vào cho Hook điều phối chế độ học.
 * Đã được chuẩn hóa để tương thích với Generic Redux Slice (activeLessonSlice).
 */
export interface UseLessonModeConfig {
  lessonId: string | undefined
  selector: (state: RootState) => IAsyncState<ILessonDetailsResponse | null>
  fetchAction: (args: { id: number; mode: LearningMode }) => any
  resetAction: () => UnknownAction
  submitScore: (args: { lessonId: number; sentenceId: number; mode: LearningMode; score: number }) => any
  submitBatchScore: (args: { lessonId: number; sentenceIds: number[]; mode: LearningMode; score: number }) => any
  updateLocalProgress: (args: { sentenceId: number; score: number; mode: LearningMode }) => UnknownAction
  progressKey: "shadowing" | "dictation"
  modeName: LearningMode
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
    updateLocalProgress,
    progressKey,
    modeName,
    captureKeysInEditable = false,
  } = config

  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { profile } = useAuth()
  const keycloak = KeycloakClient.getInstance()

  // --- UI State Management ---
  const [showHelp, setShowHelp] = useState(false)
  const lessonState = useAppSelector(selector)
  const { data: lesson, status, error } = lessonState

  // --- Progress State Derivation ---
  const progress = useMemo(() => lesson?.progressOverview?.[progressKey], [lesson, progressKey])
  const completedIdsArray = useMemo(
    () => Object.keys(progress?.progressItems ?? {}).map(Number),
    [progress?.progressItems]
  )
  const completedIdsSet = useMemo(() => new Set(completedIdsArray), [completedIdsArray])
  const isLessonCompleted = useMemo(() => progress?.status === "COMPLETED", [progress])

  // --- Player & Interaction State ---
  const [autoStop, setAutoStop] = useState(true)
  const [largeVideo, setLargeVideo] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [autoPlayOnSentenceChange, setAutoPlayOnSentenceChange] = useState(true)
  const [userInteracted, setUserInteracted] = useState(false)

  const [showTranscriptToggle, setShowTranscriptToggle] = useState(true)
  const [showProgress, setShowProgress] = useState(true)
  const [isDesktop, setIsDesktop] = useState(true)

  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const initialCompletionHandledRef = useRef(false)
  const syncRef = useRef(false)

  const playerRef = useRef<PlayerRef | null>(null)
  const [playbackRate, setPlaybackRate] = useState<number>(1.0)
  const [isPlaying, setIsPlaying] = useState(false)

  /**
   * Theo dõi và cập nhật trạng thái Responsive (Desktop vs Mobile)
   */
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1280)
    checkDesktop()
    window.addEventListener("resize", checkDesktop)
    return () => window.removeEventListener("resize", checkDesktop)
  }, [])

  const effectiveShowTranscript = isDesktop ? showTranscriptToggle : true

  /**
   * Khởi tạo luồng Fetch dữ liệu khi mount Component
   */
  useEffect(() => {
    initialCompletionHandledRef.current = false
    setShowCompletionModal(false)
    if (lessonId) {
      dispatch(fetchAction({ id: Number(lessonId), mode: modeName }) as any)
    }
    return () => {
      dispatch(resetAction())
    }
  }, [dispatch, lessonId, fetchAction, resetAction, modeName])

  const isLoading = status === "idle" || status === "loading"

  // Khi mở một bài đã hoàn thành, nhắc đúng một lần trong vòng đời trang.
  // Đóng bằng Review sẽ không bị effect mở lại do status vẫn là COMPLETED.
  useEffect(() => {
    if (status !== "succeeded" || !lesson || initialCompletionHandledRef.current) return
    initialCompletionHandledRef.current = true
    if (isLessonCompleted) setShowCompletionModal(true)
  }, [status, lesson, isLessonCompleted])

  const sentences: ILessonSentenceDetailsResponse[] = useMemo(
    () => lesson?.sentences ?? [],
    [lesson]
  )

  /**
   * Khôi phục vị trí câu hỏi đang học dở dang (Resume functionality)
   */
  useEffect(() => {
    if (sentences.length > 0 && completedIdsSet.size > 0) {
      const firstUnfinished = sentences.findIndex((s) => !completedIdsSet.has(s.id))
      setActiveIndex(firstUnfinished > 0 ? firstUnfinished : 0)
    } else {
      setActiveIndex(0)
    }
    setAutoPlayOnSentenceChange(true)
    setUserInteracted(false)
  }, [lesson?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentSentence = sentences[activeIndex]

  // --- Navigation Controls ---
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

  /**
   * Xử lý luồng hoàn thành một câu hỏi.
   * Áp dụng Optimistic UI: Cập nhật Store local trước, gọi API bất đồng bộ sau.
   */
const handleCompleteSentence = useCallback(
  async (sentenceId: number, score: number) => {
    if (!lesson?.id) return
    const justCompletedGuestLesson = !profile
      && !completedIdsSet.has(sentenceId)
      && sentences.length > 0
      && completedIdsSet.size + 1 === sentences.length

    // 1. Cập nhật tiến độ bài học tạm thời để UI xanh lên mượt mà
    dispatch(updateLocalProgress({ sentenceId, score, mode: modeName }))

    // (ĐÃ XÓA TRẮNG HOÀN TOÀN LOGIC TỰ TÍNH XP/COIN VÀ TỰ DISPATCH REWARD Ở ĐÂY)
    // Việc nổ hiệu ứng bây giờ sẽ do hook useGamificationSocket lắng nghe WebSocket đảm nhận.

    // 2. Xử lý đồng bộ dữ liệu lên Server
    if (profile) {
      try {
        const response = await dispatch(
          submitScore({ lessonId: lesson.id, sentenceId, mode: modeName, score }) as any
        ).unwrap() as ProgressUpdateResponse
        if (response.justCompletedLesson) {
          window.setTimeout(() => setShowCompletionModal(true), 800)
        }
      } catch {
        // Redux thunk already stores the request error; keep optimistic UI responsive.
      }
    } else {
      const currentLocal = getGuestProgress(lessonId!, modeName)
      if (!currentLocal.includes(sentenceId)) {
        saveGuestProgress(lessonId!, modeName, [...currentLocal, sentenceId])
        if (!justCompletedGuestLesson) setTimeout(() => setShowLoginModal(true), 600)
      }
      if (justCompletedGuestLesson) {
        window.setTimeout(() => setShowCompletionModal(true), 800)
      }
    }
  },
  
  [dispatch, lesson?.id, profile, lessonId, updateLocalProgress, submitScore, modeName, completedIdsSet, sentences.length]
)
  /**
   * Phục hồi tiến độ học tập cho Guest User từ LocalStorage
   */
  useEffect(() => {
    if (!profile && status === "succeeded" && lessonId) {
      const localData = getGuestProgress(lessonId, modeName)
      if (localData.length > 0) {
        console.log("Hydrating guest progress from localStorage...")
        localData.forEach((sId) => {
          // Guest storage chỉ giữ completion, nên dùng điểm mặc định khi hydrate local UI.
          const mockScore = 100;
          dispatch(updateLocalProgress({ sentenceId: sId, score: mockScore, mode: modeName }))
        })
      }
    }
  }, [profile, status, lessonId, dispatch, modeName, updateLocalProgress])

  /**
   * Tiến trình đồng bộ dữ liệu hàng loạt (Batch Sync) khi User chuyển từ Guest sang Authenticated
   */
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
              // 1. Đồng bộ lên Server
              await dispatch(
                submitBatchScore({ lessonId: lesson.id, sentenceIds: pendingIds, mode: modeName, score: 100 }) as any
              ).unwrap()

              // 2. Cập nhật Redux Store
              pendingIds.forEach((sId) => dispatch(updateLocalProgress({ sentenceId: sId, score: 100, mode: modeName })))

              // 3. Cập nhật con trỏ tiến độ
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
  }, [profile, lesson?.id, lessonId, dispatch, completedIdsSet, sentences, modeName, submitBatchScore, updateLocalProgress])

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
    if (lessonId) dispatch(fetchAction({ id: Number(lessonId), mode: modeName }) as any)
  }, [dispatch, fetchAction, lessonId, modeName])

  const handleTogglePlayPause = useCallback(() => {
     console.log("🔊 [useLessonMode] Toggle play/pause — current isPlaying:", isPlaying)
    if (isPlaying) {
      playerRef.current?.pause()
    } else {
      playerRef.current?.play()
    }
  }, [isPlaying])

  /**
   * Trình chặn sự kiện bàn phím (Keyboard Event Interceptor)
   * Quản lý các phím tắt Media Control và Navigation
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isEditable = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable
      
      const isNavKey = e.key === "Tab" || e.key === "PageDown" || e.key === "PageUp"
      
      // Hỗ trợ multi-layout keyboard (Code Backquote hoặc Key `)
      const isPlayPauseKey = e.code === "Backquote" || e.key === "`" 
      const isCtrlKey = e.key === "Control" || e.code === "ControlLeft" || e.code === "ControlRight"

      // 1. Phím Media Control (Ưu tiên cao nhất)
      if (isPlayPauseKey) {
        e.preventDefault() 
        e.stopPropagation()
        handleTogglePlayPause()
        return
      }

      if (isCtrlKey) {
        e.preventDefault()
        e.stopPropagation()
        playerRef.current?.playCurrentSegment()
        return
      }

      // 2. Phím Điều hướng (Navigation)
      if (isEditable && !captureKeysInEditable) {
        return // Bỏ qua nếu đang trong vùng nhập liệu văn bản
      }

      if (isNavKey) {
        e.preventDefault()
        e.stopPropagation()
        if (e.key === "PageDown" || e.key === "Tab") handleNext()
        else if (e.key === "PageUp") handlePrev()
      }
    }

    // Capture phase để giành quyền xử lý Event trước các Component con
    window.addEventListener("keydown", onKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true })
  }, [handleNext, handlePrev, handleTogglePlayPause, captureKeysInEditable])


  
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
    handleTogglePlayPause
  }
}
