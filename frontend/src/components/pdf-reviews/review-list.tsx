"use client";

import { SecondaryButton } from "@/components/ui/controls";
import { sameKey, type ReviewKey, type ReviewSummary } from "@/features/pdf-reviews/types";

type Props = {
  readonly reviews: readonly ReviewSummary[];
  readonly selectedId: ReviewKey | null;
  readonly loading: boolean;
  readonly error: string;
  readonly onSelect: (id: ReviewKey) => void;
  readonly onRetry: () => void;
};

const dateText = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date);
};

export function ReviewList({ reviews, selectedId, loading, error, onSelect, onRetry }: Props) {
  return <section aria-label="심사 목록" className="min-w-0 rounded-card border border-border bg-card p-4">
    <h2 className="mb-3 px-1 text-sm font-bold">내 심사</h2>
    {error ? <div role="alert" className="mb-3 rounded-control bg-fail-bg p-3 text-sm text-fail">
      <p className="break-words">{error}</p>
      <SecondaryButton onClick={onRetry} className="mt-2">다시 불러오기</SecondaryButton>
    </div> : null}
    {loading ? <p role="status" className="p-3 text-sm text-muted-strong">심사 목록을 불러오고 있습니다…</p>
      : !reviews.length && !error ? <p className="p-3 text-sm leading-7 text-muted-strong">아직 만든 심사가 없습니다. 제목과 배역을 입력해 첫 심사를 만들어 주세요.</p>
        : <ul className="max-h-[420px] space-y-2 overflow-y-auto">
          {reviews.map(review => {
            const active = sameKey(review.id, selectedId);
            return <li key={String(review.id)}>
              <button type="button" aria-pressed={active} onClick={() => onSelect(review.id)}
                className={`min-h-11 w-full min-w-0 rounded-control border p-3 text-left ${active ? "border-brand bg-brand-soft" : "border-border hover:border-brand-line"}`}>
                <span className="block break-words text-sm font-semibold">{review.title}</span>
                <span className="num mt-1 block text-xs text-muted-strong">배역 {review.roleCount}개 · 지원서 {review.entryCount}개{dateText(review.createdAt) ? ` · ${dateText(review.createdAt)}` : ""}</span>
              </button>
            </li>;
          })}
        </ul>}
  </section>;
}
