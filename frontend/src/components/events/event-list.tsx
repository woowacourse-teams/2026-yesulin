"use client";

import { ContentState, ContentSkeleton } from "@/components/ui/content-state";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { NotebookListHeading } from "@/components/landing/notebook-page-main";
import { getEvents } from "@/features/events/api";
import { eventRoutes, formatEventPeriod, type PublicEventSummary } from "@/features/events/types";
import { EventImage, EventPhaseBadge, EventScreen } from "./event-screen";

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
        {state.status === "loading" ? <ContentSkeleton label="이벤트 목록 불러오는 중"><div className="grid grid-cols-1 gap-4 min-[761px]:grid-cols-2 min-[1100px]:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-40 rounded-card border border-border bg-card p-4"><div className="h-5 w-1/4 rounded bg-border-soft" /><div className="mt-4 h-6 w-2/3 rounded bg-border-soft" /></div>)}</div></ContentSkeleton> : null}
        {state.status === "error" ? (
          <ScreenError message="이벤트를 불러오지 못했어요." onRetry={() => { setState({ status: "loading" }); load(); }} />
        ) : null}
        {state.status === "ready" && state.events.length === 0 ? (
          <ContentState title="지금 열린 이벤트가 없어요" description="새 소식이 생기면 이곳에 안내할게요." />
        ) : null}
        {state.status === "ready" && state.events.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 min-[761px]:grid-cols-2 min-[1100px]:grid-cols-4">
            {state.events.map((event) => <EventCard key={event.id} event={event} />)}
          </ul>
        ) : null}
      </div>
    </EventScreen>
  );
}

function EventCard({ event }: { readonly event: PublicEventSummary }) {
  const period = formatEventPeriod(event.startsOn, event.endsOn);
  return (
    <li className="min-w-0">
      <Link
        href={eventRoutes.detail(event.id)}
        className={`block h-full overflow-hidden rounded-card border border-border bg-card transition-colors hover:border-brand-line ${event.phase === "ENDED" ? "opacity-80" : ""}`}
      >
        {event.coverImageUrl ? <EventImage src={event.coverImageUrl} className="aspect-[16/9] object-cover" /> : null}
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <EventPhaseBadge phase={event.phase} />
            {period ? <span className="num text-muted">{period}</span> : null}
          </div>
          <h2 className="mt-2 break-words text-base font-bold leading-snug">{event.title}</h2>
          {event.summary ? <p className="mt-1 text-sm leading-6 text-muted-strong">{event.summary}</p> : null}
        </div>
      </Link>
    </li>
  );
}
