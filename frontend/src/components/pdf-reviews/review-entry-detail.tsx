"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ModalShell } from "@/components/auditions/modal-shell";
import { PdfOriginalViewer } from "@/components/pdf-extractions/pdf-original-viewer";
import { FieldTextarea, SecondaryButton } from "@/components/ui/controls";
import { fetchPdfExtraction } from "@/features/pdf-extractions/api";
import type { PdfExtractionJob } from "@/features/pdf-extractions/types";
import { assignPdfReviewRoles, isUnauthorized, updatePdfReviewEntry } from "@/features/pdf-reviews/api";
import { displayAge } from "@/features/pdf-reviews/profile-display";
import { decisionLabels, matchStatusLabels, sameKey, type ReviewDecision, type ReviewDetail, type ReviewEntry } from "@/features/pdf-reviews/types";
import { PdfCareerList } from "./career-list";

type Props = {
  readonly review: ReviewDetail;
  readonly entry: ReviewEntry;
  readonly refreshKey: number;
  readonly onSaved: (entry: ReviewEntry) => void;
  readonly onUnauthorized: () => void;
  readonly onDirtyChange: (dirty: boolean) => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
  readonly position: string;
};

export function ReviewEntryDetail({ review, entry, refreshKey, onSaved, onUnauthorized, onDirtyChange,
  onPrevious, onNext, hasPrevious, hasNext, position }: Props) {
  const id = useId();
  const photoArea = useRef<HTMLDivElement>(null);
  const [photoHeight, setPhotoHeight] = useState(360);
  const [job, setJob] = useState<PdfExtractionJob | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [photo, setPhoto] = useState(0);
  const [modal, setModal] = useState<"pdf" | "photo" | null>(null);
  const [memo, setMemo] = useState(entry.memo ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [changingRole, setChangingRole] = useState(false);
  useEffect(() => {
    const resize = () => {
      const top = (photoArea.current?.getBoundingClientRect().top ?? 320) + window.scrollY;
      setPhotoHeight(window.innerWidth >= 1024 ? Math.max(220, Math.min(660, window.innerHeight - top - 130)) : 360);
    };
    const frame = requestAnimationFrame(resize);
    const observer = new ResizeObserver(resize);
    if (photoArea.current?.parentElement) observer.observe(photoArea.current.parentElement);
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", resize); };
  }, [changingRole]);

  const role = entry.matchStatus === "MATCHED" ? review.roles.find(item => sameKey(item.id, entry.roleId))?.name : undefined;
  const dirty = memo !== (entry.memo ?? "");
  useEffect(() => { onDirtyChange(dirty || saving); return () => onDirtyChange(false); }, [dirty, saving, onDirtyChange]);
  useEffect(() => {
    const controller = new AbortController();
    fetchPdfExtraction(entry.jobId, true, controller.signal)
      .then(next => { if (!controller.signal.aborted) { setJob(next); setError(""); } })
      .catch(cause => {
        if (controller.signal.aborted) return;
        if (isUnauthorized(cause)) onUnauthorized();
        setError(cause instanceof Error ? cause.message : "원본과 추출 결과를 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, [entry.jobId, entry.matchStatus, refreshKey, retry, onUnauthorized]);

  async function save(decision: ReviewDecision) {
    if (saving) return;
    setSaving(true); setSaveMessage(""); setError("");
    try {
      onSaved(await updatePdfReviewEntry(review.id, entry.id, { memo, decision }));
      setSaveMessage(`${decisionLabels[decision]} · 저장했습니다.`);
    } catch (cause) {
      if (isUnauthorized(cause)) onUnauthorized();
      setError(cause instanceof Error ? cause.message : "저장하지 못했습니다. 다시 시도해 주세요.");
    } finally { setSaving(false); }
  }
  async function assignRole(value: string) {
    if (saving) return;
    setSaving(true); setError("");
    try {
      const [updated] = await assignPdfReviewRoles(review.id, [entry.id], value || null);
      onSaved(updated); setChangingRole(false);
    } catch (cause) {
      if (isUnauthorized(cause)) onUnauthorized();
      setError(cause instanceof Error ? cause.message : "배역을 변경하지 못했습니다.");
    } finally { setSaving(false); }
  }
  const result = job?.result;
  const profile = result?.applicantInfo?.status === "COMPLETED" ? result.applicantInfo.profile : null;
  const images = (result?.pages.flatMap(page => page.images) ?? []).filter(image => image.classification === "CANDIDATE" && image.url);
  const current = images[Math.min(photo, Math.max(0, images.length - 1))];
  const careers = (profile?.careers ?? []).map(career => ({ text: career.evidence,
    title: [career.title, career.venue].filter(Boolean).join(" / "), part: career.part ?? undefined,
    genre: career.genre ?? undefined, period: career.period ?? undefined, company: career.company ?? undefined }));
  const openPdf = () => setModal("pdf");
  const photoNav = images.length > 1 ? <div className="flex items-center justify-center gap-4 py-2">
    <button type="button" aria-label="이전 사진" className="min-h-10 min-w-10 rounded-full border border-border" onClick={() => setPhoto(value => (value + images.length - 1) % images.length)}>‹</button>
    <span className="num text-sm text-muted-strong">{photo + 1} / {images.length}</span>
    <button type="button" aria-label="다음 사진" className="min-h-10 min-w-10 rounded-full border border-border" onClick={() => setPhoto(value => (value + 1) % images.length)}>›</button>
  </div> : null;

  return <section aria-label="지원자 심사" className="min-w-0">
    <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold">{entry.applicantName || "이름 미확인"} <span className="ml-2 rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted-strong">{decisionLabels[entry.decision]}</span></h2>
        <p className="mt-1 text-sm text-muted-strong">{role ?? matchStatusLabels[entry.matchStatus]} · {position}</p></div>
      <div className="flex flex-wrap gap-2">
        <SecondaryButton disabled={saving} onClick={() => setChangingRole(value => !value)}>배역 변경</SecondaryButton>
        <SecondaryButton onClick={openPdf} disabled={!job?.sourceUrl}>원문 PDF 보기</SecondaryButton>
      </div>
    </header>
    {changingRole ? <label className="mb-3 flex flex-wrap items-center gap-3 rounded-control bg-surface p-3 text-sm">지원 배역
      <select aria-label="변경할 배역" value={entry.roleId ?? ""} disabled={saving} className="min-h-11 rounded-control border border-border bg-card px-3" onChange={event => void assignRole(event.target.value)}>
        <option value="">미기재</option>{review.roles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label> : null}
    {error ? <div role="alert" className="mb-3 rounded-control bg-fail-bg p-3 text-sm text-fail">{error} <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>다시 확인</button></div> : null}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <div className="min-w-0">
        <div ref={photoArea} className="flex justify-center">
          {current ? <button type="button" aria-label="지원자 사진 크게 보기" onClick={() => setModal("photo")} className="block max-w-full overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-brand">
            {/* Signed private image URLs are already bounded by the extraction worker. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt="지원서에서 추출한 사진" style={{ height: photoHeight }} className="max-w-full object-contain" />
          </button> : <div style={{ height: photoHeight }} className="flex w-full max-w-sm flex-col items-center justify-center rounded-2xl bg-surface p-6 text-center">
            <p className="text-sm leading-6 text-muted-strong">{!job || entry.matchStatus === "WAITING" ? "지원서를 정리하고 있습니다." : "사진을 자동으로 확인하지 못했습니다."}</p>
            <SecondaryButton onClick={openPdf} disabled={!job?.sourceUrl} className="mt-4">원문 PDF에서 확인</SecondaryButton>
          </div>}
        </div>
        {photoNav}
        <div className="mt-3 flex items-start justify-center gap-2 sm:gap-4" aria-label="심사 결정">
          <button type="button" disabled={!hasPrevious || saving} onClick={onPrevious} className="min-h-12 rounded-full border border-border px-4 text-sm disabled:opacity-30">← 이전</button>
          <button type="button" disabled={saving} aria-pressed={entry.decision === "FAIL"} onClick={() => void save("FAIL")} className="min-h-12 rounded-full border-2 border-red-200 px-3 sm:px-6 font-bold text-red-600 hover:bg-red-50 disabled:opacity-40">✕ 불합격</button>
          <button type="button" disabled={saving} aria-pressed={entry.decision === "PASS"} onClick={() => void save("PASS")} className="min-h-12 rounded-full border-2 border-green-200 px-3 sm:px-6 font-bold text-green-700 hover:bg-green-50 disabled:opacity-40">○ 합격</button>
          <button type="button" disabled={!hasNext || saving} onClick={onNext} className="min-h-12 rounded-full border border-border px-4 text-sm disabled:opacity-30">다음 →</button>
        </div>
        <p role="status" className="mt-2 min-h-5 text-center text-xs text-muted-strong">{saving ? "저장 중…" : saveMessage}</p>
      </div>
      <aside aria-label="기본정보와 경력" className="min-w-0 rounded-2xl border border-border bg-card p-5 lg:max-h-[calc(100dvh-290px)] lg:overflow-y-auto">
        <dl className="divide-y divide-border text-sm">
          {[["나이", displayAge(profile)], ["키", profile?.height.value || "미확인"], ["학력", profile?.education.value || "미확인"]].map(([label, value]) => <div key={label} className="grid grid-cols-[50px_minmax(0,1fr)] gap-3 py-3 first:pt-0"><dt className="text-muted-strong">{label}</dt><dd className="whitespace-pre-line break-words font-medium">{value}</dd></div>)}
        </dl>
        <h3 className="mb-3 mt-5 text-sm font-semibold text-muted-strong">경력 {careers.length ? `${careers.length}건` : "미확인"}</h3>
        {careers.length ? <PdfCareerList careers={careers} /> : <button type="button" disabled={!job?.sourceUrl} onClick={openPdf} className="text-sm text-brand underline">원문 PDF에서 확인</button>}
        <label htmlFor={`${id}-memo`} className="mb-2 mt-6 block text-sm font-semibold text-muted-strong">내부 메모</label>
        <FieldTextarea id={`${id}-memo`} value={memo} maxLength={2000} rows={3} onChange={event => setMemo(event.target.value)} placeholder="심사 메모를 남겨 주세요" />
        <SecondaryButton disabled={!dirty || saving} onClick={() => void save(entry.decision)} className="mt-2 w-full">메모 저장</SecondaryButton>
        {dirty ? <p className="mt-2 text-xs text-muted-strong">아직 저장하지 않은 메모가 있습니다.</p> : null}
      </aside>
    </div>
    <ModalShell open={modal !== null} onClose={() => setModal(null)} labelledBy={`${id}-modal`} className="flex h-[96dvh] w-[96vw] max-w-[1400px] flex-col overflow-hidden rounded-2xl bg-card p-3 shadow-xl">
      <header className="mb-2 flex items-center justify-between gap-3"><h2 id={`${id}-modal`} className="truncate font-bold">{modal === "pdf" ? entry.originalFilename : "지원자 사진"}</h2><SecondaryButton onClick={() => setModal(null)}>닫기</SecondaryButton></header>
      {modal === "pdf" && job?.sourceUrl ? <PdfOriginalViewer url={job.sourceUrl} filename={entry.originalFilename} /> : null}
      {modal === "photo" && current ? <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt="지원서 사진 크게 보기" className="min-h-0 flex-1 object-contain" />{photoNav}
      </div> : null}
    </ModalShell>
  </section>;
}
