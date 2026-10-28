import type { AdminActorPageSummary } from "./types";

export type AdminActorPageStatusTone = "public" | "locked" | "hidden" | "private";

export const adminActorPageRoutes = {
  list: "/admin/actor-pages",
  detail: (publicId: string) => `/admin/actor-pages/${encodeURIComponent(publicId)}`,
} as const;

/** 잠금은 상태도 비공개로 바꾸므로 잠금을 먼저 본다. 자동 비공개는 배우가 직접 내린 비공개와 구분한다. */
export function adminActorPageStatus(
  page: Pick<AdminActorPageSummary, "status" | "locked" | "autoHiddenReason">,
): { readonly label: string; readonly tone: AdminActorPageStatusTone } {
  if (page.locked) return { label: "잠김", tone: "locked" };
  if (page.status === "PUBLIC") return { label: "공개 중", tone: "public" };
  if (page.autoHiddenReason === "UNDER_14") return { label: "자동 비공개(만 14세 미만)", tone: "hidden" };
  if (page.autoHiddenReason === "MISSING_REQUIRED") return { label: "자동 비공개(필수 항목 누락)", tone: "hidden" };
  return { label: "비공개", tone: "private" };
}

/** 운영자 화면과 변경 기록에서 아이디를 같은 모양으로 쓴다. */
export function adminActorHandleLabel(handle: string | null): string {
  return handle ? `@${handle}` : "아이디 없음";
}
