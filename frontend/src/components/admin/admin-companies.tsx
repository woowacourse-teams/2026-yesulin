"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AuditionPostStatusBadge } from "@/components/audition-posts/audition-post-status-badge";
import { CompanyAvatar } from "@/components/companies/company-avatar";
import { CompanyProfileFields } from "@/components/companies/company-profile-fields";
import { FieldTextarea } from "@/components/ui/controls";
import {
  AdminApiError,
  changeCompanyStatus,
  createCompany,
  fetchCompanies,
  updateCompany,
  uploadCompanyPhoto,
} from "@/features/admin/api";
import type { AdminCompany, AdminCompanyStatus, AdminCompanyWrite } from "@/features/admin/types";
import {
  COMPANY_FIELD_LABELS,
  draftOf,
  emptyDraft,
  hideUndecided,
  undecidedFields,
  writeOf,
  type CompanyDraft,
} from "@/features/companies/profile-draft";
import { companyRoutes } from "@/features/companies/types";
import { logout } from "@/features/auth/session-api";
import { formatDateTime } from "./admin-format";
import { AdminAuditionPostTabs } from "./admin-audition-post-tabs";
import { AdminCompanyAuthors } from "./admin-company-authors";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminActionButton, AdminActionLink, AdminEmptyState, AdminShell } from "./admin-shell";

type Phase = "loading" | "ready" | "unauthorized" | "failed";

/** 검토 전이나 내린 공연사는 공개하고, 공개 중이면 내린다. */
const STATUS_ACTIONS: Readonly<Record<AdminCompanyStatus, string>> = {
  PENDING: "공개하기",
  PUBLISHED: "숨기기",
  HIDDEN: "다시 공개",
};

/**
 * 공고를 올린 공연사 정보를 만들고 고친다. 새 공연사는 검토 전이라 공고와 공연사 화면에 보이지 않고, 내용을 확인한 뒤
 * 공개해야 보인다. 공고와 공연사 연결은 전체 공고 목록에서 한다.
 */
export function AdminCompanies() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [companies, setCompanies] = useState<readonly AdminCompany[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  /** 편집 중인 공연사. `"new"`면 새로 만든다. */
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [changing, setChanging] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchCompanies()
      .then((next) => {
        if (!active) return;
        setCompanies(next);
        setError(null);
        setPhase("ready");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          setPhase("unauthorized");
          return;
        }
        setError(cause instanceof Error ? cause.message : "공연사 목록을 불러오지 못했습니다.");
        setPhase("failed");
      });
    return () => { active = false; };
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);
  const endSession = useCallback(() => setPhase("unauthorized"), []);

  const replace = (company: AdminCompany) => setCompanies((current) => [
    company, ...current.filter((item) => item.id !== company.id),
  ].sort((left, right) => right.id - left.id));

  const toggleStatus = async (company: AdminCompany) => {
    setChanging(company.id);
    setError(null);
    try {
      replace(await changeCompanyStatus(company.id, company.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED"));
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) {
        setPhase("unauthorized");
        return;
      }
      setError(cause instanceof Error ? cause.message : "공개 상태를 바꾸지 못했습니다.");
    } finally {
      setChanging(null);
    }
  };

  async function signOut() {
    await logout().catch(() => null);
    setCompanies([]);
    setPhase("unauthorized");
  }

  if (phase === "unauthorized") return <AdminSessionEnded />;

  const editingCompany = typeof editing === "number" ? companies.find((company) => company.id === editing) : undefined;

  return (
    <AdminShell
      current="posts"
      title="공고 관리"
      description="공고를 올린 공연사 정보를 정리하고, 확인한 뒤 공개해 주세요."
      actions={(
        <>
          <AdminActionButton onClick={refresh}>새로고침</AdminActionButton>
          <AdminActionButton tone="quiet" onClick={() => void signOut()}>로그아웃</AdminActionButton>
        </>
      )}
    >
      <AdminAuditionPostTabs current="companies" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">공연사 <span className="num ml-1 text-sm font-normal text-muted">{phase === "ready" ? `${companies.length}곳` : ""}</span></h2>
        <AdminActionButton tone="primary" onClick={() => setEditing("new")} disabled={editing === "new"}>공연사 추가</AdminActionButton>
      </div>
      <p className="-mt-3 text-xs text-muted">공개한 공연사만 연결된 공고 상세와 공연사 화면에 보여요. 공고 연결은 전체 공고 목록에서 해요.</p>

      {editing === "new" ? (
        <CompanyForm
          key="new"
          initial={emptyDraft()}
          submitLabel="검토 전으로 만들기"
          onCancel={() => setEditing(null)}
          onSave={async (write) => {
            const created = await createCompany(write);
            replace(created);
            setEditing(null);
          }}
          onUnauthorized={() => setPhase("unauthorized")}
        />
      ) : null}

      {error ? (
        <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">
          {error} {phase === "failed" ? <button type="button" onClick={refresh} className="font-semibold underline">다시 시도</button> : null}
        </p>
      ) : null}
      {phase === "loading" ? <p role="status" className="text-sm text-muted">공연사를 불러오는 중이에요.</p> : null}

      {phase === "ready" ? (
        <section aria-label="공연사 목록" className="flex flex-col gap-4">
          {companies.length === 0 && editing !== "new" ? (
            <AdminEmptyState title="첫 공연사를 등록해 보세요" description="이름만 있어도 만들 수 있어요. 나머지는 확인되는 대로 채워 주세요." />
          ) : null}
          {companies.map((company) => editing === company.id && editingCompany ? (
            <CompanyForm
              key={company.id}
              initial={draftOf(editingCompany)}
              submitLabel="저장"
              onCancel={() => setEditing(null)}
              onSave={async (write) => {
                replace(await updateCompany(company.id, write));
                setEditing(null);
              }}
              onUnauthorized={() => setPhase("unauthorized")}
            />
          ) : (
            <article key={company.id} className="rounded-card border border-border bg-card p-4 sm:px-5">
              <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <AuditionPostStatusBadge status={company.status} />
                <span className="num text-muted">공연사 {company.id}</span>
                <span className="ml-auto text-muted">{formatDateTime(company.updatedAt)} 갱신</span>
              </header>
              <div className="mt-3 flex min-w-0 items-center gap-3">
                <CompanyAvatar name={company.name} photoUrl={company.photoUrl} size="sm" />
                <h3 className="min-w-0 break-words text-lg font-semibold">{company.name}</h3>
              </div>
              <p className="mt-1 text-sm text-muted-strong">
                {[
                  company.representativeName && `대표 ${company.representativeName}`,
                  company.foundedOn && `설립 ${company.foundedOn}`,
                  company.address?.roadAddress ?? company.region,
                ].filter(Boolean).join(" · ") || "이름 말고는 아직 비어 있어요."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border-soft pt-4">
                {company.status === "PUBLISHED" ? (
                  <AdminActionLink href={companyRoutes.detail(company.id)} target="_blank">공개 화면</AdminActionLink>
                ) : null}
                <AdminActionButton onClick={() => setEditing(company.id)}>수정</AdminActionButton>
                <AdminActionButton disabled={changing === company.id} onClick={() => void toggleStatus(company)} className="ml-auto">
                  {changing === company.id ? "바꾸는 중…" : STATUS_ACTIONS[company.status]}
                </AdminActionButton>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {phase === "ready" ? (
        <AdminCompanyAuthors companies={companies} onCompaniesChanged={refresh} onUnauthorized={endSession} />
      ) : null}
    </AdminShell>
  );
}

/**
 * 공연사 정보 입력 폼. 선택 항목은 값을 적거나 "비공개"를 체크해야 저장된다. 정보 출처 메모는 운영자만 본다.
 */
export function CompanyForm({ initial, submitLabel, onSave, onCancel, onUnauthorized, footer }: {
  readonly initial: CompanyDraft;
  readonly submitLabel: string;
  /** 저장 버튼 위에 더 보일 칸(예: 저장하면서 공개). */
  readonly footer?: React.ReactNode;
  readonly onSave: (write: AdminCompanyWrite) => Promise<void>;
  readonly onCancel: () => void;
  readonly onUnauthorized: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const undecided = new Set(checked ? undecidedFields(draft) : []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChecked(true);
    if (!draft.name.trim()) {
      setError("공연사 이름을 입력해 주세요.");
      return;
    }
    const missing = undecidedFields(draft);
    if (missing.length) {
      setError(`${missing.map((field) => COMPANY_FIELD_LABELS[field]).join(", ")}: 값을 적거나 비공개를 체크해 주세요.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(writeOf(draft));
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) {
        onUnauthorized();
        return;
      }
      setError(cause instanceof Error ? cause.message : "공연사 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4 rounded-card border border-brand-line bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface px-3 py-2 text-xs text-muted-strong">
        <span>선택 항목은 값을 적거나 &quot;비공개&quot;를 체크해 주세요. 비공개 항목은 공개 화면에 &quot;비공개&quot;로 보여요.</span>
        <AdminActionButton tone="quiet" className="!min-h-9" onClick={() => setDraft(hideUndecided)}>빈 항목 모두 비공개</AdminActionButton>
      </div>
      <CompanyProfileFields
        draft={draft}
        onChange={setDraft}
        undecided={undecided}
        mode="admin"
        uploadPhoto={async (photo) => ({ url: await uploadCompanyPhoto(photo), uploadKey: null })}
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor="company-source-note" className="text-sm font-semibold">정보 출처<span className="ml-1 text-xs font-normal text-muted">운영자만 봐요</span></label>
        <FieldTextarea id="company-source-note" rows={2} value={draft.sourceNote} maxLength={1000} onChange={(event) => setDraft((current) => ({ ...current, sourceNote: event.target.value }))} />
        <p className="text-xs text-muted">어디서 확인했는지 남겨 두세요(예: 공식 홈페이지 연혁, 공연사 전화 확인).</p>
      </div>
      {footer}
      {error ? <p role="alert" className="text-sm text-fail">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <AdminActionButton onClick={onCancel} disabled={saving}>취소</AdminActionButton>
        <AdminActionButton type="submit" tone="primary" disabled={saving}>{saving ? "저장하는 중…" : submitLabel}</AdminActionButton>
      </div>
    </form>
  );
}
