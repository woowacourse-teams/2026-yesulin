"use client";

import { SecondaryButton, TextButton } from "@/components/ui/controls";
import { formatInstant } from "@/features/timetables/time";
import type { TimetableRequest } from "@/features/timetables/types";

/**
 * 바운더리 안에 맞는 시간이 없는 배우가 남긴 시간 조정 요청. 보드에서 배우를 옮겨 저장하면 자동으로 처리되고,
 * 전화 등으로 해결했다면 처리 완료로 닫는다.
 */
export function RequestsPanel({ requests, busy, onFocusActor, onResolve }: {
  readonly requests: readonly TimetableRequest[];
  readonly busy: boolean;
  readonly onFocusActor: (actorId: number) => void;
  readonly onResolve: (requestId: number) => void;
}) {
  if (requests.length === 0) return null;
  return (
    <section aria-labelledby="timetable-requests-heading" className="rounded-card border border-warn/40 bg-warn-bg px-4 py-4">
      <h2 id="timetable-requests-heading" className="text-base font-bold text-foreground">
        시간 조정 요청 <span className="num text-warn">{requests.length}건</span>
      </h2>
      <p className="mt-1 text-sm text-muted-strong">배우를 다른 시간으로 옮겨 저장하면 요청이 처리되고 배우에게 변경 안내가 가요.</p>
      <ul className="mt-3 space-y-2">
        {requests.map((request) => (
          <li key={request.id} className="rounded-control border border-border bg-card px-3 py-3">
            <p className="text-sm font-semibold">
              {request.actorName} <span className="text-xs font-normal text-muted">{formatInstant(request.createdAt)}</span>
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground">{request.message}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <SecondaryButton onClick={() => onFocusActor(request.actorId)} className="min-h-9 px-3">보드에서 고르기</SecondaryButton>
              <TextButton onClick={() => onResolve(request.id)} disabled={busy} className="min-h-9 px-3">처리 완료</TextButton>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
