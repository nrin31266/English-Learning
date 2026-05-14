import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type ActionTone = "neutral" | "active" | "inactive" | "magic";

interface VocabActionButtonProps extends Omit<ComponentProps<typeof Button>, "children" | "size"> {
  label: string;
  loading?: boolean;
  loadingLabel?: string;
  tone?: ActionTone;
}

const toneClassMap: Record<ActionTone, string> = {
  neutral: "",
  active:
    "!border-blue-900 !bg-blue-900 !text-white hover:!border-blue-800 hover:!bg-blue-800",
  inactive:
    "!border-slate-300 !bg-slate-200 !text-slate-700 hover:!border-slate-400 hover:!bg-slate-300",
  magic:
    "!border-indigo-500 !bg-gradient-to-r !from-sky-500 !via-blue-600 !to-indigo-700 !text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:!from-sky-400 hover:!via-blue-500 hover:!to-indigo-600 hover:shadow-[0_8px_20px_rgba(37,99,235,0.45)]",
};

export default function VocabActionButton({
  label,
  loading = false,
  loadingLabel = "Loading...",
  tone = "neutral",
  className,
  variant = "outline",
  ...props
}: VocabActionButtonProps) {
  return (
    <Button
      size="sm"
      variant={variant}
      className={cn(
        "h-8 rounded-md px-2 text-xs font-medium transition-colors",
        toneClassMap[tone],
        className
      )}
      {...props}
    >
      {loading ? loadingLabel : label}
    </Button>
  );
}
