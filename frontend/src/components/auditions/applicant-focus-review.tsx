"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { applicantEducationText } from "@/features/auditions/education-text";
import { orderedCareersByRecency } from "@/features/auditions/featured-careers";
import { selectGalleryIndex } from "@/features/auditions/gallery-navigation";
import { ageText, genderText, roleConditionText } from "@/features/auditions/labels";
import { safeExternalUrl } from "@/features/auditions/safe-external-url";
import type { Applicant, ReviewStatus } from "@/features/auditions/types";
import { SecondaryButton } from "@/components/ui/controls";
import { ApplicantPhotoImage } from "./applicant-photo";
import { useBoard } from "./board-context";
import { PhotoLightbox } from "./photo-lightbox";
import { ZoomablePhoto } from "./zoomable-photo";
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

/**
 * 사진을 먼저 크게 보고 바로 판정하는 화면이라 세로 스크롤 없이 한 화면에 들어가야 한다.
 * 바깥 높이를 화면에서 빼서 고정하고, 사진은 남는 높이를 채우며 정보는 옆에서 따로 스크롤한다.
 */
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
  const { board, filters, saving, reviewLocked, reviewFocused, patchReview, openApplicant } = useBoard();
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherReason, setOtherReason] = useState(
    applicant.review.status === "ETC" ? applicant.review.memo : "",
  );
  const [note, setNote] = useState(applicant.review.note);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const focusHeight = useViewportFitHeight(sectionRef);

  const photoCount = applicant.photos.length;
  const currentPhoto = selectGalleryIndex(photoIndex, photoCount);
  const photo = currentPhoto === null ? undefined : applicant.photos[currentPhoto];

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
      const decidable = !saving && !reviewLocked;
      if (event.key.toLowerCase() === "a" && decidable) {
        event.preventDefault();
        void saveDecision("PASS");
      }
      if (event.key.toLowerCase() === "d" && decidable) {
        event.preventDefault();
        void saveDecision("FAIL");
      }
      if (event.key.toLowerCase() === "n" && next) {
        event.preventDefault();
        onMove(next);
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
  }, [next, onMove, saveDecision, saving, reviewLocked, showPrevious, showNext]);

  const careers = orderedCareersByRecency(applicant.career);
  const links = applicant.links
    .map((link) => ({ original: link, safe: safeExternalUrl(link) }))
    .filter((link): link is { readonly original: string; readonly safe: string } => link.safe !== null);
  const decided = applicant.review.status !== "PENDING";
  const canDecide = !reviewLocked && !saving;

  return (
    <section
      ref={sectionRef}
      aria-label="한 명씩 심사"
      style={focusHeight === null ? undefined : { height: `${focusHeight}px` }}
      className="mx-auto flex w-full max-w-6xl flex-col gap-3"
    >

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-h-0 flex-col items-center gap-3">
          {/*
            썸네일을 사진 옆에 세워 두면 세로 높이를 사진이 그대로 쓴다.
            넓은 화면에서는 안쪽을 절대 배치로 채워 사진 높이가 남은 공간으로 확정되게 한다.
            그러지 않으면 사진의 가로세로비가 부모를 밀어 올려 화면 밖으로 넘친다.
          */}
          <div className="relative min-h-0 w-full flex-1">
          <div className="flex w-full flex-col items-center gap-2 lg:absolute lg:inset-0 lg:flex-row lg:items-stretch lg:justify-center">
            {photoCount > 1 ? (
              <div className="scrollbar-hidden order-2 flex shrink-0 gap-2 overflow-x-auto lg:order-1 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pr-0.5">
                {applicant.photos.map((candidate, slot) => (
                  <button
                    key={candidate.url}
                    type="button"
                    aria-pressed={slot === currentPhoto}
                    title={candidate.label}
                    onClick={() => setPhotoIndex(slot)}
                    className={`relative aspect-[3/4] h-14 w-auto shrink-0 overflow-hidden rounded-lg border-2 bg-border-soft transition-[border-color,box-shadow,transform] duration-150 active:scale-[0.97] lg:h-auto lg:w-14 ${
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
            <div className="relative order-1 aspect-[3/4] w-full max-w-[340px] overflow-hidden rounded-card border border-border bg-border-soft lg:order-2 lg:h-full lg:max-h-[600px] lg:w-auto lg:max-w-full">
            {photo ? (
              <>
                {/* 휠로 바로 확대·이동한다. 전체 화면으로 볼 때만 크게 보기를 누른다. */}
                <ZoomablePhoto
                  key={currentPhoto}
                  photo={photo}
                  alt={`${applicant.name} ${photo.label}`}
                  sizes="(min-width: 1024px) 460px, 92vw"
                  className="object-cover object-[center_18%]"
                  priority
                />
                <span className="pointer-events-none absolute left-3 top-3 z-2 rounded-full bg-foreground/70 px-2.5 py-1 text-xs font-semibold text-white">
                  {photo.label}
                </span>
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="absolute left-3 top-11 z-3 min-h-8 rounded-full bg-foreground/70 px-2.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-foreground/85"
                >
                  크게 보기
                </button>
                <span className="num pointer-events-none absolute right-3 top-3 z-2 rounded-full bg-foreground/70 px-2.5 py-1 text-xs font-semibold text-white">
                  {(currentPhoto ?? 0) + 1} / {photoCount}
                </span>
                {/* 머리말을 없앤 대신 이름·배역·상태·순서를 사진 위에 얹어 높이를 쓰지 않는다. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-2 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-3 pt-12 text-white">
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
                      {genderText(applicant.gender)} · {ageText(applicant.age)} · {measurementText(applicant.height, "cm")}
                    </p>
                  </div>
                  <span className="num shrink-0 rounded-full bg-white/92 px-2.5 py-1 text-sm font-bold leading-none text-foreground">
                    {index + 1}<span className="text-muted"> / {rows.length}</span>
                  </span>
                </div>
                {photoCount > 1 ? (
                  <>
                    <GalleryArrow label="이전 사진" direction="left" disabled={currentPhoto === 0} onClick={showPrevious} />
                    <GalleryArrow label="다음 사진" direction="right" disabled={currentPhoto === photoCount - 1} onClick={showNext} />
                  </>
                ) : null}
              </>
            ) : (
              <div className="grid h-full place-items-center px-6 text-center text-sm text-muted">
                제출된 사진이 없습니다.
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
            <div className="flex shrink-0 items-start justify-center gap-2 sm:gap-3">
              <FocusAction caption="이전" label="이전 지원자" tone="neutral" size="sm" disabled={!previous} onClick={() => onMove(previous)}>
                <UndoIcon />
              </FocusAction>
              <FocusAction
                caption="불합격"
                label={filters.work === "DONE" ? "불합격으로 변경" : "불합격"}
                hint="D"
                tone="fail"
                active={applicant.review.status === "FAIL"}
                disabled={!canDecide}
                onClick={() => void saveDecision("FAIL")}
              >
                <CrossIcon />
              </FocusAction>
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
              <FocusAction caption="다음" label="다음 지원자" hint="N" tone="neutral" size="sm" disabled={!next} onClick={() => onMove(next)}>
                <ArrowRightIcon />
              </FocusAction>
            </div>
          )}

          {otherOpen && !reviewLocked ? (
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
                  autoFocus
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
          ) : null}

          {decided && filters.work === "DONE" && !reviewLocked ? (
            <SecondaryButton disabled={saving} onClick={() => void saveDecision("PENDING")} className="min-h-9 shrink-0 px-3 text-xs text-muted-strong">
              심사 전으로 되돌리기
            </SecondaryButton>
          ) : null}
        </div>

        <aside className="min-h-0 overflow-y-auto rounded-card border border-border bg-card p-4 lg:p-5">
          <p className="mb-3 rounded-control border border-brand-line bg-brand-soft px-3 py-2 text-xs leading-5">
            <span className="font-semibold text-brand">배역 조건</span>
            <span className="text-muted-strong"> {roleConditionText(board.role)}</span>
          </p>
          <SecondaryButton onClick={() => openApplicant(applicant.id)} className="mb-3 min-h-9 w-full text-xs">
            상세 지원서 보기
          </SecondaryButton>
          <InfoRow label="성별">{genderText(applicant.gender)}</InfoRow>
          <InfoRow label="나이">{ageText(applicant.age)}</InfoRow>
          <InfoRow label="키">{measurementText(applicant.height, "cm")}</InfoRow>
          <InfoRow label="몸무게">{measurementText(applicant.weight, "kg")}</InfoRow>
          <InfoRow label="학력">{applicantEducationText(applicant)}</InfoRow>

          <FocusSection title={`경력 ${careers.length > 0 ? `${careers.length}건` : ""}`}>
            {careers.length === 0 ? <p className="text-sm text-muted">등록한 경력이 없습니다.</p> : (
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

          <FocusSection title="SNS">
            {links.length === 0 ? <p className="text-sm text-muted">등록한 SNS 링크가 없습니다.</p> : (
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
          </FocusSection>

          <FocusSection title="내부 메모">
            <textarea
              disabled={reviewLocked}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={255}
              placeholder="예: 발성 좋음, 앙상블로도 고려 가능"
              className="min-h-20 w-full resize-none rounded-control border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:bg-surface"
            />
            <SecondaryButton
              disabled={reviewLocked || saving || note === applicant.review.note}
              onClick={() => void patchReview(applicant.id, { note })}
              className="mt-2 min-h-9 w-full text-xs"
            >
              메모 저장
            </SecondaryButton>
          </FocusSection>

          <p className="mt-4 border-t border-border-soft pt-3 text-xs leading-5 text-muted">
            <Shortcut>A</Shortcut> 합격 · <Shortcut>D</Shortcut> 불합격 · <Shortcut>N</Shortcut> 다음 · <Shortcut>←</Shortcut><Shortcut>→</Shortcut> 사진
          </p>
        </aside>
      </div>

      {expanded && currentPhoto !== null ? (
        <PhotoLightbox
          applicant={applicant}
          index={currentPhoto}
          onSelect={setPhotoIndex}
          onClose={() => setExpanded(false)}
        />
      ) : null}
    </section>
  );
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
    <span className="flex w-14 flex-col items-center gap-1 sm:w-16">
      <button
        type="button"
        aria-label={hint ? `${label} (단축키 ${hint})` : label}
        aria-pressed={tone === "neutral" ? undefined : active}
        title={hint ? `${label} · ${hint}` : label}
        disabled={disabled}
        onClick={onClick}
        className={`grid shrink-0 place-items-center rounded-full border-2 bg-card shadow-[var(--shadow-2)] transition-[background-color,border-color,transform,opacity] duration-150 active:scale-95 disabled:pointer-events-none disabled:shadow-none ${
          active ? ACTION_ACTIVE_TONE[tone] : `${ACTION_TONE[tone]} disabled:opacity-35`
        } ${ACTION_SIZE[size]}`}
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
    <div className="flex gap-3 border-b border-border-soft py-1.5 text-sm first:pt-0">
      <span className="w-14 shrink-0 text-muted">{label}</span>
      <span className="min-w-0 font-medium text-foreground">{children}</span>
    </div>
  );
}

function FocusSection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">{title}</h3>
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
