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
    RotateCcw
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import WordChip from "./WordChip"
import WordPopup from "@/components/WordPopup"
import { useWordPopup } from "@/hooks/UseWordPopupReturn"
import { successSound } from "@/utils/sound"

// ─── Types ────────────────────────────────────────────────────────────────────
type RevealState = Record<number, boolean>

type DictationPanelProps = {
    sentence: ILessonSentenceDetailsResponse
    onSubmit?: (score: number) => void
    onNext?: () => void
    loading?: boolean
    completed?: boolean
    currentTemporaryAnswer?: string
    onTemporaryAnswerChange?: (tempAnswer: string) => void
    userInteracted?: boolean
}

const getWordDisplay = (w: ILessonWordResponse): string =>
    w.wordText || w.wordNormalized || ""

// ─── Main Component ───────────────────────────────────────────────────────────
const DictationPanel = ({
    sentence, onSubmit, onNext,
    loading = false, 
    completed = false,
    currentTemporaryAnswer, onTemporaryAnswerChange,
    userInteracted
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

    // 🎯 Tự động focus khi user tương tác (ví dụ sau khi ấn Play)
    useEffect(() => {
        if (userInteracted) {
            textareaRef.current?.focus()
        }
    }, [userInteracted])

    // 🎯 Reset hoặc Khởi tạo nội dung khi đổi câu
    useEffect(() => {
        setIsTransitioning(true)
        setRevealState({})

        // Nếu câu này đã hoàn thành trước đó, hiển thị text chuẩn có dấu
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

    // 🎯 Xử lý khi gõ đúng hết: Fill text chuẩn và phát âm thanh
    useEffect(() => {
       
        if (isAllCorrect && !completed && !loading && userInteracted) {
            successSound.play()
            // Đưa bản text đẹp nhất (có dấu câu, viết hoa) vào textarea
            const finalPath = sentence.textDisplay || sortedWords.map(w => getWordDisplay(w)).join(" ")
            setAnswer(finalPath)
            onTemporaryAnswerChange?.(finalPath)
            onSubmit?.(calculatedScore)
        }
    }, [isAllCorrect, completed, loading, calculatedScore, onSubmit, userInteracted, sentence.textDisplay])

    
    // 🎯 Hàm "Làm đẹp" và Đưa con trỏ tới CUỐI từ lỗi để xóa/sửa cho nhanh
    const prettifyAndFocus = useCallback(() => {
        let firstErrorIndex = -1
        const newTokens = [...typedTokens]

        sortedWords.forEach((word, idx) => {
            const targetDisplay = getWordDisplay(word)
            const targetNorm = normalizeWordLower(targetDisplay) || ""
            const typedNorm = normalizeWordLower(typedTokens[idx]) || ""

            if (typedNorm === targetNorm) {
                // Nếu đúng, thay bằng từ chuẩn (viết hoa/dấu câu)
                newTokens[idx] = targetDisplay
            } else if (firstErrorIndex === -1) {
                // Đánh dấu từ sai đầu tiên
                firstErrorIndex = idx
            }
        })

        const prettifiedAnswer = newTokens.join(" ")
        setAnswer(prettifiedAnswer)
        onTemporaryAnswerChange?.(prettifiedAnswer)

        // 🎯 LOGIC MỚI: Nhảy tới CUỐI từ lỗi
        if (textareaRef.current) {
            let cursorPosition = 0
            if (firstErrorIndex !== -1) {
                // Tính toán độ dài chuỗi: (Các từ phía trước) + (Từ lỗi hiện tại)
                // .slice(0, firstErrorIndex + 1) sẽ lấy đến hết từ lỗi
                cursorPosition = newTokens.slice(0, firstErrorIndex + 1).join(" ").length
            } else {
                cursorPosition = prettifiedAnswer.length
            }

            // Đợi render xong rồi đặt con trỏ
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
    // console.log("Render DictationPanel - Typed Tokens:", typedTokens, "Reveal State:", revealState)
    return (
        <div className="flex w-full flex-col gap-3 rounded-xl border bg-card p-3 sm:p-4 shadow-sm relative">

            {/* 🎯 HEADER */}
            <div className="flex items-start justify-between gap-4 z-10">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1.5 px-2 py-0.5 text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {correctTypedCount}/{totalWords} Words
                    </Badge>
                    {hasRevealedAny && (
                        <Badge variant="outline" className="gap-1.5 px-2 py-0.5 text-[10px] font-bold border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400">
                            <Eye className="h-3.5 w-3.5" />
                            {revealedCount} Revealed
                        </Badge>
                    )}
                </div>

                {completed && (
                    <div className="flex shrink-0 items-center gap-1 text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 shadow-sm transition-all">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline-block">Completed</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest sm:hidden">Done</span>
                    </div>
                )}
            </div>

            {/* 🎯 TEXTAREA */}
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
                                // Nếu chưa đúng hết, thực hiện prettify và tìm chỗ sai
                                prettifyAndFocus()
                            }
                        }
                    }}
                    // 👉 Dùng Placeholder thay vì lớp Blur overlay lố lăng
                    placeholder={userInteracted ? "Type what you hear..." : "▶ Play audio to start typing..."}
                    className={cn(
                        "min-h-[80px] sm:min-h-[100px] resize-none text-xl! sm:text-2xl! leading-relaxed font-bold tracking-wide p-3 sm:p-4 font-dictation",
                        "border border-border/60",
                        "focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary",
                        "transition-all duration-200 shadow-inner",
                        // 👉 Khi chưa tương tác, cho nền xám nhẹ và cursor-not-allowed, text placeholder làm rõ ràng hơn
                        userInteracted ? "bg-muted/20 placeholder:text-muted-foreground/40" : "bg-muted/40 cursor-not-allowed placeholder:text-foreground/60 placeholder:font-semibold"
                    )}
                    disabled={loading || !userInteracted}
                />
            </div>

            {/* 🎯 WORD CHIPS */}
            <div className={cn(
                "rounded-lg border border-border/50 bg-muted/10 p-3 flex flex-wrap gap-2 max-h-48 overflow-y-auto min-h-[80px] z-10 transition-all",
                // 👉 Xóa grayscale tịt ngóm đi, chỉ cần khóa click là đủ
                !userInteracted && "pointer-events-none opacity-80"
            )}>
                {/* 👉 Bỏ điều kiện userInteracted ở mảng, cho render TẤT CẢ từ đầu! */}
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

            {/* 🎯 FOOTER */}
            <div className="flex justify-between items-center pt-1 z-10">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        disabled={!userInteracted || loading || answer.length === 0}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                        <RotateCcw className="h-3.5 w-3.5 sm:mr-1" />
                        <span className="hidden sm:inline">Reset</span>
                    </Button>
                </div>

                <Button
                    onClick={onNext}
                    disabled={loading || (!userInteracted && !completed)}
                    size="sm"
                    className={cn(
                        "h-8 gap-1.5 px-4 text-xs shadow-sm transition-all",
                        completed
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                >
                    {completed ? "Next Sentence" : "Skip"}
                    <ChevronRight className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* 🎯 MEANING */}
            {isAllCorrect && completed && !loading && sentence.translationVi && (
                <div className="mt-4 border-l-2 border-emerald-500/50 pl-4 py-1 bg-emerald-500/[0.03] z-10">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 dark:text-emerald-400/70 mb-1">
                        Translation
                    </span>
                    <p className="text-sm sm:text-base font-medium text-foreground/90 leading-relaxed italic">
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