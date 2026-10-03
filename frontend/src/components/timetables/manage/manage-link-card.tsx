"use client";

import { useState } from "react";
import { timetableRoutes } from "@/features/timetables/types";

/** 로그인이 없으므로 이 주소가 열쇠다. 만든 직후에는 저장을 더 강하게 권한다. */
export function ManageLinkCard({ manageKey, organizerPhone, justCreated }: {
  readonly manageKey: string;
  readonly organizerPhone: string;
  readonly justCreated: boolean;
}) {
  const [copied, setCopied] = useState<"idle" | "success" | "error">("idle");
  const copy = () => {
    const url = new URL(timetableRoutes.manage(manageKey), window.location.origin).href;
    navigator.clipboard.writeText(url).then(() => setCopied("success"), () => setCopied("error"));
  };
  return (
    <section
      aria-labelledby="manage-link-heading"
      className={`rounded-card border px-4 py-4 ${justCreated ? "border-brand bg-brand-soft" : "border-border bg-card"}`}
    >
      <h2 id="manage-link-heading" className="text-sm font-bold">
        {justCreated ? "일정표를 만들었어요. 이 관리 링크를 꼭 저장해 두세요." : "관리 링크"}
      </h2>
      <p className="mt-1 text-sm text-muted-strong">
        로그인 없이 이 페이지 주소로 다시 들어와요. 링크를 가진 사람은 누구나 고칠 수 있으니 담당자끼리만 나눠 주세요.
        {" "}<span className="num">{organizerPhone}</span> 번호로도 보내 드려요.
      </p>
      <button
        type="button"
        onClick={copy}
        aria-live="polite"
        className="mt-3 min-h-11 w-full rounded-control border border-brand-line bg-card px-3 text-sm font-semibold text-brand hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
      >
        {copied === "success" ? "관리 링크 복사됨" : copied === "error" ? "복사 실패 · 주소창에서 복사해 주세요" : "관리 링크 복사"}
      </button>
    </section>
  );
}
