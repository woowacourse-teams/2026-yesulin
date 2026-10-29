"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { roleId, postingId, type SubmissionId, type ReviewStatus } from "@/features/auditions/types";
import { fetchPdfExtraction } from "@/features/pdf-extractions/api";
import type { PdfExtractionJob } from "@/features/pdf-extractions/types";
import { assignPdfReviewRoles, isUnauthorized, updatePdfReviewEntry } from "@/features/pdf-reviews/api";
import { screeningApplicant } from "@/features/pdf-reviews/screening-adapter";
import { matchesDecision, sameKey, type DecisionFilter, type ReviewDetail, type ReviewEntry } from "@/features/pdf-reviews/types";
import { ModalShell } from "@/components/auditions/modal-shell";
import { ReviewOriginalDocument } from "./review-original-document";
import { SecondaryButton } from "@/components/ui/controls";
import { BoardProvider } from "./screening-ui/board-context";
import { ApplicantFocusReview } from "./screening-ui/applicant-focus-review";
import { ApplicantCards } from "./screening-ui/applicant-cards";
import { ApplicantTable } from "./screening-ui/applicant-table";
import styles from "./screening.module.css";

type Props = { review: ReviewDetail; entries: readonly ReviewEntry[]; decision: DecisionFilter; view: "single" | "card" | "table";
  refreshKey: number; onSaved: (entry: ReviewEntry) => void; onUnauthorized: () => void;
  onDirtyChange: (dirty: boolean) => void; onApplicantOpened?: () => void; navigate: (action: () => void) => void };

export function ScreeningBoard({ review, entries, decision, view, refreshKey, onSaved, onUnauthorized, onDirtyChange, onApplicantOpened, navigate }: Props) {
  const [jobs, setJobs] = useState<Record<string, PdfExtractionJob>>({});
  const cache = useRef(new Map<string, { job: PdfExtractionJob; signature: string; at: number; refresh: number }>());
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [selected, setSelected] = useState<Set<SubmissionId>>(new Set());
  const [focused, setFocused] = useState<string | null>(null);
  const [targets, setTargets] = useState<readonly SubmissionId[]>([]);
  const [role, setRole] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const latest = useRef({ review, entries, onUnauthorized });
  useEffect(() => { latest.current = { review, entries, onUnauthorized }; });
  const signature = entries.map(entry => `${entry.jobId}:${entry.matchStatus}`).join("|");
  const single = view === "single" || focused !== null;
  const refreshApplicant = useCallback((id: SubmissionId) => {
    const entry = latest.current.entries.find(item => sameKey(item.id, id));
    if (!entry) return;
    const controller = new AbortController();
    void fetchPdfExtraction(entry.jobId, true, controller.signal).then(job => {
      if (controller.signal.aborted) return;
      cache.current.set(entry.jobId, { job, signature: entry.matchStatus, at: Date.now(), refresh: refreshKey });
      setJobs(current => ({ ...current, [entry.jobId]: job }));
    }).catch(cause => {
      if (controller.signal.aborted) return;
      if (isUnauthorized(cause)) latest.current.onUnauthorized();
      setError("지원자 정보를 불러오지 못했습니다. 다시 불러와 주세요.");
    });
    return () => controller.abort();
  }, [refreshKey]);
  useEffect(() => {
    // Single review fetches only the applicant being viewed. Card/table retain bounded prefetching.
    if (single) return;
    const controller = new AbortController();
    const pending = latest.current.entries.filter(entry => {
      const cached = cache.current.get(entry.jobId);
      return !cached || cached.signature !== entry.matchStatus || cached.refresh !== refreshKey || Date.now() - cached.at > 300_000;
    });
    let cursor = 0;
    async function worker() {
      while (!controller.signal.aborted && cursor < pending.length) {
        const entry = pending[cursor++];
        try {
          const job = await fetchPdfExtraction(entry.jobId, true, controller.signal);
          if (controller.signal.aborted) return;
          cache.current.set(entry.jobId, { job, signature: entry.matchStatus, at: Date.now(), refresh: refreshKey });
          setJobs(current => ({ ...current, [entry.jobId]: job }));
        } catch (cause) {
          if (controller.signal.aborted) return;
          if (isUnauthorized(cause)) latest.current.onUnauthorized();
          setError("일부 사진·정보를 불러오지 못했습니다. 다시 불러와 주세요.");
        }
      }
    }
    if (pending.length) {
      setError("");
      void Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker));
    }
    return () => controller.abort();
  }, [signature, refreshKey, loadAttempt, single]);
  const rows = entries.map(entry => screeningApplicant(review, entry, jobs[entry.jobId]));
  const entryFor = (id: string) => latest.current.review.entries.find(entry => sameKey(entry.id, id));
  const save = async (id: SubmissionId, status: ReviewStatus, note?: string) => {
    if (savingRef.current) return null;
    const entry = entryFor(id); if (!entry) return null;
    savingRef.current = true; setSaving(true); setError(""); setSavedMessage("");
    try {
      const updated = await updatePdfReviewEntry(review.id, entry.id, { decision: status === "ETC" ? "HOLD" : status, memo: note ?? entry.memo ?? "" });
      onSaved(updated); onDirtyChange(false); setSavedMessage("저장했습니다.");
      const next = latest.current.entries.map(item => sameKey(item.id, updated.id) ? updated : item)
        .filter(item => matchesDecision(item, decision));
      if (focused && !next.some(item => sameKey(item.id, focused))) setFocused(null);
      return { applicants: next.map(item => screeningApplicant(review, item, jobs[item.jobId])) };
    } catch (cause) {
      if (isUnauthorized(cause)) onUnauthorized();
      setError(cause instanceof Error ? cause.message : "저장하지 못했습니다. 다시 시도해 주세요."); return null;
    } finally { savingRef.current = false; setSaving(false); }
  };
  const patch = async (id: SubmissionId, change: { note?: string }) => {
    const entry = entryFor(id); if (entry) await save(id, entry.decision === "HOLD" ? "ETC" : entry.decision, change.note);
  };
  const noteDirty = useCallback((dirty: boolean) => onDirtyChange(dirty), [onDirtyChange]);
  function openAssignment(ids: readonly SubmissionId[]) { navigate(() => { setTargets(ids); setRole(String(entryFor(ids[0])?.roleId ?? "")); setError(""); }); }
  async function assign(event: React.FormEvent) {
    event.preventDefault(); if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setError("");
    try { const changed = await assignPdfReviewRoles(review.id, targets, role || null); changed.forEach(onSaved); setTargets([]); setSelected(new Set()); }
    catch (cause) { if (isUnauthorized(cause)) onUnauthorized(); setError(cause instanceof Error ? cause.message : "배역을 저장하지 못했습니다."); }
    finally { savingRef.current = false; setSaving(false); }
  }
  const allEntries = review.entries;
  const done = allEntries.filter(entry => entry.decision !== "PENDING").length;
  const counts = { all: allEntries.length, pending: allEntries.length - done, done,
    pass: allEntries.filter(entry => entry.decision === "PASS").length,
    fail: allEntries.filter(entry => entry.decision === "FAIL").length,
    etc: allEntries.filter(entry => entry.decision === "HOLD").length };
  return <BoardProvider value={{ source: { kind: "PDF" }, board: { role: { id: roleId(String(review.id)), postingId: postingId(String(review.id)), name: "PDF 지원자", description: "", quota: 0, gender: "ANY", ageMin: 0, ageMax: 0, applicantCount: allEntries.length, activeRound: 1, allRoundsClosed: false, counts, progress: { done, total: allEntries.length, percent: allEntries.length ? Math.round(done / allEntries.length * 100) : 0 } } },
    filters: { work: decision === "PENDING" ? "PENDING" : "DONE" }, selected, saving, reviewLocked: false,
    toggleSelected: id => setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }),
    openApplicant: id => navigate(() => setFocused(id)), assignRoles: openAssignment, requestNavigation: navigate, onNoteDirty: noteDirty,
    onApplicantViewed: refreshApplicant,
    onApplicantOpened,
    applicantRefreshKey: `${refreshKey}:${loadAttempt}:${signature}`,
    reviewFocused: (id, status, _memo, note) => save(id, status, note), patchReview: patch,
    renderDocument: applicant => { const entry = entryFor(applicant.id); return entry ? <ReviewOriginalDocument key={entry.jobId} jobId={entry.jobId} onUnauthorized={onUnauthorized} /> : null; },
  }}>
    {error && <div role="alert" className="mb-3 rounded-control bg-fail-bg p-3 text-sm text-fail"><p>{error}</p><SecondaryButton onClick={() => setLoadAttempt(value => value + 1)} className="mt-2">사진·정보 다시 불러오기</SecondaryButton></div>}
    {!single && !error && entries.some(entry => !jobs[entry.jobId]) && <p role="status" className="sr-only">사진과 프로필을 불러오는 중입니다.</p>}
    <p role="status" className="sr-only">{saving ? "저장 중…" : savedMessage}</p>
    {view === "single" || focused ? <ApplicantFocusReview key={focused ?? "single"} rows={rows} initialId={focused ?? undefined} onBack={focused ? () => navigate(() => setFocused(null)) : undefined} /> : <>
      <div className="mb-3 flex min-h-11 items-center gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={rows.length > 0 && rows.every(row => selected.has(row.id))} onChange={event => setSelected(new Set(event.target.checked ? rows.map(row => row.id) : []))} />전체 선택</label>
        <span>{selected.size}명 선택</span><SecondaryButton disabled={!selected.size || saving} onClick={() => openAssignment([...selected])}>배역 변경</SecondaryButton>
      </div>
      {view === "card" ? <ApplicantCards rows={rows} /> : <ApplicantTable rows={rows} />}
    </>}
    <ModalShell open={targets.length > 0} onClose={() => { if (!saving) setTargets([]); }} labelledBy="assign-role-title" className={styles.roleModal}>
      <form onSubmit={event => void assign(event)}><h2 id="assign-role-title">{targets.length}명 배역 변경</h2><p>선택한 배역으로 분류합니다. 심사 결과와 메모는 유지됩니다.</p>
        <label htmlFor="assignment-role">심사할 배역</label><select id="assignment-role" value={role} onChange={event => setRole(event.target.value)}><option value="">미기재</option>{review.roles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        {error && <p role="alert" className="text-fail">{error}</p>}<div className={styles.modalActions}><button type="button" disabled={saving} onClick={() => setTargets([])}>취소</button><button type="submit" disabled={saving} className="bg-brand text-white">{saving ? "저장 중…" : "배역 저장"}</button></div>
      </form>
    </ModalShell>
  </BoardProvider>;
}
