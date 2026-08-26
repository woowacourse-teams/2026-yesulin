"use client";

import { useEffect } from "react";
import { TrackedLoginLink } from "@/components/analytics/tracked-login-link";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { SecondaryButton } from "@/components/ui/controls";
import type { LoginAttribution } from "@/features/analytics/events";
import { trackAnalyticsEvent } from "@/features/analytics/events";

const TITLE_ID = "application-start-dialog-title";

export function ApplicationStartDialog({ open, loginHref, hasDraft, selectedRoleCount, loginAnalytics, onClose, onContinueWithoutLogin }: {
  readonly open: boolean;
  readonly loginHref: string;
  readonly hasDraft: boolean;
  readonly selectedRoleCount: number;
  readonly loginAnalytics: LoginAttribution;
  readonly onClose: () => void;
  readonly onContinueWithoutLogin: () => void;
}) {
  useEffect(() => {
    if (open) trackAnalyticsEvent("login_prompt_view", { login_reason: "application_start", has_draft: hasDraft });
  }, [hasDraft, open]);

  const close = () => {
    trackAnalyticsEvent("login_prompt_action", { login_reason: "application_start", action: "close", has_draft: hasDraft });
    onClose();
  };
  const continueGuest = () => {
    trackAnalyticsEvent("login_prompt_action", { login_reason: "application_start", action: "continue_guest", has_draft: hasDraft });
    trackAnalyticsEvent("application_start", { start_mode: hasDraft ? "resume" : "guest", selected_role_count: selectedRoleCount, has_draft: hasDraft });
    onContinueWithoutLogin();
  };

  return <ModalShell open={open} onClose={close} labelledBy={TITLE_ID} placement="responsiveSheet" className="w-full rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:w-[min(520px,calc(100vw-32px))] md:rounded-modal">
    <DialogHeader id={TITLE_ID} title={hasDraft ? "로그인하고 지원서를 이어갈까요?" : "로그인하고 지원서를 작성할까요?"} subtitle="로그인하면 저장한 배우 프로필을 불러와 반복 입력을 줄일 수 있어요." />
    <div className="px-5 py-6 md:px-6">
      <ul className="space-y-3 text-sm leading-6 text-muted-strong">
        <li className="rounded-control bg-brand-soft px-4 py-3"><strong className="block text-foreground">로그인하고 작성</strong>저장한 프로필을 불러오고, 로그인 후 제출까지 이어갑니다.</li>
        <li className="rounded-control bg-surface px-4 py-3"><strong className="block text-foreground">로그인 없이 작성</strong>이 브라우저에 내용을 저장하고 최종 제출 전에 로그인합니다.</li>
      </ul>
    </div>
    <DialogFooter>
      <SecondaryButton onClick={continueGuest}>로그인 없이 작성</SecondaryButton>
      <TrackedLoginLink href={loginHref} analytics={loginAnalytics} onTrackedClick={() => {
        trackAnalyticsEvent("login_prompt_action", { login_reason: "application_start", action: "login", has_draft: hasDraft });
        trackAnalyticsEvent("application_start", { start_mode: hasDraft ? "resume" : "login", selected_role_count: selectedRoleCount, has_draft: hasDraft });
      }} className="inline-flex min-h-11 items-center justify-center rounded-control border border-brand bg-brand px-4 text-sm font-semibold text-white shadow-[var(--shadow-1)] hover:bg-brand-strong">로그인하고 작성</TrackedLoginLink>
    </DialogFooter>
  </ModalShell>;
}
