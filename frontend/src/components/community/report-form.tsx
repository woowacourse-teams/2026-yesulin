"use client";

import type { FormEvent } from "react";
import { reportEntry } from "@/features/community/api";
import { useCommunityAction } from "@/features/community/hooks";
import type { SubmissionAttempt } from "@/features/community/draft";
import { reportReasons, type ReportReason } from "@/features/community/types";
import { CommunityError } from "./community-ui";

type Props = { readonly entryId: number; readonly attempt: SubmissionAttempt; readonly onSent: () => void };

export function ReportForm({ entryId, attempt, onSent }: Props) {
  const action = useCommunityAction();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = { reason: String(data.get("reason")) as ReportReason, detail: String(data.get("detail") ?? "").trim() };
    await action.run(async () => { await reportEntry(entryId, input.reason, input.detail, attempt.idFor(input)); onSent(); });
  }
  return <form onSubmit={submit} className="community-report"><fieldset disabled={action.busy}><legend>신고 사유를 골라 주세요</legend>
    {Object.entries(reportReasons).map(([value, label], index) => <label key={value} className="community-sheet-row">
      <input type="radio" name="reason" value={value} required defaultChecked={index === 0} />{label}</label>)}
    <label className="community-sr-only" htmlFor={`report-detail-${entryId}`}>상세 설명</label>
    <textarea id={`report-detail-${entryId}`} name="detail" rows={3} maxLength={1000} placeholder="상세 설명 (선택 · 최대 1,000자)" /></fieldset>
    <p className="community-sheet-hint">신고 내용은 공개되지 않아요. 신고만으로 글이 삭제되지는 않아요.</p>
    <CommunityError message={action.error} />
    <button className="community-sheet-submit" disabled={action.busy}>{action.busy && "보내는 중…"}{!action.busy && "신고 보내기"}</button></form>;
}
