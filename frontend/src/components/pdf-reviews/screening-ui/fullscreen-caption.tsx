import type { ReviewStatus } from "@/features/pdf-reviews/screening-types";
import { statusLabels } from "./fullscreen-dock";

type Props = { readonly name: string; readonly status: ReviewStatus; readonly position: number; readonly total: number; readonly error?: string };

export function FullscreenCaption({ name, status, position, total, error }: Props) {
  if (error) return <p role="alert" data-caption-error>{error} Esc로 닫고 다시 시도해 주세요.</p>;
  return <>
    <p data-caption-detail><span className="num">{position} / {total}</span>, <strong>{name}</strong>, <span data-review-status={status}>{statusLabels[status]}</span></p>
    <p data-caption-detail aria-hidden="true"><kbd>←</kbd><kbd>→</kbd> 쪽 <kbd>N</kbd> 다음 지원서 <kbd>Z</kbd> 되돌리기</p>
  </>;
}
