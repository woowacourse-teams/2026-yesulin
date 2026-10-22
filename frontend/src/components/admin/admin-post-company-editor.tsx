"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FieldInput, FieldSelect } from "@/components/ui/controls";
import {
  AdminApiError,
  changeAuditionPostCompany,
  fetchKopisCompanies,
  fetchPostCompany,
  savePostCompany,
} from "@/features/admin/api";
import type { AdminCompany, AdminPostCompanyProfile, KopisCompanySearchResult } from "@/features/admin/types";
import { kstToday } from "@/features/audition-posts/format";
import { draftFromKopis } from "@/features/companies/kopis-draft";
import { draftOf, emptyDraft } from "@/features/companies/profile-draft";
import { CompanyForm } from "./admin-companies";
import { AdminActionButton } from "./admin-shell";

/** KOPIS 후보를 고르지 않고 원문 작성자 이름으로만 쓴다. */
const WITHOUT_KOPIS = -1;

/**
 * 공고 목록에서 그 공고를 올린 공연사의 정보를 바로 쓴다. 공고에 연결된 공연사가 없으면 같은 OTR 작성자로 이전에 쓴 정보를
 * 불러오고, 그것도 없으면 원문 작성자 이름으로 KOPIS 기획제작사를 찾아 처음 값으로 채운다. 운영자가 확인해 저장하면 바로 공개되고,
 * 같은 OTR 작성자의 다른 공고와 이후 가져오는 공고에도 같은 정보가 연결된다. 숨긴 공연사는 숨긴 채로 저장하고, 숨기기와
 * 다시 공개는 공연사 탭에서 한다. 잘못 연결된 공고는 이 공고만 다른 공연사로 옮기거나 연결을 끊는다.
 */
export function AdminPostCompanyEditor({ postId, companies, onSaved, onLinkChanged, onCancel, onUnauthorized }: {
  readonly postId: number;
  /** 이 공고만 다른 공연사로 바꿀 때 고를 후보. 불러오지 못했으면 null이고 연결 바꾸기를 숨긴다. */
  readonly companies: readonly AdminCompany[] | null;
  readonly onSaved: (company: AdminCompany) => void;
  /** 이 공고의 연결을 바꾸거나 끊었다. */
  readonly onLinkChanged: () => void;
  readonly onCancel: () => void;
  readonly onUnauthorized: () => void;
}) {
  const [profile, setProfile] = useState<AdminPostCompanyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 지금 KOPIS에서 찾고 있는 이름. 찾는 중이 아니면 null이다. */
  const [searching, setSearching] = useState<string | null>(null);
  /** 마지막으로 찾은 결과. 다시 찾는 동안에도 지금 폼을 두려고 남겨 둔다. */
  const [kopisResult, setKopisResult] = useState<KopisCompanySearchResult | null>(null);
  const [kopisFailed, setKopisFailed] = useState(false);
  /** 찾은 횟수. 새 결과가 오면 폼을 그 결과로 다시 채운다. */
  const [kopisVersion, setKopisVersion] = useState(0);
  /** 고른 KOPIS 후보 순번. 바꾸면 폼을 그 후보로 다시 채운다. */
  const [picked, setPicked] = useState(0);

  useEffect(() => {
    let active = true;
    fetchPostCompany(postId)
      .then((next) => {
        if (!active) return;
        setProfile(next);
        if (!next.company) setSearching(next.suggestedName);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          onUnauthorized();
          return;
        }
        setError(cause instanceof Error ? cause.message : "공연사 정보를 불러오지 못했습니다.");
      });
    return () => { active = false; };
  }, [postId, onUnauthorized]);

  useEffect(() => {
    if (searching === null) return;
    let active = true;
    fetchKopisCompanies(searching)
      .then((result) => {
        if (!active) return;
        setKopisResult(result);
        setKopisFailed(false);
        setPicked(result.companies.length ? 0 : WITHOUT_KOPIS);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          onUnauthorized();
          return;
        }
        setKopisResult(null);
        setKopisFailed(true);
        setPicked(WITHOUT_KOPIS);
      })
      .finally(() => {
        if (!active) return;
        setSearching(null);
        setKopisVersion((version) => version + 1);
      });
    return () => { active = false; };
  }, [searching, onUnauthorized]);

  if (!profile || (!profile.company && kopisVersion === 0)) {
    return (
      <div className="mt-4 border-t border-border-soft pt-4 text-sm">
        {error ? (
          <p role="alert" className="flex flex-wrap items-center gap-2 text-fail">{error} <AdminActionButton onClick={onCancel}>닫기</AdminActionButton></p>
        ) : (
          <p role="status" className="text-muted">
            {profile ? `KOPIS에서 "${searching ?? profile.suggestedName}" 공연사를 찾는 중이에요.` : "공연사 정보를 불러오는 중이에요."}
          </p>
        )}
      </div>
    );
  }

  const hidden = profile.company?.status === "HIDDEN";
  const candidate = picked >= 0 ? kopisResult?.companies[picked] : undefined;
  const initial = profile.company
    ? draftOf(profile.company)
    : candidate ? draftFromKopis(candidate, kstToday()) : emptyDraft(profile.suggestedName);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-border-soft pt-4">
      <p className="text-sm text-muted-strong">
        {profile.sharedByAuthor
          ? "같은 OTR 작성자로 이전에 쓴 공연사 정보를 불러왔어요. 저장하면 이 공고에도 연결돼요."
          : profile.company
            ? "이 공고에 연결된 공연사 정보예요."
            : candidate
              ? "아직 공연사 정보가 없어서 KOPIS 공연예술통합전산망 정보로 채웠어요. 확인하고 고쳐 주세요."
              : "아직 공연사 정보가 없어요. 원문 작성자 이름을 미리 넣어 두었어요."}
        {hidden ? " 숨긴 공연사라 저장해도 숨긴 채로 두어요. 다시 공개는 공연사 탭에서 해요." : " 저장하면 바로 공개돼요."}
        {profile.sourceAuthorId ? " 같은 OTR 작성자의 다른 공고와 앞으로 가져오는 공고에도 이 정보가 쓰여요." : null}
      </p>
      {companies ? (
        <PostCompanyLink
          postId={postId}
          linked={profile.company && !profile.sharedByAuthor ? profile.company : null}
          companies={companies}
          onChanged={onLinkChanged}
          onUnauthorized={onUnauthorized}
        />
      ) : null}
      {!profile.company ? (
        <KopisPanel
          result={kopisResult}
          failed={kopisFailed}
          searching={searching}
          picked={picked}
          suggestedName={profile.suggestedName}
          onPick={setPicked}
          onSearch={setSearching}
        />
      ) : null}
      <CompanyForm
        key={profile.company ? "company" : `kopis-${kopisVersion}-${picked}`}
        initial={initial}
        submitLabel={hidden ? "저장" : "저장하고 공개"}
        onCancel={onCancel}
        onUnauthorized={onUnauthorized}
        onSave={async (write) => onSaved(await savePostCompany(postId, write, true))}
      />
    </div>
  );
}

/**
 * 이 공고만 이미 있는 다른 공연사로 옮기거나 연결을 끊는다. 잘못 연결된 공고를 고칠 때 쓰며, 아래 폼으로 정보를 고치면
 * 연결된 공연사 자체가 바뀌어 같은 공연사의 다른 공고에도 보인다.
 */
function PostCompanyLink({ postId, linked, companies, onChanged, onUnauthorized }: {
  readonly postId: number;
  /** 이 공고에 직접 연결된 공연사. 같은 작성자로만 찾은 공연사는 null이다. */
  readonly linked: AdminCompany | null;
  readonly companies: readonly AdminCompany[];
  readonly onChanged: () => void;
  readonly onUnauthorized: () => void;
}) {
  const [target, setTarget] = useState("");
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const candidates = companies.filter((company) => company.id !== linked?.id);

  const change = async (companyId: number | null) => {
    setChanging(true);
    setError(null);
    try {
      await changeAuditionPostCompany(postId, companyId);
      onChanged();
    } catch (cause) {
      if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
        onUnauthorized();
        return;
      }
      setError(cause instanceof Error ? cause.message : "공연사 연결을 바꾸지 못했습니다.");
    } finally {
      setChanging(false);
    }
  };

  return (
    <section aria-label="이 공고의 공연사 연결" className="flex flex-col gap-2 rounded-card border border-border p-4 text-sm">
      <p>
        <span className="font-semibold">이 공고의 연결</span>{" "}
        <span className="text-muted-strong">{linked ? `${linked.name} (공연사 ${linked.id})` : "연결 안 됨"}</span>
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <label htmlFor={`post-company-${postId}`} className="sr-only">이 공고만 연결할 공연사</label>
        <FieldSelect
          id={`post-company-${postId}`}
          value={target}
          disabled={changing}
          onChange={(event) => setTarget(event.target.value)}
          className="!min-h-10 w-0 min-w-48 flex-1 py-1.5"
        >
          <option value="">다른 공연사 고르기</option>
          {candidates.map((company) => <option key={company.id} value={company.id}>{company.name} (공연사 {company.id})</option>)}
        </FieldSelect>
        <AdminActionButton disabled={changing || !target} onClick={() => void change(Number(target))}>이 공연사로 연결</AdminActionButton>
        {linked ? (
          <AdminActionButton tone="quiet" disabled={changing} onClick={() => void change(null)}>연결 끊기</AdminActionButton>
        ) : null}
      </div>
      <p className="text-xs text-muted">
        이 공고만 바꿔요. 같은 작성자의 공고를 함께 옮기려면 공연사 탭의 작성자별 묶기에서 바꿔 주세요.
        작성자 묶음이 남아 있으면 이 공고에서 정보를 다시 저장할 때 그 공연사로 다시 연결돼요.
      </p>
      {error ? <p role="alert" className="text-fail">{error}</p> : null}
    </section>
  );
}

/** KOPIS에서 찾은 후보를 고르거나 다른 이름으로 다시 찾는다. */
function KopisPanel({ result, failed, searching, picked, suggestedName, onPick, onSearch }: {
  readonly result: KopisCompanySearchResult | null;
  readonly failed: boolean;
  readonly searching: string | null;
  readonly picked: number;
  readonly suggestedName: string;
  readonly onPick: (index: number) => void;
  readonly onSearch: (name: string) => void;
}) {
  const [query, setQuery] = useState(result?.query || suggestedName);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <section aria-label="KOPIS에서 찾은 공연사" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 text-sm">
      <form onSubmit={submit} className="flex min-w-0 flex-wrap items-center gap-2">
        <label htmlFor="kopis-query" className="shrink-0 font-semibold">KOPIS에서 찾기</label>
        <FieldInput
          id="kopis-query"
          value={query}
          maxLength={50}
          onChange={(event) => setQuery(event.target.value)}
          className="!min-h-10 w-0 min-w-40 flex-1 py-1.5"
        />
        <AdminActionButton type="submit" disabled={searching !== null || !query.trim()}>{searching !== null ? "찾는 중…" : "다시 찾기"}</AdminActionButton>
      </form>
      <p role="status" className="text-muted">{kopisStatus(result, failed, searching)}</p>
      {result?.companies.length ? (
        <fieldset className="flex flex-col gap-1">
          <legend className="sr-only">처음 값으로 쓸 KOPIS 기획제작사</legend>
          {result.companies.map((company, index) => (
            <label key={`${company.kopisId ?? company.name}-${index}`} className="flex min-h-10 cursor-pointer items-start gap-2.5 rounded-control px-2 py-1.5 hover:bg-card">
              <input type="radio" name="kopis-company" checked={picked === index} onChange={() => onPick(index)} className="mt-1 size-4 shrink-0 accent-brand" />
              <span className="min-w-0">
                <span className="font-semibold">{company.name}</span>
                <span className="ml-2 text-xs text-muted">{[company.genre, company.kopisId].filter(Boolean).join(" · ")}</span>
                {company.recentWorks.length ? <span className="block truncate text-xs text-muted">{company.recentWorks.join(", ")}</span> : null}
              </span>
            </label>
          ))}
          <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-control px-2 py-1.5 hover:bg-card">
            <input type="radio" name="kopis-company" checked={picked === WITHOUT_KOPIS} onChange={() => onPick(WITHOUT_KOPIS)} className="size-4 shrink-0 accent-brand" />
            <span>KOPIS 정보 없이 원문 작성자 이름으로 쓰기</span>
          </label>
          <p className="text-xs text-muted">다른 후보를 고르면 폼이 그 정보로 다시 채워져요.</p>
        </fieldset>
      ) : null}
    </section>
  );
}

function kopisStatus(result: KopisCompanySearchResult | null, failed: boolean, searching: string | null): string {
  if (searching !== null) return `KOPIS에서 "${searching}" 공연사를 찾는 중이에요.`;
  if (failed || !result?.available) return "KOPIS를 부르지 못했어요. 직접 써 주세요.";
  if (!result.companies.length) return `KOPIS에서 "${result.query}"(으)로 찾은 공연사가 없어요. 다른 이름으로 찾거나 직접 써 주세요.`;
  return `KOPIS에서 ${result.companies.length}곳을 찾았어요. 처음 값으로 쓸 곳을 골라 주세요.`;
}
