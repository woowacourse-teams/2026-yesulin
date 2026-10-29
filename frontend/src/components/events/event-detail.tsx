"use client";

import { ContentState, ContentSkeleton } from "@/components/ui/content-state";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { ScreenError } from "@/components/auditions/screen-status";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { PrimaryLink, SecondaryLink } from "@/components/ui/controls";
import { useEffect, useState } from "react";
import { getEvent } from "@/features/events/api";
import { DEFAULT_APPLY_LABEL, eventRoutes, formatEventPeriod, registrationClosedMessage, type PublicEvent } from "@/features/events/types";
import { EventImage, EventPhaseBadge, EventScreen } from "./event-screen";

type EventState =
  | { readonly status: "loading" }
  | { readonly status: "missing" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly event: PublicEvent };

/** 이벤트 상세는 서버가 미리 읽은 글을 쓰고, 목 환경·서버 API 미설정 시 브라우저에서 읽는다. */
export function EventRoute({ eventId, initial }: { readonly eventId: string; readonly initial: PublicEvent | null }) {
  const [state, setState] = useState<EventState>(initial ? { status: "ready", event: initial } : { status: "loading" });

  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (initial && reloadToken === 0) return;
    let active = true;
    getEvent(eventId)
      .then((event) => { if (active) setState({ status: "ready", event }); })
      .catch((cause) => {
        console.error("[이벤트 조회 실패]", cause);
        if (active) setState({ status: cause instanceof AuditionRequestError && cause.status === 404 ? "missing" : "error" });
      });
    return () => { active = false; };
  }, [eventId, initial, reloadToken]);

  return (
    <EventScreen backToList contentClassName={`event-detail-layout ${state.status === "ready" && !state.event.coverImageUrl ? "event-detail-layout--text" : ""}`}>
      {state.status === "loading" ? <ContentSkeleton label="이벤트 불러오는 중" className="mt-3 rounded-card border border-border bg-card p-6"><div className="h-8 w-2/3 rounded bg-border-soft" /><div className="mt-6 h-48 rounded bg-border-soft" /></ContentSkeleton> : null}
      {state.status === "missing" ? <MissingEvent /> : null}
      {state.status === "error" ? <ScreenError message="정보를 불러오지 못했어요." onRetry={() => { setState({ status: "loading" }); setReloadToken((value) => value + 1); }} /> : null}
      {state.status === "ready" ? <EventDetail event={state.event} /> : null}
    </EventScreen>
  );
}

function EventDetail({ event }: { readonly event: PublicEvent }) {
  const period = formatEventPeriod(event.startsOn, event.endsOn);
  const ended = event.phase === "ENDED";
  const hasAction = Boolean(event.registrationEnabled || event.applyUrl);
  return (
    <article className={`event-detail ${event.coverImageUrl ? "event-detail--with-image" : ""} ${hasAction ? "event-detail--with-action" : ""} mt-3 overflow-hidden rounded-card border border-border bg-card`}>
      <header className="event-detail-header border-b border-border-soft px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <EventPhaseBadge phase={event.phase} registrationStatus={event.registrationStatus} />
          {period ? <span className="num text-muted-strong">{period}</span> : null}
        </div>
        <h1 className="mt-3 break-words text-[clamp(24px,3.4vw,32px)] font-bold leading-snug tracking-[-0.03em]">{event.title}</h1>
        {event.summary ? <p className="mt-2 wrap-anywhere text-base leading-7 text-muted-strong">{event.summary}</p> : null}
      </header>
      {event.coverImageUrl ? <EventDetailImage key={event.coverImageUrl} src={event.coverImageUrl} title={event.title} /> : null}
      <div className="event-detail-body px-5 py-6 sm:px-8">
        <p className="whitespace-pre-line wrap-anywhere text-[15px] leading-7 text-muted-strong">{event.body}</p>
      </div>
      {hasAction ? (
        <footer className="event-detail-action border-t border-border-soft px-5 py-5 sm:px-8">
          {ended ? (
            <p className="text-sm font-semibold text-muted-strong">마감된 이벤트예요. 다음 모집 소식은 이벤트 목록에서 알려 드릴게요.</p>
          ) : event.registrationEnabled ? (
            event.registrationOpen ? (
              <PrimaryLink href={eventRoutes.register(event.id)} className="w-full sm:w-auto">
                {event.applyLabel ?? DEFAULT_APPLY_LABEL}
              </PrimaryLink>
            ) : (
              <p className="text-sm font-semibold text-muted-strong">{registrationClosedMessage(event.registrationStatus)}</p>
            )
          ) : event.applyUrl ? (
            <PrimaryLink href={event.applyUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              {event.applyLabel ?? DEFAULT_APPLY_LABEL}<span className="sr-only"> (새 창에서 열림)</span>
            </PrimaryLink>
          ) : null}
        </footer>
      ) : null}
      <EventDetailContent event={event} />
    </article>
  );
}

/** 목록용 자르기와 별개로 상세 이미지 전체를 확대해서 읽는다. */
function EventDetailImage({ src, title }: { readonly src: string; readonly title: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="event-detail-media">
      <button
        type="button"
        aria-label={`${title} 이미지 크게 보기`}
        aria-haspopup="dialog"
        onClick={() => setExpanded(true)}
        className="event-detail-image relative block w-full cursor-zoom-in text-left"
      >
        <EventImage src={src} className="border-b border-border-soft object-contain" />
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-control bg-foreground/75 px-3 py-2 text-xs font-semibold text-white">크게 보기</span>
      </button>
      {expanded ? <ImageLightbox title={title} imageUrls={[src]} onClose={() => setExpanded(false)} /> : null}
    </div>
  );
}


/** 자유 형식 개요와 분리한 선택적 하단 상세 설명·이미지. */
function EventDetailContent({ event }: { readonly event: PublicEvent }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const imageUrls = event.detailImageUrls ?? [];
  if (!event.detailBody && imageUrls.length === 0) return null;
  return (
    <section className="event-detail-content border-t border-border-soft px-5 py-6 sm:px-8" aria-label="상세 안내">
      <div className="mx-auto max-w-[760px]">
        <h2 className="text-xl font-bold">상세 안내</h2>
        {event.detailBody ? <p className="mt-6 whitespace-pre-line wrap-break-word text-[15px] leading-7 text-muted-strong">{event.detailBody}</p> : null}
        {imageUrls.length > 0 ? <div className="mt-8 space-y-6">
          {imageUrls.map((url, index) => <button
            key={url}
            type="button"
            aria-label={`${event.title} 상세 이미지 ${index + 1} 크게 보기`}
            aria-haspopup="dialog"
            onClick={() => setOpenIndex(index)}
            className="relative block w-full cursor-zoom-in overflow-hidden rounded-card border border-border text-left"
          >
            <EventImage src={url} />
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-control bg-foreground/75 px-3 py-2 text-xs font-semibold text-white">크게 보기</span>
          </button>)}
        </div> : null}
      </div>
      {openIndex !== null ? <ImageLightbox title={event.title} imageUrls={imageUrls} index={openIndex} onSelect={setOpenIndex} onClose={() => setOpenIndex(null)} /> : null}
    </section>
  );
}

export function MissingEvent() {
  return <ContentState headingLevel={1} className="mt-3" title="이벤트를 찾을 수 없어요" description="이벤트가 숨겨졌거나 주소가 바뀌었을 수 있어요." action={<SecondaryLink href={eventRoutes.list}>이벤트 목록 보기</SecondaryLink>} />;
}
