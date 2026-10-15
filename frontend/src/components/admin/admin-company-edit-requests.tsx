"use client";

import { useCallback, useEffect, useState } from "react";
import { AuditionPostStatusBadge } from "@/components/audition-posts/audition-post-status-badge";
import {
  AdminApiError,
  applyCompanyEditRequest,
  fetchCompanyEditRequests,
  rejectCompanyEditRequest,
} from "@/features/admin/api";
import type { AdminCompanyEditRequest } from "@/features/admin/types";
import { logout } from "@/features/auth/session-api";
import { COMPANY_FIELD_LABELS, describeField, mergeRequest } from "@/features/companies/profile-draft";
import { companyRoutes } from "@/features/companies/types";
import { CompanyForm } from "./admin-companies";
import { formatDateTime } from "./admin-format";
import { AdminAuditionPostTabs } from "./admin-audition-post-tabs";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminActionButton, AdminActionLink, AdminEmptyState, AdminShell } from "./admin-shell";

type Phase = "loading" | "ready" | "unauthorized" | "failed";

/**
 * 공개된 공연사 화면에서 누구나 보낸 정보 수정 요청. 바뀐 항목을 지금 정보와 나란히 보고, 요청자가 바꾼 항목만 덮어쓴 폼을
 * 다듬어 적용하거나 반려한다. 적용해도 공개 상태는 그대로이고, 처리하면 요청자 연락처는 지워진다.
 */
export function AdminCompanyEditRequests() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [requests, setRequests] = useState<readonly AdminCompanyEditRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [applying, setApplying] = useState<number | null>(null);
  const [confirmingReject, setConfirmingReject] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchCompanyEditRequests()
      .then((next) => {
        if (!active) return;
        setRequests(next);
        setError(null);
        setPhase("ready");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          setPhase("unauthorized");
          return;
        }
        setError(cause instanceof Error ? cause.message : "수정 요청을 불러오지 못했습니다.");
        setPhase("failed");
      });
    return () => { active = false; };
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);
  const endSession = useCallback(() => setPhase("unauthorized"), []);
  const remove = (requestId: number) => setRequests((current) => current.filter((request) => request.id !== requestId));

  const reject = async (request: AdminCompanyEditRequest) => {
    setRejecting(request.id);
    setError(null);
    try {
      await rejectCompanyEditRequest(request.id);
      remove(request.id);
      setNotice(`${request.company.name} 수정 요청을 반려했어요.`);
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) {
        endSession();
        return;
      }
      setError(cause instanceof Error ? cause.message : "수정 요청을 반려하지 못했습니다.");
    } finally {
      setRejecting(null);
      setConfirmingReject(null);
    }
  };

  async function signOut() {
    await logout().catch(() => null);
    setRequests([]);
    setPhase("unauthorized");
  }

  if (phase === "unauthorized") return <AdminSessionEnded />;

  return (
    <AdminShell
      current="posts"
      title="공고 관리"
      description="공연사 화면에서 들어온 정보 수정 요청을 확인하고 반영해 주세요."
      actions={(
        <>
          <AdminActionButton onClick={refresh}>새로고침</AdminActionButton>
          <AdminActionButton tone="quiet" onClick={() => void signOut()}>로그아웃</AdminActionButton>
        </>
      )}
    >
      <AdminAuditionPostTabs current="edit-requests" />
      <h2 className="text-base font-semibold">
        처리할 수정 요청 <span className="num ml-1 text-sm font-normal text-muted">{phase === "ready" ? `${requests.length}건` : ""}</span>
      </h2>
      <p className="-mt-3 text-xs text-muted">요청자는 공개된 정보만 봐요. 적용하면 요청자가 바꾼 항목만 덮어쓰고 나머지는 지금 정보를 그대로 둬요.</p>

      {notice ? <p role="status" className="rounded-control border border-brand-line bg-brand-soft px-4 py-3 text-sm">{notice}</p> : null}
      {error ? (
        <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">
          {error} {phase === "failed" ? <button type="button" onClick={refresh} className="font-semibold underline">다시 시도</button> : null}
        </p>
      ) : null}
      {phase === "loading" ? <p role="status" className="text-sm text-muted">수정 요청을 불러오는 중이에요.</p> : null}

      {phase === "ready" ? (
        <section aria-label="수정 요청 목록" className="flex flex-col gap-4">
          {requests.length === 0 ? (
            <AdminEmptyState title="처리할 수정 요청이 없어요" description="공연사 화면에서 요청이 들어오면 여기에 보이고 Slack으로도 알려 드려요." />
          ) : null}
          {requests.map((request) => (
            <article key={request.id} className="rounded-card border border-border bg-card p-4 sm:px-5">
              <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <AuditionPostStatusBadge status={request.company.status} />
                <span className="num text-muted">요청 {request.id} · 공연사 {request.company.id}</span>
                <span className="ml-auto text-muted">{formatDateTime(request.createdAt)} 요청</span>
              </header>
              <h3 className="mt-3 break-words text-lg font-semibold">{request.company.name}</h3>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex min-w-0 gap-3">
                  <dt className="w-14 shrink-0 text-muted">사유</dt>
                  <dd className="min-w-0 whitespace-pre-line break-words">{request.reason}</dd>
                </div>
                <div className="flex min-w-0 gap-3">
                  <dt className="w-14 shrink-0 text-muted">연락처</dt>
                  <dd className="min-w-0 break-all">{request.contact ?? <span className="text-muted">남기지 않음</span>}</dd>
                </div>
              </dl>
              <ChangedFields request={request} />

              {applying === request.id ? (
                <div className="mt-4">
                  <CompanyForm
                    initial={mergeRequest(request.company, request.proposal, request.changedFields)}
                    submitLabel="적용"
                    onCancel={() => setApplying(null)}
                    onUnauthorized={endSession}
                    onSave={async (write) => {
                      await applyCompanyEditRequest(request.id, write);
                      remove(request.id);
                      setApplying(null);
                      setNotice(`${request.company.name} 정보에 수정 요청을 반영했어요.`);
                    }}
                  />
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-soft pt-4">
                  {request.company.status === "PUBLISHED" ? (
                    <AdminActionLink href={companyRoutes.detail(request.company.id)} target="_blank">공개 화면</AdminActionLink>
                  ) : null}
                  <AdminActionButton tone="primary" onClick={() => { setApplying(request.id); setNotice(null); }}>검토해서 적용</AdminActionButton>
                  {confirmingReject === request.id ? (
                    <span className="ml-auto flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted-strong">반려할까요?</span>
                      <AdminActionButton tone="destructive" disabled={rejecting === request.id} onClick={() => void reject(request)}>
                        {rejecting === request.id ? "반려하는 중…" : "반려"}
                      </AdminActionButton>
                      <AdminActionButton tone="quiet" onClick={() => setConfirmingReject(null)}>취소</AdminActionButton>
                    </span>
                  ) : (
                    <AdminActionButton className="ml-auto" onClick={() => setConfirmingReject(request.id)}>반려</AdminActionButton>
                  )}
                </div>
              )}
            </article>
          ))}
        </section>
      ) : null}
    </AdminShell>
  );
}

/** 요청자가 바꾼 항목을 지금 정보와 나란히 보인다. */
function ChangedFields({ request }: { readonly request: AdminCompanyEditRequest }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <caption className="sr-only">바뀐 항목</caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted">
            <th scope="col" className="w-28 py-2 pr-3 font-semibold">바뀐 항목</th>
            <th scope="col" className="py-2 pr-3 font-semibold">지금</th>
            <th scope="col" className="py-2 font-semibold">요청</th>
          </tr>
        </thead>
        <tbody>
          {request.changedFields.map((field) => (
            <tr key={field} className="border-b border-border-soft align-top">
              <th scope="row" className="py-2 pr-3 font-semibold">{COMPANY_FIELD_LABELS[field]}</th>
              <td className="whitespace-pre-line break-words py-2 pr-3 text-muted-strong">
                <FieldValue value={describeField(request.company, field)} />
              </td>
              <td className="whitespace-pre-line break-words py-2">
                <FieldValue value={describeField(request.proposal, field)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldValue({ value }: { readonly value: string | null }) {
  return value ?? <span className="text-muted">비공개(비움)</span>;
}
