import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  onClose: () => void;
  /** If true, clicking the backdrop overlay will NOT close the modal. Default: false (overlay closes). */
  static?: boolean;
}

/**
 * Reusable modal overlay.
 * - Clicking the dark backdrop calls onClose (unless static=true).
 * - Clicks inside the modal content do NOT close.
 * - All dialogs should use this for consistent behavior.
 */
export default function Modal({ children, onClose, static: isStatic }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 no-select"
      onClick={isStatic ? undefined : onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
