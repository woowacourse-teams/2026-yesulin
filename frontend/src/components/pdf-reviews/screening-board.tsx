"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reportReviewError } from "@/features/pdf-reviews/report-review-error";
import { trackReviewAction } from "@/features/analytics/review-actions";
import { roleId, postingId, type SubmissionId, type ReviewStatus } from "@/features/auditions/types";
import { assignPdfReviewRoles, isUnauthorized, renamePdfReviewEntry, updatePdfReviewEntry } from "@/features/pdf-reviews/api";
import { screeningApplicant } from "@/features/pdf-reviews/screening-adapter";
import { matchesDecision, sameKey, type DecisionFilter, type ReviewDetail, type ReviewEntry } from "@/features/pdf-reviews/types";
import { usePdfSourceCache } from "@/features/pdf-reviews/pdf-source-cache";
import { ReviewOriginalDocument } from "./review-original-document";
import { BoardProvider } from "./screening-ui/board-context";
import { ApplicantFocusReview } from "./screening-ui/applicant-focus-review";
import { ApplicantCards } from "./screening-ui/applicant-cards";
import { ApplicantTable } from "./screening-ui/applicant-table";
import { ReviewRoleSelect } from "./review-role-select";

type Props = { review: ReviewDetail; entries: readonly ReviewEntry[]; decision: DecisionFilter; view: "single" | "card" | "table";
  refreshKey: number; onSaved: (entry: ReviewEntry) => void; onUnauthorized: () => void;
  onDirtyChange: (dirty: boolean) => void; registerNavigationSave?: (flush: () => Promise<boolean>) => () => void; onApplicantOpened?: () => void; navigate: (action: () => void) => void };

export function ScreeningBoard({ review, entries, decision, view, refreshKey, onSaved, onUnauthorized, onDirtyChange, onApplicantOpened, navigate, registerNavigationSave }: Props) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [selected, setSelected] = useState<Set<SubmissionId>>(new Set());
  const [focused, setFocused] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const latest = useRef({ review, entries, onUnauthorized });
  useEffect(() => { latest.current = { review, entries, onUnauthorized }; });
  const rows = useMemo(() => entries.map(entry => screeningApplicant(review, entry)), [review, entries]);
  const sources = usePdfSourceCache();
  const entryFor = (id: string) => latest.current.review.entries.find(entry => sameKey(entry.id, id));
  const nextJobId = (id: SubmissionId) => {
    const next = rows[rows.findIndex(row => row.id === id) + 1];
    if (!next) return undefined;
    return entryFor(next.id)?.jobId;
  };
  const save = async (id: SubmissionId, status: ReviewStatus, note?: string, saveKind: "decision" | "memo" = "decision") => {
    if (savingRef.current) return null;
    const entry = entryFor(id); if (!entry) return null;
    savingRef.current = true; setSaving(true); setError(""); setSavedMessage("");
    try {
      const updated = await updatePdfReviewEntry(review.id, entry.id, { decision: status === "ETC" ? "HOLD" : status, memo: note ?? entry.memo ?? "" }, saveKind);
      onSaved(updated); onDirtyChange(false); setSavedMessage("저장했습니다.");
      const next = latest.current.entries.map(item => sameKey(item.id, updated.id) ? updated : item)
        .filter(item => matchesDecision(item, decision));
      if (focused && next.length === 0) setFocused(null);
      return { applicants: next.map(item => screeningApplicant(review, item)) };
    } catch (cause) {
      reportReviewError(cause, "review_save");
      if (isUnauthorized(cause)) onUnauthorized();
      setError(cause instanceof Error ? cause.message : "저장하지 못했습니다. 다시 시도해 주세요."); return null;
    } finally { savingRef.current = false; setSaving(false); }
  };
  const noteDirty = useCallback((dirty: boolean) => onDirtyChange(dirty), [onDirtyChange]);
  const assignRole = async (ids: readonly SubmissionId[], roleId: string | null) => {
    if (savingRef.current || !ids.length) return;
    savingRef.current = true; setSaving(true); setError(""); setSavedMessage("");
    try {
      const changed = await assignPdfReviewRoles(review.id, ids, roleId);
      changed.forEach(onSaved); setSelected(new Set()); setSavedMessage("배역을 저장했습니다.");
    } catch (cause) {
      reportReviewError(cause, "review_save");
      if (isUnauthorized(cause)) onUnauthorized();
      setError(cause instanceof Error ? cause.message : "배역을 저장하지 못했습니다. 다시 선택해 주세요.");
    } finally { savingRef.current = false; setSaving(false); }
  };
  const publishField = (id: SubmissionId, patch: Partial<ReviewEntry>) => {
    const entry = entryFor(id); if (!entry) return;
    const updated = { ...entry, ...patch };
    const replace = (item: ReviewEntry) => { if (sameKey(item.id, id)) return updated; return item; };
    latest.current = { ...latest.current, entries: latest.current.entries.map(replace),
      review: { ...latest.current.review, entries: latest.current.review.entries.map(replace) } };
    onSaved(updated);
  };
  const renameTitle = async (id: SubmissionId, title: string) => {
    try {
      const updated = await renamePdfReviewEntry(review.id, id, title);
      const confirmed = updated.title ?? title;
      publishField(id, { title: confirmed }); return confirmed;
    } catch (cause) { reportReviewError(cause, "autosave"); if (isUnauthorized(cause)) onUnauthorized(); return null; }
  };
  const saveMemo = async (id: SubmissionId, memo: string) => {
    const entry = entryFor(id); if (!entry) return null;
    try {
      const updated = await updatePdfReviewEntry(review.id, id, { memo, decision: entry.decision }, "memo");
      publishField(id, { memo: updated.memo ?? "" }); return updated.memo ?? "";
    } catch (cause) { reportReviewError(cause, "autosave"); if (isUnauthorized(cause)) onUnauthorized(); return null; }
  };
  const allEntries = review.entries;
  const done = allEntries.filter(entry => entry.decision === "PASS" || entry.decision === "FAIL").length;
  const counts = { all: allEntries.length, pending: allEntries.filter(entry => entry.decision === "PENDING").length, done,
    pass: allEntries.filter(entry => entry.decision === "PASS").length,
    fail: allEntries.filter(entry => entry.decision === "FAIL").length,
    etc: allEntries.filter(entry => entry.decision === "HOLD").length };
  return <BoardProvider value={{ source: { kind: "PDF" }, board: { role: { id: roleId(String(review.id)), postingId: postingId(String(review.id)), name: "PDF 지원자", description: "", quota: 0, gender: "ANY", ageMin: 0, ageMax: 0, applicantCount: allEntries.length, activeRound: 1, allRoundsClosed: false, counts, progress: { done, total: allEntries.length, percent: allEntries.length ? Math.round(done / allEntries.length * 100) : 0 } } },
    filters: { work: decision === "PENDING" ? "PENDING" : "DONE" }, selected, saving, saveError: error, reviewLocked: false,
    toggleSelected: id => setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }),
    openApplicant: id => { trackReviewAction(String(review.id), String(id), view, "open"); navigate(() => setFocused(id)); }, roleOptions: review.roles,
    currentRole: id => review.entries.find(entry => sameKey(entry.id, id))?.roleId ?? null,
    changeRole: (id, roleId) => void assignRole([id], roleId), renameTitle, saveMemo, registerNavigationSave, requestNavigation: navigate, onNoteDirty: noteDirty,
    onBasicAction: (id, action, input) => trackReviewAction(String(review.id), String(id), view, action, input),
    onApplicantOpened,
    reviewFocused: (id, status, _memo, note) => save(id, status, note),
    renderDocument: (applicant, frame) => { const entry = entryFor(applicant.id); if (!entry) return null; return <ReviewOriginalDocument key={`${entry.jobId}:${refreshKey}`} jobId={entry.jobId} sources={sources} prefetchJobId={nextJobId(applicant.id)} onUnauthorized={onUnauthorized} frame={frame} />; },
  }}>
    {error && <p role="alert" className="mb-3 rounded-control bg-fail-bg p-3 text-sm text-fail">{error}</p>}
    <p role="status" className="sr-only">{saving ? "저장 중…" : savedMessage}</p>
    {view === "single" || focused ? <ApplicantFocusReview key={focused ?? "single"} rows={rows} initialId={focused ?? undefined} onBack={focused ? () => setFocused(null) : undefined} /> : <>
      <div className="mb-4 flex min-h-11 flex-wrap items-center gap-3 rounded-control border border-border bg-surface px-3 py-2 text-sm">
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 font-medium"><input className="h-5 w-5 accent-brand" type="checkbox" checked={rows.length > 0 && rows.every(row => selected.has(row.id))} onChange={event => setSelected(new Set(event.target.checked ? rows.map(row => row.id) : []))} />전체 선택</label>
        <span>{selected.size}명 선택</span>{review.roles.length > 0 && <ReviewRoleSelect label="선택한 지원자 배역" allowReselect roles={review.roles} value={null} disabled={!selected.size || selected.size > 300 || saving} onChange={roleId => void assignRole([...selected], roleId)} />}
        {selected.size > 300 && <p role="alert" className="text-fail">배역은 한 번에 300명까지 설정해 주세요.</p>}
      </div>
      {view === "card" ? <ApplicantCards rows={rows} /> : <ApplicantTable rows={rows} />}
    </>}
  </BoardProvider>;
}
