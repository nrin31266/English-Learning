// src/pages/dictation/components/DictationPanel.tsx

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { ILessonSentenceDetailsResponse, ILessonWordResponse } from "@/types"
import { normalizeWordLower } from "@/utils/textUtils"
import {
    ChevronRight,
    Eye,
    RotateCcw,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import WordChip from "./WordChip"
import WordPopup from "@/components/WordPopup"
import { useWordPopup } from "@/hooks/UseWordPopupReturn"
import { successSound } from "@/utils/sound"
import BestScoreBadge from "@/components/BestScoreBadge"

type RevealState = Record<number, boolean>

type DictationPanelProps = {
    sentence: ILessonSentenceDetailsResponse
    onComplete?: (sentenceId: number, score: number) => void
    onNext?: () => void
    loading?: boolean
    completed?: boolean
    currentTemporaryAnswer?: string
    onTemporaryAnswerChange?: (tempAnswer: string) => void
    userInteracted?: boolean
    onTogglePlayPause?: () => void
    isPlaying?: boolean
    highestScore?: number
}

const getWordDisplay = (w: ILessonWordResponse): string =>
    w.wordText || w.wordNormalized || ""

const DictationPanel = ({
    sentence, onComplete, onNext,
    loading = false,
    completed = false,
    currentTemporaryAnswer, onTemporaryAnswerChange,
    userInteracted,
    highestScore = 0,
    onTogglePlayPause,
    isPlaying
}: DictationPanelProps) => {

    // --- States ---
    const [answer, setAnswer] = useState("")
    const [revealState, setRevealState] = useState<RevealState>({})
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [autoFillHints, setAutoFillHints] = useState(true)
    const [isLocallyReset, setIsLocallyReset] = useState(false)

    // --- Refs ---
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const { activeWord, anchorEl, wordData, loadingWordData, handleWordClick, closePopup } = useWordPopup()

    const processedAnswerRef = useRef<string | null>(null)
    const prevSentenceIdRef = useRef<number | null>(null)

    // 👈 Override completed bằng local state
    const effectiveCompleted = completed && !isLocallyReset

    // --- Derived Data ---
    const sortedWords = useMemo(
        () => [...sentence.lessonWords].sort((a, b) => a.orderIndex - b.orderIndex),
        [sentence.lessonWords]
    )

    const typedTokens = useMemo(
        () => answer.trim().split(/\s+/).filter(Boolean),
        [answer]
    )

    useEffect(() => {
        if (userInteracted && !effectiveCompleted) {
            textareaRef.current?.focus()
        }
    }, [userInteracted, effectiveCompleted])

    /**
     * Khởi tạo & Reset State khi load câu mới
     */
    useEffect(() => {
        const isNewSentence = prevSentenceIdRef.current !== sentence.id
        prevSentenceIdRef.current = sentence.id

        // Sang câu mới → reset local override
        if (isNewSentence) {
            console.log(`📖 [Dictation] New sentence #${sentence.id}`)
            setIsTransitioning(true)
            setRevealState({})
            setIsLocallyReset(false)
        }

        if (effectiveCompleted) {
            const finalStr = sentence.textDisplay || sortedWords.map(w => getWordDisplay(w)).join(" ")
            setAnswer(finalStr)
            processedAnswerRef.current = finalStr
        } else if (isNewSentence) {
            setAnswer(currentTemporaryAnswer || "")
            processedAnswerRef.current = null
        }

        requestAnimationFrame(() => {
            setIsTransitioning(false)
            if (userInteracted && !effectiveCompleted) textareaRef.current?.focus()
        })
    }, [sentence.id, effectiveCompleted, currentTemporaryAnswer, sentence.textDisplay, sortedWords, userInteracted])

    // --- Metrics & Validation ---
    const totalWords = sortedWords.length
    const revealedCount = Object.keys(revealState).length
    const hasRevealedAny = revealedCount > 0

    const calculatedScore = useMemo(() => {
        if (revealedCount === 0) return 100
        return Math.max(0, Math.round(((totalWords - revealedCount) / totalWords) * 100))
    }, [revealedCount, totalWords])

    const correctTypedCount = useMemo(() => {
        let count = 0
        sortedWords.forEach((word, idx) => {
            const targetNorm = normalizeWordLower(getWordDisplay(word)) || ""
            const typedNorm = normalizeWordLower(typedTokens[idx]) || ""
            if (typedNorm && typedNorm === targetNorm) count++
        })
        return count
    }, [sortedWords, typedTokens])

    const isAllCorrect = typedTokens.length === totalWords && correctTypedCount === totalWords
    const showCompletedBadge = effectiveCompleted && isAllCorrect
    const canAdvanceAsCompleted = completed || isAllCorrect

    /**
     * Effect: Xử lý sự kiện nộp bài & Gamification
     */
    useEffect(() => {
    if (!isAllCorrect || loading || !userInteracted) return;
    if (processedAnswerRef.current === answer) return;

    processedAnswerRef.current = answer;
    console.log(`🏆 [Dictation] All correct! Score: ${calculatedScore} | High: ${highestScore}`)

    // 👈 Khi hoàn thành, trả lại trạng thái completed thật
    setIsLocallyReset(false);

    if (calculatedScore > highestScore) {
        successSound.play()
    }

    if (calculatedScore > highestScore || !effectiveCompleted) {
        onComplete?.(sentence.id, calculatedScore)
    }

    const finalPath = sentence.textDisplay || sortedWords.map(w => getWordDisplay(w)).join(" ")
    if (answer !== finalPath) {
        setAnswer(finalPath)
        onTemporaryAnswerChange?.(finalPath)
        processedAnswerRef.current = finalPath
    }

}, [isAllCorrect, loading, calculatedScore, highestScore, answer, onComplete, userInteracted, 
    sentence.id, sentence.textDisplay, sortedWords, effectiveCompleted, onTemporaryAnswerChange])
    /**
     * Tiện ích: Format lại đoạn text và đưa con trỏ đến vị trí lỗi (hoặc dấu _)
     */
    const prettifyAndFocus = useCallback(() => {
        let firstErrorIndex = -1
        const newTokens = [...typedTokens]

        sortedWords.forEach((word, idx) => {
            const targetDisplay = getWordDisplay(word)
            const targetNorm = normalizeWordLower(targetDisplay) || ""
            const typedNorm = normalizeWordLower(typedTokens[idx]) || ""

            if (typedNorm === targetNorm) {
                newTokens[idx] = targetDisplay
            } else if (firstErrorIndex === -1) {
                firstErrorIndex = idx
            }
        })

        const prettifiedAnswer = newTokens.join(" ")
        setAnswer(prettifiedAnswer)
        onTemporaryAnswerChange?.(prettifiedAnswer)

        if (textareaRef.current && !showCompletedBadge) {
            let cursorPosition = 0
            if (firstErrorIndex !== -1) {
                cursorPosition = newTokens.slice(0, firstErrorIndex + 1).join(" ").length
            } else {
                cursorPosition = prettifiedAnswer.length
            }

            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus()
                    if (newTokens[firstErrorIndex] === "_") {
                        const startPos = newTokens.slice(0, firstErrorIndex).join(" ").length + (firstErrorIndex > 0 ? 1 : 0)
                        textareaRef.current.setSelectionRange(startPos, startPos + 1)
                    } else {
                        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition)
                    }
                }
            }, 10)
        }
    }, [typedTokens, sortedWords, onTemporaryAnswerChange, showCompletedBadge])

    /**
     * Handler: Khi click "Con mắt" để mở Hint
     */
    const handleRevealOne = useCallback((wordId: number, wordText: string, wordIndex: number) => {
        
        if (!userInteracted || showCompletedBadge) return;
        console.log('autoFillHints value:', autoFillHints); // 👈 Debug

        setRevealState(prev => ({ ...prev, [wordId]: true }))

        if (autoFillHints) {
            setAnswer(prevAnswer => {
                const currentTokens = prevAnswer.trim().split(/\s+/).filter(Boolean)
                const newTokens = [...currentTokens]

                for (let i = 0; i < wordIndex; i++) {
                    if (!newTokens[i]) {
                        newTokens[i] = "_"
                    }
                }

                newTokens[wordIndex] = wordText
                const newAnswer = newTokens.join(" ") + (wordIndex === totalWords - 1 ? "" : " ")
                onTemporaryAnswerChange?.(newAnswer)

                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus()
                        const firstGapIndex = newTokens.findIndex(t => t === "_")

                        if (firstGapIndex !== -1) {
                            const prefix = newTokens.slice(0, firstGapIndex).join(" ")
                            const startPos = prefix.length > 0 ? prefix.length + 1 : 0
                            textareaRef.current.setSelectionRange(startPos, startPos + 1)
                        } else {
                            const pos = newAnswer.length
                            textareaRef.current.setSelectionRange(pos, pos)
                        }
                    }
                }, 10)

                return newAnswer
            })
        }
    }, [onTemporaryAnswerChange, userInteracted, autoFillHints, showCompletedBadge, totalWords])

    const handleWordChipClick = useCallback((w: ILessonWordResponse, el: HTMLElement) => {
        handleWordClick(w, el, sentence.textDisplay || "")
    }, [handleWordClick, sentence.textDisplay])

    /**
     * Handler: Reset hoặc Luyện tập lại
     */
    const handleReset = useCallback(() => {
        if (!userInteracted) return;

        // Reset local state
        setRevealState({})
        setAnswer("")
        onTemporaryAnswerChange?.("")
        processedAnswerRef.current = null
        setIsLocallyReset(true)

        // Tự động play audio nếu đang pause
        if (!isPlaying && onTogglePlayPause) {
            onTogglePlayPause()
        }

        setTimeout(() => textareaRef.current?.focus(), 50)
    }, [userInteracted, onTemporaryAnswerChange, isPlaying, onTogglePlayPause])

    return (
        <div className="relative flex w-full flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm transition-all sm:p-4">

            {/* HEADER */}
            <div className="flex items-start sm:items-center justify-between gap-4 z-10 min-h-[28px]">
                <div className="flex flex-wrap items-center gap-3 text-sm mt-1 sm:mt-0">
                    <div className="flex items-center gap-1.5 animate-in fade-in">
                        <span className="font-semibold text-foreground">
                            {correctTypedCount}/{totalWords}
                        </span>
                        <span className="text-muted-foreground text-xs">words</span>
                    </div>
                    {hasRevealedAny && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 animate-in fade-in zoom-in-95">
                            <Eye className="h-3.5 w-3.5" />
                            <span>{revealedCount} hints</span>
                        </div>
                    )}
                </div>
                {completed && (
                <div className="shrink-0">
                    <BestScoreBadge score={highestScore} />
                </div>
                )}
            </div>

            {/* TEXTAREA */}
            <div className="relative group z-10">
                <Textarea
                    ref={textareaRef}
                    value={answer}
                    readOnly={showCompletedBadge}
                    onChange={(e) => {
                        setAnswer(e.target.value)
                        onTemporaryAnswerChange?.(e.target.value)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            if (isAllCorrect) {
                                onNext?.()
                            } else {
                                prettifyAndFocus()
                            }
                        }
                    }}
                    placeholder={userInteracted ? "Type what you hear..." : "▶ Play audio to start typing..."}
                    className={cn(
                        "min-h-[80px] sm:min-h-[100px] resize-none text-lg! sm:text-xl! leading-relaxed font-light tracking-wide p-3 sm:p-4 transition-all duration-300",
                        userInteracted ? "bg-muted/20 placeholder:text-muted-foreground/40" : "bg-muted/40 cursor-not-allowed placeholder:text-foreground/60 placeholder:font-semibold",
                        showCompletedBadge
                            ? "bg-muted/30 border-border/40 text-foreground/80 cursor-default focus-visible:ring-0 shadow-none"
                            : "border-border/60 focus-visible:border-none focus-visible:ring-2 focus-visible:ring-primary/30 shadow-inner"
                    )}
                    disabled={loading || !userInteracted}
                />
            </div>

            {/* HINTS */}
            <div className={cn("transition-all duration-300", !userInteracted && "pointer-events-none opacity-80")}>
                <div className="flex justify-between items-center px-1 mb-2">
                    <span className="text-[10px] sm:text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">
                        Vocabulary Hints
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={autoFillHints}
                            onChange={(e) => {
                                console.log('Auto-fill hints toggled:', e.target.checked); // 👈 Debug
                                setAutoFillHints(e.target.checked)
                            }}
                            disabled={showCompletedBadge}
                            className="w-3.5 h-3.5 rounded border-muted-foreground/30 accent-primary cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                            Auto-fill
                        </span>
                    </label>
                </div>

                <div className="flex max-h-48 min-h-[60px] flex-wrap gap-2 overflow-y-auto rounded-lg border border-border/50 bg-muted/10 p-3">
                    {!isTransitioning && sortedWords.map((word, idx) => (
                        <WordChip
                            key={word.id}
                            word={word}
                            index={idx}
                            typedToken={typedTokens[idx] || ""}
                            isRevealed={!!revealState[word.id]}
                            onReveal={handleRevealOne}
                            onClickWord={handleWordChipClick}
                            userInteracted={userInteracted || false}
                        />
                    ))}
                </div>
            </div>

            {/* TRANSLATION */}
            {showCompletedBadge && !loading && sentence.translationVi && (
                <div className="mt-1 rounded-lg bg-primary/5 border border-primary/20 p-3 sm:p-4 z-10 transition-all animate-in fade-in slide-in-from-top-2">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5 opacity-80">
                        Translation
                    </span>
                    <p className="text-sm sm:text-[15px] text-foreground/90 leading-relaxed font-medium">
                        "{sentence.translationVi}"
                    </p>
                </div>
            )}

            {/* FOOTER */}
            <div className="flex justify-between items-center pt-3 z-10 border-t border-border/40 mt-1">
                <div className="flex items-center gap-2">
                    <Button
                        variant={showCompletedBadge ? "outline" : "ghost"}
                        size="sm"
                        onClick={handleReset}
                        disabled={!userInteracted || loading || (!showCompletedBadge && answer.length === 0)}
                        className={cn(
                            "h-8 px-2.5 transition-all shadow-sm",
                            showCompletedBadge
                                ? "border-primary/60 text-primary hover:bg-primary/10 hover:text-primary font-semibold"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium"
                        )}
                    >
                        <RotateCcw className={cn("h-3.5 w-3.5 sm:mr-1.5", showCompletedBadge && "text-primary")} />
                        <span className="hidden sm:inline text-[13px]">
                            {showCompletedBadge ? "Practice Again" : "Reset"}
                        </span>
                    </Button>
                </div>

                <div className="hidden sm:flex" />

                <Button
                    onClick={onNext}
                    disabled={loading || (!userInteracted && !canAdvanceAsCompleted)}
                    size="sm"
                    className={cn(
                        "h-8 sm:h-9 gap-1.5 px-4 sm:px-6 text-[13px] sm:text-sm font-semibold shadow-sm transition-all",
                        canAdvanceAsCompleted
                            ? "bg-green-600 text-white hover:bg-green-700 animate-in zoom-in-95 duration-300"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                >
                    {canAdvanceAsCompleted ? "Next sentence" : "Skip"}
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5]" />
                </Button>
            </div>

            {/* WORD POPUP */}
            <WordPopup
                word={activeWord}
                anchorEl={anchorEl}
                onClose={() => {
                    closePopup()
                    if (userInteracted && !showCompletedBadge) textareaRef.current?.focus()
                }}
                wordData={wordData}
                isLoading={loadingWordData}
            />
        </div>
    )
}

export default DictationPanel
