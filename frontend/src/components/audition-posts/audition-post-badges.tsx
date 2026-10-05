import type { DeadlineBadge } from "@/features/audition-posts/format";

const BADGE_CLASS: Record<DeadlineBadge["kind"], string> = {
  closed: "bg-border-soft text-muted",
  today: "bg-fail-bg text-fail",
  soon: "bg-fail-bg text-fail",
  open: "bg-brand-soft text-brand",
  text: "border border-border bg-white text-muted-strong",
};

/** 마감 상태는 색만으로 구분하지 않도록 항상 글자로도 보여 준다. */
export function DeadlineChip({ badge, className = "" }: { readonly badge: DeadlineBadge; readonly className?: string }) {
  return (
    <span className={`num inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-bold ${BADGE_CLASS[badge.kind]} ${className}`}>
      {badge.label}
    </span>
  );
}
