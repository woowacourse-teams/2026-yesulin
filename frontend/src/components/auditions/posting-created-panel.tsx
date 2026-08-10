"use client";

import { useState } from "react";
import { DialogFooter, DialogHeader } from "./modal-shell";
import { FieldInput, PrimaryButton, SecondaryButton } from "./ui-controls";

export const POSTING_CREATED_TITLE_ID = "posting-created-title";

export function PostingCreatedPanel({
  postingTitle,
  applicationUrl,
  onClose,
}: {
  readonly postingTitle: string;
  readonly applicationUrl: string;
  readonly onClose: () => void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  async function copyApplicationUrl() {
    try {
      await navigator.clipboard.writeText(applicationUrl);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DialogHeader
        id={POSTING_CREATED_TITLE_ID}
        title="공고가 생성되었습니다"
        subtitle="외부 공고에 지원서 링크를 붙여 넣어 지원자를 예술in으로 연결하세요."
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-7 md:px-6 md:py-8">
        <div className="mx-auto max-w-[620px]">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-pass-bg text-pass">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2">
              <path d="m5 12 4 4 10-10" />
            </svg>
          </span>
          <h3 className="mt-5 text-xl font-bold tracking-[-0.02em]">{postingTitle}</h3>
          <p className="mt-2 text-base leading-relaxed text-muted-strong">
            아래 URL을 OTR 등 외부 오디션 공고의 지원 링크로 사용해 주세요.
          </p>

          <div className="mt-6 rounded-card border border-brand-line bg-brand-soft p-4">
            <label htmlFor="created-posting-url" className="text-sm font-semibold text-brand-strong">
              공개 지원서 링크
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <FieldInput
                id="created-posting-url"
                readOnly
                value={applicationUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="min-w-0 flex-1 bg-white font-mono text-sm"
              />
              <PrimaryButton
                type="button"
                data-autofocus="true"
                onClick={copyApplicationUrl}
                className="shrink-0 sm:min-w-28"
              >
                {copyState === "copied" ? "복사 완료" : "링크 복사"}
              </PrimaryButton>
            </div>
            <p className={`mt-2 text-sm ${copyState === "error" ? "font-medium text-fail" : "text-muted-strong"}`} role={copyState === "error" ? "alert" : "status"}>
              {copyState === "copied" ? "클립보드에 복사했습니다." : copyState === "error" ? "자동 복사에 실패했습니다. URL을 직접 선택해 복사해 주세요." : "공고마다 고유한 링크가 생성됩니다."}
            </p>
          </div>

          <div className="mt-5 rounded-control border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-muted-strong">
            지원자는 외부 공고에서 이 링크를 눌러 예술in 지원서 작성 화면으로 이동하게 됩니다.
          </div>
        </div>
      </div>
      <DialogFooter>
        <SecondaryButton type="button" onClick={onClose}>닫기</SecondaryButton>
      </DialogFooter>
    </div>
  );
}
