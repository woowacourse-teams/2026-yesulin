import type { EditableAuditionPostStatus } from "@/features/audition-posts/editing";

export function AuditionPostStatusBadge({ status }: { readonly status: EditableAuditionPostStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status === "PUBLISHED" ? "bg-pass-bg text-pass" : "bg-border-soft text-muted-strong"}`}>
      {status === "PUBLISHED" ? "공개 중" : "숨김"}
    </span>
  );
}
