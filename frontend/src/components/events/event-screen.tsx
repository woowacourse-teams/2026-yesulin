import { FallbackImage } from "@/components/ui/fallback-image";
import Link from "next/link";
import type { ReactNode } from "react";
import { NotebookFooter, NotebookHeader } from "@/components/landing/notebook-site-layout";
import { NotebookPageMain } from "@/components/landing/notebook-page-main";
import { EVENT_PHASE_LABELS, eventRoutes, type EventPhase } from "@/features/events/types";

/** 이벤트 목록·상세가 함께 쓰는 틀. 상세에서는 목록으로 돌아가는 링크를 보인다. */
export function EventScreen({ backToList = false, children }: { readonly backToList?: boolean; readonly children: ReactNode }) {
  return (
    <div className="public-notebook">
      <a className="notebook-skip" href="#main">본문으로 바로가기</a>
      <NotebookHeader />
      <NotebookPageMain>
        {backToList ? (
          <Link
            href={eventRoutes.list}
            className="-ml-2 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-muted-strong hover:bg-white hover:text-foreground"
          >
            이벤트 목록
          </Link>
        ) : null}
        {children}
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

export function EventPhaseBadge({ phase }: { readonly phase: EventPhase }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PHASE_TONES[phase]}`}>{EVENT_PHASE_LABELS[phase]}</span>;
}

/** 운영자가 올린 이미지는 저장소 공개 주소를 그대로 보여 준다. */
export function EventImage({ src, className = "" }: { readonly src: string; readonly className?: string }) {
  return <FallbackImage src={src} alt="" width={1080} height={608} unoptimized className={`block h-auto w-full bg-surface ${className}`} />;
}
