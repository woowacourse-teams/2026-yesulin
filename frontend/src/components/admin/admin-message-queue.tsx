"use client";

import { useCallback, useEffect, useState } from "react";
import { FilterChip } from "@/components/ui/controls";
import { AdminApiError, completeTimetableMessages, fetchTimetableMessages } from "@/features/admin/api";
import { smsHref } from "@/features/admin/sms-link";
import type { AdminTimetableMessage, AdminTimetableMessages, AdminTimetableMessageStatus, AdminTimetableMessageType } from "@/features/admin/types";
import { logout } from "@/features/auth/session-api";
import { AdminSessionEnded } from "./admin-session-ended";
import { formatDateTime } from "./admin-format";
import { AdminActionButton, AdminShell } from "./admin-shell";

type Phase = "loading" | "ready" | "unauthorized" | "failed";

const TYPE_LABELS: Record<AdminTimetableMessageType, string> = {
  ORGANIZER_LINK: "기획사 · 관리 링크",
  ORGANIZER_TIME_REQUEST: "기획사 · 시간 조정 요청",
  ACTOR_INVITATION: "배우 · 합격·일정 안내",
  ACTOR_SCHEDULE_CHANGED: "배우 · 일정 변경",
};

const ROW_BUTTON_CLASS =
  "min-h-11 rounded-control border border-border bg-card px-3 text-sm font-semibold text-muted-strong hover:border-brand-line hover:text-brand disabled:opacity-50";

/**
 * 오디션 일정표 문자 발송 대기열. 기획사 화면은 자동 발송으로 안내하므로 운영자가 오래된 순서대로 직접 보내고
 * 완료로 표시한다. 휴대폰에서는 번호와 본문을 채운 문자 앱을 한 사람씩 연다. 번호와 본문은 화면에서만 보여 주고
 * 브라우저에 저장하지 않는다.
 */
export function AdminMessageQueue() {
  const [status, setStatus] = useState<AdminTimetableMessageStatus>("PENDING");
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<AdminTimetableMessages | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [completing, setCompleting] = useState<ReadonlySet<number>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTimetableMessages(status)
      .then((next) => {
        if (!active) return;
        setData(next);
        setError(null);
        setPhase("ready");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          setData(null);
          setPhase("unauthorized");
          return;
        }
        setError(cause instanceof Error ? cause.message : "문자 대기열을 불러오지 못했습니다.");
        setPhase("failed");
      });
    return () => { active = false; };
  }, [status, reloadToken]);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => setCopied(key), () => setCopied(null));
  };

  const complete = async (messages: readonly AdminTimetableMessage[]) => {
    const ids = messages.map((message) => message.id);
    setCompleting((current) => new Set([...current, ...ids]));
    try {
      await completeTimetableMessages(ids);
      setData((current) => current && {
        pendingCount: Math.max(0, current.pendingCount - ids.length),
        messages: current.messages.filter((message) => !ids.includes(message.id)),
      });
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) {
        setPhase("unauthorized");
        return;
      }
      setError(cause instanceof Error ? cause.message : "발송 완료로 표시하지 못했습니다.");
    } finally {
      setCompleting((current) => new Set([...current].filter((id) => !ids.includes(id))));
    }
  };

  async function signOut() {
    await logout().catch(() => null);
    setData(null);
    setPhase("unauthorized");
  }

  if (phase === "unauthorized") {
    return <AdminSessionEnded />;
  }

  return (
    <AdminShell
      current="messages"
      title="문자 대기열"
      description="오디션 일정표에서 생긴 문자예요. 기획사에는 자동 발송으로 안내하므로 오래된 순서대로 문자 앱으로 열기 → 보내기 → 완료 표시 순서로 처리해 주세요."
      actions={(
        <>
          <AdminActionButton onClick={refresh}>새로고침</AdminActionButton>
          <AdminActionButton onClick={() => void signOut()}>로그아웃</AdminActionButton>
        </>
      )}
    >
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="발송 상태">
        <FilterChip pressed={status === "PENDING"} onClick={() => { setStatus("PENDING"); setPhase("loading"); }}>
          보낼 문자{data ? ` ${data.pendingCount}` : ""}
        </FilterChip>
        <FilterChip pressed={status === "SENT"} onClick={() => { setStatus("SENT"); setPhase("loading"); }}>최근 보낸 문자</FilterChip>
      </div>

      {error ? (
        <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">
          {error} <button type="button" onClick={refresh} className="font-semibold underline">다시 시도</button>
        </p>
      ) : null}
      {phase === "loading" ? <p role="status" className="text-sm text-muted">문자를 불러오는 중이에요.</p> : null}

      {data && phase === "ready" ? (
        <section aria-label={status === "PENDING" ? "보낼 문자" : "최근 보낸 문자"} className="flex flex-col gap-3">
          {data.messages.length === 0 ? (
            <p className="rounded-card border border-border bg-card px-4 py-8 text-center text-sm text-muted">
              {status === "PENDING" ? "보낼 문자가 없어요." : "보낸 문자가 없어요."}
            </p>
          ) : null}
          {data.messages.map((message) => (
            <article key={message.id} className="rounded-card border border-border bg-card p-4 sm:px-5">
              <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand">{TYPE_LABELS[message.type]}</span>
                <span className="text-sm font-semibold">{message.timetableTitle}</span>
                <span className="text-xs text-muted">{message.organizerName}</span>
                <span className="ml-auto text-xs text-muted">
                  {status === "PENDING" ? `${formatDateTime(message.createdAt)} 대기` : `${formatDateTime(message.sentAt)} 보냄`}
                </span>
              </header>
              <div className="mt-3 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-semibold">{message.recipientName}</p>
                  <p className="num text-base">{message.recipientPhone}</p>
                </div>
                <p className="whitespace-pre-line break-all rounded-control bg-surface px-3 py-2 text-sm text-foreground">{message.body}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {status === "PENDING" ? (
                  <a
                    href={smsHref(message.recipientPhone, message.body, navigator.userAgent)}
                    className="inline-flex min-h-11 items-center rounded-control border border-brand bg-brand-soft px-3 text-sm font-semibold text-brand hover:bg-brand-soft-strong"
                  >
                    문자 앱으로 열기
                  </a>
                ) : null}
                <button type="button" className={ROW_BUTTON_CLASS} onClick={() => copy(`phone-${message.id}`, message.recipientPhone)}>
                  {copied === `phone-${message.id}` ? "번호 복사됨" : "번호 복사"}
                </button>
                <button type="button" className={ROW_BUTTON_CLASS} onClick={() => copy(`body-${message.id}`, message.body)}>
                  {copied === `body-${message.id}` ? "본문 복사됨" : "본문 복사"}
                </button>
                {status === "PENDING" ? (
                  <button
                    type="button"
                    disabled={completing.has(message.id)}
                    onClick={() => void complete([message])}
                    className="ml-auto min-h-11 rounded-control border border-foreground bg-foreground px-4 text-sm font-semibold text-white hover:bg-sidebar-hover disabled:opacity-50"
                  >
                    {completing.has(message.id) ? "표시 중…" : "보냈어요 · 완료 표시"}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          {status === "PENDING" && data.pendingCount > data.messages.length ? (
            <p className="text-sm text-muted">오래된 {data.messages.length}건만 보여요. 완료로 표시하면 다음 문자가 이어서 보여요.</p>
          ) : null}
        </section>
      ) : null}
    </AdminShell>
  );
}
