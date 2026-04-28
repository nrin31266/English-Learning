import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { ILessonSentenceDetailsResponse, ILessonWordResponse } from "@/types"
import { normalizeWordLower } from "@/utils/textUtils"
import {
    CheckCircle2,
    ChevronRight,
    Eye,
    KeyboardIcon,
    Mic,
    RotateCcw
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import WordChip from "./WordChip"
import WordPopup from "@/components/WordPopup"
import { useWordPopup } from "@/hooks/UseWordPopupReturn"

// ─── Types ────────────────────────────────────────────────────────────────────
type RevealState = Record<number, boolean>

type DictationPanelProps = {
    sentence: ILessonSentenceDetailsResponse
    onSubmit?: (answer: string, revealedWordIds: number[]) => void
    onNext?: () => void
    progress?: { current: number; total: number }
    loading?: boolean
    completed?: boolean,
    currentTemporaryAnswer?: string,
    onTemporaryAnswerChange?: (tempAnswer: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getWordDisplay = (w: ILessonWordResponse): string =>
    w.wordText || w.wordNormalized ||""



// ─── Main Component ───────────────────────────────────────────────────────────
const DictationPanel = ({ sentence, onSubmit, onNext, progress, loading = false, completed = false, currentTemporaryAnswer, onTemporaryAnswerChange }: DictationPanelProps) => {
    const [answer, setAnswer] = useState("")
    const [revealState, setRevealState] = useState<RevealState>({})
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [isTransitioning, setIsTransitioning] = useState(false)
    
    const { activeWord, anchorEl, wordData, loadingWordData, handleWordClick, closePopup } = useWordPopup();

    const sortedWords = useMemo(
        () => [...sentence.lessonWords].sort((a, b) => a.orderIndex - b.orderIndex),
        [sentence.lessonWords]
    )

    // ✅ Single source of truth: typedTokens
    const typedTokens = useMemo(
        () => answer.trim().split(/\s+/).filter(Boolean),
        [answer]
    )

    useEffect(() => {
        setIsTransitioning(true)
        setRevealState({})
        if (completed) {
            setAnswer(sortedWords.map(w => getWordDisplay(w)).join(" "))
        } else {
            setAnswer(currentTemporaryAnswer || "")
        }
        textareaRef.current?.focus()
        requestAnimationFrame(() => {
            setIsTransitioning(false)
        })
    }, [sentence.id])

    const totalWords = sortedWords.length
    const revealedCount = Object.keys(revealState).length
    const hasRevealedAny = revealedCount > 0

    // ✅ Tính correctTypedCount trực tiếp từ typedTokens (không cần contentWordStatuses)
    const correctTypedCount = useMemo(() => {
        let count = 0
        sortedWords.forEach((word, idx) => {
            const targetDisplay = getWordDisplay(word)
            const targetNorm = normalizeWordLower(targetDisplay) || ""
            const typedNorm = normalizeWordLower(typedTokens[idx]) || ""
            if (typedNorm && typedNorm === targetNorm) count++
        })
        return count
    }, [sortedWords, typedTokens])

    // ✅ isAllCorrect đơn giản
    const isAllCorrect = typedTokens.length === totalWords && correctTypedCount === totalWords

    const handleRevealOne = useCallback((wordId: number, wordText: string, wordIndex: number) => {
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
        
        textareaRef.current?.focus()
    }, [onTemporaryAnswerChange])

    const handleWordClickCallback = useCallback((word: ILessonWordResponse, el: HTMLElement) => {
        handleWordClick(word, el, sentence.textDisplay || "")
    }, [sentence.textDisplay, handleWordClick])

    // Auto submit when all correct
    useEffect(() => {
        if (isAllCorrect && !completed && !loading) {
            onSubmit?.(answer.trim(), Object.keys(revealState).map(id => parseInt(id)))
        }
    }, [isAllCorrect, completed, loading, answer, revealState, onSubmit])

    const handleReset = () => {
        setRevealState({})
        setAnswer("")
        onTemporaryAnswerChange?.("")
        textareaRef.current?.focus()
    }

    return (
        <div className="flex w-full flex-col gap-0 overflow-hidden rounded-xl border bg-gradient-to-br from-card to-card/80 shadow-lg z-10">
            {/* Header */}
            <div className="relative overflow-hidden border-b px-5 py-4 flex flex-col gap-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
                
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-primary/10 p-2.5 shadow-sm">
                            <KeyboardIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold tracking-tight">Dictation Exercise</h3>
                            {progress && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Sentence {progress.current} of {progress.total}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-nowrap gap-2 items-center">
                    <Badge
                        variant="secondary"
                        className="gap-1.5 px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    >
                        <CheckCircle2 className="h-3 w-3" />
                        {correctTypedCount}/{totalWords}
                    </Badge>
                    {hasRevealedAny && (
                        <Badge
                            variant="outline"
                            className="gap-1.5 px-3 py-1 text-xs font-medium border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                        >
                            <Eye className="h-3 w-3" />
                            {revealedCount} revealed
                        </Badge>
                    )}
                </div>
            </div>

            {/* Main content */}
            <div className="p-5 flex flex-col gap-5">
                {/* Textarea */}
                <div className="relative group">
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
                                if (!loading && isAllCorrect && completed) {
                                    onNext?.()
                                }
                            }
                        }}
                        placeholder="Type what you hear..."
                        className={cn(
                            "min-h-[110px] resize-none text-lg! font-mono tracking-wide",
                            "border border-border",
                            "bg-background/50",
                            "focus-visible:ring-2 focus-visible:ring-primary/30",
                            "focus-visible:border-primary",
                            "placeholder:text-muted-foreground/50",
                            "transition-all duration-200"
                        )}
                        disabled={loading}
                    />
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => console.log("Mic clicked")}
                        className="absolute bottom-2 right-2 h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-all"
                    >
                        <Mic className="h-4 w-4" />
                    </Button>
                </div>

                {/* Word chips area */}
                <div className="rounded-xl border bg-muted/15 mt-3">
                    <div className="flex flex-wrap gap-2 p-4 max-h-56 overflow-y-auto min-h-[120px]">
                        {!isTransitioning && sortedWords.map((word, idx) => (
                            <WordChip
                                key={word.id}
                                word={word}
                                index={idx}
                                typedToken={typedTokens[idx] || ""}
                                isRevealed={!!revealState[word.id]}
                                onReveal={handleRevealOne}
                                onClickWord={handleWordClickCallback}
                            />
                        ))}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-between items-center gap-3 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Reset
                    </Button>

                    <Button
                        onClick={onNext}
                        disabled={loading}
                        className="gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md transition-all duration-200"
                    >
                        {isAllCorrect && completed ? "Completed" : "Skip"}
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Meaning */}
                {isAllCorrect && completed && !loading && (
                    <p>
                        <span className="font-medium">Meaning:</span> {sentence.translationVi}
                    </p>
                )}

                {/* Keyboard hint */}
                <div className="text-center text-[11px] text-muted-foreground/60 pt-1">
                    <kbd className="rounded border bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] shadow-sm">Enter</kbd> to submit •{' '}
                    <kbd className="rounded border bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] shadow-sm">Ctrl</kbd> to replay audio
                </div>
            </div>
            
            <WordPopup
                word={activeWord}
                anchorEl={anchorEl}
                onClose={() => {
                    closePopup()
                    textareaRef.current?.focus()
                }}
                wordData={wordData}
                isLoading={loadingWordData}
            />
        </div>
    )
}

export default DictationPanel