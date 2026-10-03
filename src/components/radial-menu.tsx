import type { ReactNode } from "react";

export interface RadialMenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  angleDeg: number; // 0 = straight up, increases clockwise
  status: "ready" | "cooldown" | "always-on";
  cooldownLabel?: string; // e.g. "6h" — RadialMenu never formats this itself
  onSelect?: () => void;
}

export function RadialMenu({
  items,
  radius,
  center,
}: {
  items: RadialMenuItem[];
  radius: number;
  center: ReactNode;
}) {
  return (
    <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
      <div className="absolute inset-0 flex items-center justify-center">
        {center}
      </div>
      {items.map((item) => {
        // 0deg = up, clockwise — shift by -90 so 0 lands at the top, not the right
        const rad = ((item.angleDeg - 90) * Math.PI) / 180;
        const x = radius + radius * Math.cos(rad);
        const y = radius + radius * Math.sin(rad);
        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onSelect}
            disabled={item.status === "cooldown"}
            className="absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 rounded-full border w-14 h-14 text-xs disabled:opacity-50"
            style={{ left: x, top: y }}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.cooldownLabel && <span className="text-[9px] text-muted">{item.cooldownLabel}</span>}
          </button>
        );
      })}
    </div>
  );
}
