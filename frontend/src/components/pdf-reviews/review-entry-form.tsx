"use client";

import { useId, useState } from "react";
import { FieldTextarea, PrimaryButton } from "@/components/ui/controls";
import { isUnauthorized, updatePdfReviewEntry } from "@/features/pdf-reviews/api";
import { decisionLabels, decisionOptions, type ReviewDecision, type ReviewEntry, type ReviewKey } from "@/features/pdf-reviews/types";

type Props = {
  readonly reviewId: ReviewKey;
  readonly entry: ReviewEntry;
  readonly disabled: boolean;
  readonly onBusyChange: (busy: boolean) => void;
  readonly onSaved: (entry: ReviewEntry) => void;
  readonly onUnauthorized: () => void;
};

/** 담당자가 바꿀 수 있는 것은 메모와 결정뿐이다. 입력 중인 내용은 목록이 다시 읽혀도 유지된다. */
export function ReviewEntryForm({ reviewId, entry, disabled, onBusyChange, onSaved, onUnauthorized }: Props) {
  const id = useId();
  const [memo, setMemo] = useState(entry.memo ?? "");
  const [decision, setDecision] = useState<ReviewDecision>(entry.decision);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const dirty = memo !== (entry.memo ?? "") || decision !== entry.decision;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || disabled || !dirty) return;
    onBusyChange(true);
    setSaving(true); setError(""); setSaved(false);
    try {
      onSaved(await updatePdfReviewEntry(reviewId, entry.id, { memo, decision }));
      setSaved(true);
    } catch (cause) {
      if (isUnauthorized(cause)) onUnauthorized();
      setError(cause instanceof Error ? cause.message : "저장하지 못했습니다. 입력한 내용은 그대로 남아 있습니다.");
    } finally { setSaving(false); onBusyChange(false); }
  }

  return <form onSubmit={event => void save(event)} aria-label="메모와 결정" className="rounded-control border border-border p-4">
    <fieldset>
      <legend className="text-sm font-bold">심사 결정</legend>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {decisionOptions.map(option => <label key={option} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-control border px-3 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${decision === option ? "border-brand bg-brand-soft text-brand" : "border-border text-muted-strong"}`}>
          <input type="radio" name={`${id}-decision`} value={option} checked={decision === option} className="sr-only"
            onChange={() => { setDecision(option); setSaved(false); }} />
          {decisionLabels[option]}
        </label>)}
      </div>
    </fieldset>
    <label htmlFor={`${id}-memo`} className="mt-4 block text-sm font-bold">메모</label>
    <FieldTextarea id={`${id}-memo`} value={memo} rows={4} placeholder="이 지원자에 대해 남길 메모" className="mt-2 resize-y"
      onChange={event => { setMemo(event.target.value); setSaved(false); }} />
    {error ? <p role="alert" className="mt-3 break-words rounded-control bg-fail-bg p-3 text-sm text-fail">{error}</p> : null}
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <PrimaryButton type="submit" disabled={!dirty || disabled || saving} className="min-h-12 px-5">{saving ? "저장 중…" : "메모·결정 저장"}</PrimaryButton>
      <p role="status" className="text-sm text-muted-strong">{saved && !dirty ? "저장했습니다." : dirty ? "저장하지 않은 변경이 있습니다." : ""}</p>
    </div>
  </form>;
}
