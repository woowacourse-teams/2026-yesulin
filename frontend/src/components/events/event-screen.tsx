import { FallbackImage } from "@/components/ui/fallback-image";
import Link from "next/link";
import type { ReactNode } from "react";
import { NotebookFooter, NotebookHeader } from "@/components/landing/notebook-site-layout";
import { NotebookPageMain } from "@/components/landing/notebook-page-main";
import { EVENT_PHASE_LABELS, eventRoutes, type EventPhase, type EventRegistrationStatus } from "@/features/events/types";

/** 이벤트 목록·상세가 함께 쓰는 틀. 상세에서는 목록으로 돌아가는 링크를 보인다. */
export function EventScreen({ backToList = false, contentClassName, children }: { readonly backToList?: boolean; readonly contentClassName?: string; readonly children: ReactNode }) {
  return (
    <div className="public-notebook">
      <a className="notebook-skip" href="#main">본문으로 바로가기</a>
      <NotebookHeader />
      <NotebookPageMain>
        <div className={contentClassName}>
          {backToList ? (
            <Link
              href={eventRoutes.list}
              className="-ml-2 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-muted-strong hover:bg-white hover:text-foreground"
            >
              이벤트 목록
            </Link>
          ) : null}
          {children}
        </div>
      </NotebookPageMain>
      <NotebookFooter />
    </div>
  );
}

const PHASE_TONES: Readonly<Record<EventPhase, string>> = {
  UPCOMING: "bg-brand-soft text-brand",
  ONGOING: "bg-pass-bg text-pass",
  ENDED: "bg-border-soft text-muted-strong",
};

const REGISTRATION_CLOSED_LABELS: Readonly<Partial<Record<EventRegistrationStatus, string>>> = {
  FULL: "선착순 마감",
  CLOSED: "모집 마감",
};

/** 진행 중인 이벤트라도 신청이 닫혔으면 신청 마감 문구를 먼저 보여 준다. */
export function registrationClosedLabel(phase: EventPhase, registrationStatus?: EventRegistrationStatus): string | undefined {
  if (phase === "ENDED" || !registrationStatus) return undefined;
  return REGISTRATION_CLOSED_LABELS[registrationStatus];
}

export function EventPhaseBadge({ phase, registrationStatus }: { readonly phase: EventPhase; readonly registrationStatus?: EventRegistrationStatus }) {
  const closedLabel = registrationClosedLabel(phase, registrationStatus);
  if (closedLabel) return <span className="rounded-full bg-border-soft px-2.5 py-0.5 text-xs font-bold text-muted-strong">{closedLabel}</span>;
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PHASE_TONES[phase]}`}>{EVENT_PHASE_LABELS[phase]}</span>;
}

/** 운영자가 올린 이미지는 저장소 공개 주소를 그대로 보여 준다. */
export function EventImage({ src, className = "" }: { readonly src: string; readonly className?: string }) {
  return <FallbackImage src={src} alt="" width={1080} height={608} unoptimized className={`block h-auto w-full bg-surface ${className}`} />;
}
