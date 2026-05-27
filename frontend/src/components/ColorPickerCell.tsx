import { useEffect, useRef } from "react";

declare const ColorPicker: any;

interface Props {
  color: string;
  onColorChange: (hex: string) => void;
}

export default function ColorPickerCell({ color, onColorChange }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<any>(null);
  const lastColorRef = useRef(color);

  useEffect(() => {
    if (!buttonRef.current) return;
    if (typeof ColorPicker === "undefined") return;

    buttonRef.current.setAttribute("data-cp-theme", "dark");

    pickerRef.current = new ColorPicker(buttonRef.current, {
      color: color,
      enableAlpha: false,
      toggleStyle: "button",
      defaultFormat: "hex",
      submitMode: "never", // don't auto-submit — we handle it on close
    });

    // Only send the update when the picker dialog closes
    pickerRef.current.on("close", (c: any) => {
      const hex = c.toString();
      if (hex && hex !== lastColorRef.current) {
        lastColorRef.current = hex;
        onColorChange(hex);
      }
    });

    return () => {
      if (pickerRef.current) {
        try { pickerRef.current.destroy(); } catch {}
        pickerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update picker color when prop changes from outside
  useEffect(() => {
    if (pickerRef.current && color && color !== lastColorRef.current) {
      lastColorRef.current = color;
      try { pickerRef.current.setColor(color); } catch {}
    }
  }, [color]);

  return (
    <button
      ref={buttonRef}
      className="w-7 h-7 rounded border border-gray-700 cursor-pointer p-0"
      style={{ backgroundColor: color, minWidth: "28px", minHeight: "28px" }}
      title="Box color"
    />
  );
}
