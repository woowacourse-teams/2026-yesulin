"use client";

import type { Attendance, TimetableBoard } from "@/features/timetables/types";

type Step = { readonly label: string; readonly detail: string; readonly done: boolean };

/**
 * 작성 중에는 지금 할 일을 3단계로 보여 주고, 확정 뒤에는 안내·추가 합격·요청 현황을 보여 준다. 설명 문장을 대신한다.
 */
export function StatusSteps({ board, unassignedCount, additionalCount, onOpenRequests }: {
  readonly board: TimetableBoard;
  readonly unassignedCount: number;
  readonly additionalCount: number;
  readonly onOpenRequests: () => void;
}) {
  if (board.status === "PUBLISHED") {
    const invitedActors = board.actors.filter((actor) => actor.invited);
    const invited = invitedActors.length;
    const countOf = (attendance: Attendance) => invitedActors.filter((actor) => actor.attendance === attendance).length;
    return (
      <ul className="flex flex-wrap gap-2 text-sm" aria-label="일정표 현황">
        <li className="rounded-full bg-pass-bg px-3 py-1.5 font-semibold text-pass">확정 · 안내 <span className="num">{invited}</span>명</li>
        {invited > 0 ? (
          <li className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-muted-strong">
            참석 <span className="num text-pass">{countOf("ATTENDING")}</span> · 불참 <span className="num text-fail">{countOf("ABSENT")}</span>
            {" "}· 미응답 <span className="num">{countOf("UNANSWERED")}</span>
          </li>
        ) : null}
        {additionalCount > 0 ? (
          <li className="rounded-full bg-etc-bg px-3 py-1.5 font-semibold text-etc">추가 합격 <span className="num">{additionalCount}</span>명</li>
        ) : null}
        {unassignedCount > 0 ? (
          <li className="rounded-full bg-warn-bg px-3 py-1.5 font-semibold text-warn">미배정 <span className="num">{unassignedCount}</span>명</li>
        ) : null}
        {board.requests.length > 0 ? (
          <li>
            <button type="button" onClick={onOpenRequests} className="rounded-full bg-warn px-3 py-1.5 font-semibold text-white hover:opacity-90">
              시간 변경 문의 <span className="num">{board.requests.length}</span>건 보기
            </button>
          </li>
        ) : null}
      </ul>
    );
  }

  const assigned = board.actors.length - unassignedCount;
  const steps: Step[] = [
    { label: "합격자 등록", detail: board.actors.length > 0 ? `${board.actors.length}명` : "아직 없음", done: board.actors.length > 0 },
    { label: "시간 배정", detail: board.actors.length > 0 ? `${assigned}/${board.actors.length}명` : "등록 후", done: board.actors.length > 0 && unassignedCount === 0 },
    { label: "일정 확정", detail: "배우에게 문자 발송", done: false },
  ];
  const current = steps.findIndex((step) => !step.done);
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="진행 단계">
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={index === current ? "step" : undefined}
          className={`flex items-center gap-2 rounded-control border px-3 py-2 ${
            index === current ? "border-brand bg-brand-soft" : step.done ? "border-border bg-card" : "border-border bg-surface"
          }`}
        >
          <span
            aria-hidden="true"
            className={`num flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              step.done ? "bg-pass text-white" : index === current ? "bg-brand text-white" : "bg-border text-muted-strong"
            }`}
          >
            {step.done ? "✓" : index + 1}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-foreground">{step.label}</span>
            <span className="num block truncate text-xs text-muted">{step.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
