"use client";

import { useEffect, useRef, useState } from "react";
import { ModalShell } from "@/components/auditions/modal-shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { usePassedContacts, type PassedContact } from "@/features/pdf-reviews/use-passed-contacts";
import type { ReviewKey } from "@/features/pdf-reviews/types";
import { contactLabels, emailLabels, contactsClipboardText } from "@/features/pdf-reviews/contact-copy";
import { ReviewOriginalDocument } from "./review-original-document";
import { ReviewTimetablePanel } from "./review-timetable-panel";

export function ReviewPassedContacts({ reviewId, onBack, onUnauthorized, onDirtyChange }: {
  readonly reviewId: ReviewKey;
  readonly onBack: () => void;
  readonly onUnauthorized: () => void;
  readonly onDirtyChange: (dirty: boolean) => void;
}) {
  const { rows, loading, error, refresh } = usePassedContacts(reviewId, onUnauthorized);
  const [documentJobId, setDocumentJobId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [panelRows, setPanelRows] = useState<readonly PassedContact[] | null>(null);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState("");
  const [manualCopy, setManualCopy] = useState("");
  const manualField = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (manualCopy) { manualField.current?.focus(); manualField.current?.select(); } }, [manualCopy]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const found = rows.filter(row => row.contact.status === "FOUND").length;
  const emailsFound = rows.filter(row => row.email.status === "FOUND").length;
  const selectedRows = rows.filter(row => selected.has(String(row.entry.id)));
  async function copyContacts() {
    if (loading || error || !rows.length || copying) return;
    const targets = selectedRows.length ? selectedRows : rows;
    const text = contactsClipboardText(targets);
    setCopying(true); setCopied(""); setManualCopy("");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`${targets.length}명의 이름·배역·전화번호·이메일을 복사했습니다. 원하는 곳에 붙여 넣으세요.`);
    } catch {
      setManualCopy(text);
    } finally { setCopying(false); }
  }
  if (panelRows !== null) return <ReviewTimetablePanel reviewId={reviewId} selected={panelRows} onUnauthorized={onUnauthorized} onDirtyChange={onDirtyChange} onClose={() => { setPanelRows(null); setSelected(new Set()); refresh(); }} />;
  return <section aria-labelledby="passed-contacts-title" className="py-4">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 ref={heading} tabIndex={-1} id="passed-contacts-title" className="text-xl font-bold outline-none">합격자 연락처</h2>
        <p className="mt-2 text-sm leading-6 text-muted-strong">이 심사함의 전체 배역 합격자를 모았습니다.<br />전화번호나 이메일이 여러 개이거나 읽히지 않으면 원문을 확인해 주세요.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <SecondaryButton disabled={copying} onClick={() => { setCopied(""); setManualCopy(""); setPanelRows([]); }}>오디션 일정 명단</SecondaryButton>
        <SecondaryButton disabled={loading || copying} onClick={() => { setCopied(""); setManualCopy(""); refresh(); }}>새로고침</SecondaryButton>
        <SecondaryButton disabled={copying} onClick={onBack}>심사로 돌아가기</SecondaryButton>
      </div>
    </div>
    {error ? <p role="alert" className="rounded-control bg-fail-bg p-4 text-sm text-fail">{error}</p>
      : <>
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-control border border-border bg-surface p-3">
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-5 w-5 accent-brand" disabled={loading || copying || !rows.length} checked={rows.length > 0 && rows.every(row => selected.has(String(row.entry.id)))} onChange={event => { setCopied(""); setManualCopy(""); setSelected(new Set(event.target.checked ? rows.map(row => String(row.entry.id)) : [])); }} />전체 선택</label>
          <span className="text-sm">{selectedRows.length}명 선택</span>
          <SecondaryButton disabled={loading || copying || !rows.length} onClick={() => void copyContacts()}>{copying ? "복사 중…" : selectedRows.length ? `선택한 ${selectedRows.length}명 연락처 복사` : `전체 ${rows.length}명 연락처 복사`}</SecondaryButton>
          <PrimaryButton disabled={loading || copying || !selectedRows.length || selectedRows.length > 300} onClick={() => { setCopied(""); setManualCopy(""); setPanelRows(selectedRows); }}>선택한 {selectedRows.length}명 일정에 추가</PrimaryButton>
          {selectedRows.length > 300 && <p role="alert" className="text-sm text-fail">한 번에 300명까지 선택해 주세요.</p>}
        </div>
        <p className="mb-3 text-sm text-muted-strong">일정을 사용하지 않아도 연락처를 복사해 엑셀이나 메모장에 붙여 넣을 수 있어요. 선택하지 않으면 전체 명단을 복사합니다.</p>
        {copied && <p role="status" className="mb-3 rounded-control bg-brand-soft p-3 text-sm text-brand">{copied}</p>}
        {manualCopy && <div className="mb-4 space-y-2 rounded-control border border-border bg-surface p-3">
          <p role="alert" className="text-sm">자동 복사를 사용할 수 없습니다. 아래 내용을 선택해 직접 복사해 주세요.</p>
          <label htmlFor="manual-contact-copy" className="block text-sm font-medium">복사할 연락처</label>
          <textarea ref={manualField} id="manual-contact-copy" readOnly value={manualCopy} rows={5} className="w-full rounded-control border border-border bg-card p-3 text-sm" onFocus={event => event.currentTarget.select()} />
          <SecondaryButton onClick={() => setManualCopy("")}>복사 내용 닫기</SecondaryButton>
        </div>}
        <p role="status" className="mb-3 text-sm text-muted-strong">{loading && !rows.length ? "합격자 명단을 불러오는 중…" : `합격 ${rows.length}명 · 번호 확인 ${found}명 · 이메일 확인 ${emailsFound}명${loading ? " · 연락처를 불러오는 중…" : ""}`}</p>
        {!loading && !rows.length ? <div className="rounded-card border border-border bg-card px-5 py-12 text-center">
          <p className="font-semibold">아직 합격 처리한 지원자가 없습니다.</p><p className="mt-2 text-sm text-muted">심사에서 합격으로 저장한 지원자가 여기에 표시됩니다.</p>
        </div> : rows.length > 0 && <div className="overflow-x-auto rounded-card border border-border bg-card">
          <table className="w-full min-w-[800px] text-left text-sm">
            <caption className="sr-only">전체 배역 합격자 이름과 전화번호·이메일</caption>
            <thead className="border-b border-border bg-surface text-muted-strong"><tr>
              <th scope="col" className="px-3 py-3"><span className="sr-only">선택</span></th>
              <th scope="col" className="px-4 py-3 font-semibold">이름</th><th scope="col" className="px-4 py-3 font-semibold">배역</th>
              <th scope="col" className="px-4 py-3 font-semibold">전화번호</th><th scope="col" className="px-4 py-3 font-semibold">이메일</th><th scope="col" className="px-4 py-3 font-semibold">원문</th>
            </tr></thead>
            <tbody className="divide-y divide-border-soft">{rows.map(({ entry, roleName, contact, email }) => <tr key={entry.id}>
              <td className="px-2"><label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center"><span className="sr-only">{entry.applicantName || entry.originalFilename} 대상 선택</span><input type="checkbox" className="h-5 w-5 accent-brand" disabled={loading || copying} checked={selected.has(String(entry.id))} onChange={event => { setCopied(""); setManualCopy(""); setSelected(current => { const next = new Set(current); if (event.target.checked) next.add(String(entry.id)); else next.delete(String(entry.id)); return next; }); }} /></label></td>
              <th scope="row" className="max-w-[280px] px-4 py-4 font-normal"><span className="font-semibold">{entry.applicantName || "이름 미확인"}</span>
                <span className="mt-1 block break-all text-xs text-muted">{entry.originalFilename}</span></th>
              <td className="max-w-[180px] break-words px-4 py-4">{roleName}</td>
              <td className="whitespace-nowrap px-4 py-4">{contact.status === "FOUND" ? <span className="num select-all font-medium">{contact.phone}</span>
                : <span className={contact.status === "ERROR" ? "text-fail" : "text-muted-strong"}>{contactLabels[contact.status]}</span>}</td>
              <td className="min-w-48 max-w-64 break-all px-4 py-4">{email.status === "FOUND" ? <span className="select-all font-medium">{email.email}</span>
                : <span className={email.status === "ERROR" ? "text-fail" : "text-muted-strong"}>{emailLabels[email.status]}</span>}</td>
              <td className="px-4 py-3"><SecondaryButton aria-label={`${entry.applicantName || entry.originalFilename} 원본 PDF 보기`} onClick={() => setDocumentJobId(entry.jobId)}>PDF 보기</SecondaryButton></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </>}
    <ModalShell open={documentJobId !== null} onClose={() => setDocumentJobId(null)} labelledBy="contacts-document-title"
      className="flex h-[90dvh] w-[calc(100vw-24px)] max-w-5xl flex-col overflow-hidden rounded-modal border border-border bg-card text-foreground shadow-[var(--shadow-modal)]">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><h2 id="contacts-document-title" className="font-semibold">지원서 원본 PDF</h2><SecondaryButton onClick={() => setDocumentJobId(null)}>닫기</SecondaryButton></header>
      <div className="min-h-0 flex-1">{documentJobId && <ReviewOriginalDocument key={documentJobId} jobId={documentJobId} onUnauthorized={onUnauthorized} />}</div>
    </ModalShell>
  </section>;
}
