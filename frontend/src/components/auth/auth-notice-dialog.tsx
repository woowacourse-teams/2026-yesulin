"use client";

import { SecondaryButton } from "@/components/screening/ui-controls";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/screening/modal-shell";

export type AuthNotice = { readonly title: string; readonly description: string };

export function AuthNoticeDialog({ notice, onClose }: { readonly notice: AuthNotice | null; readonly onClose: () => void }) {
  return (
    <ModalShell
      open={notice !== null}
      onClose={onClose}
      labelledBy="auth-notice-title"
      placement="responsiveSheet"
      className="max-h-[calc(100dvh-24px)] w-full overflow-hidden rounded-t-modal border border-border bg-card shadow-[var(--shadow-modal)] md:w-[min(440px,calc(100vw-40px))] md:rounded-modal"
    >
      <DialogHeader id="auth-notice-title" title={notice?.title ?? "안내"} />
      <div className="px-5 py-6 md:px-6">
        <p className="text-base leading-relaxed text-muted-strong">{notice?.description}</p>
      </div>
      <DialogFooter>
        <SecondaryButton type="button" data-autofocus="true" onClick={onClose}>확인</SecondaryButton>
      </DialogFooter>
    </ModalShell>
  );
}
