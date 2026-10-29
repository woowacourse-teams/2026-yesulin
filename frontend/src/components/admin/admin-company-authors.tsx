"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FieldInput, FieldSelect } from "@/components/ui/controls";
import {
  AdminApiError,
  createCompaniesFromAuthors,
  createCompanyFromAuthor,
  fetchCompanyAuthors,
  fillAuditionPostAuthors,
  linkCompanyAuthor,
  unlinkCompanyAuthor,
} from "@/features/admin/api";
import type { AdminCompany, AdminCompanyAuthor, AdminCompanyAuthorOverview } from "@/features/admin/types";
import { AUDITION_POST_STATUS_LABELS } from "@/features/audition-posts/editing";
import { adminAuditionPostRoutes } from "@/features/admin/audition-posts";
import { AdminActionButton, AdminEmptyState } from "./admin-shell";

/**
 * OTR 공고를 작성자(회원 번호)별로 보여 주고 같은 작성자의 공고를 한 공연사로 묶는다. 같은 작성자가 여러 번 올린 공고와
 * 같은 공고를 다시 올린 글이 공연사 하나로 모인다. 묶으면 이후 가져오는 그 작성자의 공고도 그 공연사에 연결된다.
 */
export function AdminCompanyAuthors({ companies, onCompaniesChanged, onUnauthorized }: {
  readonly companies: readonly AdminCompany[];
  /** 공연사를 새로 만들었으니 목록을 다시 읽으라는 신호. */
  readonly onCompaniesChanged: () => void;
  readonly onUnauthorized: () => void;
}) {
  const [overview, setOverview] = useState<AdminCompanyAuthorOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const handleFailure = useCallback((cause: unknown, fallback: string) => {
    if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
      onUnauthorized();
      return;
    }
    setError(cause instanceof Error ? cause.message : fallback);
  }, [onUnauthorized]);

  useEffect(() => {
    let active = true;
    fetchCompanyAuthors()
      .then((next) => { if (active) { setOverview(next); setError(null); } })
      .catch((cause: unknown) => { if (active) handleFailure(cause, "작성자 목록을 불러오지 못했습니다."); });
    return () => { active = false; };
  }, [reloadToken, handleFailure]);

  const reload = () => setReloadToken((value) => value + 1);

  const run = async (key: string, work: () => Promise<string>, createsCompany: boolean) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      setNotice(await work());
      if (createsCompany) onCompaniesChanged();
      reload();
    } catch (cause) {
      handleFailure(cause, "작성자를 묶지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const fillAuthorIds = () => run("fill", async () => {
    let beforeId: number | null = null;
    let filled = 0;
    let failed = 0;
    // 한 번에 20건씩 읽으므로 남은 공고가 없을 때까지 이어서 읽는다. 너무 오래 붙잡지 않도록 10번까지만 반복한다.
    for (let round = 0; round < 10; round += 1) {
      const result = await fillAuditionPostAuthors(beforeId);
      filled += result.filled;
      failed += result.failed;
      if (result.nextBeforeId === null) break;
      beforeId = result.nextBeforeId;
    }
    return `작성자 번호를 ${filled}건 채웠어요.${failed ? ` 원문을 읽지 못한 공고 ${failed}건은 다시 시도해 주세요.` : ""}`;
  }, false);

  if (!overview) {
    return (
      <section aria-labelledby="company-authors" className="flex flex-col gap-3">
        <AuthorsHeading />
        {error ? <p role="alert" className="text-sm text-fail">{error}</p> : <p role="status" className="text-sm text-muted">작성자를 불러오는 중이에요.</p>}
      </section>
    );
  }

  const search = query.trim().toLocaleLowerCase("ko-KR");
  const visible = overview.authors.filter((author) => !search
    || [author.authorName, author.sourceAuthorId, author.companyName].some((value) => value?.toLocaleLowerCase("ko-KR").includes(search)));
  const unlinkedCount = overview.authors.filter((author) => author.sourceAuthorId && author.linkId === null).length;

  return (
    <section aria-labelledby="company-authors" className="flex flex-col gap-3">
      <AuthorsHeading />
      {overview.missingAuthorIdCount > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-control border border-warn/30 bg-warn-bg px-4 py-3 text-sm">
          <p className="min-w-0 flex-1 text-foreground">
            작성자 번호가 없는 예전 공고가 <span className="num font-semibold">{overview.missingAuthorIdCount}</span>건 있어요. 번호를 읽어야 작성자별로 묶을 수 있어요.
          </p>
          <AdminActionButton disabled={busy !== null} onClick={() => void fillAuthorIds()}>
            {busy === "fill" ? "번호 읽는 중…" : "OTR에서 작성자 번호 읽기"}
          </AdminActionButton>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="flex w-full flex-col gap-1.5 text-sm font-medium sm:w-72" htmlFor="author-search">
          작성자 검색
          <FieldInput id="author-search" type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="닉네임, 회원 번호, 공연사…" />
        </label>
        {unlinkedCount > 0 ? (
          confirmBulk ? (
            <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
              <span>묶지 않은 작성자 <span className="num font-semibold">{unlinkedCount}</span>명마다 검토 전 공연사를 만들까요?</span>
              <AdminActionButton
                tone="primary"
                disabled={busy !== null}
                onClick={() => { setConfirmBulk(false); void run("bulk", async () => `공연사 ${await createCompaniesFromAuthors()}곳을 검토 전으로 만들었어요.`, true); }}
              >
                만들기
              </AdminActionButton>
              <AdminActionButton onClick={() => setConfirmBulk(false)}>취소</AdminActionButton>
            </div>
          ) : (
            <AdminActionButton disabled={busy !== null} onClick={() => setConfirmBulk(true)}>
              {busy === "bulk" ? "만드는 중…" : `묶지 않은 작성자 모두 공연사로 만들기 (${unlinkedCount}명)`}
            </AdminActionButton>
          )
        ) : null}
      </div>
      {notice ? <p role="status" className="rounded-control border border-pass/30 bg-pass-bg px-4 py-3 text-sm text-pass">{notice}</p> : null}
      {error ? <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">{error}</p> : null}
      {overview.authors.length === 0 ? <AdminEmptyState title="가져온 OTR 공고가 없어요" description="OTR 공고를 가져오면 작성자별로 여기에 모여요." /> : null}
      {overview.authors.length > 0 && visible.length === 0 ? <AdminEmptyState title="조건에 맞는 작성자가 없어요" /> : null}
      <ul className="flex flex-col gap-2">
        {visible.map((author) => (
          <AuthorRow
            key={author.sourceAuthorId ? `${author.source}#${author.sourceAuthorId}` : `${author.source}@${author.authorName}`}
            author={author}
            companies={companies}
            busy={busy}
            onLink={(companyId) => void run(
              `link-${author.sourceAuthorId}`,
              async () => {
                await linkCompanyAuthor(author.source, author.sourceAuthorId!, companyId);
                return `${author.authorName}의 공고를 공연사에 묶었어요.`;
              },
              false,
            )}
            onCreate={() => void run(
              `create-${author.sourceAuthorId}`,
              async () => {
                await createCompanyFromAuthor(author.source, author.sourceAuthorId!);
                return `'${author.authorName}' 공연사를 검토 전으로 만들고 묶었어요. 정보를 채운 뒤 공개해 주세요.`;
              },
              true,
            )}
            onUnlink={() => void run(
              `unlink-${author.linkId}`,
              async () => {
                await unlinkCompanyAuthor(author.linkId!);
                return `${author.authorName}의 묶음을 풀었어요. 이미 연결된 공고는 그대로예요.`;
              },
              false,
            )}
          />
        ))}
      </ul>
    </section>
  );
}

function AuthorsHeading() {
  return (
    <div>
      <h2 id="company-authors" className="text-base font-semibold">OTR 작성자별 묶기</h2>
      <p className="mt-1 text-xs text-muted">
        같은 OTR 회원이 올린 공고는 한 공연사로 묶어요. 닉네임은 바뀔 수 있어 회원 번호로 묶고, 묶은 뒤 가져오는 공고도 자동으로 연결돼요.
      </p>
      <p className="mt-1 text-xs text-muted">
        가입 회원이 로그인해서 공고를 관리하게 하려면 <Link href={adminAuditionPostRoutes.owners} className="font-semibold text-brand underline underline-offset-2">회원 연결</Link>에서 OTR 작성자와 가입 회원을 연결해 주세요.
      </p>
    </div>
  );
}

function AuthorRow({ author, companies, busy, onLink, onCreate, onUnlink }: {
  readonly author: AdminCompanyAuthor;
  readonly companies: readonly AdminCompany[];
  readonly busy: string | null;
  readonly onLink: (companyId: number) => void;
  readonly onCreate: () => void;
  readonly onUnlink: () => void;
}) {
  const selectId = `author-company-${author.source}-${author.sourceAuthorId ?? author.authorName}`;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-border bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="break-words font-semibold">{author.authorName || "닉네임 없음"}</p>
        <p className="mt-0.5 text-xs text-muted">
          {author.sourceAuthorId ? <span className="num">{author.source} 회원 #{author.sourceAuthorId}</span> : <span className="text-warn">회원 번호 없음</span>}
          {" · "}공고 <span className="num">{author.postCount}</span>건
          {author.companylessCount ? <> · 공연사 없음 <span className="num">{author.companylessCount}</span>건</> : null}
        </p>
      </div>
      {author.sourceAuthorId ? (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={selectId} className="sr-only">{author.authorName}을 묶을 공연사</label>
          <FieldSelect
            id={selectId}
            value={author.companyId ?? ""}
            disabled={busy !== null}
            onChange={(event) => { if (event.target.value) onLink(Number(event.target.value)); }}
            className="min-h-10 w-48 min-w-0 py-1.5 text-sm"
          >
            <option value="">{author.linkId === null ? "공연사 고르기" : "공연사 없음"}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}{company.status === "PUBLISHED" ? "" : ` (${AUDITION_POST_STATUS_LABELS[company.status]})`}
              </option>
            ))}
          </FieldSelect>
          {author.linkId === null ? (
            <AdminActionButton disabled={busy !== null} onClick={onCreate}>새 공연사로 만들기</AdminActionButton>
          ) : (
            <AdminActionButton tone="quiet" disabled={busy !== null} onClick={onUnlink}>묶음 풀기</AdminActionButton>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted">번호를 읽으면 묶을 수 있어요.</p>
      )}
    </li>
  );
}
