"use client";

import { useState } from "react";
import { showRoutes } from "@/features/shows/types";

/** 인스타그램·문자로 공유할 관객용 공연 링크를 복사한다. */
export function CopyShowLinkButton({ showId }: { readonly showId: string }) {
  const [state, setState] = useState<"idle" | "success" | "error">("idle");
  const copy = () => {
    const url = new URL(showRoutes.detail(showId), window.location.origin).href;
    navigator.clipboard.writeText(url).then(() => setState("success"), () => setState("error"));
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="min-h-11 rounded-control border border-border px-3 text-sm font-semibold text-muted-strong hover:border-brand-line"
    >
      {state === "success" ? "링크 복사됨" : state === "error" ? "복사 실패 · 다시 시도" : "공연 링크 복사"}
    </button>
  );
}
