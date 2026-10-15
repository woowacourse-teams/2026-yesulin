"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { PerformanceVenueField } from "@/components/auditions/performance-venue-field";
import { AuditionPostStatusBadge } from "@/components/audition-posts/audition-post-status-badge";
import { FieldInput, FieldTextarea } from "@/components/ui/controls";
import { AdminApiError, changeCompanyStatus, createCompany, fetchCompanies, updateCompany } from "@/features/admin/api";
import type { AdminCompany, AdminCompanyStatus, AdminCompanyWrite } from "@/features/admin/types";
import type { VenueAddress } from "@/features/auditions/creation-types";
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
  PUBLISHED: "내리기",
  HIDDEN: "다시 공개",
};

const EMPTY_ADDRESS: VenueAddress = { roadAddress: "", detailAddress: "", zonecode: "", latitude: null, longitude: null };

type Draft = {
  readonly name: string;
  readonly representativeName: string;
  readonly representativeNamePublic: boolean;
  readonly homepage: string;
  readonly foundedOn: string;
  readonly address: VenueAddress;
  readonly addressPublic: boolean;
  readonly region: string;
  readonly phone: string;
  readonly description: string;
  readonly sourceNote: string;
};

const EMPTY_DRAFT: Draft = {
  name: "", representativeName: "", representativeNamePublic: false, homepage: "", foundedOn: "", address: EMPTY_ADDRESS,
  addressPublic: false, region: "", phone: "", description: "", sourceNote: "",
};

function draftOf(company: AdminCompany): Draft {
  return {
    name: company.name,
    representativeName: company.representativeName ?? "",
    representativeNamePublic: company.representativeNamePublic,
    homepage: company.homepage ?? "",
    foundedOn: company.foundedOn ?? "",
    address: company.address ?? EMPTY_ADDRESS,
    addressPublic: company.addressPublic,
    region: company.region ?? "",
    phone: company.phone ?? "",
    description: company.description ?? "",
    sourceNote: company.sourceNote ?? "",
  };
}

function writeOf(draft: Draft): AdminCompanyWrite {
  return {
    ...draft,
    foundedOn: draft.foundedOn || null,
    address: draft.address.roadAddress.trim() ? draft.address : null,
  };
}

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
          initial={EMPTY_DRAFT}
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
              <h3 className="mt-3 break-words text-lg font-semibold">{company.name}</h3>
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

function CompanyForm({ initial, submitLabel, onSave, onCancel, onUnauthorized }: {
  readonly initial: Draft;
  readonly submitLabel: string;
  readonly onSave: (write: AdminCompanyWrite) => Promise<void>;
  readonly onCancel: () => void;
  readonly onUnauthorized: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const nameMissing = !draft.name.trim();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (nameMissing) {
      setError("공연사 이름을 입력해 주세요.");
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="company-name" label="공연사 이름" required>
          <FieldInput id="company-name" value={draft.name} maxLength={100} autoComplete="organization" onChange={(event) => set("name", event.target.value)} aria-invalid={error && nameMissing ? true : undefined} />
        </Field>
        <Field id="company-representative" label="대표자 이름" hint="개인정보예요. 공개 동의가 없으면 공개 화면에 보이지 않아요.">
          <FieldInput id="company-representative" value={draft.representativeName} maxLength={50} autoComplete="off" onChange={(event) => set("representativeName", event.target.value)} />
          <Consent id="company-representative-public" checked={draft.representativeNamePublic} onChange={(checked) => set("representativeNamePublic", checked)}>
            공연사가 대표자 이름 공개에 동의했어요
          </Consent>
        </Field>
        <Field id="company-homepage" label="홈페이지">
          <FieldInput id="company-homepage" type="url" inputMode="url" value={draft.homepage} maxLength={500} placeholder="https://" onChange={(event) => set("homepage", event.target.value)} />
        </Field>
        <Field id="company-founded" label="설립일">
          <FieldInput id="company-founded" type="date" value={draft.foundedOn} min="1900-01-01" onChange={(event) => set("foundedOn", event.target.value)} />
        </Field>
        <Field id="company-phone" label="대표 연락처" hint="공식 대표번호만 적어 주세요. 개인 휴대폰 번호는 쓰지 않아요.">
          <FieldInput id="company-phone" type="tel" inputMode="tel" value={draft.phone} maxLength={30} placeholder="02-123-4567" onChange={(event) => set("phone", event.target.value)} />
        </Field>
        <Field id="company-region" label="지역" hint="주소가 없을 때 공고 카드에 대신 보여요.">
          <FieldInput id="company-region" value={draft.region} maxLength={50} placeholder="서울" onChange={(event) => set("region", event.target.value)} />
        </Field>
      </div>
      <PerformanceVenueField
        venue=""
        address={draft.address}
        onVenueChange={() => undefined}
        onAddressChange={(address) => set("address", address)}
        optional
        hideVenueName
        addressLabel="공연사 주소"
        mapLabel="공연사 위치 지도"
      />
      <Consent id="company-address-public" checked={draft.addressPublic} onChange={(checked) => set("addressPublic", checked)}>
        공식 사업장 주소예요. 상세 주소와 지도를 공개해요
        <span className="mt-0.5 block text-xs font-normal text-muted">끄면 공개 화면에 시·군·구까지만 보여요. 집 주소일 수 있으면 꺼 두세요.</span>
      </Consent>
      <Field id="company-description" label="소개">
        <FieldTextarea id="company-description" rows={4} value={draft.description} maxLength={2000} onChange={(event) => set("description", event.target.value)} />
      </Field>
      <Field id="company-source-note" label="정보 출처" hint="어디서 확인했는지 남겨 두세요(예: 공식 홈페이지 연혁, 공연사 전화 확인). 운영자만 봐요.">
        <FieldTextarea id="company-source-note" rows={2} value={draft.sourceNote} maxLength={1000} onChange={(event) => set("sourceNote", event.target.value)} />
      </Field>
      {error ? <p role="alert" className="text-sm text-fail">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <AdminActionButton onClick={onCancel} disabled={saving}>취소</AdminActionButton>
        <AdminActionButton type="submit" tone="primary" disabled={saving}>{saving ? "저장하는 중…" : submitLabel}</AdminActionButton>
      </div>
    </form>
  );
}

function Consent({ id, checked, onChange, children }: {
  readonly id: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-2.5 text-sm font-medium">
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-brand" />
      <span className="min-w-0">{children}</span>
    </label>
  );
}

function Field({ id, label, hint, required = false, children }: {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}{required ? <span className="ml-1 text-fail" aria-hidden="true">*</span> : <span className="ml-1 text-xs font-normal text-muted">선택</span>}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
