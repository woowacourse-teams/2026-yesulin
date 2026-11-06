"use client";
import type { ReactNode } from "react";
import { ModalShell } from "@/components/auditions/modal-shell";

/** A large centered original; the profile and unsaved review remain mounted behind it. */
export function ScreeningReferencePanel({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <ModalShell open onClose={onClose} labelledBy="screening-pdf-title"
    className="flex h-dvh w-screen flex-col overflow-hidden bg-card shadow-xl sm:h-[calc(100dvh-16px)] sm:w-[96vw] sm:max-w-[1600px] sm:rounded-modal">
    <div data-screening-reference className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-1">
        <h2 id="screening-pdf-title" className="font-bold">원본 PDF 확인</h2>
        <button type="button" aria-label="PDF 패널 닫기" onClick={onClose} className="min-h-11 rounded-control px-3 text-sm font-semibold hover:bg-surface">닫기 ✕</button>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  </ModalShell>;
}
