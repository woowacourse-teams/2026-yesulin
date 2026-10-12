"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FieldInput } from "@/components/ui/controls";
import {
  AdminApiError,
  AUDITION_POST_EDITED,
  changeAuditionPostStatus,
  fetchAuditionPosts,
  importOtrAuditionPost,
} from "@/features/admin/api";
import { adminAuditionPostRoutes, extractOtrId } from "@/features/admin/audition-posts";
import type { AdminAuditionPost, AdminAuditionPostImport } from "@/features/admin/types";
import { auditionPostRoutes } from "@/features/audition-posts/types";
import { logout } from "@/features/auth/session-api";
import { formatDateTime } from "./admin-format";
import { AdminAuditionPostTabs } from "./admin-audition-post-tabs";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminActionButton, AdminActionLink, AdminEmptyState, AdminFilterButton, AdminShell } from "./admin-shell";
import { SummaryItem, SummaryStrip } from "./admin-stat";

type Phase = "loading" | "ready" | "unauthorized" | "failed";

/**
 * 운영 서버는 새 OTR 공고를 알림과 함께 숨김으로 가져온다. 자동으로 가져오지 못했거나 개발 환경에서는 여기서 번호로
 * 직접 가져온다. 지원서를 준비한 뒤 보여 주고, 제작사가 내려 달라고 하면 숨긴다. 숨긴 공고 링크는 원문으로 연결된다.
 * 같은 번호를 다시 가져오면 공개 상태는 그대로 두고 원문 내용으로 교체된다. 운영자가 고친 공고는 한 번 더 확인받는다.
 */
export function AdminAuditionPosts({ ownerId }: {
  /** 이 기획사에 연결된 공고만 본다. 업체별 보기의 "공고 보기"에서 들어온다. */
  readonly ownerId?: number;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [posts, setPosts] = useState<readonly AdminAuditionPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [result, setResult] = useState<AdminAuditionPostImport | null>(null);
  const [changing, setChanging] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "HIDDEN">("ALL");
  /** 고친 공고를 원문으로 덮어쓸지 확인받는 중인 OTR 번호. */
  const [overwriteTarget, setOverwriteTarget] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchAuditionPosts(ownerId)
      .then((next) => {
        if (!active) return;
        setPosts(next);
        setError(null);
        setPhase("ready");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          setPhase("unauthorized");
          return;
        }
        setError(cause instanceof Error ? cause.message : "가져온 공고 목록을 불러오지 못했습니다.");
        setPhase("failed");
      });
    return () => { active = false; };
  }, [ownerId, reloadToken]);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);

  const handleFailure = (cause: unknown, fallback: string) => {
    if (cause instanceof AdminApiError && cause.status === 401) {
      setPhase("unauthorized");
      return;
    }
    setError(cause instanceof Error ? cause.message : fallback);
  };

  const runImport = async (otrId: string, overwriteEdited = false) => {
    setImporting(otrId);
    setError(null);
    setResult(null);
    setOverwriteTarget(null);
    try {
      const imported = await importOtrAuditionPost(otrId, overwriteEdited);
      setResult(imported);
      setPosts((current) => [
        ...(ownerId === undefined || imported.post.ownerId === ownerId ? [imported.post] : []),
        ...current.filter((post) => post.id !== imported.post.id),
      ]);
      setInput("");
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.code === AUDITION_POST_EDITED) {
        setOverwriteTarget(otrId);
        return;
      }
      handleFailure(cause, "OTR 공고를 가져오지 못했습니다.");
    } finally {
      setImporting(null);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const otrId = extractOtrId(input);
    if (!otrId) {
      setInputError("OTR 공고 번호(숫자)나 공고 주소를 넣어 주세요.");
      return;
    }
    setInputError(null);
    void runImport(otrId);
  };

  const toggleStatus = async (post: AdminAuditionPost) => {
    setChanging(post.id);
    setError(null);
    try {
      const updated = await changeAuditionPostStatus(post.id, post.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED");
      setPosts((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) {
      handleFailure(cause, "공개 상태를 바꾸지 못했습니다.");
    } finally {
      setChanging(null);
    }
  };

  async function signOut() {
    await logout().catch(() => null);
    setPosts([]);
    setPhase("unauthorized");
  }

  if (phase === "unauthorized") {
    return <AdminSessionEnded />;
  }

  const search = query.trim().toLocaleLowerCase("ko-KR");
  const visiblePosts = posts.filter((post) =>
    (statusFilter === "ALL" || post.status === statusFilter)
    && (!search || [post.title, post.authorName, post.externalId, post.ownerName].some((value) => value?.toLocaleLowerCase("ko-KR").includes(search))),
  );

  return (
    <AdminShell
      current="posts"
      title="공고 관리"
      description="공고를 작성하거나 OTR에서 가져온 뒤, 내용을 확인하고 공개해 주세요."
      actions={(
        <>
          <AdminActionButton onClick={refresh}>새로고침</AdminActionButton>
          <AdminActionButton tone="quiet" onClick={() => void signOut()}>로그아웃</AdminActionButton>
        </>
      )}
    >
      <AdminAuditionPostTabs current="posts" />
      {ownerId !== undefined ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-brand-line bg-brand-soft px-4 py-3 text-sm">
          <span>
            <strong className="font-semibold">{posts.find((post) => post.ownerName)?.ownerName ?? `기획사 회원 ${ownerId}`}</strong>에 연결된 공고만 보고 있어요.
          </span>
          <Link href={adminAuditionPostRoutes.list} className="font-semibold text-brand underline underline-offset-2">전체 공고 보기</Link>
        </p>
      ) : null}
      {phase === "ready" ? <SummaryStrip>
        <SummaryItem label="조회된 공고" value={posts.length} unit="건" />
        <SummaryItem label="공개 중" value={posts.filter((post) => post.status === "PUBLISHED").length} unit="건" />
        <SummaryItem label="숨김" value={posts.filter((post) => post.status === "HIDDEN").length} unit="건" />
        <SummaryItem label="기획사 등록" value={posts.filter((post) => post.writtenByOwner).length} unit="건" />
      </SummaryStrip> : null}
      {phase === "ready" ? <p className="-mt-3 text-xs text-muted">최근 등록된 공고 200건까지 확인·검색할 수 있어요. 요약 숫자는 현재 목록 기준입니다.</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">공고 목록 <span className="num ml-1 text-sm font-normal text-muted">{phase === "ready" ? `${visiblePosts.length}건` : ""}</span></h2>
        <div className="flex flex-wrap gap-2">
          <AdminActionButton aria-expanded={importOpen} aria-controls="otr-import" onClick={() => setImportOpen((open) => !open)}>OTR에서 가져오기</AdminActionButton>
          <AdminActionLink tone="primary" href={adminAuditionPostRoutes.create}>공고 작성</AdminActionLink>
        </div>
      </div>
      {importOpen ? <form id="otr-import" onSubmit={submit} noValidate className="rounded-card border border-border bg-card p-4 sm:p-5">
        <label htmlFor="otr-id" className="text-sm font-bold">OTR 공고 번호 또는 주소</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <FieldInput
            id="otr-id"
            value={input}
            onChange={(event) => { setInput(event.target.value); setInputError(null); }}
            placeholder="22397 또는 https://otr.co.kr/audition/?vid=22397"
            inputMode="url"
            autoComplete="off"
            aria-invalid={inputError ? true : undefined}
            aria-describedby={inputError ? "otr-id-error" : "otr-id-hint"}
            className="min-w-0 flex-1"
          />
          <AdminActionButton
            type="submit"
            tone="primary"
            disabled={importing !== null}
            className="shrink-0"
          >
            {importing ? "가져오는 중…" : "가져오기"}
          </AdminActionButton>
        </div>
        {inputError ? (
          <p id="otr-id-error" role="alert" className="mt-2 text-sm text-fail">{inputError}</p>
        ) : (
          <p id="otr-id-hint" className="mt-2 text-sm text-muted">숨김으로 가져옵니다. 사진·첨부가 많으면 수십 초 걸릴 수 있어요.</p>
        )}
      </form> : null}

      {overwriteTarget ? (
        <OverwriteConfirm
          otrId={overwriteTarget}
          title={posts.find((post) => post.externalId === overwriteTarget)?.title}
          onConfirm={() => void runImport(overwriteTarget, true)}
          onCancel={() => setOverwriteTarget(null)}
        />
      ) : null}

      {result ? <ImportResult result={result} /> : null}

      {error ? (
        <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">
          {error} {phase === "failed" ? <button type="button" onClick={refresh} className="font-semibold underline">다시 시도</button> : null}
        </p>
      ) : null}
      {phase === "loading" ? <p role="status" className="text-sm text-muted">가져온 공고를 불러오는 중이에요.</p> : null}

      {phase === "ready" ? (
        <section aria-label="공고 목록" className="flex flex-col gap-4">
          {posts.length > 0 ? <div className="flex flex-wrap items-end justify-between gap-3">
            <div role="group" aria-label="공고 공개 상태" className="flex flex-wrap gap-2">
              {([{ value: "ALL", label: "전체" }, { value: "PUBLISHED", label: "공개 중" }, { value: "HIDDEN", label: "숨김" }] as const).map((filter) => (
                <AdminFilterButton key={filter.value} pressed={statusFilter === filter.value} onClick={() => setStatusFilter(filter.value)}>{filter.label}</AdminFilterButton>
              ))}
            </div>
            <label className="flex w-full flex-col gap-1.5 text-sm font-medium sm:w-72" htmlFor="post-search">
              공고 검색
              <FieldInput id="post-search" name="post-search" type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목, 작성자, 기획사, OTR 번호…" />
            </label>
          </div> : null}
          {posts.length === 0 ? (
            <AdminEmptyState title="첫 공고를 등록해 보세요" description="업체에서 전달받은 내용을 직접 작성하거나, OTR 공고 번호·주소로 가져올 수 있어요." />
          ) : null}
          {posts.length > 0 && visiblePosts.length === 0 ? <AdminEmptyState title="조건에 맞는 공고가 없어요" description="검색어 또는 공개 상태를 바꿔 주세요.">
            <AdminActionButton onClick={() => { setQuery(""); setStatusFilter("ALL"); }}>검색·필터 초기화</AdminActionButton>
          </AdminEmptyState> : null}
          {visiblePosts.map((post) => (
            <article key={post.id} className="rounded-card border border-border bg-card p-4 sm:px-5">
              <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className={`rounded-full px-2.5 py-0.5 font-bold ${post.status === "PUBLISHED" ? "bg-pass-bg text-pass" : "bg-border-soft text-muted-strong"}`}>
                  {post.status === "PUBLISHED" ? "공개 중" : "숨김"}
                </span>
                {post.autoImported ? <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-bold text-brand">자동 수집</span> : null}
                {post.closed ? <span className="rounded-full bg-border-soft px-2.5 py-0.5 font-bold text-muted">마감</span> : null}
                {post.editedAt ? <span className="rounded-full bg-warn-bg px-2.5 py-0.5 font-bold text-warn">수정됨</span> : null}
                {post.externalId ? (
                  <span className="num text-muted">{post.source} {post.externalId}</span>
                ) : (
                  <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-bold text-brand">{post.writtenByOwner ? "기획사 등록" : "직접 작성"}</span>
                )}
                {post.ownerId !== null ? <span className="text-muted-strong">기획사 {post.ownerName ?? `회원 ${post.ownerId}`}</span> : null}
                <span className="ml-auto text-muted">{formatDateTime(post.updatedAt)} 갱신</span>
              </header>
              <h3 className="mt-3 break-words text-lg font-semibold"><Link href={adminAuditionPostRoutes.edit(post.id)} className="hover:text-brand">{post.title}</Link></h3>
              <p className="mt-1 text-sm text-muted-strong">
                {[post.category, post.authorName, post.deadlineText && `마감 ${post.deadlineText}`].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-1 text-xs text-muted">사진 <span className="num">{post.imageCount}</span> · 첨부 <span className="num">{post.attachmentCount}</span> · 조회 <span className="num">{post.viewCount}</span> · OTR 이동 <span className="num">{post.redirectCount}</span></p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border-soft pt-4">
                {post.status === "PUBLISHED" ? (
                  <AdminActionLink href={auditionPostRoutes.detail(post.id)} target="_blank">공개 화면</AdminActionLink>
                ) : null}
                <AdminActionLink href={adminAuditionPostRoutes.edit(post.id)}>수정</AdminActionLink>
                {post.sourceUrl && post.externalId ? (
                  <>
                    <AdminActionLink href={post.sourceUrl} target="_blank" rel="noopener noreferrer">원문</AdminActionLink>
                    <ReimportButton otrId={post.externalId} importing={importing} onImport={(otrId) => void runImport(otrId)} />
                  </>
                ) : null}
                <AdminActionButton
                  disabled={changing === post.id}
                  onClick={() => void toggleStatus(post)}
                  className="ml-auto"
                >
                  {changing === post.id ? "바꾸는 중…" : post.status === "PUBLISHED" ? "숨기기" : "보여주기"}
                </AdminActionButton>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </AdminShell>
  );
}

function ReimportButton({ otrId, importing, onImport }: {
  readonly otrId: string;
  readonly importing: string | null;
  readonly onImport: (otrId: string) => void;
}) {
  return (
    <AdminActionButton disabled={importing !== null} onClick={() => onImport(otrId)}>
      {importing === otrId ? "다시 가져오는 중…" : "원문으로 다시 가져오기"}
    </AdminActionButton>
  );
}

/** 고친 공고를 원문으로 덮어쓰기 전에 한 번 더 묻는다. 확인하면 같은 번호를 덮어쓰기로 다시 요청한다. */
function OverwriteConfirm({ otrId, title, onConfirm, onCancel }: {
  readonly otrId: string;
  readonly title?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  return (
    <section role="alert" className="rounded-card border border-warn/30 bg-warn-bg px-4 py-4 text-sm sm:px-5">
      <p className="font-bold text-warn">고친 공고예요. 원문으로 다시 가져올까요?</p>
      <p className="mt-1 font-semibold text-foreground">
        <span className="num">OTR {otrId}</span>{title ? ` · ${title}` : ""}
      </p>
      <p className="mt-1 text-foreground">원문으로 다시 가져오면 운영자가 고친 제목·마감·본문 등이 모두 원문 내용으로 돌아가요.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <AdminActionButton
          tone="destructive"
          onClick={onConfirm}
        >
          원문으로 덮어쓰기
        </AdminActionButton>
        <AdminActionButton onClick={onCancel}>그대로 두기</AdminActionButton>
      </div>
    </section>
  );
}

function ImportResult({ result }: { readonly result: AdminAuditionPostImport }) {
  return (
    <section role="status" className="rounded-card border border-pass/30 bg-pass-bg px-4 py-4 text-sm sm:px-5">
      <p className="font-bold text-pass">
        {result.created ? "숨김으로 가져왔어요. 지원서를 준비한 뒤 '보여주기'를 눌러 주세요." : "원문 내용으로 다시 가져왔어요."}
      </p>
      <p className="mt-1 text-foreground">
        {result.post.title} · 사진 <span className="num">{result.post.imageCount}</span> · 첨부 <span className="num">{result.post.attachmentCount}</span>
      </p>
      {result.skippedAttachments.length ? (
        <div className="mt-2 text-warn">
          <p className="font-semibold">옮기지 못한 첨부파일이 있어요. 필요하면 원문에서 받도록 안내해 주세요.</p>
          <ul className="mt-1 list-disc pl-5">
            {result.skippedAttachments.map((file) => <li key={file.filename}>{file.filename} ({file.reason})</li>)}
          </ul>
        </div>
      ) : null}
      {result.post.status === "PUBLISHED" ? (
        <Link href={auditionPostRoutes.detail(result.post.id)} target="_blank" className="mt-2 inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-2">
          공개 화면 보기
        </Link>
      ) : null}
    </section>
  );
}
