"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PrimaryLink } from "@/components/ui/controls";
import { getEvent } from "@/features/events/api";
import { DEFAULT_APPLY_LABEL, eventRoutes, formatEventPeriod, type PublicEvent } from "@/features/events/types";
import { EventImage, EventPhaseBadge, EventScreen } from "./event-screen";

type EventState =
  | { readonly status: "loading" }
  | { readonly status: "missing" }
  | { readonly status: "ready"; readonly event: PublicEvent };

/** 이벤트 상세는 서버가 미리 읽은 글을 쓰고, 목 환경·서버 API 미설정 시 브라우저에서 읽는다. */
export function EventRoute({ eventId, initial }: { readonly eventId: string; readonly initial: PublicEvent | null }) {
  const [state, setState] = useState<EventState>(initial ? { status: "ready", event: initial } : { status: "loading" });

  useEffect(() => {
    if (initial) return;
    let active = true;
    getEvent(eventId)
      .then((event) => { if (active) setState({ status: "ready", event }); })
      .catch((cause) => {
        console.error("[이벤트 조회 실패]", cause);
        if (active) setState({ status: "missing" });
      });
    return () => { active = false; };
  }, [eventId, initial]);

  return (
    <EventScreen backToList>
      {state.status === "loading" ? <p role="status" className="mt-3 text-sm text-muted">이벤트를 불러오는 중이에요.</p> : null}
      {state.status === "missing" ? <MissingEvent /> : null}
      {state.status === "ready" ? <EventDetail event={state.event} /> : null}
    </EventScreen>
  );
}

function EventDetail({ event }: { readonly event: PublicEvent }) {
  const period = formatEventPeriod(event.startsOn, event.endsOn);
  const ended = event.phase === "ENDED";
  return (
    <article className="mt-3 overflow-hidden rounded-card border border-border bg-card">
      <header className="border-b border-border-soft px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <EventPhaseBadge phase={event.phase} />
          {period ? <span className="num text-muted-strong">{period}</span> : null}
        </div>
        <h1 className="mt-3 break-words text-[clamp(24px,3.4vw,32px)] font-bold leading-snug tracking-[-0.03em]">{event.title}</h1>
        {event.summary ? <p className="mt-2 text-base leading-7 text-muted-strong">{event.summary}</p> : null}
      </header>
      {event.coverImageUrl ? <EventImage src={event.coverImageUrl} className="border-b border-border-soft object-contain" /> : null}
      <div className="px-5 py-6 sm:px-8">
        <p className="whitespace-pre-line text-[15px] leading-7 text-muted-strong">{event.body}</p>
      </div>
      {event.applyUrl ? (
        <footer className="border-t border-border-soft px-5 py-5 sm:px-8">
          {ended ? (
            <p className="text-sm font-semibold text-muted-strong">마감된 이벤트예요. 다음 모집 소식은 이벤트 목록에서 알려 드릴게요.</p>
          ) : (
            <PrimaryLink href={event.applyUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              {event.applyLabel ?? DEFAULT_APPLY_LABEL}<span className="sr-only"> (새 창에서 열림)</span>
            </PrimaryLink>
          )}
        </footer>
      ) : null}
    </article>
  );
}

function MissingEvent() {
  return (
    <section className="mt-3 rounded-card border border-border bg-card px-6 py-14 text-center">
      <h1 className="text-lg font-bold">이벤트를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm text-muted-strong">내려간 이벤트이거나 주소가 바뀌었을 수 있어요.</p>
      <Link
        href={eventRoutes.list}
        className="mt-4 inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
      >
        이벤트 목록 보기
      </Link>
    </section>
  );
}
