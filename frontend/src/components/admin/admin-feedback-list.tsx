"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminApiError, fetchFeedback } from "@/features/admin/api";
import type { AdminFeedbackItem, AdminFeedbackType } from "@/features/admin/types";
import { AdminSessionEnded } from "./admin-session-ended";
import { formatDateTime } from "./admin-format";
import { AdminActionButton, AdminEmptyState, AdminShell } from "./admin-shell";

type Phase = "loading" | "ready" | "unauthorized" | "failed";

const TYPE_LABELS: Record<AdminFeedbackType, string> = {
  INCONVENIENCE: "불편해요",
  BUG: "오류예요",
  SUGGESTION: "제안해요",
};

/**
 * 화면의 "의견 보내기"로 들어온 의견. 슬랙 알림에는 연락처와 사진이 없으므로 여기서 확인한다.
 * 사진 주소는 잠깐만 열리므로 오래 열어 두었으면 새로고침한다.
 */
export function AdminFeedbackList() {
  const feed = useFeedbackPages();
  if (feed.phase === "unauthorized") return <AdminSessionEnded />;
  return (
    <AdminShell current="feedback" title="받은 의견" description="화면 오른쪽 아래 의견 보내기로 들어온 의견이에요. 최신순으로 보여 줘요."
      actions={<AdminActionButton onClick={feed.reload}>새로고침</AdminActionButton>}>
      {feed.error && <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">{feed.error}</p>}
      {feed.phase === "loading" && feed.items.length === 0 && <p role="status" className="text-sm text-muted">의견을 불러오는 중이에요.</p>}
      {feed.phase === "ready" && feed.items.length === 0 && <AdminEmptyState title="아직 받은 의견이 없어요" />}
      <section aria-label="받은 의견" className="flex flex-col gap-3">
        {feed.items.map(item => <FeedbackCard key={item.id} item={item} />)}
      </section>
      {feed.hasNext && <AdminActionButton onClick={feed.loadMore} disabled={feed.phase === "loading"}>더 보기</AdminActionButton>}
    </AdminShell>
  );
}

type Request = { readonly before?: number; readonly token: number };

/** 더 보기는 화면에 있는 마지막 의견 번호를 기준으로 이어 받는다. 실패해도 기준이 그대로라 다시 누르면 같은 자리부터 받는다. */
function useFeedbackPages() {
  const [items, setItems] = useState<readonly AdminFeedbackItem[]>([]);
  const [request, setRequest] = useState<Request>({ token: 0 });
  const [hasNext, setHasNext] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetchFeedback(request.before).then(next => {
      if (!active) return;
      setItems(current => mergePage(current, next.items, request.before));
      setHasNext(next.hasNext); setError(""); setPhase("ready");
    }).catch((cause: unknown) => {
      if (active) applyFailure(cause, setPhase, setError);
    });
    return () => { active = false; };
  }, [request]);
  const reload = useCallback(() => { setPhase("loading"); setRequest(current => ({ token: current.token + 1 })); }, []);
  const lastId = items.at(-1)?.id;
  const loadMore = useCallback(() => {
    setPhase("loading");
    setRequest(current => ({ before: lastId, token: current.token + 1 }));
  }, [lastId]);
  return { items, hasNext, phase, error, reload, loadMore };
}

function mergePage(current: readonly AdminFeedbackItem[], incoming: readonly AdminFeedbackItem[], before?: number) {
  if (before === undefined) return incoming;
  const seen = new Set(current.map(item => item.id));
  return [...current, ...incoming.filter(item => !seen.has(item.id))];
}

function applyFailure(cause: unknown, setPhase: (phase: Phase) => void, setError: (message: string) => void) {
  if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) return setPhase("unauthorized");
  setError(errorMessage(cause));
  setPhase("failed");
}

function errorMessage(cause: unknown) {
  if (cause instanceof Error) return cause.message;
  return "받은 의견을 불러오지 못했습니다.";
}

function FeedbackCard({ item }: { readonly item: AdminFeedbackItem }) {
  return (
    <article id={`feedback-${item.id}`} className="rounded-card border border-border bg-card p-4 sm:px-5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand">{TYPE_LABELS[item.type]}</span>
        <span className="text-sm font-semibold">#{item.id}</span>
        <span className="text-xs text-muted">{senderLabel(item.memberId)}</span>
        <span className="ml-auto text-xs text-muted">{formatDateTime(item.createdAt)}</span>
      </header>
      <p className="mt-3 whitespace-pre-line break-all text-sm">{item.content}</p>
      <FeedbackImages item={item} />
      <dl className="mt-3 grid gap-1 text-xs text-muted sm:grid-cols-[72px_minmax(0,1fr)]">
        <dt>화면</dt><dd className="break-all">{item.pagePath || "알 수 없음"}</dd>
        <dt>연락처</dt><dd className="break-all text-foreground">{item.contact || "없음"}</dd>
        <dt>브라우저</dt><dd className="break-all">{item.userAgent || "-"}</dd>
      </dl>
    </article>
  );
}

function senderLabel(memberId: number | null) {
  if (memberId === null) return "비회원";
  return `회원 #${memberId}`;
}

function FeedbackImages({ item }: { readonly item: AdminFeedbackItem }) {
  if (item.imageUrls.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label={`의견 #${item.id} 첨부 사진`}>
      {item.imageUrls.map((url, index) => (
        <li key={url}>
          <a href={url} target="_blank" rel="noopener noreferrer" className="block size-28 overflow-hidden rounded-control border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- 잠깐만 열리는 비공개 저장소 주소라 이미지 최적화를 거치지 않는다. */}
            <img src={url} alt={`첨부 사진 ${index + 1} (새 창에서 열기)`} className="size-full object-cover" />
          </a>
        </li>
      ))}
    </ul>
  );
}
