import type { PostingPhase, ReviewStatus } from "@/features/screening/types";
import { PHASE_LABELS, statusText } from "@/features/screening/labels";

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
  const scale = size === "sm" ? "text-[11px] px-[7px] py-0.5" : "text-xs px-[9px] py-[3px]";

  return (
    <span
      className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-full font-semibold ${scale} ${STATUS_TEXT[status]} ${
        onPhoto ? "bg-white/95" : STATUS_BG[status]
      }`}
    >
      <span aria-hidden="true" className="h-[5px] w-[5px] shrink-0 rounded-full bg-current" />
      {statusText(status, memo)}
    </span>
  );
}

export function PhaseTag({ phase }: { phase: PostingPhase }) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.02em] ${PHASE_TONE[phase]}`}
    >
      {PHASE_LABELS[phase]}
    </span>
  );
}
