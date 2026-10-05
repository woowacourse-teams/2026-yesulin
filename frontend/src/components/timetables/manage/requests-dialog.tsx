"use client";

import { SecondaryButton, TextButton } from "@/components/ui/controls";
import { formatInstant } from "@/features/timetables/time";
import type { TimetableRequest } from "@/features/timetables/types";
import { SheetDialog } from "./sheet-dialog";

/** 맞는 빈 시간이 없는 배우가 남긴 요청. 옮기면 저장할 때 요청이 닫히고, 전화로 해결했다면 처리 완료로 닫는다. */
export function RequestsDialog({ requests, busy, onMove, onResolve, onClose }: {
  readonly requests: readonly TimetableRequest[];
  readonly busy: boolean;
  readonly onMove: (actorId: number) => void;
  readonly onResolve: (requestId: number) => void;
  readonly onClose: () => void;
}) {
  return (
    <SheetDialog title={`시간 조정 요청 ${requests.length}건`} busy={busy} onClose={onClose}>
      {requests.length === 0 ? <p className="py-6 text-center text-sm text-muted">남은 요청이 없어요.</p> : null}
      <ul className="space-y-3">
        {requests.map((request) => (
          <li key={request.id} className="rounded-control border border-border px-3 py-3">
            <p className="text-sm font-semibold">
              {request.actorName} <span className="text-xs font-normal text-muted">{formatInstant(request.createdAt)}</span>
            </p>
            <p className="mt-1 whitespace-pre-line text-sm">{request.message}</p>
            <div className="mt-2 flex gap-2">
              <SecondaryButton onClick={() => onMove(request.actorId)} className="min-h-9 px-3">시간 옮기기</SecondaryButton>
              <TextButton onClick={() => onResolve(request.id)} disabled={busy} className="min-h-9 px-3">처리 완료</TextButton>
            </div>
          </li>
        ))}
      </ul>
    </SheetDialog>
  );
}
