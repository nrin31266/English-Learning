// SentenceItem.tsx
import type { ILessonSentence } from "@/types"
import { formatTimeMs } from "@/utils/timeUtils"


type SentenceItemProps = {
  sentence: ILessonSentence
}

const SentenceItem = ({ sentence }: SentenceItemProps) => {
  const s = sentence

  return (
    <div className="flex gap-3 py-3">
      <div className="mt-0.5 w-12 shrink-0 text-[14px] text-muted-foreground">
        {formatTimeMs(s.audioStartMs)}
      </div>

      <div className="flex-1 space-y-1">
        <p className="leading-snug">{s.textDisplay ?? s.textRaw}</p>

        {s.translationVi && (
          <p className="leading-snug text-muted-foreground">
            {s.translationVi}
          </p>
        )}

        <div>
          {s.phoneticUk && (
            <p className="text-[12px] leading-snug text-muted-foreground">
              UK: [{s.phoneticUk}]
            </p>
          )}
          {s.phoneticUs && (
            <p className="text-[12px] leading-snug text-muted-foreground">
              US: [{s.phoneticUs}]
            </p>
          )}
        </div>

        {s.lessonWords && s.lessonWords.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {s.lessonWords.map((w) => (
              <button
                key={w.id}
                type="button"
                className={[
                  "rounded-full border px-2 py-0.5 text-[14px]",
                  w.isClickable
                    ? "cursor-pointer hover:bg-slate-100"
                    : "cursor-default opacity-60",
                ].join(" ")}
              >
                {w.wordLower}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SentenceItem
