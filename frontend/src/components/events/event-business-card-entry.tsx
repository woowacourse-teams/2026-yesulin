"use client";

import { ModalShell } from "@/components/auditions/modal-shell";
import { PrimaryButton, TextButton } from "@/components/ui/controls";
import { SiteIcon } from "@/components/ui/site-icon";

export function EventBusinessCardEntry({ open, busy, error, onClose, onProfile, onManual }: {
  readonly open: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onProfile: () => void;
  readonly onManual: () => void;
}) {
  const close = () => { if (!busy) onClose(); };
  return <ModalShell open={open} onClose={close} labelledBy="card-entry-title"
    className="public-theme max-h-[calc(100dvh-32px)] w-[min(520px,calc(100vw-32px))] overflow-y-auto rounded-modal border border-border bg-card p-6 shadow-[var(--shadow-modal)] sm:p-8">
    <div className="flex items-center justify-between gap-3">
      <h2 id="card-entry-title" className="text-xl font-bold">무료 명함 만들기</h2>
      <button type="button" disabled={busy} onClick={close} aria-label="명함 만들기 안내 닫기" className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-control text-muted-strong hover:bg-surface disabled:opacity-40"><SiteIcon name="close" /></button>
    </div>
    <p className="mt-4 text-lg font-semibold leading-8">프로필을 등록하고<br />명함을 더 편하게 만들어 보세요.</p>
    <ul className="mt-5 space-y-3 rounded-control bg-brand-soft px-4 py-5 text-sm leading-7 text-muted-strong">
      <li><strong className="text-foreground">명함 정보 자동 채움</strong><br />사진과 기본 정보를 불러오고 필요한 부분만 수정해요.</li>
      <li><strong className="text-foreground">내 공개 프로필로 연결되는 QR</strong><br />명함을 받은 사람이 내 사진과 소개를 확인할 수 있어요.</li>
    </ul>
    <p className="mt-4 text-xs leading-6 text-muted-strong">처음 이용한다면 소셜 로그인으로 가입한 뒤 프로필을 등록해 주세요. 이미 공개 프로필이 있다면 바로 불러와요.</p>
    {error ? <p role="alert" className="mt-4 text-sm leading-6 text-fail">{error}</p> : null}
    <div className="mt-6 flex flex-col gap-2">
      <PrimaryButton disabled={busy} onClick={onProfile} className="min-h-12 w-full">{busy ? "프로필 불러오는 중…" : "프로필 등록하고 명함 만들기"}</PrimaryButton>
      <TextButton disabled={busy} onClick={onManual} className="min-h-11 w-full text-sm text-muted-strong">프로필 등록 없이 직접 작성하기</TextButton>
    </div>
  </ModalShell>;
}
