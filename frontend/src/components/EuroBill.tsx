import React from "react";

// Aspect ratios from the actual cropped bill images
const BILL_ASPECT: Record<number, number> = {
  5: 165 / 83,
  10: 177 / 92,
  20: 194 / 104,
  50: 200 / 110,
  100: 300 / 156,
};

// Width scale based on real Euro bill dimensions (mm): €5=120, €10=127, €20=133, €50=140, €100=147
// €100 image is 300px wide; other widths scaled proportionally from real mm
const BILL_WIDTH_SCALE: Record<number, number> = {
  100: 147 / 147,
  50: 140 / 147,
  20: 133 / 147,
  10: 127 / 147,
  5: 120 / 147,
};

interface Props {
  amount: number;
  className?: string;
  onClick?: () => void;
  maxWidth?: number; // max width in px for the 100€ bill
  count?: number;    // number of times this bill was clicked in current order
}

export default function EuroBill({ amount, className, onClick, maxWidth, count }: Props) {
  const aspect = BILL_ASPECT[amount];
  if (!aspect) return null;

  const scale = BILL_WIDTH_SCALE[amount] || 1;
  const width = maxWidth ? `${maxWidth * scale}px` : `${scale * 100}%`;
  const hasCount = count != null && count > 0;

  return (
    <div
      className={`relative cursor-pointer transition-transform active:scale-95 ${className || ""}`}
      onPointerDown={onClick}
      style={{
        aspectRatio: `${aspect}`,
        width,
        boxShadow: hasCount ? "inset 0 0 0 4px rgba(0,0,0,0.55)" : undefined,
        borderRadius: "4px",
        opacity: hasCount ? 1 : 0.55,
      }}
    >
      <img
        src={`/bills/eur${amount}.png`}
        alt={`${amount} Euro`}
        className="w-full h-full object-contain rounded-sm"
      />
      {hasCount && (
        <div
          className="absolute flex items-center justify-center"
          style={{
            top: "3px",
            right: "3px",
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.85)",
            color: "#fff",
            fontSize: "22px",
            fontWeight: "bold",
            lineHeight: "1",
            pointerEvents: "none",
          }}
        >
          {count}
        </div>
      )}
    </div>
  );
}
