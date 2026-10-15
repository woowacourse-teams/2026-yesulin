"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FieldInput } from "@/components/ui/controls";
import { AdminApiError, fetchKopisCompanies, fetchPostCompany, savePostCompany } from "@/features/admin/api";
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
 * 같은 OTR 작성자의 다른 공고와 이후 가져오는 공고에도 같은 정보가 연결된다. 내리기는 공연사 탭에서 한다.
 */
export function AdminPostCompanyEditor({ postId, onSaved, onCancel, onUnauthorized }: {
  readonly postId: number;
  readonly onSaved: (company: AdminCompany) => void;
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
        {" "}저장하면 바로 공개돼요.
        {profile.sourceAuthorId ? " 같은 OTR 작성자의 다른 공고와 앞으로 가져오는 공고에도 이 정보가 쓰여요." : null}
      </p>
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
        submitLabel="저장하고 공개"
        onCancel={onCancel}
        onUnauthorized={onUnauthorized}
        onSave={async (write) => onSaved(await savePostCompany(postId, write, true))}
      />
    </div>
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
