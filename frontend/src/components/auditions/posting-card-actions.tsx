"use client";

import type { PostingId } from "@/features/auditions/types";
import { ApplicationLinkButton } from "./application-link-button";
import { DestructiveButton, SecondaryButton } from "@/components/ui/controls";

export function PostingCardActions({
  postingId,
  editable,
  onEdit,
  onDelete,
}: {
  readonly postingId: PostingId;
  readonly editable: boolean;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}) {
  return (
    <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
      <ApplicationLinkButton postingId={postingId} className="col-span-2 w-full justify-center whitespace-nowrap px-3 md:col-span-1 md:w-auto" />
      <SecondaryButton type="button" onClick={onEdit} disabled={!editable} title={editable ? undefined : "모집 시작 전 공고만 수정할 수 있습니다."} className="w-full whitespace-nowrap px-3 text-dense md:w-auto">
        수정
      </SecondaryButton>
      <DestructiveButton type="button" onClick={onDelete} className="w-full whitespace-nowrap px-3 text-dense md:w-auto">
        삭제
      </DestructiveButton>
    </div>
  );
}
