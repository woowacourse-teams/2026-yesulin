"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { ShowFormModal } from "@/components/shows/manage/show-form-modal";
import { ShowManagementApiProvider } from "@/components/shows/manage/show-management-api-context";
import { FilterChip, PrimaryButton } from "@/components/ui/controls";
import { adminShowManagementApi, adminShowRoutes } from "@/features/admin/show-api";
import type { AdminShow, AdminShowSession, AdminShowStatus } from "@/features/admin/types";
import { formatDateTime, orDash } from "./admin-format";
import { AdminShowHostNameDialog } from "./admin-show-host-name-dialog";

type Props = {
  readonly shows: readonly AdminShow[];
  /** 지난 회차를 가르는 기준 시각이다. 대시보드를 불러온 시각을 쓴다. */
  readonly now: number;
};

type StatusFilter = AdminShowStatus | "ALL";

const HEADERS = ["공연", "주최(관객 화면)", "기획사 계정", "상태", "회차", "예매 매수 / 정원", "예매", "취소", "등록", "회차별"];

const STATUS_LABEL: Record<AdminShowStatus, string> = {
  DRAFT: "초안",
  OPEN: "예매 중",
  CLOSED: "마감",
};

const STATUS_FILTERS: readonly { readonly label: string; readonly value: StatusFilter }[] = [
  { label: "전체", value: "ALL" },
  { label: "예매 중", value: "OPEN" },
  { label: "초안", value: "DRAFT" },
  { label: "마감", value: "CLOSED" },
];

function ratio(reserved: number, capacity: number): number | null {
  return capacity > 0 ? Math.min(1, reserved / capacity) : null;
}

function OccupancyBar({ reserved, capacity }: { readonly reserved: number; readonly capacity: number }) {
  const value = ratio(reserved, capacity);
  return (
    <div className="flex min-w-36 items-center gap-2">
      <span className="num text-foreground">{reserved} / {capacity}</span>
      {value === null ? null : (
        <>
          <span aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-border-soft">
            <span
              className="block h-full rounded-full bg-brand"
              style={{ width: `${Math.round(value * 100)}%` }}
            />
          </span>
          <span className="text-xs num text-muted">{Math.round(value * 100)}%</span>
        </>
      )}
    </div>
  );
}

function SessionTable({ sessions, now, external }: {
  readonly sessions: readonly AdminShowSession[];
  readonly now: number;
  /** 외부 링크 공연은 정원·예매가 없어 회차 시각만 보여 준다. */
  readonly external: boolean;
}) {
  if (sessions.length === 0) {
    return <p className="px-4 py-4 text-sm text-muted">등록된 회차가 없어요.</p>;
  }
  if (external) {
    return (
      <ul className="px-4 py-2 text-sm text-muted-strong">
        {sessions.map((session) => (
          <li key={session.sessionId} className="py-1">
            {formatDateTime(session.startsAt)}
            {Date.parse(session.startsAt) <= now ? <span className="ml-2 text-xs text-muted">지난 회차</span> : null}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">회차별 예매 현황</caption>
      <thead className="text-xs text-muted">
        <tr>
          <th scope="col" className="px-4 py-2 font-medium">회차</th>
          <th scope="col" className="px-4 py-2 font-medium">예매 매수 / 정원</th>
          <th scope="col" className="px-4 py-2 font-medium">잔여</th>
          <th scope="col" className="px-4 py-2 font-medium">예매</th>
          <th scope="col" className="px-4 py-2 font-medium">취소</th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((session) => {
          const past = Date.parse(session.startsAt) <= now;
          const remaining = Math.max(0, session.capacity - session.reservedTickets);
          return (
            <tr key={session.sessionId} className="border-t border-border-soft">
              <td className="px-4 py-2 text-muted-strong">
                {formatDateTime(session.startsAt)}
                {past ? <span className="ml-2 text-xs text-muted">지난 회차</span> : null}
              </td>
              <td className="px-4 py-2"><OccupancyBar reserved={session.reservedTickets} capacity={session.capacity} /></td>
              <td className={`px-4 py-2 num ${remaining === 0 ? "font-medium text-fail" : "text-muted-strong"}`}>
                {remaining === 0 ? "매진" : `${remaining}석`}
              </td>
              <td className="px-4 py-2 num text-muted-strong">{session.reservationCount}건</td>
              <td className="px-4 py-2 num text-muted">{session.canceledReservationCount}건</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * 무료 공연별 예매 집계다. 예매자 명단은 기획사 화면에서만 보고 이 화면은 숫자만 보여 준다.
 * 주최 이름은 기획사가 계정 이름을 개인 이름으로 적은 경우 등을 위해 운영자가 대신 고칠 수 있다.
 * 기획사 계정이 없는 공연은 운영자가 외부 링크 공연으로 직접 등록하고, 공연명을 눌러 회차·공개를 관리한다.
 * 외부 링크 공연은 정원·예매 대신 관객이 예매하기로 이동한 횟수를 보여 준다.
 */
export function AdminShowTable({ shows: loadedShows, now }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [expandedShowId, setExpandedShowId] = useState<string | null>(null);
  // 대시보드를 다시 읽지 않고도 고친 주최 이름이 바로 보이게 이 표 안에서만 덮어쓴다.
  const [hostNames, setHostNames] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [editingShowId, setEditingShowId] = useState<string | null>(null);
  const shows = loadedShows.map((show) => hostNames.has(show.showId) ? { ...show, hostName: hostNames.get(show.showId)! } : show);
  const visible = statusFilter === "ALL" ? shows : shows.filter((show) => show.status === statusFilter);
  const editingShow = shows.find((show) => show.showId === editingShowId) ?? null;

  return (
    <section aria-labelledby="shows-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="shows-heading" className="text-sm font-semibold text-muted">
          무료 공연 예매 ({visible.length})
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label="공연 상태 필터">
            {STATUS_FILTERS.map((filter) => (
              <FilterChip
                key={filter.value}
                pressed={statusFilter === filter.value}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </FilterChip>
            ))}
          </div>
          <PrimaryButton onClick={() => setCreating(true)}>외부 링크 공연 등록</PrimaryButton>
        </div>
      </div>
      <div className="overflow-x-auto rounded-card border border-border bg-card">
        {/* 공연명·주최만 줄바꿈하고 나머지 짧은 값은 한 줄로 둔다. 좁으면 표 안에서 가로로 넘긴다. */}
        <table className="w-full min-w-[64rem] whitespace-nowrap text-left text-sm">
          <thead className="bg-surface text-xs text-muted">
            <tr>
              {HEADERS.map((header) => (
                <th key={header} scope="col" className="px-3 py-2 font-medium">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={HEADERS.length} className="px-3 py-6 text-center text-muted">
                  {shows.length === 0 ? "등록된 무료 공연이 없어요." : "이 상태의 공연이 없어요."}
                </td>
              </tr>
            ) : null}
            {visible.map((show) => {
              const expanded = expandedShowId === show.showId;
              return (
                <Fragment key={show.showId}>
                  <tr className="border-t border-border-soft">
                    <td className="min-w-40 whitespace-normal px-3 py-2 text-foreground">
                      {show.externalReservationUrl ? (
                        <Link href={adminShowRoutes.detail(show.showId)} className="font-medium text-brand hover:underline">
                          {show.title}
                        </Link>
                      ) : show.title}
                    </td>
                    <td className="min-w-52 whitespace-normal px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 break-keep text-foreground">{orDash(show.hostName || show.companyName)}</span>
                        {show.hostName ? <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">직접 입력</span> : null}
                        <button
                          type="button"
                          onClick={() => setEditingShowId(show.showId)}
                          aria-label={`${show.title} 주최 이름 수정`}
                          className="ml-auto min-h-9 shrink-0 rounded-control border border-border px-2.5 text-xs font-medium text-muted-strong hover:bg-surface"
                        >
                          수정
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-strong">
                      {show.externalReservationUrl
                        ? <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">운영자 등록 · 외부 링크</span>
                        : orDash(show.companyName)}
                    </td>
                    <td className="px-3 py-2 text-muted-strong">{STATUS_LABEL[show.status]}</td>
                    <td className="px-3 py-2 num text-muted-strong">{show.sessions.length}</td>
                    {show.externalReservationUrl ? (
                      <>
                        <td className="px-3 py-2 text-muted">외부 예매</td>
                        <td className="px-3 py-2 num text-muted-strong">이동 {show.externalReservationVisits}회</td>
                        <td className="px-3 py-2 text-muted">-</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2"><OccupancyBar reserved={show.reservedTickets} capacity={show.totalCapacity} /></td>
                        <td className="px-3 py-2 num text-muted-strong">{show.reservationCount}건</td>
                        <td className="px-3 py-2 num text-muted">{show.canceledReservationCount}건</td>
                      </>
                    )}
                    <td className="px-3 py-2 text-muted">{formatDateTime(show.createdAt)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={`show-sessions-${show.showId}`}
                        onClick={() => setExpandedShowId(expanded ? null : show.showId)}
                        className="min-h-11 rounded-control border border-border px-3 text-sm font-medium text-muted-strong hover:bg-surface"
                      >
                        {expanded ? "접기" : "회차 보기"}
                      </button>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr id={`show-sessions-${show.showId}`} className="border-t border-border bg-surface/60">
                      <td colSpan={HEADERS.length}>
                        <SessionTable sessions={show.sessions} now={now} external={show.externalReservationUrl !== ""} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {editingShow ? (
        <AdminShowHostNameDialog
          show={editingShow}
          onClose={() => setEditingShowId(null)}
          onSaved={(result) => {
            setHostNames((current) => new Map(current).set(result.showId, result.hostName));
            setEditingShowId(null);
          }}
        />
      ) : null}
      {creating ? (
        <ShowManagementApiProvider api={adminShowManagementApi}>
          <ShowFormModal
            onClose={() => setCreating(false)}
            onSaved={(saved) => router.push(adminShowRoutes.detail(saved.id))}
          />
        </ShowManagementApiProvider>
      ) : null}
    </section>
  );
}
