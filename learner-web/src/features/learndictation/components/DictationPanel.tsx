import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { ILessonSentenceDetailsResponse, ILessonWordResponse } from "@/types"
import { normalizeWordLower } from "@/utils/textUtils"
import {
    CheckCircle2,
    ChevronRight,
    Eye,
    KeyboardIcon,
    RotateCcw
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { WordChipStatus } from "./WordChip"
import WordChip from "./WordChip"
import WordPopup from "@/components/WordPopup"

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
    w.wordText || w.wordNormalized || w.wordLower || ""



// ─── Main Component ───────────────────────────────────────────────────────────
const DictationPanel = ({ sentence, onSubmit, onNext, progress, loading = false, completed = false, currentTemporaryAnswer, onTemporaryAnswerChange }: DictationPanelProps) => {
    const [answer, setAnswer] = useState("")
    const [revealState, setRevealState] = useState<RevealState>({})
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [activeWord, setActiveWord] = useState<ILessonWordResponse | null>(null)
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
    const sortedWords = useMemo(
        () => [...sentence.lessonWords].sort((a, b) => a.orderIndex - b.orderIndex),
        [sentence.lessonWords]
    )
    useEffect(() => {
        console.log("MOUNT")

        return () => {
            console.log("UNMOUNT")
        }
    }, [])

    useEffect(() => {
        // 👉 mỗi lần sentence thay đổi, reset toàn bộ state liên quan đến answer và reveal
        setActiveWord(null)
        setAnchorEl(null)

        setRevealState(prev => {
            if (Object.keys(prev).length === 0) return prev
            return {}
        })
        if (completed) {
            setAnswer(sortedWords.map(w => getWordDisplay(w)).join(" "))
        } else {
            if (currentTemporaryAnswer) {
                setAnswer(currentTemporaryAnswer)
            } else {
                setAnswer("")
            }
        }
        textareaRef.current?.focus()
    }, [sentence.id])



    const totalWords = sortedWords.length
    const revealedWordIds = useMemo(() => sortedWords.filter(w => revealState[w.id]).map(w => w.id), [sortedWords, revealState])
    const revealedCount = revealedWordIds.length
    const hasRevealedAny = revealedCount > 0

    const contentWordStatuses = useMemo(() => {
        const statuses = new Map<number, { status: "correct" | "wrong" | "untyped"; text: string }>()
        const typedTokens = answer.trim().split(/\s+/).filter(Boolean)

        sortedWords.forEach((word, index) => {
            const typedToken = index < typedTokens.length ? typedTokens[index] : null
            const targetDisplay = getWordDisplay(word)
            const targetNorm = normalizeWordLower(targetDisplay) || ""
            const typedNorm = normalizeWordLower(typedToken) || ""

            if (!typedToken) {
                statuses.set(word.id, { status: "untyped", text: "*".repeat(targetDisplay.length) })
            } else if (typedNorm === targetNorm) {
                statuses.set(word.id, { status: "correct", text: targetDisplay })
            } else {
                let maskedText = ""
                for (let i = 0; i < targetDisplay.length; i++) {
                    const char = targetDisplay[i]
                    const typedChar = typedToken[i]
                    if (typedChar && typedChar.toLowerCase() === char.toLowerCase()) {
                        maskedText += char
                    } else {
                        maskedText += "*"
                    }
                }
                statuses.set(word.id, { status: "wrong", text: maskedText })
            }
        })
        return statuses
    }, [sortedWords, answer])

    const correctTypedCount = useMemo(() =>
        Array.from(contentWordStatuses.values()).filter(s => s.status === "correct").length
        , [contentWordStatuses])
    const isAllCorrect = useMemo(() => {
        const typedWords = answer.trim().split(/\s+/).filter(Boolean)
        return typedWords.length === totalWords && correctTypedCount === totalWords
    }, [answer, totalWords, correctTypedCount])

    // Dùng ở nhiều chỗ
    useEffect(() => {
        if (isAllCorrect && !completed && !loading) {
            onSubmit?.(answer.trim(), revealedWordIds)
        }
    }, [isAllCorrect, completed])
    const handleRevealOne = useCallback((id: number) => {
        setRevealState(p => ({ ...p, [id]: true }))
    }, [])

    const handleRevealAll = () => {
        const next: RevealState = {}
        sortedWords.forEach(w => next[w.id] = true)
        setRevealState(next)
        setAnswer(sortedWords.map(w => getWordDisplay(w)).join(" "))
        textareaRef && textareaRef.current?.focus()
    }

    const progressPercent = (correctTypedCount / totalWords) * 100

    return (
        <div className="flex w-full flex-col gap-0 overflow-hidden rounded-xl border bg-gradient-to-br from-card to-card/80 shadow-lg">
            {/* Header with gradient */}
            <div className="relative overflow-hidden border-b bg-gradient-to-r from-primary/5 via-primary/8 to-primary/5 px-5 py-4">
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

                    <div className="flex gap-2">
                        <Badge
                            variant="secondary"
                            className="gap-1.5 px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        >
                            <CheckCircle2 className="h-3 w-3" />
                            {correctTypedCount}/{totalWords} correct
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

                {/* Progress bar */}
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted/50">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Main content */}
            <div className="p-5 flex flex-col gap-5">
                {/* Textarea with styling */}
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
                                    onNext && onNext()
                                }
                            }
                        }}
                        placeholder="Type what you hear..."
                        className={cn(
                            "min-h-[110px] resize-none text-base font-mono tracking-wide",
                            "border-muted/60 bg-background/50",
                            "focus-visible:ring-2 focus-visible:ring-primary/30",
                            "placeholder:text-muted-foreground/50",
                            "transition-all duration-200"
                        )}
                        disabled={loading}
                    />
                    <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground/50">
                        Mic Here
                    </div>
                </div>

                {/* Word chips area */}
                <div className="rounded-xl border bg-muted/15">
                    <ScrollArea className="max-h-56">
                        <div className="flex flex-wrap gap-2 p-4">
                            {sortedWords.map((word) => {
                                const isRevealed = !!revealState[word.id]
                                const statusObj = contentWordStatuses.get(word.id)

                                let status: WordChipStatus = "untyped"
                                let display = statusObj?.text || ""

                                if (isRevealed) {
                                    status = "revealed"
                                    display = getWordDisplay(word)
                                } else if (statusObj?.status === "correct") {
                                    status = "correct_typed"
                                } else if (statusObj?.status === "wrong") {
                                    status = "wrong"
                                }

                                return (
                                    <WordChip
                                        key={word.id}
                                        word={word}
                                        displayText={display}
                                        status={status}
                                        onReveal={() => handleRevealOne(word.id)}
                                        onClickWord={(w: ILessonWordResponse, el: HTMLElement) => {
                                            setActiveWord(w)
                                            setAnchorEl(el)
                                        }}
                                    />
                                )
                            })}
                        </div>
                    </ScrollArea>
                </div>

                {/* Action buttons */}
                <div className="flex justify-between items-center gap-3 pt-2">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setAnswer(""); setRevealState({}) }}
                            className="gap-2 text-muted-foreground hover:text-foreground"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Reset
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRevealAll}
                            className="gap-2 text-muted-foreground hover:text-foreground"
                            disabled={revealedCount === totalWords}
                        >
                            <Eye className="h-4 w-4" />
                            Reveal All
                        </Button>
                    </div>

                    <Button
                        onClick={onNext}
                        disabled={loading}
                        className="gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md transition-all duration-200"
                    >
                        Continue
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

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
                    setActiveWord(null)
                    setAnchorEl(null)
                }}
            />
        </div>
    )
}

export default DictationPanel