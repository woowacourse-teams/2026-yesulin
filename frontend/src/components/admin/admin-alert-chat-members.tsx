"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FieldInput } from "@/components/ui/controls";
import { AdminApiError, fetchAlertChatMembers, recordAlertChatMembers } from "@/features/admin/api";
import { ALERT_CHAT_MAX_MEMBER_COUNT, type AdminAlertChatMembers as AlertChatMembers } from "@/features/admin/types";
import { logout } from "@/features/auth/session-api";
import { formatDateTime } from "./admin-format";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminOpenChatVisits } from "./admin-openchat-visits";
import { AdminActionButton, AdminShell } from "./admin-shell";

type Phase = "loading" | "ready" | "unauthorized" | "failed";

/** 지금 인원의 두 배 이상이나 절반 이하로 바꾸면 잘못 친 숫자일 수 있어 한 번 더 확인한다. */
const CONFIRM_RATIO = 2;

const count = (value: number) => `${value.toLocaleString("ko-KR")}명`;

function signed(value: number): string {
  if (value === 0) return "변화 없음";
  return `${value > 0 ? "+" : "−"}${Math.abs(value).toLocaleString("ko-KR")}`;
}

/**
 * 공고 알림 오픈채팅방 인원. 지금 인원을 적으면 그 시각부터 올라오는 공고의 공개 조회수 추정치에 쓰이고, 이미 올라온 공고는
 * 올린 시각의 인원을 그대로 쓴다. 잘못 적었으면 고칠 수 없으니 바로 맞는 인원을 다시 적는다.
 */
export function AdminAlertChatMembers() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [members, setMembers] = useState<AlertChatMembers | null>(null);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  /** 크게 바뀌어 한 번 더 저장을 눌러야 하는 인원. */
  const [confirming, setConfirming] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    fetchAlertChatMembers()
      .then((next) => {
        if (!active) return;
        setMembers(next);
        setError(null);
        setPhase("ready");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          setPhase("unauthorized");
          return;
        }
        setError(cause instanceof Error ? cause.message : "오픈채팅방 인원을 불러오지 못했습니다.");
        setPhase("failed");
      });
    return () => { active = false; };
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);
  const endSession = useCallback(() => setPhase("unauthorized"), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!members || saving) return;
    const memberCount = Number(input);
    if (!input || !Number.isInteger(memberCount) || memberCount < 1 || memberCount > ALERT_CHAT_MAX_MEMBER_COUNT) {
      setInputError(`1~${ALERT_CHAT_MAX_MEMBER_COUNT.toLocaleString("ko-KR")} 사이의 숫자로 적어 주세요.`);
      return;
    }
    const current = members.currentMemberCount;
    if (memberCount === current) {
      setInputError("지금 적용 중인 인원과 같아요.");
      return;
    }
    const bigChange = memberCount >= current * CONFIRM_RATIO || memberCount * CONFIRM_RATIO <= current;
    if (bigChange && confirming !== memberCount) {
      setConfirming(memberCount);
      setInputError(`지금(${count(current)})보다 크게 ${memberCount > current ? "늘었어요" : "줄었어요"}. ${count(memberCount)}이 맞으면 한 번 더 저장을 눌러 주세요.`);
      return;
    }
    setConfirming(null);
    setInputError(null);
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      setMembers(await recordAlertChatMembers(memberCount));
      setInput("");
      setNotice(`${count(memberCount)}으로 적었어요. 지금부터 올라오는 공고에 적용돼요.`);
    } catch (cause) {
      if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
        setPhase("unauthorized");
        return;
      }
      setError(cause instanceof Error ? cause.message : "오픈채팅방 인원을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  async function signOut() {
    await logout().catch(() => null);
    setMembers(null);
    setPhase("unauthorized");
  }

  if (phase === "unauthorized") return <AdminSessionEnded />;

  const latest = members?.history[0] ?? null;

  return (
    <AdminShell
      current="openchat"
      title="오픈채팅방 관리"
      description="공고 알림 오픈채팅방의 인원을 기록하고, 공유한 공고 링크의 방문 수를 확인해요."
      actions={(
        <>
          <AdminActionButton onClick={refresh}>새로고침</AdminActionButton>
          <AdminActionButton tone="quiet" onClick={() => void signOut()}>로그아웃</AdminActionButton>
        </>
      )}
    >
      {notice ? <p role="status" className="rounded-control border border-brand-line bg-brand-soft px-4 py-3 text-sm">{notice}</p> : null}
      {error ? (
        <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">
          {error} {phase === "failed" ? <button type="button" onClick={refresh} className="font-semibold underline">다시 시도</button> : null}
        </p>
      ) : null}
      {phase === "loading" ? <p role="status" className="text-sm text-muted">오픈채팅방 인원을 불러오는 중이에요.</p> : null}

      <AdminOpenChatVisits key={reloadToken} onUnauthorized={endSession} />

      {members ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section aria-labelledby="alert-chat-current" className="rounded-card border border-border bg-card p-4 sm:p-5">
            <h2 id="alert-chat-current" className="text-sm font-semibold text-muted-strong">지금 적용 중인 인원</h2>
            <p className="num mt-1 text-3xl font-bold">{count(members.currentMemberCount)}</p>
            <p className="mt-1 text-xs text-muted">
              {latest ? `${formatDateTime(latest.recordedAt)}에 적었어요.` : "아직 적지 않아 기록 전 인원을 쓰고 있어요."}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-strong">인원은 기록한 시각부터 올라오는 공고의 공개 조회수 추정치에 적용해요. 위 링크 방문 수는 실제 방문을 따로 집계한 값이에요.</p>

            <form onSubmit={(event) => void submit(event)} noValidate className="mt-5 border-t border-border pt-4">
              <label htmlFor="alert-chat-member-count" className="text-sm font-bold">지금 오픈채팅방 인원</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <FieldInput
                  id="alert-chat-member-count"
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value.replace(/\D/g, "").slice(0, 5));
                    setInputError(null);
                    setConfirming(null);
                  }}
                  placeholder={String(members.currentMemberCount)}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-invalid={inputError ? true : undefined}
                  aria-describedby={inputError ? "alert-chat-member-count-error" : "alert-chat-member-count-hint"}
                  className="min-w-0 flex-1"
                />
                <AdminActionButton type="submit" tone="primary" disabled={saving} className="shrink-0">
                  {saving ? "저장하는 중…" : confirming !== null ? "그대로 저장" : "저장"}
                </AdminActionButton>
              </div>
              {inputError ? (
                <p id="alert-chat-member-count-error" role="alert" className="mt-2 text-sm text-fail">{inputError}</p>
              ) : (
                <p id="alert-chat-member-count-hint" className="mt-2 text-sm text-muted">
                  카카오톡 오픈채팅방에 보이는 참여자 수를 그대로 적어 주세요. 잘못 적었으면 바로 맞는 인원을 다시 적으면 돼요.
                </p>
              )}
            </form>
          </section>

          <section aria-labelledby="alert-chat-history" className="rounded-card border border-border bg-card p-4 sm:p-5">
            <h2 id="alert-chat-history" className="text-sm font-semibold text-muted-strong">적은 기록</h2>
            <ol className="mt-3 divide-y divide-border text-sm">
              {members.history.map((entry, index) => {
                const previous = members.history[index + 1]?.memberCount ?? members.initialMemberCount;
                return (
                  <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
                    <span className="text-muted-strong">{formatDateTime(entry.recordedAt)}부터</span>
                    <span>
                      <span className="num font-semibold">{count(entry.memberCount)}</span>
                      <span className="num ml-2 text-xs text-muted">{signed(entry.memberCount - previous)}</span>
                    </span>
                  </li>
                );
              })}
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-muted">
                <span>처음 기록 전·게시 시각을 모르는 공고</span>
                <span className="num font-semibold">{count(members.initialMemberCount)}</span>
              </li>
            </ol>
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
