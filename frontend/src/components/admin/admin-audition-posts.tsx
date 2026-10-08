"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FieldInput } from "@/components/ui/controls";
import {
  AdminApiError,
  changeAuditionPostStatus,
  fetchAuditionPosts,
  importOtrAuditionPost,
} from "@/features/admin/api";
import { extractOtrId } from "@/features/admin/audition-posts";
import type { AdminAuditionPost, AdminAuditionPostImport } from "@/features/admin/types";
import { auditionPostRoutes } from "@/features/audition-posts/types";
import { logout } from "@/features/auth/session-api";
import { formatDateTime } from "./admin-format";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminActionButton, AdminShell } from "./admin-shell";

type Phase = "loading" | "ready" | "unauthorized" | "failed";

const ROW_BUTTON_CLASS =
  "inline-flex min-h-11 items-center rounded-control border border-border bg-card px-3 text-sm font-semibold text-muted-strong hover:border-brand-line hover:text-brand disabled:opacity-50";

/**
 * 운영 서버는 새 OTR 공고를 알림과 함께 숨김으로 가져온다. 자동으로 가져오지 못했거나 개발 환경에서는 여기서 번호로
 * 직접 가져온다. 지원서를 준비한 뒤 보여 주고, 제작사가 내려 달라고 하면 숨긴다. 숨긴 공고 링크는 원문으로 연결된다.
 * 같은 번호를 다시 가져오면 공개 상태는 그대로 두고 원문 내용으로 교체된다.
 */
export function AdminAuditionPosts() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [posts, setPosts] = useState<readonly AdminAuditionPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [result, setResult] = useState<AdminAuditionPostImport | null>(null);
  const [changing, setChanging] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchAuditionPosts()
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
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);

  const handleFailure = (cause: unknown, fallback: string) => {
    if (cause instanceof AdminApiError && cause.status === 401) {
      setPhase("unauthorized");
      return;
    }
    setError(cause instanceof Error ? cause.message : fallback);
  };

  const runImport = async (otrId: string) => {
    setImporting(otrId);
    setError(null);
    setResult(null);
    try {
      const imported = await importOtrAuditionPost(otrId);
      setResult(imported);
      setPosts((current) => [imported.post, ...current.filter((post) => post.id !== imported.post.id)]);
      setInput("");
    } catch (cause) {
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

  return (
    <AdminShell
      current="posts"
      title="공고 가져오기"
      description="운영 서버는 새 OTR 공고를 알림과 함께 숨김으로 가져와요. 지원서를 준비한 뒤 '보여주기'를 누르면 공개되고, 제작사가 내려 달라고 하면 '숨기기'를 눌러 주세요. 숨긴 공고 링크는 OTR 원문으로 연결돼요. 자동으로 가져오지 못했거나 개발 환경에서는 OTR 번호나 알림 링크를 넣어 직접 가져와 주세요."
      actions={(
        <>
          <AdminActionButton onClick={refresh}>새로고침</AdminActionButton>
          <AdminActionButton onClick={() => void signOut()}>로그아웃</AdminActionButton>
        </>
      )}
    >
      <form onSubmit={submit} noValidate className="rounded-card border border-border bg-card p-4 sm:p-5">
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
          <button
            type="submit"
            disabled={importing !== null}
            className="min-h-12 shrink-0 rounded-control bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60"
          >
            {importing ? "가져오는 중…" : "가져오기"}
          </button>
        </div>
        {inputError ? (
          <p id="otr-id-error" role="alert" className="mt-2 text-sm text-fail">{inputError}</p>
        ) : (
          <p id="otr-id-hint" className="mt-2 text-xs text-muted">사진·첨부가 많으면 수십 초 걸릴 수 있어요. 끝날 때까지 기다려 주세요.</p>
        )}
      </form>

      {result ? <ImportResult result={result} /> : null}

      {error ? (
        <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">
          {error} {phase === "failed" ? <button type="button" onClick={refresh} className="font-semibold underline">다시 시도</button> : null}
        </p>
      ) : null}
      {phase === "loading" ? <p role="status" className="text-sm text-muted">가져온 공고를 불러오는 중이에요.</p> : null}

      {phase === "ready" ? (
        <section aria-label="가져온 공고" className="flex flex-col gap-3">
          {posts.length === 0 ? (
            <p className="rounded-card border border-border bg-card px-4 py-8 text-center text-sm text-muted">아직 가져온 공고가 없어요.</p>
          ) : null}
          {posts.map((post) => (
            <article key={post.id} className="rounded-card border border-border bg-card p-4 sm:px-5">
              <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className={`rounded-full px-2.5 py-0.5 font-bold ${post.status === "PUBLISHED" ? "bg-pass-bg text-pass" : "bg-border-soft text-muted-strong"}`}>
                  {post.status === "PUBLISHED" ? "공개 중" : "숨김"}
                </span>
                {post.autoImported ? <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-bold text-brand">자동 수집</span> : null}
                {post.closed ? <span className="rounded-full bg-border-soft px-2.5 py-0.5 font-bold text-muted">마감</span> : null}
                <span className="num text-muted">{post.source} {post.externalId}</span>
                <span className="ml-auto text-muted">{formatDateTime(post.updatedAt)} 갱신</span>
              </header>
              <h3 className="mt-2 text-base font-bold">{post.title}</h3>
              <p className="mt-1 text-sm text-muted-strong">
                {[post.category, post.authorName, post.deadlineText && `마감 ${post.deadlineText}`].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-1 text-xs text-muted">사진 <span className="num">{post.imageCount}</span> · 첨부 <span className="num">{post.attachmentCount}</span> · 조회 <span className="num">{post.viewCount}</span> · OTR 이동 <span className="num">{post.redirectCount}</span></p>
              <div className="mt-3 flex flex-wrap gap-2">
                {post.status === "PUBLISHED" ? (
                  <Link href={auditionPostRoutes.detail(post.id)} target="_blank" className={ROW_BUTTON_CLASS}>공개 화면</Link>
                ) : null}
                <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className={ROW_BUTTON_CLASS}>원문</a>
                <button
                  type="button"
                  className={ROW_BUTTON_CLASS}
                  disabled={importing !== null}
                  onClick={() => void runImport(post.externalId)}
                >
                  {importing === post.externalId ? "다시 가져오는 중…" : "원문으로 다시 가져오기"}
                </button>
                <button
                  type="button"
                  disabled={changing === post.id}
                  onClick={() => void toggleStatus(post)}
                  className="ml-auto min-h-11 rounded-control border border-foreground bg-foreground px-4 text-sm font-semibold text-white hover:bg-sidebar-hover disabled:opacity-50"
                >
                  {changing === post.id ? "바꾸는 중…" : post.status === "PUBLISHED" ? "숨기기" : "보여주기"}
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </AdminShell>
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
