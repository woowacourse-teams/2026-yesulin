"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { applicantEducationText } from "@/features/auditions/education-text";
import { featuredCareers } from "@/features/auditions/featured-careers";
import { ageText, genderText } from "@/features/auditions/labels";
import { safeExternalUrl } from "@/features/auditions/safe-external-url";
import type { Applicant, ReviewStatus } from "@/features/auditions/types";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { useBoard } from "./board-context";
import { DetailGallery } from "./detail-gallery";
import { StatusBadge } from "./status-badge";

/**
 * 목록의 필터 결과 안에서 한 지원자에게만 집중하는 심사 화면이다.
 * 저장 응답의 목록을 기준으로 다음 대상을 정해, 서버 필터와 화면 순서가 어긋나지 않게 한다.
 */
export function ApplicantFocusReview({ rows }: { readonly rows: readonly Applicant[] }) {
  const [activeId, setActiveId] = useState(rows[0]?.id ?? null);
  const applicant = rows.find((candidate) => candidate.id === activeId) ?? rows[0] ?? null;
  const moveTo = useCallback((candidate: Applicant | undefined) => {
    if (candidate) setActiveId(candidate.id);
  }, []);

  if (!applicant) return null;

  const index = rows.findIndex((candidate) => candidate.id === applicant.id);
  return (
    <FocusReviewContent
      key={applicant.id}
      applicant={applicant}
      rows={rows}
      index={index}
      previous={index > 0 ? rows[index - 1] : undefined}
      next={index >= 0 ? rows[index + 1] : undefined}
      onMove={moveTo}
    />
  );
}

function FocusReviewContent({
  applicant,
  rows,
  index,
  previous,
  next,
  onMove,
}: {
  readonly applicant: Applicant;
  readonly rows: readonly Applicant[];
  readonly index: number;
  readonly previous: Applicant | undefined;
  readonly next: Applicant | undefined;
  readonly onMove: (candidate: Applicant | undefined) => void;
}) {
  const { filters, saving, reviewLocked, reviewFocused, patchReview, openApplicant } = useBoard();
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherReason, setOtherReason] = useState(
    applicant.review.status === "ETC" ? applicant.review.memo : "",
  );
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(applicant.review.note);

  const moveAfterSaving = useCallback((nextRows: readonly Applicant[]) => {
    if (nextRows.length === 0) return;
    onMove(nextRows[Math.min(Math.max(index, 0), nextRows.length - 1)]);
  }, [index, onMove]);

  const saveDecision = useCallback(async (status: ReviewStatus, memo?: string) => {
    if (reviewLocked) return;
    const nextBoard = await reviewFocused(applicant.id, status, memo);
    if (!nextBoard) return;

    // 검토 대기 목록에서는 결과를 저장한 지원자가 빠지므로 같은 자리의 다음 사람을 연다.
    if (filters.work === "PENDING") moveAfterSaving(nextBoard.applicants);
  }, [applicant, filters.work, moveAfterSaving, reviewFocused, reviewLocked]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable)
      ) return;
      if (event.key.toLowerCase() === "a" && applicant && !saving && !reviewLocked) {
        event.preventDefault();
        void saveDecision("PASS");
      }
      if (event.key.toLowerCase() === "n" && next) {
        event.preventDefault();
        onMove(next);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applicant, next, onMove, saveDecision, saving, reviewLocked]);

  const careers = featuredCareers(applicant.career);
  const links = applicant.links
    .map((link) => ({ original: link, safe: safeExternalUrl(link) }))
    .filter((link): link is { readonly original: string; readonly safe: string } => link.safe !== null);
  const canPass = !reviewLocked && applicant.review.status !== "PASS";

  return (
    <section aria-label="한 명씩 심사" className="mx-auto max-w-6xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-card px-4 py-3">
        <div>
          <h2 className="text-base font-bold text-foreground">한 명씩 심사</h2>
          <p className="mt-0.5 text-xs text-muted">
            <span className="num">{index + 1} / {rows.length}</span>명 · <kbd className="rounded border border-border bg-surface px-1 py-0.5 font-sans text-[11px]">A</kbd> 합격 · <kbd className="rounded border border-border bg-surface px-1 py-0.5 font-sans text-[11px]">N</kbd> 다음
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={applicant.review.status} memo={applicant.review.memo} />
          <SecondaryButton onClick={() => openApplicant(applicant.id)} className="min-h-10 px-3 text-xs">
            상세 지원서 보기
          </SecondaryButton>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <div className="overflow-hidden rounded-card border border-border bg-card">
          <DetailGallery applicant={applicant} layout="review" className="border-b border-border" />
          <div className="p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand">{applicant.roleName} 지원</p>
                <h3 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-foreground">{applicant.name}</h3>
                <p className="num mt-2 text-sm text-muted-strong">
                  {genderText(applicant.gender)} · {ageText(applicant.age)} · {measurementText(applicant.height, "cm")}
                </p>
              </div>
              {applicant.mismatchReasons.length > 0 ? (
                <span className="rounded-full border border-fail/30 bg-fail-bg px-2.5 py-1 text-xs font-semibold text-fail">배역 조건 불일치</span>
              ) : null}
            </div>

            <FocusSection title="학력">
              <p className="text-sm text-muted-strong">{applicantEducationText(applicant)}</p>
            </FocusSection>

            <FocusSection title="주요 경력">
              {careers.length === 0 ? <p className="text-sm text-muted">등록한 경력이 없습니다.</p> : (
                <ul className="space-y-2">
                  {careers.map((career) => <li key={`${career.year}-${career.title}-${career.part}`} className="flex gap-3 text-sm"><span className="num shrink-0 text-muted">{career.year}</span><span className="min-w-0"><strong className="font-semibold text-foreground">{career.title}</strong><span className="text-muted"> · {career.part}</span></span></li>)}
                </ul>
              )}
            </FocusSection>

            <FocusSection title="SNS">
              {links.length === 0 ? <p className="text-sm text-muted">등록한 SNS 링크가 없습니다.</p> : (
                <ul className="flex flex-wrap gap-2">
                  {links.map(({ original, safe }) => <li key={original}><a href={safe} target="_blank" rel="noreferrer" className="inline-flex min-h-10 max-w-64 items-center truncate rounded-control border border-brand-line bg-brand-soft px-3 text-sm font-semibold text-brand hover:border-brand">{linkLabel(original)}</a></li>)}
                </ul>
              )}
            </FocusSection>
          </div>
        </div>

        <aside className="h-fit rounded-card border border-border bg-card p-5 xl:sticky xl:top-5">
          <h3 className="text-lg font-bold text-foreground">심사 결정</h3>
          <p className="mt-1 text-sm leading-6 text-muted">합격을 저장하면 다음 지원자로 자동 이동합니다.</p>

          {reviewLocked ? <p className="mt-4 rounded-control border border-border bg-surface px-3 py-2 text-sm text-muted">마감된 전형은 결과를 변경할 수 없습니다.</p> : (
            <>
              <PrimaryButton disabled={saving || !canPass} onClick={() => void saveDecision("PASS")} className="mt-5 w-full">
                {applicant.review.status === "PASS" ? "합격 처리됨" : saving ? "저장 중…" : "합격 · 다음 지원자"}
              </PrimaryButton>
              <SecondaryButton disabled={saving || !next} onClick={() => onMove(next)} className="mt-2 w-full">
                다음 지원자 {next ? "→" : "없음"}
              </SecondaryButton>

              {filters.work === "DONE" ? (
                <SecondaryButton disabled={saving} onClick={() => void saveDecision("PENDING")} className="mt-4 w-full text-muted-strong">
                  검토 대기로 되돌리기
                </SecondaryButton>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border-soft pt-4">
                  <SecondaryButton disabled={saving} onClick={() => void saveDecision("FAIL")} className="text-fail hover:border-fail/40 hover:bg-fail-bg">불합격</SecondaryButton>
                  <SecondaryButton disabled={saving} onClick={() => setOtherOpen((open) => !open)} className="text-etc hover:border-etc/40 hover:bg-etc-bg">기타</SecondaryButton>
                </div>
              )}
            </>
          )}

          {otherOpen && !reviewLocked ? (
            <form onSubmit={(event) => { event.preventDefault(); const memo = otherReason.trim(); if (memo) void saveDecision("ETC", memo); }} className="mt-3 rounded-control border border-etc/30 bg-etc-bg p-3">
              <label className="block text-sm font-semibold text-etc">기타 사유<input autoFocus required maxLength={255} value={otherReason} onChange={(event) => setOtherReason(event.target.value)} placeholder="예: 다른 배역으로 검토" className="mt-2 min-h-11 w-full rounded-control border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-etc focus:ring-2 focus:ring-etc-bg" /></label>
              <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setOtherOpen(false)} className="min-h-10 px-3 text-sm font-semibold text-muted">취소</button><button type="submit" disabled={saving || !otherReason.trim()} className="min-h-10 rounded-control border border-etc bg-card px-3 text-sm font-semibold text-etc disabled:opacity-50">기타로 저장</button></div>
            </form>
          ) : null}

          <div className="mt-4 border-t border-border-soft pt-4">
            <button type="button" onClick={() => setNoteOpen((open) => !open)} className="min-h-10 text-sm font-semibold text-muted-strong hover:text-brand">
              {noteOpen ? "내부 메모 닫기" : "내부 메모 남기기"}
            </button>
            {noteOpen ? <div className="mt-2"><textarea disabled={reviewLocked} value={note} onChange={(event) => setNote(event.target.value)} maxLength={255} placeholder="예: 발성 좋음, 앙상블로도 고려 가능" className="min-h-24 w-full resize-none rounded-control border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:bg-surface" /><SecondaryButton disabled={reviewLocked || saving || note === applicant.review.note} onClick={() => void patchReview(applicant.id, { note })} className="mt-2 min-h-10 w-full">메모 저장</SecondaryButton></div> : null}
          </div>

          <nav aria-label="한 명씩 심사 이동" className="mt-4 flex gap-2 border-t border-border-soft pt-4">
            <SecondaryButton disabled={!previous} onClick={() => onMove(previous)} className="min-h-10 flex-1 px-3 text-sm">← 이전</SecondaryButton>
            <SecondaryButton disabled={!next} onClick={() => onMove(next)} className="min-h-10 flex-1 px-3 text-sm">다음 →</SecondaryButton>
          </nav>
        </aside>
      </div>
    </section>
  );
}

function FocusSection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <section className="mt-6 border-t border-border-soft pt-5"><h4 className="mb-2 text-sm font-bold text-foreground">{title}</h4>{children}</section>;
}

function measurementText(value: number | null, unit: string) {
  return value === null ? `${unit} 미수집` : `${value}${unit}`;
}

function linkLabel(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}
