import { AUDITION_POST_STATUS_LABELS, type EditableAuditionPostStatus } from "@/features/audition-posts/editing";

const TONES: Record<EditableAuditionPostStatus, string> = {
  PENDING: "bg-warn-bg text-warn",
  PUBLISHED: "bg-pass-bg text-pass",
  HIDDEN: "bg-border-soft text-muted-strong",
};

/** 공고 공개 상태 배지. 운영자와 기획사 화면이 같은 이름과 색을 쓴다. */
export function AuditionPostStatusBadge({ status }: { readonly status: EditableAuditionPostStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TONES[status]}`}>
      {AUDITION_POST_STATUS_LABELS[status]}
    </span>
  );
}
