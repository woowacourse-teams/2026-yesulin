import type { PostingPhase, ReviewStatus } from "@/features/auditions/types";
import { PHASE_LABELS, statusText } from "@/features/auditions/labels";

const STATUS_TEXT = {
  PASS: "text-pass",
  FAIL: "text-fail",
  ABSENT: "text-absent",
  ETC: "text-etc",
  PENDING: "text-pending",
} as const satisfies Record<ReviewStatus, string>;

const STATUS_BG = {
  PASS: "bg-pass-bg",
  FAIL: "bg-fail-bg",
  ABSENT: "bg-absent-bg",
  ETC: "bg-etc-bg",
  PENDING: "bg-pending-bg",
} as const satisfies Record<ReviewStatus, string>;

const PHASE_TONE = {
  OPEN: "text-pass bg-pass-bg",
  UPCOMING: "text-upcoming bg-upcoming-bg",
  RECRUIT_CLOSED: "text-warn bg-warn-bg",
  FINISHED: "text-muted bg-border-soft",
} as const satisfies Record<PostingPhase, string>;

const PHASE_DOT = {
  OPEN: "bg-pass",
  UPCOMING: "bg-brand-line",
  RECRUIT_CLOSED: "bg-warn",
  FINISHED: "bg-sidebar-muted",
} as const satisfies Record<PostingPhase, string>;

/** 사진 위에 얹는 배지는 상태 배경 대신 반투명 흰 배경을 쓴다. */
export function StatusBadge({
  status,
  memo = "",
  size = "md",
  onPhoto = false,
}: {
  status: ReviewStatus;
  memo?: string;
  size?: "sm" | "md";
  onPhoto?: boolean;
}) {
  const scale = size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-[13px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-transparent font-semibold ${scale} ${STATUS_TEXT[status]} ${
        onPhoto ? "border-white/60 bg-white/95 shadow-[var(--shadow-1)]" : STATUS_BG[status]
      }`}
    >
      <span aria-hidden="true" className="h-[5px] w-[5px] shrink-0 rounded-full bg-current" />
      {statusText(status, memo)}
    </span>
  );
}

export function PhaseTag({
  phase,
  variant = "default",
}: {
  phase: PostingPhase;
  variant?: "default" | "sidebar" | "sidebarActive";
}) {
  const inSidebar = variant !== "default";
  const tone = variant === "default"
    ? PHASE_TONE[phase]
    : variant === "sidebarActive"
      ? "border-white/20 bg-white/10 text-white"
      : "border-sidebar-line bg-white/[0.035] text-sidebar-text";

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap border font-semibold tracking-[0.005em] ${
        inSidebar ? "h-5 gap-1.5 rounded-md px-1.5 text-[10.5px]" : "h-6 rounded-lg border-transparent px-2 text-xs font-bold"
      } ${tone}`}
    >
      {inSidebar ? <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${PHASE_DOT[phase]}`} /> : null}
      {PHASE_LABELS[phase]}
    </span>
  );
}
