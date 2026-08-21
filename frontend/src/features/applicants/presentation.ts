import type { ApplicantAnswerValue } from "./types";

export function formatApplicantDate(value: string | number, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(date);
}

export function answerValueText(value: ApplicantAnswerValue) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "미입력";
    if (typeof value[0] === "string") return `${value.length}개 파일`;
    return value.map((entry) => {
      if (typeof entry === "object" && entry && "year" in entry && "title" in entry && "part" in entry) {
        return `${entry.year} · ${entry.title} · ${entry.part}`;
      }
      return String(entry);
    }).join("\n");
  }
  if (typeof value === "object" && value && "height" in value && "weight" in value) {
    return `${value.height}cm · ${value.weight}kg`;
  }
  return "미입력";
}

export function submissionAvailability(editable: boolean) {
  void editable;
  return { label: "제출 완료", tone: "border-border bg-surface text-muted-strong", detail: "제출 당시 스냅샷을 읽기 전용으로 확인할 수 있어요." };
}
