import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { ILessonSentenceDetailsResponse, ILessonWordResponse } from "@/types"
import { normalizeWordLower } from "@/utils/textUtils"
import {
    CheckCircle2,
    ChevronRight,
    Eye,
    Pause,
    Play,
    RotateCcw
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import WordChip from "./WordChip"
import WordPopup from "@/components/WordPopup"
import { useWordPopup } from "@/hooks/UseWordPopupReturn"
import { successSound } from "@/utils/sound"
import CompletedBadge from "@/components/CompletedBadge"

type RevealState = Record<number, boolean>

type DictationPanelProps = {
    sentence: ILessonSentenceDetailsResponse
    onSubmit?: (score: number) => void
    onNext?: () => void
    loading?: boolean
    completed?: boolean
    currentTemporaryAnswer?: string
    onTemporaryAnswerChange?: (tempAnswer: string) => void
    userInteracted?: boolean,
    onTogglePlayPause?: () => void,
    isPlaying?: boolean
}

const getWordDisplay = (w: ILessonWordResponse): string =>
    w.wordText || w.wordNormalized || ""

const DictationPanel = ({
    sentence, onSubmit, onNext,
    loading = false, 
    completed = false,
    currentTemporaryAnswer, onTemporaryAnswerChange,
    userInteracted,
    onTogglePlayPause,
    isPlaying
}: DictationPanelProps) => {
    const [answer, setAnswer] = useState("")
    const [revealState, setRevealState] = useState<RevealState>({})
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [isTransitioning, setIsTransitioning] = useState(false)
   
    const { activeWord, anchorEl, wordData, loadingWordData, handleWordClick, closePopup } = useWordPopup();

    const sortedWords = useMemo(
        () => [...sentence.lessonWords].sort((a, b) => a.orderIndex - b.orderIndex),
        [sentence.lessonWords]
    )

    const typedTokens = useMemo(
        () => answer.trim().split(/\s+/).filter(Boolean),
        [answer]
    )

    useEffect(() => {
        if (userInteracted) {
            textareaRef.current?.focus()
        }
    }, [userInteracted])

    useEffect(() => {
        setIsTransitioning(true)
        setRevealState({})

        if (completed) {
            setAnswer(sentence.textDisplay || sortedWords.map(w => getWordDisplay(w)).join(" "))
        } else {
            setAnswer(currentTemporaryAnswer || "")
        }

        requestAnimationFrame(() => {
            setIsTransitioning(false)
            if (userInteracted) textareaRef.current?.focus()
        })
    }, [sentence.id, completed])

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

    useEffect(() => {
        if (isAllCorrect && !completed && !loading && userInteracted) {
            successSound.play()
            const finalPath = sentence.textDisplay || sortedWords.map(w => getWordDisplay(w)).join(" ")
            setAnswer(finalPath)
            onTemporaryAnswerChange?.(finalPath)
            onSubmit?.(calculatedScore)
        }
    }, [isAllCorrect, completed, loading, calculatedScore, onSubmit, userInteracted, sentence.textDisplay])

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

        if (textareaRef.current) {
            let cursorPosition = 0
            if (firstErrorIndex !== -1) {
                cursorPosition = newTokens.slice(0, firstErrorIndex + 1).join(" ").length
            } else {
                cursorPosition = prettifiedAnswer.length
            }

            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus()
                    textareaRef.current.setSelectionRange(cursorPosition, cursorPosition)
                }
            }, 10)
        }
    }, [typedTokens, sortedWords, onTemporaryAnswerChange])

    const handleRevealOne = useCallback((wordId: number, wordText: string, wordIndex: number) => {
        if (!userInteracted) return;
        setRevealState(prev => ({ ...prev, [wordId]: true }))
        setAnswer(prevAnswer => {
            const currentTokens = prevAnswer.trim().split(/\s+/).filter(Boolean)
            if (currentTokens.length === wordIndex) {
                const newAnswer = [...currentTokens, wordText].join(" ")
                onTemporaryAnswerChange?.(newAnswer)
                return newAnswer
            }
            return prevAnswer
        })
        if (userInteracted) textareaRef.current?.focus()
    }, [onTemporaryAnswerChange])

    const handleWordChipClick = useCallback((w: ILessonWordResponse, el: HTMLElement) => {
        handleWordClick(w, el, sentence.textDisplay || "")
    }, [handleWordClick, sentence.textDisplay])

    const handleReset = () => {
        if (!userInteracted) return;
        setRevealState({})
        setAnswer("")
        onTemporaryAnswerChange?.("")
        textareaRef.current?.focus()
    }

    return (
        <div className="flex w-full flex-col gap-3 rounded-xl border bg-card p-3 sm:p-4 shadow-sm relative">

            {/* HEADER - Gọn với text thường */}
            <div className="flex items-center justify-between gap-4 z-10">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground">
                            {correctTypedCount}/{totalWords}
                        </span>
                        <span className="text-muted-foreground text-xs">words</span>
                    </div>
                    {hasRevealedAny && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600">
                            <Eye className="h-3.5 w-3.5" />
                            <span>{revealedCount} hints</span>
                        </div>
                    )}
                </div>

                {completed && <CompletedBadge size="sm" />}
            </div>

            {/* TEXTAREA */}
            <div className="relative group z-10">
                <Textarea
                    ref={textareaRef}
                    value={answer}
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
                        "min-h-[80px] sm:min-h-[100px] resize-none text-lg! sm:text-xl! leading-relaxed font-light tracking-wide p-3 sm:p-4",
                        "border border-border/60",
                        "focus-visible:border-none focus-visible:ring-2 focus-visible:ring-primary/30",
                        "transition-all duration-200 shadow-inner",
                        userInteracted ? "bg-muted/20 placeholder:text-muted-foreground/40" : "bg-muted/40 cursor-not-allowed placeholder:text-foreground/60 placeholder:font-semibold"
                    )}
                    disabled={loading || !userInteracted}
                />
            </div>

            {/* WORD CHIPS */}
            <div className={cn(
                "rounded-lg border border-border/50 bg-muted/10 p-3 flex flex-wrap gap-2 max-h-48 overflow-y-auto min-h-[80px] z-10 transition-all",
                !userInteracted && "pointer-events-none opacity-80"
            )}>
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

            {/* FOOTER */}
            <div className="flex justify-between items-center pt-1 z-10">
                
                {/* NHÓM BÊN TRÁI: Các công cụ */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        disabled={!userInteracted || loading || answer.length === 0}
                        className="h-8 px-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                        <RotateCcw className="h-3.5 w-3.5 sm:mr-1" />
                        <span className="hidden sm:inline">Reset</span>
                    </Button>

                    {/* <Button
                        variant="outline"
                        size="sm"
                        onClick={onTogglePlayPause}
                        disabled={!userInteracted}
                        className="h-8 px-3 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 hidden sm:flex transition-all w-24 justify-center"
                        title="Press ` (Backtick) to Play/Pause"
                    >
                        {isPlaying ? (
                            <Pause className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                        ) : (
                            <Play className="h-3.5 w-3.5 mr-1.5 text-primary" />
                        )}
                        <span className="text-xs font-medium w-10 text-left">
                            {isPlaying ? "Pause" : "Play"}
                        </span>
                        <kbd className="ml-1 px-1.5 py-0.5 rounded bg-muted text-[11px] font-mono border border-border font-bold">
                            `
                        </kbd>
                    </Button> */}
                </div>

                {/* NHÓM BÊN PHẢI: Chuyển câu */}
                <Button
                    onClick={onNext}
                    disabled={loading || (!userInteracted && !completed)}
                    size="sm"
                    className={cn(
                        "h-8 gap-1.5 px-4  text-base shadow-sm transition-all",
                        completed
                            ? "bg-primary hover:bg-primary/80 text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                >
                    {completed ? "Next Sentence" : "Skip"}
                    <ChevronRight className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* MEANING - Nền vàng nhẹ */}
            {isAllCorrect && completed && !loading && sentence.translationVi && (
                <div className="mt-4 rounded-lg bg-primary/3 border border-primary/40  p-3 z-10">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                        Translation
                    </span>
                    <p className="text-sm sm:text-base text-foreground/90 leading-relaxed">
                        "{sentence.translationVi}"
                    </p>
                </div>
            )}

            <WordPopup
                word={activeWord}
                anchorEl={anchorEl}
                onClose={() => {
                    closePopup()
                    if (userInteracted) textareaRef.current?.focus()
                }}
                wordData={wordData}
                isLoading={loadingWordData}
            />
        </div>
    )
}

export default DictationPanel