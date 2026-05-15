import { cn } from "@/lib/utils";

const POS_MAP: Record<string, { label: string }> = {
  NOUN: { label: "DANH TỪ" },
  VERB: { label: "ĐỘNG TỪ" },
  ADJ: { label: "TÍNH TỪ" },
  ADV: { label: "TRẠNG TỪ" },
  PRON: { label: "ĐẠI TỪ" },
  DET: { label: "TỪ HẠN ĐỊNH" },
  ADP: { label: "GIỚI TỪ" },
  CONJ: { label: "LIÊN TỪ" },
  SCONJ: { label: "LIÊN TỪ PHỤ THUỘC" },
  INTJ: { label: "THÁN TỪ" },
  NUM: { label: "SỐ TỪ" },
  PROPN: { label: "DANH TỪ RIÊNG" },
  PART: { label: "TIỂU TỪ" },
  AUX: { label: "TRỢ ĐỘNG TỪ" },
  PUNCT: { label: "DẤU CÂU" },
  SYM: { label: "KÝ HIỆU" },
  X: { label: "KHÁC" },
};

type PosBadgeProps = {
  pos?: string | null;
  className?: string;
};

export default function PosBadge({ pos, className }: PosBadgeProps) {
  const key = (pos || "").toUpperCase();
  const preset = POS_MAP[key];
  if (!key) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold",
        "border-border bg-muted/40 text-foreground/80",
        className
      )}
    >
      {preset?.label ?? key}
    </span>
  );
}
