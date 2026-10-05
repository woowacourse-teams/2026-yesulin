import type { AuditionPostSummary } from "./types";

const KST_DATE = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** 원문 작성 시각을 `2026.10.04` 형식의 한국 날짜로 보여 준다. */
export function formatPostedDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(KST_DATE.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}.${parts.month}.${parts.day}`;
}

/** 한국 날짜 기준 오늘(`YYYY-MM-DD`). */
export function kstToday(now: Date = new Date()): string {
  const parts = Object.fromEntries(KST_DATE.formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export type DeadlineBadge = { readonly kind: "closed" | "today" | "soon" | "open" | "text"; readonly label: string };

/**
 * 마감 표시. 서버의 `closed`가 정본이고, 날짜 마감은 남은 일수를 붙인다. 날짜가 아니면 원문 표현을 그대로 쓴다.
 */
export function deadlineBadge(
  post: Pick<AuditionPostSummary, "closed" | "deadline" | "deadlineText">,
  today: string = kstToday(),
): DeadlineBadge {
  if (post.closed) return { kind: "closed", label: "마감" };
  if (!post.deadline) return { kind: "text", label: post.deadlineText || "상시" };
  const days = Math.round((Date.parse(`${post.deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
  if (days <= 0) return { kind: "today", label: "오늘 마감" };
  if (days <= 3) return { kind: "soon", label: `D-${days}` };
  return { kind: "open", label: `D-${days}` };
}

/** 원문 마감을 `10월 31일까지`처럼 읽기 쉽게 바꾼다. 날짜가 아니면 원문 그대로 둔다. */
export function formatDeadline(post: Pick<AuditionPostSummary, "deadline" | "deadlineText">): string {
  if (!post.deadline) return post.deadlineText || "상시";
  const [, month, day] = post.deadline.split("-").map(Number);
  return `${month}월 ${day}일까지`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
