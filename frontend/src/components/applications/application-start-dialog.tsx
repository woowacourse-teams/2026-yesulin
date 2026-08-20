"use client";

import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { PrimaryLink, SecondaryButton } from "@/components/ui/controls";

const TITLE_ID = "application-start-dialog-title";

export function ApplicationStartDialog({ open, loginHref, hasDraft, onClose, onContinueWithoutLogin }: {
  readonly open: boolean;
  readonly loginHref: string;
  readonly hasDraft: boolean;
  readonly onClose: () => void;
  readonly onContinueWithoutLogin: () => void;
}) {
  return <ModalShell open={open} onClose={onClose} labelledBy={TITLE_ID} placement="responsiveSheet" className="w-full rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:w-[min(520px,calc(100vw-32px))] md:rounded-modal">
    <DialogHeader id={TITLE_ID} title={hasDraft ? "로그인하고 지원서를 이어갈까요?" : "로그인하고 지원서를 작성할까요?"} subtitle="로그인하면 저장한 배우 프로필을 불러와 반복 입력을 줄일 수 있어요." />
    <div className="px-5 py-6 md:px-6">
      <ul className="space-y-3 text-sm leading-6 text-muted-strong">
        <li className="rounded-control bg-brand-soft px-4 py-3"><strong className="block text-foreground">로그인하고 작성</strong>저장한 프로필을 불러오고, 로그인 후 제출까지 이어갑니다.</li>
        <li className="rounded-control bg-surface px-4 py-3"><strong className="block text-foreground">로그인 없이 작성</strong>이 브라우저에 내용을 저장하고 최종 제출 전에 로그인합니다.</li>
      </ul>
    </div>
    <DialogFooter>
      <SecondaryButton onClick={onContinueWithoutLogin}>로그인 없이 작성</SecondaryButton>
      <PrimaryLink href={loginHref}>로그인하고 작성</PrimaryLink>
    </DialogFooter>
  </ModalShell>;
}
