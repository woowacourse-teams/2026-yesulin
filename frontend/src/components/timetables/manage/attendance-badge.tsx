import type { Attendance } from "@/features/timetables/types";

const LABELS: Record<Attendance, string> = { UNANSWERED: "미응답", ATTENDING: "참석", ABSENT: "불참" };
const TONES: Record<Attendance, string> = {
  UNANSWERED: "bg-surface text-muted-strong",
  ATTENDING: "bg-pass-bg text-pass",
  ABSENT: "bg-fail-bg text-fail",
};

export function attendanceLabel(attendance: Attendance): string {
  return LABELS[attendance];
}

export function AttendanceBadge({ attendance }: { readonly attendance: Attendance }) {
  return (
    <span className={`shrink-0 rounded px-1.5 text-[11px] font-bold leading-5 ${TONES[attendance]}`}>{LABELS[attendance]}</span>
  );
}
