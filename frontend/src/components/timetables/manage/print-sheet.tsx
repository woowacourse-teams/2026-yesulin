"use client";

import { useEffect, useId, useState } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { FieldInput, PrimaryButton, TextLink } from "@/components/ui/controls";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { getTimetableBoard } from "@/features/timetables/api";
import { checkItemsOf, printDays } from "@/features/timetables/print-sheet";
import { formatDate } from "@/features/timetables/time";
import { TIMETABLE_KEY_PATTERN, timetableRoutes, type TimetableBoard } from "@/features/timetables/types";

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "notFound" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly board: TimetableBoard };

const CELL = "border border-border px-3 py-2 text-left align-top print:border-black";

export function TimetablePrintSheet({ manageKey }: { readonly manageKey: string }) {
  const validKey = TIMETABLE_KEY_PATTERN.test(manageKey);
  const [state, setState] = useState<LoadState>(() => (validKey ? { status: "loading" } : { status: "notFound" }));
  const [reloadToken, setReloadToken] = useState(0);
  const [checks, setChecks] = useState("");
  const id = useId();

  useEffect(() => {
    if (!validKey) return;
    let active = true;
    getTimetableBoard(manageKey)
      .then((board) => { if (active) setState({ status: "ready", board }); })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof AuditionRequestError && cause.status === 404) setState({ status: "notFound" });
        else setState({ status: "error", message: cause instanceof AuditionRequestError ? cause.message : "일정표를 불러오지 못했어요." });
      });
    return () => { active = false; };
  }, [manageKey, validKey, reloadToken]);

  if (state.status === "loading") {
    return <p role="status" className="px-4 py-14 text-center text-muted">일정표를 불러오는 중…</p>;
  }
  if (state.status === "notFound") {
    return <p className="px-4 py-14 text-center font-semibold">일정표를 찾을 수 없어요. 관리 링크를 다시 확인해 주세요.</p>;
  }
  if (state.status === "error") {
    return <ScreenError message={state.message} onRetry={() => { setState({ status: "loading" }); setReloadToken((value) => value + 1); }} />;
  }

  const { board } = state;
  const days = printDays(board);
  const items = checkItemsOf(checks);
  const unassigned = board.actors.filter((actor) => !actor.slot);

  return (
    <main className="min-h-dvh break-keep bg-surface pb-16 text-foreground print:bg-white print:pb-0">
      <style>{"@page { size: A4; margin: 12mm; }"}</style>
      <div className="mx-auto max-w-[860px] px-4 py-6 md:px-8 print:max-w-none print:p-0">
        <div className="mb-5 space-y-3 rounded-card border border-border bg-card px-5 py-4 print:hidden">
          <div className="flex items-center justify-between gap-3">
            <TextLink href={timetableRoutes.manage(manageKey)} className="px-0">← 일정표로 돌아가기</TextLink>
            <PrimaryButton onClick={() => window.print()}>인쇄</PrimaryButton>
          </div>
          <div>
            <label htmlFor={`${id}-checks`} className="text-sm font-semibold">비고에 넣을 체크 항목 <span className="font-normal text-muted">(선택)</span></label>
            <FieldInput
              id={`${id}-checks`}
              value={checks}
              onChange={(event) => setChecks(event.target.value)}
              placeholder="예: MR, 프로필 사진, 대본"
              className="mt-2"
            />
          </div>
        </div>

        <article className="rounded-card border border-border bg-card px-5 py-6 md:px-8 print:rounded-none print:border-0 print:p-0 print:text-black">
          <header className="border-b-2 border-foreground pb-3 print:border-black">
            <h1 className="text-xl font-bold">{board.title} 오디션 일정표</h1>
            <p className="mt-1 text-sm text-muted-strong print:text-black">
              {board.organizerName}{board.location ? ` · ${board.location}` : ""}
            </p>
          </header>

          {days.length === 0 ? <p className="mt-6 text-sm text-muted">시간이 정해진 배우가 없어요.</p> : null}
          {days.map((day) => (
            <section key={day.date} className="mt-6">
              <h2 className="text-lg font-bold">{formatDate(day.date)}</h2>
              <table className="mt-2 w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-surface print:bg-white">
                    <th scope="col" className={`${CELL} w-[22%]`}>이름</th>
                    <th scope="col" className={`${CELL} w-[24%]`}>연락처</th>
                    <th scope="col" className={CELL}>비고</th>
                  </tr>
                </thead>
                {day.slots.map((slot) => (
                  <tbody key={slot.startTime} className="break-inside-avoid">
                    <tr>
                      <th scope="colgroup" colSpan={3} className={`${CELL} num bg-brand-soft font-bold print:bg-white`}>
                        {slot.startTime}~{slot.endTime}
                      </th>
                    </tr>
                    {slot.actors.map((actor) => (
                      <tr key={actor.id}>
                        <td className={`${CELL} font-semibold`}>{actor.name}</td>
                        <td className={`${CELL} num`}>{actor.phone}</td>
                        <td className={CELL}>
                          <span className="flex flex-wrap gap-x-4 gap-y-1">
                            {actor.attendance === "ABSENT" ? <strong className="text-fail print:text-black">불참</strong> : null}
                            {items.map((item) => <span key={item} className="whitespace-nowrap">☐ {item}</span>)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </section>
          ))}

          {unassigned.length > 0 ? (
            <section className="mt-6 break-inside-avoid">
              <h2 className="text-lg font-bold">미배정</h2>
              <p className="mt-1 text-sm">{unassigned.map((actor) => `${actor.name}(${actor.phone})`).join(", ")}</p>
            </section>
          ) : null}
        </article>
      </div>
    </main>
  );
}
