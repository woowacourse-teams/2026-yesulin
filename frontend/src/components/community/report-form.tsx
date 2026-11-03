"use client";

import { useRef, useState, type FormEvent } from "react";
import { PiDotsThree } from "react-icons/pi";
import { reportEntry } from "@/features/community/api";
import { SubmissionAttempt } from "@/features/community/draft";
import { useCommunityAction } from "@/features/community/hooks";
import { reportReasons, type ReportReason } from "@/features/community/types";
import { CommunityError } from "./community-ui";

export function ReportForm({ entryId, compact = false }: { readonly entryId: number; readonly compact?: boolean }) {
  const action = useCommunityAction();
  const attempt = useRef(new SubmissionAttempt());
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = { reason: String(data.get("reason")) as ReportReason, detail: String(data.get("detail") ?? "").trim() };
    await action.run(async () => { await reportEntry(entryId, input.reason, input.detail, attempt.current.idFor(input)); setSent(true); });
  }
  if (sent) return <p role="status" className="community-hint">신고가 접수되었어요. 팀에서 확인할게요.</p>;
  let className = "community-report";
  if (compact) className += " community-report-compact";
  return <details className={className}><summary aria-label="신고하기">{compact && <PiDotsThree size={24} aria-hidden="true" />}{!compact && "신고하기"}</summary><form onSubmit={submit} className="community-editor">
    <fieldset disabled={action.busy}><label htmlFor={`reason-${entryId}`}>신고 사유</label><select id={`reason-${entryId}`} name="reason" required>
      {Object.entries(reportReasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <label htmlFor={`report-detail-${entryId}`}>상세 설명 <span>선택 · 최대 1,000자</span></label>
      <textarea id={`report-detail-${entryId}`} name="detail" rows={3} maxLength={1000} /></fieldset>
    <p className="community-hint">신고 내용은 공개되지 않아요. 신고만으로 글이 삭제되지는 않아요.</p>
    <CommunityError message={action.error} /><button disabled={action.busy} className="community-button">신고 보내기</button></form></details>;
}
