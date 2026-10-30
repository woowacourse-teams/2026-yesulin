"use client";

import { useEffect, useState } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { ContentSkeleton, ContentState } from "@/components/ui/content-state";
import { SecondaryLink } from "@/components/ui/controls";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { getEvent } from "@/features/events/api";
import { eventRoutes, formatEventPeriod, registrationClosedMessage, type PublicEvent } from "@/features/events/types";
import { MissingEvent } from "./event-detail";
import { EventRegistrationForm } from "./event-registration-form";
import { EventScreen } from "./event-screen";

type RegistrationState =
  | { readonly status: "loading" }
  | { readonly status: "missing" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly event: PublicEvent };

/** 이벤트 참가 신청 화면. 서버가 미리 읽은 글을 쓰고, 목 환경·서버 API 미설정 시 브라우저에서 읽는다. */
export function EventRegistrationRoute({ eventId, initial }: { readonly eventId: string; readonly initial: PublicEvent | null }) {
  const [state, setState] = useState<RegistrationState>(initial ? { status: "ready", event: initial } : { status: "loading" });
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
    <EventScreen backToList>
      {state.status === "loading" ? <ContentSkeleton label="신청서 불러오는 중" className="mt-3 rounded-card border border-border bg-card p-6"><div className="h-8 w-2/3 rounded bg-border-soft" /><div className="mt-6 h-64 rounded bg-border-soft" /></ContentSkeleton> : null}
      {state.status === "missing" ? <MissingEvent /> : null}
      {state.status === "error" ? <ScreenError message="정보를 불러오지 못했습니다." onRetry={() => { setState({ status: "loading" }); setReloadToken((value) => value + 1); }} /> : null}
      {state.status === "ready" ? <Registration event={state.event} /> : null}
    </EventScreen>
  );
}

function Registration({ event }: { readonly event: PublicEvent }) {
  const [done, setDone] = useState(false);
  const period = formatEventPeriod(event.startsOn, event.endsOn);

  if (!event.registrationOpen) {
    return (
      <ContentState
        headingLevel={1}
        className="mt-3"
        title={registrationClosedMessage(event.registrationStatus)}
        description="신청이 마감되었거나 아직 열리지 않았습니다. 자세한 내용은 이벤트 글에서 확인해 주십시오."
        action={<SecondaryLink href={eventRoutes.detail(event.id)}>이벤트 글 보기</SecondaryLink>}
      />
    );
  }

  return (
    <article className="mt-3 rounded-card border border-border bg-card">
      <header className="border-b border-border-soft px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-sm font-semibold text-brand">참가 신청</p>
        <h1 className="mt-2 break-words text-[clamp(22px,3.2vw,30px)] font-bold leading-snug tracking-[-0.03em]">{event.title}</h1>
        {period ? <p className="num mt-2 text-sm text-muted-strong">{period}</p> : null}
      </header>
      {event.registrationNotice ? <Notice text={event.registrationNotice} /> : null}
      {done ? (
        <section aria-live="polite" className="px-5 py-8 sm:px-8">
          <h2 className="text-xl font-bold">신청이 접수되었습니다</h2>
          <p className="mt-2 text-[15px] leading-7 text-muted-strong">
            위 안내를 꼭 확인해 주십시오. 행사 소식은 남겨 주신 연락처로 안내합니다.
          </p>
          <SecondaryLink href={eventRoutes.detail(event.id)} className="mt-5">이벤트 글로 돌아가기</SecondaryLink>
        </section>
      ) : (
        <EventRegistrationForm
          eventId={event.id}
          businessCardOpen={event.businessCardOpen}
          businessCardClosesAt={event.businessCardClosesAt}
          registrationConfirmationEnabled={event.registrationConfirmationEnabled}
          registrationConfirmationMessage={event.registrationConfirmationMessage}
          registrationBankAccount={event.registrationBankAccount}
          onDone={() => { setDone(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      )}
    </article>
  );
}

/** 운영자가 적은 보증금·계좌 같은 안내. 줄바꿈을 그대로 보여 준다. */
function Notice({ text }: { readonly text: string }) {
  return (
    <section aria-label="신청 안내" className="border-b border-border-soft bg-brand-soft px-5 py-5 sm:px-8">
      <h2 className="text-sm font-bold text-brand">신청 전 확인 사항</h2>
      <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-foreground">{text}</p>
    </section>
  );
}
