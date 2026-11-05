"use client";

import { useEffect, useState } from "react";
import { formatShowTime, groupSessionsByDay, sessionAvailability, type ShowSessionDay } from "@/features/shows/format";
import type { PublicShow, PublicShowSession } from "@/features/shows/types";
import { SessionAvailabilityText } from "./show-status";

type SessionDay = ShowSessionDay<PublicShowSession>;

function hasBookable(day: SessionDay): boolean {
  return day.sessions.some((session) => session.bookable);
}

function initialDay(days: readonly SessionDay[], selectedId: number | null): SessionDay | undefined {
  return days.find((day) => day.sessions.some((session) => session.id === selectedId)) ?? days.find(hasBookable) ?? days[0];
}

/**
 * 회차가 많아도 한눈에 고르도록 공연 있는 날짜만 띠로 보여 주고, 고른 날짜의 시작 시각을 칩으로 보여 준다.
 * 시각은 라디오 버튼이라 키보드·보조기술에서도 기존 회차 선택과 같이 동작한다.
 */
export function SessionPicker({ show, sectionId, selectedId, onSelect }: {
  readonly show: PublicShow;
  readonly sectionId: string;
  readonly selectedId: number | null;
  readonly onSelect: (id: number) => void;
}) {
  const days = groupSessionsByDay(show.sessions);
  const [dayKey, setDayKey] = useState(() => initialDay(days, selectedId)?.key ?? null);
  const day = days.find((candidate) => candidate.key === dayKey) ?? days[0];
  const chooseDay = (next: SessionDay) => {
    setDayKey(next.key);
    selectOnlySession(next, onSelect);
  };
  // 처음 펼친 날짜에 예매할 회차가 하나뿐이면 바로 고른 상태로 둔다.
  useEffect(() => { if (selectedId === null && day) selectOnlySession(day, onSelect); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <section id={sectionId} className="border-b border-border py-8 sm:py-10">
    <fieldset>
      <legend className="text-xl font-bold tracking-[-0.02em]">회차 선택</legend>
      <p id="show-sessions-description" className="mt-2 text-sm text-muted-strong">{sessionGuide(show)}</p>
      {day ? <>
        <div role="group" aria-label="공연 날짜" className="show-dates">
          {days.map((candidate) => <DateButton key={candidate.key} day={candidate} selected={candidate.key === day.key} onChoose={chooseDay} />)}
        </div>
        <div aria-describedby="show-sessions-description" className="show-times">
          {day.sessions.map((session) => <TimeChip key={session.id} session={session} selected={session.id === selectedId} onSelect={onSelect} />)}
        </div>
      </> : <p className="mt-5 rounded-card border border-border bg-card px-4 py-3 text-sm text-muted-strong">회차를 준비하고 있어요.</p>}
    </fieldset>
  </section>;
}

function selectOnlySession(day: SessionDay, onSelect: (id: number) => void): void {
  const bookable = day.sessions.filter((session) => session.bookable);
  if (bookable.length === 1) onSelect(bookable[0]!.id);
}

function sessionGuide(show: PublicShow): string {
  if (show.status === "CLOSED") return "예매가 종료된 공연이에요. 공연 정보는 계속 확인할 수 있어요.";
  return "날짜를 고른 뒤 시작 시각을 선택해 주세요. 모든 시각은 한국 시간 기준입니다.";
}

function DateButton({ day, selected, onChoose }: { readonly day: SessionDay; readonly selected: boolean; readonly onChoose: (day: SessionDay) => void }) {
  const count = day.sessions.length;
  return <button type="button" className="show-date" aria-pressed={selected} aria-label={`${day.label}, 회차 ${count}개`} data-weekday={day.weekday} data-closed={!hasBookable(day) || undefined} onClick={() => onChoose(day)}>
    <small aria-hidden="true">{day.weekday}</small>
    <b className="num" aria-hidden="true">{day.day}</b>
    {count > 1 && <span className="show-date-count" aria-hidden="true">{count}회</span>}
  </button>;
}

function TimeChip({ session, selected, onSelect }: { readonly session: PublicShowSession; readonly selected: boolean; readonly onSelect: (id: number) => void }) {
  return <label className="show-time" data-selected={selected || undefined} data-disabled={!session.bookable || undefined}>
    <input type="radio" name="show-session" value={session.id} checked={selected} disabled={!session.bookable} onChange={() => onSelect(session.id)} className="sr-only" />
    <b className="num">{formatShowTime(session.startsAt)}</b>
    <SessionAvailabilityText availability={sessionAvailability(session)} />
  </label>;
}
