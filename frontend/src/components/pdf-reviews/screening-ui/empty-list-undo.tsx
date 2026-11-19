"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { trackReviewAction, type ReviewInput, type ReviewView } from "@/features/analytics/review-actions";
import { isUnauthorized, updatePdfReviewEntry } from "@/features/pdf-reviews/api";
import { reportReviewError } from "@/features/pdf-reviews/report-review-error";
import type { ReviewStatus } from "@/features/pdf-reviews/screening-types";
import { sameKey, type ReviewDecision, type ReviewDetail, type ReviewEntry } from "@/features/pdf-reviews/types";
import type { LastDecision } from "./fullscreen-dock";

type Props = {
  readonly review: ReviewDetail; readonly last: LastDecision; readonly view: ReviewView;
  readonly onSaved: (entry: ReviewEntry) => void; readonly onDone: () => void; readonly onUnauthorized: () => void;
};

export function EmptyListUndo({ review, last, view, onSaved, onDone, onUnauthorized }: Props) {
  const [error, setError] = useState("");
  const pending = useRef(false);
  const undo = async (input: ReviewInput) => {
    const entry = review.entries.find(item => sameKey(item.id, last.id));
    if (!entry || pending.current) return;
    pending.current = true; setError("");
    trackReviewAction(String(review.id), String(last.id), view, "decision_undo", input);
    try { onSaved(await updatePdfReviewEntry(review.id, entry.id, { decision: toDecision(last.previous), memo: entry.memo ?? "" })); onDone(); }
    catch (cause) { reportUndoFailure(cause, onUnauthorized); setError("되돌리지 못했습니다. 다시 시도해 주세요."); }
    finally { pending.current = false; }
  };
  const onShortcut = useEffectEvent((event: KeyboardEvent) => { if (undoShortcut(event)) { event.preventDefault(); void undo("shortcut"); } });
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => onShortcut(event);
    window.addEventListener("keydown", keyboard); return () => window.removeEventListener("keydown", keyboard);
  }, []);
  if (!error) return null;
  return <p role="alert" className="mb-6 text-sm text-fail">{error}</p>;
}

function toDecision(status: ReviewStatus): ReviewDecision {
  if (status === "ETC") return "HOLD";
  return status;
}

function undoShortcut(event: KeyboardEvent) {
  if (event.code !== "KeyZ" || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.repeat || event.isComposing) return false;
  return !(event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable=true]'));
}

function reportUndoFailure(cause: unknown, onUnauthorized: () => void) {
  reportReviewError(cause, "review_save");
  if (isUnauthorized(cause)) onUnauthorized();
}
