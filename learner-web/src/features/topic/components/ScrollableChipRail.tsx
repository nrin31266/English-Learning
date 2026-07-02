import { useEffect, useRef, useState } from "react";
import { getTextColorForHex } from "@/utils/colorUtils";

export type ChipRailItem = { value: string; label: string; color?: string | null };

export default function ScrollableChipRail({
  items,
  selectedValue,
  onSelect,
}: {
  items: ChipRailItem[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: true, right: true });

  const updateEdges = () => {
    const rail = railRef.current;
    if (!rail) return;
    setEdges({
      left: rail.scrollLeft <= 2,
      right: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2,
    });
  };

  useEffect(() => {
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    const rail = railRef.current;
    const handleWheel = (event: WheelEvent) => {
      if (!rail || rail.scrollWidth <= rail.clientWidth) return;
      event.preventDefault();
      rail.scrollLeft += event.deltaY || event.deltaX;
    };
    if (rail) {
      observer.observe(rail);
      rail.addEventListener("wheel", handleWheel, { passive: false });
    }
    return () => {
      observer.disconnect();
      rail?.removeEventListener("wheel", handleWheel);
    };
  }, [items]);

  useEffect(() => {
    railRef.current
      ?.querySelector<HTMLElement>(`[data-value="${CSS.escape(selectedValue)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [selectedValue]);

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      {!edges.left && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-linear-to-r from-card to-transparent" />
      )}
      <div
        ref={railRef}
        onScroll={updateEdges}
        className="no-scrollbar flex gap-1.5 overflow-x-auto overscroll-x-contain px-0.5 py-1"
      >
        {items.map((item) => {
          const active = item.value === selectedValue;
          const color = item.color || undefined;
          const textContrast = color ? getTextColorForHex(color) : "dark";

          const activeStyle = color
            ? {
                backgroundColor: color,
                borderColor: color,
                color: textContrast === "dark" ? "#09090b" : "#fafafa",
              }
            : undefined;

          const inactiveStyle = color
            ? {
                borderColor: `${color}40`,
                backgroundColor: `${color}0d`,
                color: `color-mix(in srgb, ${color} 70%, currentColor)`,
              }
            : undefined;

          const isAll = item.value === "ALL";

          return (
            <button
              type="button"
              key={item.value}
              data-value={item.value}
              onClick={() => onSelect(item.value)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                active
                  ? "shadow-sm"
                  : "hover:border-primary/30 hover:text-foreground"
              } ${!color && active ? "border-primary bg-primary text-primary-foreground" : ""} ${!color && !active ? "bg-background text-muted-foreground" : ""}`}
              style={active ? activeStyle : inactiveStyle}
            >
              <span className={isAll ? "" : "underline decoration-dotted underline-offset-4"}>
                {isAll ? item.label : `# ${item.label}`}
              </span>
            </button>
          );
        })}
      </div>
      {!edges.right && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-linear-to-l from-card to-transparent" />
      )}
    </div>
  );
}
