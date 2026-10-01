"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PublicVenueGuide } from "@/components/applications/public-venue-guide";
import { PrimaryButton } from "@/components/ui/controls";
import { ANALYTICS_READY_EVENT } from "@/features/analytics/consent";
import { trackReservationEvent } from "@/features/analytics/events";
import {
  formatShowDate,
  formatShowDateTime,
  formatShowPeriod,
  formatShowTime,
  sessionAvailability,
  showAvailability,
  type ShowAvailability,
} from "@/features/shows/format";
import type { PublicShow, PublicShowSession, ReservationReceipt } from "@/features/shows/types";
import { ReservationSheet } from "./reservation-sheet";
import { ShowLinkButtons } from "./show-links";
import { ShowImageLightbox } from "./show-image-lightbox";
import { ShowPageHeader } from "./show-page-header";
import { SessionAvailabilityText, ShowGenreBadge, ShowStatusBadge } from "./show-status";

const SESSIONS_SECTION_ID = "show-sessions";

export function PublicShowDetail({ show, onReserved, onStale }: {
  readonly show: PublicShow;
  readonly onReserved: (receipt: ReservationReceipt) => void;
  readonly onStale: () => Promise<void>;
}) {
  const bookableSessions = show.sessions.filter((session) => session.bookable);
  const [selectedId, setSelectedId] = useState<number | null>(
    () => bookableSessions.length === 1 ? bookableSessions[0]!.id : null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const selectedSession = bookableSessions.find((session) => session.id === selectedId) ?? null;
  // 시트가 열린 사이 매진돼도 시트가 사라지지 않고 이유를 보여 주도록 예매 가능 여부와 관계없이 찾는다.
  const sheetSession = show.sessions.find((session) => session.id === selectedId) ?? null;
  const showsMobileAction = show.status === "OPEN";
  const availability = showAvailability(show);

  const focusSessions = () => {
    const section = document.getElementById(SESSIONS_SECTION_ID);
    section?.scrollIntoView({ behavior: "smooth", block: "center" });
    section?.querySelector<HTMLInputElement>("input:not([disabled])")?.focus({ preventScroll: true });
  };
  const openReservation = () => {
    trackReservationEvent("reservation_start", {});
    setSheetOpen(true);
  };
  const action = { show, availability, selectedSession, hasBookable: bookableSessions.length > 0, onReserve: openReservation, onChoose: focusSessions };

  // 좌석이 바뀌어 공연 정보를 다시 읽어도 같은 공연이면 조회 이벤트를 다시 보내지 않는다.
  // 이 화면에서 분석에 동의하면 그때 한 번 보낸다. 실제로 보낸 뒤에만 보낸 공연으로 기록한다.
  const viewedShowIdRef = useRef<PublicShow["id"] | null>(null);
  const sessionCount = show.sessions.length;
  useEffect(() => {
    const trackView = () => {
      if (viewedShowIdRef.current === show.id) return;
      if (trackReservationEvent("view_show", { session_count: sessionCount })) viewedShowIdRef.current = show.id;
    };
    trackView();
    window.addEventListener(ANALYTICS_READY_EVENT, trackView);
    return () => window.removeEventListener(ANALYTICS_READY_EVENT, trackView);
  }, [show.id, sessionCount]);

  return (
    <main className={`min-h-screen break-keep bg-surface text-foreground wrap-break-word ${showsMobileAction ? "pb-[calc(120px+env(safe-area-inset-bottom))]" : "pb-12"} min-[1200px]:pb-12`}>
      <ShowPageHeader />
      <div className="mx-auto max-w-[880px] px-5 py-8 md:px-8 md:py-12 min-[1200px]:grid min-[1200px]:max-w-[1200px] min-[1200px]:grid-cols-[minmax(0,1fr)_320px] min-[1200px]:gap-12">
        <article className="min-w-0">
          <ShowHero show={show} availability={availability} />
          <SessionSelection show={show} selectedId={selectedSession?.id ?? null} onSelect={setSelectedId} />
          <ReservationNotice show={show} />
          {show.description ? (
            <InfoSection title="공연 소개">
              <p className="whitespace-pre-line text-base leading-7 text-muted-strong">{show.description}</p>
            </InfoSection>
          ) : null}
          {show.imageUrls.length ? <DetailImages show={show} /> : null}
          <InfoSection title="오시는 길" last>
            <PublicVenueGuide venue={show.venue.name} address={show.venue} note="공연이 열리는 장소입니다. 공연 시작 전까지 도착해 주세요." />
            {show.guides.length ? <ShowGuides guides={show.guides} /> : null}
          </InfoSection>
        </article>
        <aside className="hidden min-[1200px]:block"><DesktopAction {...action} /></aside>
      </div>
      {showsMobileAction ? <MobileAction {...action} /> : null}
      {sheetSession ? (
        <ReservationSheet
          open={sheetOpen}
          show={show}
          session={sheetSession}
          onClose={() => setSheetOpen(false)}
          onReserved={(receipt) => { setSheetOpen(false); onReserved(receipt); }}
          onStale={onStale}
        />
      ) : null}
    </main>
  );
}

/** 모바일은 포스터를 작게 두고 제목 옆에 붙여 회차 선택이 첫 화면에 들어오게 한다. */
function ShowHero({ show, availability }: { readonly show: PublicShow; readonly availability: ShowAvailability }) {
  return (
    <section className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-x-4 gap-y-6 border-b border-border pb-8 sm:grid-cols-[200px_minmax(0,1fr)] sm:grid-rows-[auto_1fr] sm:gap-x-6 md:grid-cols-[240px_minmax(0,1fr)]">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card border border-border bg-border-soft sm:row-span-2">
        <Image src={show.posterUrl} alt={`${show.title} 포스터`} fill unoptimized priority sizes="(min-width: 768px) 240px, (min-width: 640px) 200px, 112px" className="object-cover" />
      </div>
      <div className="min-w-0 self-center sm:self-start">
        <div className="flex flex-wrap items-center gap-2">
          <ShowStatusBadge availability={availability} />
          <ShowGenreBadge genre={show.genre} />
        </div>
        <h1 className="mt-3 text-[clamp(24px,4vw,40px)] font-bold leading-tight tracking-[-0.035em]">{show.title}</h1>
        {show.hostName ? (
          <p className="mt-2 text-sm text-muted-strong md:text-base">
            <span className="text-muted">주최</span> <span className="ml-1 font-medium">{show.hostName}</span>
          </p>
        ) : null}
      </div>
      <dl className="col-span-2 grid grid-cols-[88px_minmax(0,1fr)] gap-x-4 gap-y-3 text-base sm:col-span-1">
        <dt className="text-muted">공연 기간</dt>
        <dd className="num">{formatShowPeriod(show.sessions)}</dd>
        <dt className="text-muted">공연 시간</dt>
        <dd className="num">{show.runningMinutes}분</dd>
        {show.ageRating ? <><dt className="text-muted">관람 연령</dt><dd>{show.ageRating}</dd></> : null}
        <dt className="text-muted">장소</dt>
        <dd className="break-words">{show.venue.name}</dd>
        <dt className="text-muted">관람료</dt>
        <dd className="font-semibold text-brand">무료</dd>
      </dl>
    </section>
  );
}

function SessionSelection({ show, selectedId, onSelect }: {
  readonly show: PublicShow;
  readonly selectedId: number | null;
  readonly onSelect: (id: number) => void;
}) {
  const closed = show.status === "CLOSED";
  const description = closed
    ? "예매가 종료된 공연이에요. 공연 정보는 계속 확인할 수 있어요."
    : "관람할 회차를 선택해 주세요. 모든 시각은 한국 시간 기준입니다.";
  return (
    <section id={SESSIONS_SECTION_ID} className="border-b border-border py-8 sm:py-10">
      <fieldset>
        <legend className="text-xl font-bold tracking-[-0.02em]">회차 선택</legend>
        <p id="show-sessions-description" className="mt-2 text-sm text-muted-strong">{description}</p>
        {show.sessions.length ? (
          <div aria-describedby="show-sessions-description" className="mt-5 grid gap-3 sm:grid-cols-2">
            {show.sessions.map((session) => (
              <SessionCard key={session.id} session={session} selected={session.id === selectedId} onSelect={onSelect} />
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-card border border-border bg-card px-4 py-3 text-sm text-muted-strong">회차를 준비하고 있어요.</p>
        )}
      </fieldset>
    </section>
  );
}

function SessionCard({ session, selected, onSelect }: {
  readonly session: PublicShowSession;
  readonly selected: boolean;
  readonly onSelect: (id: number) => void;
}) {
  const availability = sessionAvailability(session);
  const disabled = !session.bookable;
  // 배경색 클래스가 둘 이상 붙으면 CSS 순서로 한쪽이 무시되므로 상태별로 하나만 고른다.
  const tone = selected
    ? "cursor-pointer border-brand bg-brand-soft shadow-[var(--shadow-1)]"
    : disabled ? "cursor-default border-border bg-border-soft" : "cursor-pointer border-border bg-card hover:border-brand-line";
  return (
    <label className={`block rounded-card border p-4 transition-[border-color,background-color,box-shadow] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand ${tone}`}>
      <input
        type="radio"
        name="show-session"
        value={session.id}
        checked={selected}
        disabled={disabled}
        onChange={() => onSelect(session.id)}
        className="sr-only"
      />
      <span className="flex items-center gap-3">
        <span aria-hidden="true" className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-brand bg-brand" : "border-muted-soft bg-card"}`}>
          <span className={`text-xs font-bold text-white ${selected ? "block" : "hidden"}`}>•</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={`num block text-base font-bold ${disabled ? "text-muted" : ""}`}>{formatShowDate(session.startsAt)}</span>
          <span className={`num mt-0.5 block text-sm ${disabled ? "text-muted" : "text-muted-strong"}`}>{formatShowTime(session.startsAt)} 시작</span>
        </span>
        <SessionAvailabilityText availability={availability} />
      </span>
    </label>
  );
}

function ReservationNotice({ show }: { readonly show: PublicShow }) {
  const phoneHref = `tel:${show.inquiryPhone.replaceAll("-", "")}`;
  return (
    <InfoSection title="예매 안내">
      <ul className="grid gap-2 text-base leading-7 text-muted-strong md:text-sm md:leading-6">
        <NoticeItem>무료 공연이며 좌석은 따로 지정하지 않아요.</NoticeItem>
        <NoticeItem>한 번에 최대 <strong className="font-semibold text-foreground">{show.maxTicketsPerReservation}매</strong>까지 예매할 수 있어요. 더 많은 인원은 단체 관람으로 문의해 주세요.</NoticeItem>
        <NoticeItem>예매 취소는 <strong className="font-semibold text-foreground">공연 시작 1시간 전까지</strong> 전화로 요청해 주세요.</NoticeItem>
      </ul>
      <a
        href={phoneHref}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-control border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:border-brand-line hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        취소·단체 문의 <span className="num text-brand">{show.inquiryPhone}</span>
      </a>
      {show.links.length ? (
        <div className="mt-6">
          <p className="text-sm font-semibold text-muted-strong">공연 소식</p>
          <ShowLinkButtons links={show.links} className="mt-2" />
        </div>
      ) : null}
    </InfoSection>
  );
}

/** 기획사가 제목을 정한 추가 안내. 주차·입장처럼 주소만으로 전하기 어려운 내용을 지도 아래에 적은 순서대로 보여 준다. */
function ShowGuides({ guides }: { readonly guides: PublicShow["guides"] }) {
  return (
    <div className="mt-4 grid gap-3">
      {guides.map((guide, index) => (
        <section key={index} className="rounded-card border border-border bg-card px-4 py-4 sm:px-5">
          <h3 className="text-sm font-semibold text-brand">{guide.title}</h3>
          <p className="mt-2 whitespace-pre-line break-words text-base leading-7 text-muted-strong md:text-sm md:leading-6">{guide.content}</p>
        </section>
      ))}
    </div>
  );
}

/** 두 줄로 넘어가도 둘째 줄이 글머리표가 아닌 글자 시작에 맞도록 표를 따로 둔다. */
function NoticeItem({ children }: { readonly children: React.ReactNode }) {
  return (
    <li className="flex gap-1.5">
      <span aria-hidden="true">·</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function DetailImages({ show }: { readonly show: PublicShow }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const closeLightbox = useCallback(() => setOpenIndex(null), []);

  return (
    <InfoSection title="상세 정보">
      <p className="mb-4 text-sm text-muted-strong">이미지를 누르면 크게 볼 수 있어요.</p>
      <div className="grid gap-4">
        {show.imageUrls.map((url, index) => (
          <button
            key={url}
            type="button"
            aria-label={`${show.title} 상세 이미지 ${index + 1} 확대`}
            onClick={() => setOpenIndex(index)}
            className="block w-full cursor-zoom-in overflow-hidden rounded-card border border-border bg-card text-left transition-[border-color,filter] hover:border-brand-line hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Image
              src={url}
              alt={`${show.title} 상세 이미지 ${index + 1}`}
              width={880}
              height={1200}
              unoptimized
              className="h-auto w-full"
            />
          </button>
        ))}
      </div>
      {openIndex !== null ? (
        <ShowImageLightbox
          title={show.title}
          imageUrls={show.imageUrls}
          index={openIndex}
          onSelect={setOpenIndex}
          onClose={closeLightbox}
        />
      ) : null}
    </InfoSection>
  );
}

function InfoSection({ title, last = false, children }: {
  readonly title: string;
  readonly last?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <section className={`py-8 sm:py-10 ${last ? "" : "border-b border-border"}`}>
      <h2 className="text-xl font-bold tracking-[-0.02em]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

type ActionProps = {
  readonly show: PublicShow;
  readonly availability: ShowAvailability;
  readonly selectedSession: PublicShowSession | null;
  readonly hasBookable: boolean;
  readonly onReserve: () => void;
  readonly onChoose: () => void;
};

function ActionButton({ availability, selectedSession, hasBookable, onReserve, onChoose }: ActionProps) {
  const unavailable = availability.kind !== "open" || !hasBookable;
  const label = unavailable ? availability.label : selectedSession ? "예매하기" : "회차 선택하기";
  return (
    <PrimaryButton disabled={unavailable} onClick={selectedSession ? onReserve : onChoose} className="shrink-0 px-5">
      {label}
    </PrimaryButton>
  );
}

function SelectedSessionSummary({ selectedSession, hasBookable }: {
  readonly selectedSession: PublicShowSession | null;
  readonly hasBookable: boolean;
}) {
  if (!selectedSession) {
    return <strong className="block truncate text-sm">{hasBookable ? "회차를 선택해 주세요" : "예매할 수 있는 회차가 없어요"}</strong>;
  }
  return (
    <>
      <strong className="num block truncate text-sm">{formatShowDateTime(selectedSession.startsAt)}</strong>
      <SessionAvailabilityText availability={sessionAvailability(selectedSession)} />
    </>
  );
}

function DesktopAction(props: ActionProps) {
  return (
    <div className="glass-surface-strong sticky top-24 rounded-modal p-6">
      <p className="text-sm font-bold text-muted-strong">예매 요약</p>
      <div className="mt-5">
        <span className="block text-xs font-medium text-muted">선택 회차</span>
        <div className="mt-1"><SelectedSessionSummary selectedSession={props.selectedSession} hasBookable={props.hasBookable} /></div>
      </div>
      <div className="mt-6 [&>button]:w-full"><ActionButton {...props} /></div>
      <p className="mt-4 border-t border-border-soft pt-4 text-xs leading-5 text-muted">
        로그인 없이 이름과 휴대폰 번호로 예매해요. 취소는 공연 1시간 전까지 <span className="num whitespace-nowrap">{props.show.inquiryPhone}</span>로 전화해 주세요.
      </p>
    </div>
  );
}

function MobileAction(props: ActionProps) {
  return (
    <div className="glass-surface fixed inset-x-0 bottom-0 z-20 border-x-0 border-b-0 min-[1200px]:hidden">
      <div className="mx-auto flex max-w-[880px] items-center gap-3 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 md:px-8">
        <div className="min-w-0 flex-1"><SelectedSessionSummary selectedSession={props.selectedSession} hasBookable={props.hasBookable} /></div>
        <ActionButton {...props} />
      </div>
    </div>
  );
}
