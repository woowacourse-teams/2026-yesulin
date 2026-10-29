"use client";

import { useEffect } from "react";
import { startReviewTimer } from "@/features/analytics/review-timer";
import type { ProductProperties } from "@/features/analytics/posthog-contract";

export function ReviewMeasurement({ workflow, reviewId, itemId, round }: {
  workflow: ProductProperties["workflow"]; reviewId: string; itemId: string; round?: number;
}) {
  useEffect(() => startReviewTimer({ workflow, review_id: reviewId, item_id: itemId, round }), [workflow, reviewId, itemId, round]);
  return null;
}
