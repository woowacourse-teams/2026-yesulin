import { trackProductEvent } from "./product-analytics";
import type { ProductProperties } from "./posthog-contract";

export type ReviewAction = NonNullable<ProductProperties["review_action"]>;
export type ReviewInput = NonNullable<ProductProperties["input_method"]>;
export type ReviewView = NonNullable<ProductProperties["review_view"]>;

/** 직접 조작 시도만 기록한다. 자동 이동·렌더·저장 성공과 구분한다. */
export function trackReviewAction(reviewId: string, itemId: string, view: ReviewView, action: ReviewAction, input: ReviewInput = "button") {
  trackProductEvent("review_basic_action", {
    metric_version: 1, workflow: "producer_pdf", review_id: reviewId, item_id: itemId,
    review_action: action, input_method: input, review_view: view,
  });
}
