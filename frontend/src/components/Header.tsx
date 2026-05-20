import { ReactNode } from "react";

export default function Header({ children }: { children: ReactNode }) {
  return (
    <header className="bg-bar-mid border-b border-gray-700 px-4 py-2 shrink-0">
      {children}
    </header>
  );
}
