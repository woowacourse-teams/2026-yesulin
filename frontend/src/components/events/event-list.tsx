"use client";

import { ContentState, ContentSkeleton } from "@/components/ui/content-state";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { NotebookListHeading } from "@/components/landing/notebook-page-main";
import { getEvents } from "@/features/events/api";
import { PosterImage } from "@/components/ui/poster-image";
import { EVENT_PHASE_LABELS, eventRoutes, formatEventPeriod, type PublicEventSummary } from "@/features/events/types";
import { EventScreen, registrationClosedLabel } from "./event-screen";

type ListState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly events: readonly PublicEventSummary[] };

/** 이벤트 목록은 서버가 미리 읽은 목록을 쓰고, 목 환경·서버 API 미설정 시 브라우저에서 읽는다. */
export function EventsRoute({ initialEvents }: { readonly initialEvents: readonly PublicEventSummary[] | null }) {
  const [state, setState] = useState<ListState>(() => initialEvents === null
    ? { status: "loading" }
    : { status: "ready", events: initialEvents });

  const load = useCallback(() => {
    let active = true;
    getEvents()
      .then((events) => { if (active) setState({ status: "ready", events }); })
      .catch((cause) => {
        console.error("[이벤트 목록 조회 실패]", cause);
        if (active) setState({ status: "error" });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (initialEvents !== null) return;
    return load();
  }, [initialEvents, load]);

  return (
    <EventScreen>
      <NotebookListHeading title="이벤트" />
      <div>
        {state.status === "loading" ? <ContentSkeleton label="이벤트 목록 불러오는 중"><div className="notebook-event-grid">{[0, 1, 2, 3].map((item) => <div key={item} className="notebook-poster-skeleton" />)}</div></ContentSkeleton> : null}
        {state.status === "error" ? (
          <ScreenError message="이벤트를 불러오지 못했어요." onRetry={() => { setState({ status: "loading" }); load(); }} />
        ) : null}
        {state.status === "ready" && state.events.length === 0 ? (
          <ContentState title="지금 열린 이벤트가 없어요" description="새 소식이 생기면 이곳에 안내할게요." />
        ) : null}
        {state.status === "ready" && state.events.length > 0 ? (
          <ul className="notebook-event-grid">
            {state.events.map((event) => <EventCard key={event.id} event={event} />)}
          </ul>
        ) : null}
      </div>
    </EventScreen>
  );
}

const EVENT_POSTER_SIZES = "(min-width: 1100px) 260px, (min-width: 761px) 33vw, 50vw";

/** 이벤트 포스터도 공고 카드처럼 3:4 틀에 잘리지 않게 담는다. */
function EventCard({ event }: { readonly event: PublicEventSummary }) {
  const period = formatEventPeriod(event.startsOn, event.endsOn);
  return (
    <li className="min-w-0">
      <Link href={eventRoutes.detail(event.id)} className="notebook-poster-card" data-ended={event.phase === "ENDED" || undefined}>
        <div className="notebook-poster">
          <EventPosterBadge event={event} />
          <EventPoster event={event} />
        </div>
        <h2 className="notebook-poster-title">{event.title}</h2>
        {Boolean(period) && <p className="notebook-poster-meta num">{period}</p>}
        {Boolean(event.summary) && <p className="notebook-event-summary">{event.summary}</p>}
      </Link>
    </li>
  );
}

function EventPosterBadge({ event }: { readonly event: PublicEventSummary }) {
  const closedLabel = registrationClosedLabel(event.phase, event.registrationStatus);
  if (closedLabel) return <span className="notebook-poster-badge" data-kind="closed">{closedLabel}</span>;
  return <span className="notebook-poster-badge" data-kind={EVENT_BADGE_KINDS[event.phase]}>{EVENT_PHASE_LABELS[event.phase]}</span>;
}

const EVENT_BADGE_KINDS: Readonly<Record<PublicEventSummary["phase"], string>> = {
  UPCOMING: "open",
  ONGOING: "open",
  ENDED: "closed",
};

function EventPoster({ event }: { readonly event: PublicEventSummary }) {
  const fallback = <span className="notebook-poster-default" aria-hidden="true"><span className="notebook-poster-kind">이벤트</span><span className="notebook-poster-headline">{event.title}</span><span className="notebook-poster-mark">예술in</span></span>;
  if (!event.coverImageUrl) return fallback;
  return <PosterImage key={event.coverImageUrl} src={event.coverImageUrl} alt="" sizes={EVENT_POSTER_SIZES} fallback={fallback} />;
}
