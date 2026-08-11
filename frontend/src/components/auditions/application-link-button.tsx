"use client";

import { useState } from "react";
import { publicApplicationRoute } from "@/features/auditions/routes";
import type { PostingId } from "@/features/auditions/types";
import { SecondaryButton } from "@/components/ui/controls";
import { useToast } from "./toast";

export function ApplicationLinkButton({
  postingId,
  className = "",
}: {
  readonly postingId: PostingId;
  readonly className?: string;
}) {
  const [copying, setCopying] = useState(false);
  const toast = useToast();

  async function copyApplicationLink() {
    setCopying(true);
    try {
      const applicationUrl = `${window.location.origin}${publicApplicationRoute(postingId)}`;
      await navigator.clipboard.writeText(applicationUrl);
      toast("지원 링크를 복사했습니다.", { type: "success" });
    } catch {
      toast("지원 링크를 복사하지 못했습니다. 다시 시도해 주세요.", { type: "error" });
    } finally {
      setCopying(false);
    }
  }

  return (
    <SecondaryButton
      type="button"
      onClick={copyApplicationLink}
      disabled={copying}
      className={`shrink-0 gap-2 ${className}`}
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-[1.7]">
        <path d="M7.5 12.5 12.5 7.5M6.2 8.5 4.6 10.1a3.25 3.25 0 0 0 4.6 4.6l1.6-1.6M13.8 11.5l1.6-1.6a3.25 3.25 0 0 0-4.6-4.6L9.2 6.9" />
      </svg>
      {copying ? "복사 중…" : "지원 링크 복사"}
    </SecondaryButton>
  );
}
