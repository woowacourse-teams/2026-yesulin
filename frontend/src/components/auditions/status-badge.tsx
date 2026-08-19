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

const STATUS_BORDER = {
  PASS: "border-pass/30",
  FAIL: "border-fail/30",
  ABSENT: "border-absent/30",
  ETC: "border-etc/30",
  PENDING: "border-pending/30",
} as const satisfies Record<ReviewStatus, string>;

const PHASE_TONE = {
  DRAFT: "border-border text-muted-strong bg-border-soft",
  OPEN: "border-brand bg-brand text-white",
  UPCOMING: "border-brand-line bg-card text-brand-strong",
  RECRUIT_CLOSED: "border-absent/25 bg-absent-bg text-absent",
  FINISHED: "border-foreground bg-foreground text-white",
} as const satisfies Record<PostingPhase, string>;

const PHASE_DOT = {
  DRAFT: "bg-sidebar-muted",
  OPEN: "bg-brand",
  UPCOMING: "bg-brand-line",
  RECRUIT_CLOSED: "bg-sidebar-muted",
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
  const scale = size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-dense";

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold ${scale} ${STATUS_TEXT[status]} ${
        onPhoto ? "border-white/60 bg-white/95 shadow-[var(--shadow-1)]" : `${STATUS_BG[status]} ${STATUS_BORDER[status]}`
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
      ? "text-white/90"
      : "text-sidebar-text/80";
  const dot = variant === "sidebarActive" ? "bg-white" : inSidebar ? PHASE_DOT[phase] : "bg-current";

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap font-semibold tracking-[0.005em] ${
        inSidebar ? "h-5 gap-1.5 px-0.5 text-xs" : "h-6 gap-1.5 rounded-full border px-2 text-xs font-bold"
      } ${tone}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {PHASE_LABELS[phase]}
    </span>
  );
}
