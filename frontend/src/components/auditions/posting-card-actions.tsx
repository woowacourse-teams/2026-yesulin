"use client";

import type { PostingId } from "@/features/auditions/types";
import { ApplicationLinkButton } from "./application-link-button";
import { DestructiveButton, SecondaryButton } from "./ui-controls";

export function PostingCardActions({
  postingId,
  onEdit,
  onDelete,
}: {
  readonly postingId: PostingId;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <ApplicationLinkButton postingId={postingId} className="px-3" />
      <div className="flex items-center gap-2">
        <SecondaryButton type="button" onClick={onEdit} className="px-3 text-[13px]">
          수정
        </SecondaryButton>
        <DestructiveButton type="button" onClick={onDelete} className="px-3 text-[13px]">
          삭제
        </DestructiveButton>
      </div>
    </div>
  );
}
