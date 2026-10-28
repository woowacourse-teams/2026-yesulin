"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { FieldInput } from "@/components/ui/controls";
import {
  adminActorHandleLabel,
  adminActorPageRoutes,
  adminActorPageStatus,
  type AdminActorPageStatusTone,
} from "@/features/admin/actor-pages";
import { AdminApiError, fetchAdminActorPages } from "@/features/admin/api";
import type { AdminActorPageList } from "@/features/admin/types";
import { formatDateTime, orDash } from "./admin-format";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminActionButton, AdminEmptyState, AdminShell } from "./admin-shell";
import { useDebouncedValue } from "./use-debounced-value";

export const STATUS_TONES: Readonly<Record<AdminActorPageStatusTone, string>> = {
  public: "bg-pass-bg text-pass",
  locked: "bg-fail-bg text-fail",
  hidden: "bg-warn-bg text-warn",
  private: "bg-border-soft text-muted-strong",
};

type Settled =
  | { readonly key: string; readonly phase: "ready"; readonly list: AdminActorPageList }
  | { readonly key: string; readonly phase: "failed"; readonly error: string }
  | { readonly key: string; readonly phase: "unauthorized" };

/** 배우 페이지 목록. 최근에 바뀐 페이지부터 보이고, 아이디 일부로 찾는다. 상세에서 잠금·해제·아이디 변경을 한다. */
export function AdminActorPages() {
  const searchId = useId();
  const [keyword, setKeyword] = useState("");
  const query = useDebouncedValue(keyword, 300);
  const [page, setPage] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const requestKey = `${query}#${page}#${reloadToken}`;

  useEffect(() => {
    let active = true;
    fetchAdminActorPages(query, page)
      .then((list) => { if (active) setSettled({ key: requestKey, phase: "ready", list }); })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          setSettled({ key: requestKey, phase: "unauthorized" });
          return;
        }
        setSettled({ key: requestKey, phase: "failed", error: cause instanceof Error ? cause.message : "배우 페이지 목록을 불러오지 못했습니다." });
      });
    return () => { active = false; };
  }, [page, query, requestKey]);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);
  const current = settled?.key === requestKey ? settled : null;

  if (current?.phase === "unauthorized") return <AdminSessionEnded />;

  return (
    <AdminShell
      current="actor-pages"
      title="배우 페이지"
      description="공개 상태와 잠금을 확인해요. 상세에서 공개 내용·연락처를 보고 잠그거나 아이디를 바꿀 수 있어요."
      actions={<AdminActionButton onClick={refresh}>새로고침</AdminActionButton>}
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <label htmlFor={searchId} className="text-sm font-semibold">아이디로 찾기</label>
          <FieldInput
            id={searchId}
            value={keyword}
            onChange={(event) => { setKeyword(event.target.value); setPage(0); }}
            placeholder="예: min.zzun"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            className="mt-1"
          />
        </div>
        {current?.phase === "ready" ? <p className="num pb-2 text-sm text-muted">{current.list.totalElements}개</p> : null}
      </div>

      {current?.phase === "failed" ? (
        <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">{current.error} 새로고침으로 다시 시도해 주세요.</p>
      ) : null}
      {!current ? <p role="status" className="rounded-card border border-border bg-card px-5 py-12 text-center text-sm text-muted">배우 페이지를 불러오는 중…</p> : null}
      {current?.phase === "ready" && current.list.actorPages.length === 0 ? (
        <AdminEmptyState title={query.trim() ? "찾는 아이디의 배우 페이지가 없어요" : "아직 배우 페이지가 없어요"} description="배우가 편집 화면에서 아이디를 정하거나 공개 설정을 바꾸면 페이지가 생겨요." />
      ) : null}
      {current?.phase === "ready" && current.list.actorPages.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-card border border-border bg-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">배우 페이지 목록</caption>
              <thead className="border-b border-border-soft text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">아이디</th>
                  <th scope="col" className="px-4 py-3 font-semibold">이름</th>
                  <th scope="col" className="px-4 py-3 font-semibold">상태</th>
                  <th scope="col" className="px-4 py-3 font-semibold">최근 공개 활동</th>
                  <th scope="col" className="px-4 py-3 font-semibold">마지막 변경</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {current.list.actorPages.map((actorPage) => {
                  const status = adminActorPageStatus(actorPage);
                  return (
                    <tr key={actorPage.publicId}>
                      <td className="px-4 py-3">
                        <Link href={adminActorPageRoutes.detail(actorPage.publicId)} className="font-semibold text-brand hover:underline">
                          {adminActorHandleLabel(actorPage.handle)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{orDash(actorPage.name)}</td>
                      <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONES[status.tone]}`}>{status.label}</span></td>
                      <td className="num px-4 py-3 text-muted-strong">{formatDateTime(actorPage.lastPublicActivityAt)}</td>
                      <td className="num px-4 py-3 text-muted-strong">{formatDateTime(actorPage.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {current.list.totalPages > 1 ? (
            <nav aria-label="배우 페이지 목록 페이지" className="mt-4 flex items-center justify-center gap-3">
              <AdminActionButton disabled={page === 0} onClick={() => setPage((value) => value - 1)}>이전</AdminActionButton>
              <span className="num text-sm text-muted-strong">{page + 1} / {current.list.totalPages}</span>
              <AdminActionButton disabled={page + 1 >= current.list.totalPages} onClick={() => setPage((value) => value + 1)}>다음</AdminActionButton>
            </nav>
          ) : null}
        </>
      ) : null}
    </AdminShell>
  );
}
