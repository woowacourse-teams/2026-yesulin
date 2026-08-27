"use client";

import { TextButton } from "@/components/ui/controls";
import { usePublicApplication } from "./public-application-context";

const STATUS_COPY = {
  RESTORING: { label: "저장된 작성 내용 확인 중", tone: "border-border bg-surface text-muted-strong" },
  IDLE: { label: "아직 저장할 내용 없음", tone: "border-border bg-card text-muted" },
  SAVING: { label: "저장 중", tone: "border-brand-line bg-brand-soft text-brand" },
  SAVED: { label: "이 기기에 저장됨", tone: "border-pass/20 bg-pass-bg text-pass" },
  ERROR: { label: "저장 실패", tone: "border-fail/20 bg-fail-bg text-fail" },
} as const;

export function PublicApplicationSaveBadge() {
  const { state, actions } = usePublicApplication();
  const copy = STATUS_COPY[state.draftSaveStatus];
  return <div aria-live="polite" aria-atomic="true" className="ml-auto flex items-center gap-1.5">
    <span role={state.draftSaveStatus === "ERROR" ? "alert" : "status"} className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold ${copy.tone}`}>
      <span aria-hidden="true">{statusIcon(state.draftSaveStatus)}</span>{copy.label}
    </span>
    {state.draftSaveStatus === "ERROR" ? <TextButton onClick={actions.retryDraftSave} className="min-h-8 px-2 text-xs text-fail hover:bg-fail-bg">다시 시도</TextButton> : null}
  </div>;
}

/**
 * 저장 상태는 머리말 배지 한 곳에서만 알린다.
 * 입력할 때마다 본문 배너까지 바뀌면 작성 중에 계속 눈이 가서 피로하다.
 * 손이 필요한 저장 실패와, 한 번만 알리면 되는 복구 안내만 본문에 남긴다.
 */
export function PublicApplicationSaveNotice() {
  const { state, actions } = usePublicApplication();
  if (state.draftSaveStatus === "ERROR") return <div role="alert" className="mb-6 rounded-card border border-fail/20 bg-fail-bg px-4 py-3 text-sm leading-6 text-fail">
    <strong className="block">최근 변경 내용을 저장하지 못했어요.</strong>
    <span>{state.draftSaveError} 이 페이지를 닫지 말고 다시 시도해 주세요.</span>
    <TextButton onClick={actions.retryDraftSave} className="ml-1 min-h-8 px-2 text-fail hover:bg-card">다시 시도</TextButton>
  </div>;
  if (!state.draftRestored || state.draftSaveStatus === "RESTORING") return null;
  return <div role="status" className="mb-6 rounded-card border border-pass/20 bg-pass-bg px-4 py-3 text-sm leading-6 text-muted-strong"><strong className="text-pass">이 기기에 저장된 작성 내용을 불러왔어요.</strong> 새로고침하거나 공고로 돌아와도 이 브라우저에서 이어 쓸 수 있어요.</div>;
}

function statusIcon(status: keyof typeof STATUS_COPY) {
  if (status === "SAVED") return "✓";
  if (status === "ERROR") return "!";
  if (status === "SAVING" || status === "RESTORING") return "…";
  return "○";
}
