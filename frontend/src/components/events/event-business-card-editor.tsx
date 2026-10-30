"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ModalShell } from "@/components/auditions/modal-shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { SiteIcon } from "@/components/ui/site-icon";
import type { RegistrationDraft } from "@/features/events/registration-draft";
import type { CardPreviewSide } from "./event-business-card-preview";
import { BusinessCardFields } from "./event-registration-actor";
import { EventRegistrationHelp } from "./event-registration-help";

export function EventBusinessCardEditor({ open, eventId, draft, preview, photoUrl, busy, error, onChange, onPreviewSideChange, onPhotoChange, onPhotoBusyChange, onClose, onDone }: {
  readonly open: boolean;
  readonly eventId: number;
  readonly draft: RegistrationDraft;
  readonly preview: ReactNode;
  readonly photoUrl: string | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onChange: (patch: Partial<RegistrationDraft>) => void;
  readonly onPreviewSideChange: (side: CardPreviewSide) => void;
  readonly onPhotoChange: (key: string, photo: Blob) => void;
  readonly onPhotoBusyChange: (busy: boolean) => void;
  readonly onClose: () => void;
  readonly onDone: () => void;
}) {
  const [mobileView, setMobileView] = useState<"input" | "preview">("input");
  const body = useRef<HTMLDivElement>(null);
  const inputScroll = useRef(0);
  const inputTab = useRef<HTMLButtonElement>(null);
  const previewTab = useRef<HTMLButtonElement>(null);
  const selectView = (view: "input" | "preview") => {
    if (view === mobileView) return;
    if (mobileView === "input") inputScroll.current = body.current?.scrollTop ?? 0;
    setMobileView(view);
    requestAnimationFrame(() => { if (body.current) body.current.scrollTop = view === "input" ? inputScroll.current : 0; });
  };
  const close = () => { if (!busy) { setMobileView("input"); onClose(); } };
  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const resize = () => {
      const panel = document.getElementById("card-editor-title")?.closest<HTMLElement>('[role="dialog"]');
      panel?.style.setProperty("--event-editor-height", `${viewport.height}px`);
      panel?.style.setProperty("--event-editor-top", `${viewport.offsetTop}px`);
    };
    resize();
    viewport.addEventListener("resize", resize);
    viewport.addEventListener("scroll", resize);
    return () => { viewport.removeEventListener("resize", resize); viewport.removeEventListener("scroll", resize); };
  }, [open]);
  return (
    <ModalShell open={open} onClose={close} labelledBy="card-editor-title" placement="responsiveFull"
      className="event-card-editor public-theme flex max-h-[calc(100dvh-32px)] w-[min(1080px,calc(100vw-24px))] flex-col overflow-hidden rounded-modal border border-border bg-card shadow-[var(--shadow-modal)]">
      <header className="event-card-editor-header shrink-0 border-b border-border-soft px-5 py-4 lg:px-7 lg:py-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="card-editor-title" className="text-lg font-bold lg:text-xl">명함 정보 입력</h2>
          <button type="button" disabled={busy} aria-label="명함 작성 닫기" onClick={close} className="flex size-11 shrink-0 items-center justify-center rounded-control text-muted-strong hover:bg-surface disabled:opacity-40"><SiteIcon name="close" /></button>
        </div>
        <p className="mt-2 hidden text-sm text-muted-strong lg:block">입력하면서 미리보기를 확인해 주세요. 명함을 작성한 뒤 행사 참가 신청을 마칠 수 있습니다.</p>
        <div role="tablist" aria-label="명함 작성 보기" className="mt-2 grid grid-cols-2 rounded-control bg-surface p-1 lg:hidden">
          {(["input", "preview"] as const).map((view) => <button key={view} ref={view === "input" ? inputTab : previewTab}
            id={`event-card-tab-${view}`} role="tab" type="button" aria-selected={mobileView === view} aria-controls={`event-card-panel-${view}`} tabIndex={mobileView === view ? 0 : -1}
            onClick={() => selectView(view)} onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? "input" : event.key === "End" ? "preview" : mobileView === "input" ? "preview" : "input";
              selectView(next); (next === "input" ? inputTab : previewTab).current?.focus();
            }} className={`min-h-11 rounded-control px-3 text-sm font-semibold ${mobileView === view ? "bg-card text-brand shadow-sm" : "text-muted-strong"}`}>
            {view === "input" ? "정보 입력" : "명함 미리보기"}
          </button>)}
        </div>
      </header>
      <div ref={body} className="event-card-editor-body min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-7 lg:py-6">
        <BusinessCardFields eventId={eventId} draft={draft} preview={preview} photoUrl={photoUrl} mobileView={mobileView}
          onChange={onChange} onPreviewSideChange={onPreviewSideChange} onPhotoChange={onPhotoChange} onPhotoBusyChange={onPhotoBusyChange} />
      </div>
      <footer className="event-card-editor-footer shrink-0 border-t border-border-soft bg-card px-5 py-3 lg:px-7 lg:py-4">
        {error ? <p role="alert" className="mb-3 text-sm font-semibold text-fail">{error}</p> : null}
        <div className="mb-3"><EventRegistrationHelp /></div>
        <div className="flex justify-end gap-2">
          <SecondaryButton disabled={busy} onClick={close} className="hidden lg:inline-flex">닫기</SecondaryButton>
          <PrimaryButton disabled={busy} onClick={() => { selectView("input"); onDone(); }} className="w-full lg:w-auto">{busy ? "사진 올리는 중…" : "명함 정보 완료"}</PrimaryButton>
        </div>
      </footer>
    </ModalShell>
  );
}
