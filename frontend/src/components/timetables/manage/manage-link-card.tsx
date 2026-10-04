"use client";

import { useState } from "react";
import { timetableRoutes } from "@/features/timetables/types";

/** 로그인이 없으므로 이 주소가 열쇠다. 만든 직후 한 번 강조해 저장을 권하고, 닫으면 설정 메뉴에서 복사한다. */
export function ManageLinkNotice({ manageKey, onDismiss }: { readonly manageKey: string; readonly onDismiss: () => void }) {
  const [copied, setCopied] = useState<"idle" | "success" | "error">("idle");
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control border border-brand-line bg-brand-soft px-4 py-3 text-sm">
      <p className="min-w-0 flex-1 font-semibold text-foreground">이 페이지 주소가 관리 링크예요. 꼭 저장해 두세요.</p>
      <button
        type="button"
        aria-live="polite"
        onClick={() => {
          const url = new URL(timetableRoutes.manage(manageKey), window.location.origin).href;
          navigator.clipboard.writeText(url).then(() => setCopied("success"), () => setCopied("error"));
        }}
        className="min-h-9 rounded-control bg-brand px-3 font-semibold text-white hover:bg-brand-strong"
      >
        {copied === "success" ? "복사됨" : copied === "error" ? "주소창에서 복사해 주세요" : "링크 복사"}
      </button>
      <button type="button" aria-label="닫기" onClick={onDismiss} className="inline-flex size-9 items-center justify-center rounded-control text-muted-strong hover:bg-card">✕</button>
    </div>
  );
}

export function copyManageLink(manageKey: string): Promise<void> {
  return navigator.clipboard.writeText(new URL(timetableRoutes.manage(manageKey), window.location.origin).href);
}
