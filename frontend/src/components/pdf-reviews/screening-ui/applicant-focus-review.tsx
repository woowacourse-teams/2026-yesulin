"use client";

import { startReviewTimer } from "@/features/analytics/review-timer";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { applicantEducationText } from "@/features/auditions/education-text";
import { orderedCareersByRecency } from "@/features/auditions/featured-careers";
import { selectGalleryIndex } from "@/features/auditions/gallery-navigation";
import { ageText, genderText } from "@/features/auditions/labels";
import { safeExternalUrl } from "@/features/auditions/safe-external-url";
import type { Applicant, ReviewStatus } from "@/features/pdf-reviews/screening-types";
import { SecondaryButton } from "@/components/ui/controls";
import { ApplicantPhotoImage } from "./applicant-photo";
import { useBoard } from "./board-context";
import { ModalShell } from "@/components/auditions/modal-shell";
import { PhotoLightbox } from "./photo-lightbox";
import { ZoomablePhoto } from "./zoomable-photo";
import { PdfCareerList } from "@/components/pdf-reviews/career-list";
import { ScreeningReferencePanel } from "./screening-reference-panel";
import { StatusBadge } from "@/components/auditions/status-badge";
import { ApplicantSocialLinks } from "./applicant-social-links";
import styles from "../screening.module.css";

/**
 * 목록의 필터 결과 안에서 한 지원자에게만 집중하는 심사 화면이다.
 * 저장 응답의 목록을 기준으로 다음 대상을 정해, 서버 필터와 화면 순서가 어긋나지 않게 한다.
 */
export function ApplicantFocusReview({ rows, onBack, initialId }: { readonly rows: readonly Applicant[]; readonly onBack?: () => void; readonly initialId?: string }) {
  const [activeId, setActiveId] = useState(initialId ?? rows[0]?.id ?? null);
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
      onBack={onBack}
      onMove={moveTo}
    />
  );
}

/**
 * PDF 심사는 사진을 충분히 크게 표시하고 판정 버튼을 바로 아래에 둔다.
 * 일반 지원서는 화면에 맞춘 높이 안에서 사진과 정보를 배치한다.
 */
function FocusReviewContent({
  applicant,
  rows,
  index,
  previous,
  next,
  onMove,
  onBack,
}: {
  readonly applicant: Applicant;
  readonly rows: readonly Applicant[];
  readonly index: number;
  readonly previous: Applicant | undefined;
  readonly next: Applicant | undefined;
  readonly onBack?: () => void;
  readonly onMove: (candidate: Applicant | undefined) => void;
}) {
  const { board, assignRoles, confirmNavigation, requestNavigation, source, renderDocument, renderProfile, onNoteDirty, onApplicantViewed, onApplicantOpened, applicantRefreshKey, filters, saving, reviewLocked, reviewFocused, patchReview, openApplicant } = useBoard();
  useEffect(() => onApplicantViewed?.(applicant.id), [applicant.id, onApplicantViewed, applicantRefreshKey]);
  useEffect(() => onApplicantOpened?.(), [applicant.id, onApplicantOpened]);
  const [documentOpen, setDocumentOpen] = useState(false);
  const pdfProfile = source.kind === "PDF";
  useEffect(() => startReviewTimer({ workflow: "producer_pdf", review_id: String(board.role.id), item_id: String(applicant.id) }), [board.role.id, applicant.id]);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherReason, setOtherReason] = useState(
    applicant.review.status === "ETC" ? applicant.review.memo : "",
  );
  const [note, setNote] = useState(applicant.review.note);
  const noteRevision = useRef(applicant.review.revision);
  const navigate = useCallback((candidate: Applicant | undefined) => {
    if (requestNavigation) requestNavigation(() => onMove(candidate));
    else if (!confirmNavigation || confirmNavigation()) onMove(candidate);
  }, [confirmNavigation, requestNavigation, onMove]);
  useEffect(() => {
    onNoteDirty?.(note !== applicant.review.note);
    return () => onNoteDirty?.(false);
  }, [note, applicant.review.note, onNoteDirty]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const photoTrigger = useRef<"image" | "toolbar">("image");
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => { sectionRef.current?.focus({ preventScroll: true }); }, [applicant.id]);
  const focusHeight = useViewportFitHeight(sectionRef);

  const [photoAspect, setPhotoAspect] = useState<{ url: string; ratio: number } | null>(null);
  const photoCount = applicant.photos.length;
  const currentPhoto = selectGalleryIndex(photoIndex, photoCount);
  const photo = currentPhoto === null ? undefined : applicant.photos[currentPhoto];
  const aspect = photoAspect?.url === photo?.url ? photoAspect?.ratio ?? 3 / 4 : 3 / 4;

  const showPrevious = useCallback(() => setPhotoIndex((slot) => Math.max(0, slot - 1)), []);
  const showNext = useCallback(
    () => setPhotoIndex((slot) => Math.min(photoCount - 1, slot + 1)),
    [photoCount],
  );

  const moveAfterSaving = useCallback((nextRows: readonly Applicant[]) => {
    if (nextRows.length === 0) return;
    onMove(nextRows[Math.min(Math.max(index, 0), nextRows.length - 1)]);
  }, [index, onMove]);

  const saveDecision = useCallback(async (status: ReviewStatus, memo?: string) => {
    if (reviewLocked) return;
    const nextBoard = await reviewFocused(applicant.id, status, memo, note !== applicant.review.note ? note : undefined, note !== applicant.review.note ? noteRevision.current : undefined);
    if (!nextBoard) return;
    setOtherOpen(false);

    // 현재 분류에서 빠지면 같은 자리의 다음 사람으로 이동한다. 카드·표에서 연 경우도 유지한다.
    if (!nextBoard.applicants.some(candidate => candidate.id === applicant.id)) moveAfterSaving(nextBoard.applicants);
  }, [applicant, moveAfterSaving, reviewFocused, reviewLocked, note]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.repeat || event.isComposing) return;
      const target = event.target;
      if (document.querySelector('[role="dialog"][aria-modal="true"]') || (target instanceof HTMLElement && target.closest("[data-screening-reference]"))) return;
      if (
        target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable)
      ) return;
      const decidable = !saving && !reviewLocked;
      if (event.key.toLowerCase() === "a" && decidable) {
        event.preventDefault();
        void saveDecision("PASS");
      }
      if (event.key.toLowerCase() === "d" && decidable) {
        event.preventDefault();
        void saveDecision("FAIL");
      }
      if (event.key.toLowerCase() === "s" && decidable && pdfProfile) {
        event.preventDefault();
        void saveDecision("ETC");
      }
      if (event.key.toLowerCase() === "n" && next) {
        event.preventDefault();
        navigate(next);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevious();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, navigate, saveDecision, saving, reviewLocked, showPrevious, showNext, pdfProfile]);

  const careers = orderedCareersByRecency(applicant.career);
  const pdfCareers = applicant.sourceDocument?.careers ?? [];
  const careerCount = pdfProfile ? pdfCareers.length : careers.length;
  const links = applicant.links
    .map((link) => ({ original: link, safe: safeExternalUrl(link) }))
    .filter((link): link is { readonly original: string; readonly safe: string } => link.safe !== null);
  const decided = applicant.review.status !== "PENDING";
  const canDecide = !reviewLocked && !saving;

  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      aria-label={`${applicant.name} · 지원자 ${index + 1} / ${rows.length} 심사`}
      style={pdfProfile || focusHeight === null ? undefined : { height: `${focusHeight}px` }}
      className={`mx-auto flex w-full flex-col gap-3 ${pdfProfile ? styles.focusReview : "max-w-6xl"}`}
    >

      <div className={pdfProfile ? styles.focusGrid : "grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]"}>
        <div className={pdfProfile ? styles.photoColumn : "flex min-h-0 min-w-0 flex-col items-center gap-3"}>
          {pdfProfile && <div className={styles.applicantPosition}>
            {onBack && <button type="button" onClick={onBack} className="min-h-11 rounded-control px-3 text-sm font-semibold text-muted-strong">← 목록</button>}
            <span className="num">지원자 {index + 1} / {rows.length}</span>
          </div>}
          {/*
            썸네일을 사진 옆에 세워 두면 세로 높이를 사진이 그대로 쓴다.
            넓은 화면에서는 안쪽을 절대 배치로 채워 사진 높이가 남은 공간으로 확정되게 한다.
            그러지 않으면 사진의 가로세로비가 부모를 밀어 올려 화면 밖으로 넘친다.
          */}
          <div className={pdfProfile ? "relative flex w-full justify-center" : "relative min-h-0 w-full flex-1"}>
          <div style={pdfProfile ? { "--review-photo-aspect": aspect } as CSSProperties : undefined} className={pdfProfile ? styles.gallery : "flex w-full gap-3 flex-col items-center lg:absolute lg:inset-0 lg:flex-row lg:items-stretch lg:justify-center"}>
            {photoCount > 1 ? (
              <div className={pdfProfile ? styles.thumbnails : "scrollbar-hidden flex max-w-full shrink-0 gap-2 order-2 overflow-x-auto lg:order-1 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pr-0.5"}>
                {applicant.photos.map((candidate, slot) => (
                  <button
                    key={candidate.url}
                    type="button"
                    aria-pressed={slot === currentPhoto}
                    title={candidate.label}
                    onClick={() => setPhotoIndex(slot)}
                    className={`relative aspect-[3/4] shrink-0 overflow-hidden rounded-lg border-2 bg-border-soft transition-[border-color,box-shadow,transform] duration-150 active:scale-[0.97] ${pdfProfile ? "h-16 w-12 lg:h-auto lg:w-14" : "h-14 w-auto lg:h-auto lg:w-14"} ${
                      slot === currentPhoto
                        ? "border-brand shadow-[var(--shadow-selection-soft)]"
                        : "border-transparent hover:border-muted-soft"
                    }`}
                  >
                    <span className="sr-only">{candidate.label}</span>
                    <ApplicantPhotoImage photo={candidate} alt="" sizes="90px" className="object-cover object-[center_18%]" />
                  </button>
                ))}
              </div>
            ) : null}
            <div data-review-photo className={pdfProfile ? styles.photoFrame : "relative order-1 aspect-[3/4] w-full max-w-[340px] overflow-hidden rounded-card border border-border bg-border-soft lg:order-2 lg:h-full lg:max-h-[600px] lg:w-auto lg:max-w-full"}>
            {photo ? (
              <>
                {/* 휠로 바로 확대·이동하고, 누르면 전체 화면으로 연다. */}
                {pdfProfile ? <button type="button" aria-label="사진 크게 보기" onClick={() => { photoTrigger.current = "image"; setExpanded(true); }} className="relative block h-full w-full cursor-zoom-in"><ApplicantPhotoImage photo={photo} alt={`${applicant.name} ${photo.label}`} sizes="(min-width: 1024px) 65vw, 94vw" className="object-contain" priority onLoad={event => {
                  const image = event.currentTarget;
                  if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                    const ratio = image.naturalWidth / image.naturalHeight;
                    setPhotoAspect(current => current?.url === photo.url && current.ratio === ratio ? current : { url: photo.url, ratio });
                  }
                }} /></button> : <ZoomablePhoto
                  key={currentPhoto}
                  photo={photo}
                  alt={`${applicant.name} ${photo.label}`}
                  sizes="(min-width: 1024px) 65vw, 94vw"
                  className={pdfProfile ? "object-contain" : "object-cover object-[center_18%]"}
                  controlsOutside={pdfProfile}
                  priority
                  onActivate={() => { photoTrigger.current = document.activeElement?.hasAttribute("data-photo-expand") ? "toolbar" : "image"; setExpanded(true); }}
                />}
                <span className="num pointer-events-none absolute right-3 top-3 z-2 rounded-full bg-foreground/70 px-2.5 py-1 text-xs font-semibold text-white">
                  {(currentPhoto ?? 0) + 1} / {photoCount}
                </span>
                {/* 머리말을 없앤 대신 이름·배역·상태·순서를 사진 위에 얹어 높이를 쓰지 않는다. */}
                {!pdfProfile && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-2 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-3 pt-12 text-white">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-xl font-bold tracking-[-0.02em]">{applicant.name}</p>
                      <span className="text-sm font-semibold text-white/85">{applicant.roleName}</span>
                      <StatusBadge status={applicant.review.status} memo={applicant.review.memo} size="sm" onPhoto />
                      {applicant.mismatchReasons.length > 0 ? (
                        <span className="rounded-full bg-white/92 px-2 py-0.5 text-xs font-bold text-fail">배역 조건 불일치</span>
                      ) : null}
                    </div>
                    <p className="num mt-1 text-sm text-white/85">
                      {pdfProfile && applicant.gender === null ? "성별 미확인" : genderText(applicant.gender)} · {pdfProfile && applicant.age === null ? "나이 미확인" : ageText(applicant.age)} · {pdfProfile && applicant.height === null ? "키 미확인" : measurementText(applicant.height, "cm")}
                    </p>
                  </div>
                  <span className="num shrink-0 rounded-full bg-white/92 px-2.5 py-1 text-sm font-bold leading-none text-foreground">
                    {index + 1}<span className="text-muted"> / {rows.length}</span>
                  </span>
                </div>}
                {photoCount > 1 ? (
                  <>
                    <GalleryArrow label="이전 사진" direction="left" disabled={currentPhoto === 0} onClick={showPrevious} />
                    <GalleryArrow label="다음 사진" direction="right" disabled={currentPhoto === photoCount - 1} onClick={showNext} />
                  </>
                ) : null}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-3 text-center text-sm text-muted">
                {pdfProfile ? <>
                  <p className="font-semibold text-muted-strong">사진을 자동으로 확인하지 못했습니다</p>
                  <p className="text-xs leading-5">원문 PDF에서 사진을 확인해 주세요.</p>
                  {renderDocument && <SecondaryButton onClick={() => setDocumentOpen(true)} className="shrink-0 whitespace-nowrap">원본 PDF 보기</SecondaryButton>}
                </> : "제출된 사진이 없습니다."}
              </div>
            )}
            </div>
          </div>
          </div>

          {reviewLocked ? (
            <p className="shrink-0 rounded-control border border-border bg-surface px-3 py-2 text-sm text-muted">
              마감된 전형은 결과를 변경할 수 없습니다.
            </p>
          ) : (
            <div data-review-actions role="group" aria-label="지원자 심사 판정" className={pdfProfile ? styles.photoActions : "shrink-0"}>
              <div className="flex shrink-0 items-start justify-center gap-2 max-[360px]:gap-1 sm:gap-3">
              <FocusAction caption="이전" label="이전 지원자" tone="neutral" size="sm" disabled={!previous} onClick={() => navigate(previous)}>
                <UndoIcon />
              </FocusAction>
              <FocusAction
                caption="불합격"
                label={filters.work === "DONE" ? "불합격으로 변경" : "불합격"}
                hint="D"
                tone="fail"
                size="lg"
                active={applicant.review.status === "FAIL"}
                disabled={!canDecide}
                onClick={() => void saveDecision("FAIL")}
              >
                <CrossIcon />
              </FocusAction>
              {pdfProfile && <FocusAction caption="보류" label="보류" hint="S" tone="etc" size="lg"
                active={applicant.review.status === "ETC"} disabled={!canDecide}
                onClick={() => void saveDecision("ETC")}><TriangleIcon /></FocusAction>}
              <FocusAction
                caption="합격"
                label={applicant.review.status === "PASS" ? "합격 처리됨" : "합격"}
                hint="A"
                tone="pass"
                size="lg"
                active={applicant.review.status === "PASS"}
                disabled={!canDecide || applicant.review.status === "PASS"}
                onClick={() => void saveDecision("PASS")}
              >
                <CircleIcon />
              </FocusAction>
              {!pdfProfile && <>
              <FocusAction
                caption="보류"
                label="보류 사유로 처리"
                tone="etc"
                active={applicant.review.status === "ETC"}
                disabled={!canDecide}
                onClick={() => setOtherOpen((open) => !open)}
              >
                <EllipsisIcon />
              </FocusAction>
              </>}
              <FocusAction caption="다음" label="다음 지원자" hint="N" tone="neutral" size="sm" disabled={!next} onClick={() => navigate(next)}>
                <ArrowRightIcon />
              </FocusAction>
              </div>
            </div>
          )}

          {!pdfProfile && otherOpen && !reviewLocked ? (
            <ReviewReasonPanel modal={pdfProfile} onClose={() => setOtherOpen(false)}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const memo = otherReason.trim();
                if (memo) void saveDecision("ETC", memo);
              }}
              className="w-full shrink-0 rounded-control border border-etc/30 bg-etc-bg p-3"
            >
              <label className="block text-sm font-semibold text-etc">
                보류 사유
                <input
                  autoFocus={!pdfProfile}
                  data-autofocus="true"
                  required
                  maxLength={255}
                  value={otherReason}
                  onChange={(event) => setOtherReason(event.target.value)}
                  placeholder="예: 다른 배역으로 검토"
                  className="mt-2 min-h-11 w-full rounded-control border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-etc focus:ring-2 focus:ring-etc-bg"
                />
              </label>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setOtherOpen(false)} className="min-h-10 px-3 text-sm font-semibold text-muted">취소</button>
                <button type="submit" disabled={saving || !otherReason.trim()} className="min-h-10 rounded-control border border-etc bg-card px-3 text-sm font-semibold text-etc disabled:opacity-50">보류로 저장</button>
              </div>
            </form>
            </ReviewReasonPanel>
          ) : null}

          {decided && filters.work === "DONE" && !reviewLocked ? (
            <SecondaryButton disabled={saving} onClick={() => void saveDecision("PENDING")} className="min-h-9 shrink-0 px-3 text-xs text-muted-strong">
              대기로 되돌리기
            </SecondaryButton>
          ) : null}
        </div>

        <aside aria-label="지원자 정보" className={pdfProfile ? styles.profilePanel : "min-h-0 rounded-card border border-border bg-card p-4 lg:p-5 overflow-y-auto"}>
          {pdfProfile && <>
            <div className={styles.profileHeading}><h2>지원자 정보</h2><div className={styles.profileTools}>
              {assignRoles && <SecondaryButton disabled={saving} onClick={() => assignRoles([applicant.id])}>배역 설정</SecondaryButton>}
              {renderDocument && <SecondaryButton aria-expanded={documentOpen} onClick={() => setDocumentOpen(open => !open)}>{documentOpen ? "PDF 닫기" : "원본 PDF"}</SecondaryButton>}
            </div></div>
            {applicant.sourceDocument && <InfoRow label="처리 상태">{applicant.sourceDocument.preparation}</InfoRow>}
            <InfoRow label="이름"><p className="font-semibold">{applicant.name}</p></InfoRow>
            <InfoRow label="배역">{applicant.roleName}</InfoRow>
          </>}
          {!pdfProfile && <SecondaryButton onClick={() => openApplicant(applicant.id)} className="mb-3 min-h-9 w-full text-xs">
            상세 지원서 보기
          </SecondaryButton>}
          {!pdfProfile && <InfoRow label="성별">{genderText(applicant.gender)}</InfoRow>}
          <InfoRow label="나이">{pdfProfile ? applicant.sourceDocument?.ageText || "미확인" : ageText(applicant.age)}</InfoRow>
          <InfoRow label="키">{pdfProfile ? applicant.sourceDocument?.heightText || "미확인" : measurementText(applicant.height, "cm")}</InfoRow>
          {!pdfProfile && <InfoRow label="몸무게">{measurementText(applicant.weight, "kg")}</InfoRow>}
          <InfoRow label="학력">{pdfProfile ? applicant.sourceDocument?.educationText || "미확인" : applicantEducationText(applicant)}</InfoRow>

          {pdfProfile && <FocusSection title="SNS · 영상"><ApplicantSocialLinks links={applicant.links} empty /></FocusSection>}

          <FocusSection title={pdfProfile && careerCount > 5 ? "경력 · 최근 5건" : `경력 ${careerCount > 0 ? `${careerCount}건` : ""}`}>
            {pdfProfile && pdfCareers.length > 0 ? <PdfCareerList careers={pdfCareers} /> : careers.length === 0 ? <p className="text-sm text-muted">{pdfProfile ? "미확인" : "등록한 경력이 없습니다."}</p> : (
              <ul className="space-y-1.5">
                {careers.map((career) => (
                  <li key={`${career.year}-${career.title}-${career.part}`} className="flex gap-2 text-sm">
                    <span className="num shrink-0 text-muted">{career.year}</span>
                    <span className="min-w-0">
                      <strong className="font-semibold text-foreground">{career.title}</strong>
                      <span className="text-muted"> · {career.part}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </FocusSection>

          {!pdfProfile && <FocusSection title="SNS">
            {links.length === 0 ? <p className="text-sm text-muted">{pdfProfile ? "미확인" : "등록한 SNS 링크가 없습니다."}</p> : (
              <ul className="flex flex-wrap gap-2">
                {links.map(({ original, safe }) => (
                  <li key={original}>
                    <a href={safe} target="_blank" rel="noreferrer" className="inline-flex min-h-9 max-w-full items-center truncate rounded-control border border-brand-line bg-brand-soft px-2.5 text-xs font-semibold text-brand hover:border-brand">
                      {linkLabel(original)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </FocusSection>}

          {!pdfProfile && renderProfile && <details className="mt-4 border-t border-border pt-3"><summary className="cursor-pointer py-2 text-sm font-semibold">지원자 정보·사진 수정</summary>{renderProfile(applicant)}</details>}

          <FocusSection title="내부 메모">
            <textarea
              aria-label="내부 메모"
              disabled={reviewLocked}
              value={note}
              onChange={(event) => { if (note === applicant.review.note) noteRevision.current = applicant.review.revision; setNote(event.target.value); onNoteDirty?.(event.target.value !== applicant.review.note); }}
              maxLength={2000}
              className="min-h-20 w-full resize-none rounded-control border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:bg-surface"
            />
            <SecondaryButton
              disabled={reviewLocked || saving || note === applicant.review.note}
              onClick={() => void patchReview(applicant.id, { note, revision: noteRevision.current })}
              className="mt-2 min-h-9 w-full text-xs"
            >
              메모 저장
            </SecondaryButton>
          </FocusSection>

          <p className="mt-4 hidden border-t border-border-soft pt-3 text-xs leading-5 text-muted lg:block">
            <Shortcut>A</Shortcut> 합격 · <Shortcut>S</Shortcut> 보류 · <Shortcut>D</Shortcut> 불합격 · <Shortcut>N</Shortcut> 다음 · <Shortcut>←</Shortcut><Shortcut>→</Shortcut> 사진
          </p>
        </aside>
        {documentOpen && renderDocument && <ScreeningReferencePanel onClose={() => setDocumentOpen(false)}>{renderDocument(applicant)}</ScreeningReferencePanel>}
      </div>

      {expanded && currentPhoto !== null ? (
        <PhotoLightbox
          applicant={applicant}
          index={currentPhoto}
          onSelect={setPhotoIndex}
          onClose={() => {
            setExpanded(false);
            // Changing photos replaces the old trigger; restore focus to its new counterpart.
            requestAnimationFrame(() => sectionRef.current?.querySelector<HTMLElement>(photoTrigger.current === "toolbar" ? "[data-photo-expand]" : '[aria-label="사진 크게 보기"]')?.focus({ preventScroll: true }));
          }}
        />
      ) : null}
    </section>
  );
}

/** PDF 판정은 스크롤 위치와 관계없이 사유를 입력할 수 있다. */
function ReviewReasonPanel({ modal, onClose, children }: { modal: boolean; onClose: () => void; children: ReactNode }) {
  if (!modal) return children;
  return <ModalShell open onClose={onClose} labelledBy="review-reason-title"
    className="max-h-[90dvh] w-[calc(100vw-32px)] max-w-md overflow-y-auto rounded-modal bg-card p-4 shadow-xl">
    <h2 id="review-reason-title" className="mb-3 text-lg font-bold">보류 사유 입력</h2>
    {children}
  </ModalShell>;
}

/** 화면 아래 여백. 카드가 창 바닥에 딱 붙지 않도록 조금 남긴다. */
const FOCUS_BOTTOM_GAP = 12;
/** 이보다 낮아지면 사진이 알아보기 어려워지므로 그때는 스크롤을 허용한다. */
const FOCUS_MIN_HEIGHT = 360;
const WIDE_SCREEN = "(min-width: 1024px)";

/**
 * 위쪽 크롬(차수·필터·툴바·배역 조건 줄) 높이는 화면 폭에 따라 달라진다.
 * 상수로 빼 두면 줄바꿈이 생길 때 어긋나므로, 실제 위치를 재서 남는 높이만 쓴다.
 * 좁은 화면에서는 세로로 쌓아 자연스럽게 흐르도록 높이를 고정하지 않는다.
 */
function useViewportFitHeight(ref: React.RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const wide = window.matchMedia(WIDE_SCREEN);
    const update = () => {
      if (!wide.matches) {
        setHeight(null);
        return;
      }
      const top = node.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.max(FOCUS_MIN_HEIGHT, Math.round(window.innerHeight - top - FOCUS_BOTTOM_GAP)));
    };
    update();
    // 목록이 갱신되며 위쪽 줄 높이가 늦게 확정되는 경우가 있어 다음 프레임에 한 번 더 잰다.
    const frame = requestAnimationFrame(update);

    // 섹션 자신을 관찰하면 높이를 바꾸는 순간 다시 불려 무한히 돈다. 바깥과 위쪽만 본다.
    // 바깥은 우리 높이에 따라 같이 바뀌지만, 위치는 그대로라 같은 값으로 한 번에 수렴한다.
    const observer = new ResizeObserver(update);
    if (node.parentElement) observer.observe(node.parentElement);
    for (let above = node.previousElementSibling; above; above = above.previousElementSibling) {
      observer.observe(above);
    }
    for (let block = node.parentElement?.previousElementSibling; block; block = block.previousElementSibling) {
      observer.observe(block);
    }

    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    wide.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      wide.removeEventListener("change", update);
    };
  }, [ref]);

  return height;
}

const ACTION_TONE = {
  pass: "border-pass/35 text-pass hover:bg-pass-bg",
  fail: "border-fail/35 text-fail hover:bg-fail-bg",
  etc: "border-etc/35 text-etc hover:bg-etc-bg",
  neutral: "border-border text-muted-strong hover:bg-surface",
} as const;

/** 이미 그 결과로 저장된 버튼은 색을 채워 지금 상태를 한눈에 알린다. */
const ACTION_ACTIVE_TONE = {
  pass: "border-pass bg-pass text-white hover:bg-pass",
  fail: "border-fail bg-fail text-white hover:bg-fail",
  etc: "border-etc bg-etc text-white hover:bg-etc",
  neutral: "border-border text-muted-strong hover:bg-surface",
} as const;

const ACTION_CAPTION_TONE = {
  pass: "text-pass",
  fail: "text-fail",
  etc: "text-etc",
  neutral: "text-muted",
} as const;

const ACTION_SIZE = {
  sm: "h-11 w-11 [&>svg]:h-4.5 [&>svg]:w-4.5",
  md: "h-14 w-14 [&>svg]:h-6 [&>svg]:w-6",
  lg: "h-16 w-16 [&>svg]:h-7 [&>svg]:w-7",
} as const;

/**
 * 틴더식 빠른 판정을 위해 큰 원형 버튼 하나에 동작 하나만 붙인다.
 * 아이콘만으로는 합격·불합격·보류가 구분되지 않아 글자를 함께 둔다.
 */
function FocusAction({
  caption,
  label,
  hint,
  tone,
  size = "md",
  active = false,
  disabled,
  onClick,
  children,
}: {
  readonly caption: string;
  readonly label: string;
  readonly hint?: string;
  readonly tone: keyof typeof ACTION_TONE;
  readonly size?: keyof typeof ACTION_SIZE;
  readonly active?: boolean;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <span className="flex w-14 flex-col items-center gap-1 max-[360px]:w-12 sm:w-16">
      <button
        type="button"
        aria-label={hint ? `${label} (단축키 ${hint})` : label}
        aria-pressed={tone === "neutral" ? undefined : active}
        title={hint ? `${label} · ${hint}` : label}
        disabled={disabled}
        onClick={onClick}
        className={`grid shrink-0 place-items-center rounded-full border-2 bg-card shadow-[var(--shadow-2)] transition-[background-color,border-color,transform,opacity] duration-150 active:scale-95 disabled:pointer-events-none disabled:shadow-none ${
          active ? ACTION_ACTIVE_TONE[tone] : `${ACTION_TONE[tone]} disabled:opacity-35`
        } ${ACTION_SIZE[size]} max-[360px]:h-11 max-[360px]:w-11`}
      >
        {children}
      </button>
      <span className={`whitespace-nowrap text-[11px] font-bold ${ACTION_CAPTION_TONE[tone]} ${disabled && !active ? "opacity-40" : ""}`}>
        {caption}
      </span>
    </span>
  );
}

function GalleryArrow({ label, direction, disabled, onClick }: { label: string; direction: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-1/2 z-3 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/92 text-lg font-bold text-foreground shadow-[var(--shadow-2)] hover:bg-white disabled:pointer-events-none disabled:opacity-30 ${direction === "left" ? "left-2" : "right-2"}`}
    >
      {direction === "left" ? "‹" : "›"}
    </button>
  );
}

function InfoRow({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-border-soft py-3 text-sm leading-6 first:pt-0">
      <span className="w-14 shrink-0 text-muted">{label}</span>
      <span className="min-w-0 break-words font-medium text-foreground">{children}</span>
    </div>
  );
}

function FocusSection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="mb-3 text-sm font-semibold text-muted-strong">{title}</h3>
      {children}
    </section>
  );
}

function Shortcut({ children }: { readonly children: ReactNode }) {
  return <kbd className="rounded border border-border bg-surface px-1 py-0.5 font-sans text-[11px]">{children}</kbd>;
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9h11a5 5 0 0 1 0 10H9" />
      <path d="m7 5-4 4 4 4" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/** 합격은 O, 불합격은 X. 한국에서 가장 빨리 읽히는 한 쌍이다. */
function CircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <circle cx="12" cy="12" r="7.6" />
    </svg>
  );
}

function EllipsisIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

function TriangleIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round" aria-hidden="true"><path d="M12 4 21 20H3Z" /></svg>;
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
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
