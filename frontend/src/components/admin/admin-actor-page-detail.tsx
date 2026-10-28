"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { ActorPageView } from "@/components/actor-pages/actor-page-detail";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { ConfirmDialog } from "@/components/shows/manage/confirm-dialog";
import { DestructiveButton, FieldInput, FieldTextarea, PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { missingFieldLabel } from "@/features/actor-pages/settings";
import { actorPageRoutes, isActorHandleAddress, normalizeActorHandle } from "@/features/actor-pages/types";
import { adminActorHandleLabel, adminActorPageRoutes, adminActorPageStatus } from "@/features/admin/actor-pages";
import { AdminApiError, changeActorPageHandle, fetchAdminActorPage, lockActorPage, unlockActorPage } from "@/features/admin/api";
import type { AdminActorPage } from "@/features/admin/types";
import { STATUS_TONES } from "./admin-actor-pages";
import { formatDateTime, orDash } from "./admin-format";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminActionButton, AdminActionLink, AdminEmptyState, AdminShell } from "./admin-shell";

const MAX_LOCK_REASON = 500;

type Settled =
  | { readonly key: number; readonly phase: "ready"; readonly actorPage: AdminActorPage }
  | { readonly key: number; readonly phase: "missing" | "unauthorized" }
  | { readonly key: number; readonly phase: "failed"; readonly error: string };

type Dialog = "lock" | "unlock" | "handle" | null;

/**
 * 배우 페이지 상세. 배우가 공개로 설정한 내용에 '공연사만' 영상과 연락처를 더해 본다. 연락처는 공연사 연결 문의에만 쓰고,
 * 열람은 기록하지 않는다. 잠금·해제·아이디 변경은 운영자 변경 기록에 남는다.
 */
export function AdminActorPageDetail({ publicId }: { readonly publicId: string }) {
  const [reloadToken, setReloadToken] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchAdminActorPage(publicId)
      .then((actorPage) => { if (active) setSettled({ key: reloadToken, phase: "ready", actorPage }); })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          setSettled({ key: reloadToken, phase: "unauthorized" });
          return;
        }
        if (cause instanceof AdminApiError && cause.status === 404) {
          setSettled({ key: reloadToken, phase: "missing" });
          return;
        }
        setSettled({ key: reloadToken, phase: "failed", error: cause instanceof Error ? cause.message : "배우 페이지를 불러오지 못했습니다." });
      });
    return () => { active = false; };
  }, [publicId, reloadToken]);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);
  const current = settled?.key === reloadToken ? settled : null;

  /** 바꾼 결과를 바로 그리고, 실패하면 창을 열어 둔 채 이유를 보인다. */
  const run = async (action: () => Promise<AdminActorPage>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      const actorPage = await action();
      setSettled({ key: reloadToken, phase: "ready", actorPage });
      setDialog(null);
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) {
        setSettled({ key: reloadToken, phase: "unauthorized" });
        return;
      }
      setError(cause instanceof Error ? cause.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  if (current?.phase === "unauthorized") return <AdminSessionEnded />;
  const actorPage = current?.phase === "ready" ? current.actorPage : null;
  const close = () => { setDialog(null); setError(null); };

  return (
    <AdminShell
      current="actor-pages"
      title={actorPage ? adminActorHandleLabel(actorPage.handle) : "배우 페이지"}
      description="공개 내용과 '공연사만' 영상·연락처를 확인해요. 연락처는 공연사 연결 문의에만 써 주세요."
      actions={<>
        <AdminActionLink href={adminActorPageRoutes.list} tone="quiet">목록</AdminActionLink>
        <AdminActionButton onClick={refresh}>새로고침</AdminActionButton>
      </>}
    >
      {!current ? <p role="status" className="rounded-card border border-border bg-card px-5 py-12 text-center text-sm text-muted">배우 페이지를 불러오는 중…</p> : null}
      {current?.phase === "missing" ? <AdminEmptyState title="배우 페이지를 찾을 수 없어요" description="주소를 확인하거나 목록에서 다시 골라 주세요." /> : null}
      {current?.phase === "failed" ? (
        <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">{current.error} 새로고침으로 다시 시도해 주세요.</p>
      ) : null}

      {actorPage ? (
        <div className="grid gap-6">
          <ActorPageSummary actorPage={actorPage} onLock={() => setDialog("lock")} onUnlock={() => setDialog("unlock")} onChangeHandle={() => setDialog("handle")} />

          <Panel title="연락처">
            <dl className="grid gap-2 text-sm sm:grid-cols-[6rem_1fr]">
              <dt className="font-semibold text-muted-strong">전화</dt><dd className="num break-all">{orDash(actorPage.phone)}</dd>
              <dt className="font-semibold text-muted-strong">이메일</dt><dd className="break-all">{orDash(actorPage.email)}</dd>
            </dl>
            <p className="mt-3 text-xs text-muted">공개 페이지와 공연사 화면에는 보이지 않아요. 열람은 기록하지 않아요.</p>
          </Panel>

          <Panel title="'공연사만' 영상">
            {actorPage.producerOnlyVideos.length ? (
              <ul className="grid gap-2 text-sm">
                {actorPage.producerOnlyVideos.map((video) => (
                  <li key={video.youtubeId}>
                    <a href={video.url} target="_blank" rel="noopener noreferrer" className="break-all text-brand hover:underline">{video.url}<span className="sr-only"> (새 창에서 열림)</span></a>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">&lsquo;공연사만&rsquo;으로 둔 영상이 없어요.</p>}
          </Panel>

          <Panel title="공개 페이지 내용">
            <p className="mb-2 text-xs text-muted">배우가 누구나 보도록 설정한 내용이에요. 사진은 공개 사본만 보여서 비공개·잠금 중이면 비어 있어요.</p>
            <ActorPageView actorPage={actorPage.content} preview />
          </Panel>
        </div>
      ) : null}

      {actorPage && dialog === "lock" ? <LockDialog actorPage={actorPage} busy={busy} error={error} onClose={close} onLock={(reason) => void run(() => lockActorPage(publicId, reason), "배우 페이지를 잠그지 못했습니다.")} /> : null}
      {actorPage && dialog === "unlock" ? (
        <ConfirmDialog
          title="잠금을 풀까요?"
          description={<>페이지는 비공개로 남고, 배우가 내용을 확인한 뒤 직접 다시 공개해요. 배우 편집 화면에 잠금이 풀렸다는 안내가 보여요.{error ? <span role="alert" className="mt-3 block text-fail">{error}</span> : null}</>}
          confirmLabel="잠금 풀기"
          busy={busy}
          onClose={close}
          onConfirm={() => void run(() => unlockActorPage(publicId), "잠금을 풀지 못했습니다.")}
        />
      ) : null}
      {actorPage && dialog === "handle" ? <HandleDialog actorPage={actorPage} busy={busy} error={error} onClose={close} onChange={(handle) => void run(() => changeActorPageHandle(publicId, handle), "아이디를 바꾸지 못했습니다.")} /> : null}
    </AdminShell>
  );
}

function Panel({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-4 sm:p-5">
      <h2 className="mb-3 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function ActorPageSummary({
  actorPage,
  onLock,
  onUnlock,
  onChangeHandle,
}: {
  readonly actorPage: AdminActorPage;
  readonly onLock: () => void;
  readonly onUnlock: () => void;
  readonly onChangeHandle: () => void;
}) {
  const status = adminActorPageStatus(actorPage);
  const { readiness } = actorPage;
  return (
    <Panel title="상태">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${STATUS_TONES[status.tone]}`}>{status.label}</span>
        {actorPage.handle && actorPage.status === "PUBLIC" ? (
          <a href={actorPageRoutes.detail(actorPage.handle)} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand hover:underline">
            공개 페이지 열기<span className="sr-only"> (새 창에서 열림)</span>
          </a>
        ) : null}
      </div>
      {actorPage.locked ? (
        <p className="mt-3 whitespace-pre-line break-words rounded-control border border-fail/25 bg-fail-bg px-3 py-2 text-sm text-fail">
          잠금 사유: {actorPage.lockReason}
        </p>
      ) : null}
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
        <dt className="font-semibold text-muted-strong">공개 조건</dt>
        <dd>
          {readiness.underAge ? "만 14세 미만" : readiness.missing.length ? `부족: ${readiness.missing.map(missingFieldLabel).join(", ")}` : "충족"}
        </dd>
        <dt className="font-semibold text-muted-strong">처음 공개</dt><dd className="num">{formatDateTime(actorPage.firstPublishedAt)}</dd>
        <dt className="font-semibold text-muted-strong">최근 공개</dt><dd className="num">{formatDateTime(actorPage.publishedAt)}</dd>
        <dt className="font-semibold text-muted-strong">최근 공개 활동</dt><dd className="num">{formatDateTime(actorPage.lastPublicActivityAt)}</dd>
        <dt className="font-semibold text-muted-strong">잠금</dt><dd className="num">{formatDateTime(actorPage.lockedAt)}</dd>
        <dt className="font-semibold text-muted-strong">잠금 해제</dt><dd className="num">{formatDateTime(actorPage.unlockedAt)}</dd>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border-soft pt-4">
        <AdminActionButton tone="destructive" onClick={onLock}>{actorPage.locked ? "잠금 사유 바꾸기" : "잠그기"}</AdminActionButton>
        {actorPage.locked ? <AdminActionButton onClick={onUnlock}>잠금 풀기</AdminActionButton> : null}
        <AdminActionButton onClick={onChangeHandle}>아이디 바꾸기</AdminActionButton>
      </div>
    </Panel>
  );
}

function LockDialog({
  actorPage,
  busy,
  error,
  onClose,
  onLock,
}: {
  readonly actorPage: AdminActorPage;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onLock: (reason: string) => void;
}) {
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState(actorPage.lockReason ?? "");
  const valid = reason.trim().length > 0 && reason.length <= MAX_LOCK_REASON;
  return (
    <ModalShell open onClose={() => { if (!busy) onClose(); }} labelledBy={titleId} placement="responsiveSheet" className="w-full overflow-hidden rounded-t-modal border border-border bg-card shadow-[var(--shadow-modal)] md:w-[min(520px,calc(100vw-40px))] md:rounded-modal">
      <DialogHeader id={titleId} title={actorPage.locked ? "잠금 사유를 바꿀까요?" : "배우 페이지를 잠글까요?"} subtitle="잠그면 페이지와 배우 목록에서 바로 사라지고, 풀 때까지 배우가 다시 공개할 수 없어요." />
      <div className="px-5 py-5 md:px-6">
        <label htmlFor={reasonId} className="text-sm font-semibold">잠금 사유 (배우 편집 화면에 그대로 보여요)</label>
        <FieldTextarea id={reasonId} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={MAX_LOCK_REASON} rows={4} className="mt-2" />
        <p className="num mt-1 text-right text-xs text-muted">{reason.length} / {MAX_LOCK_REASON}</p>
        {error ? <p role="alert" className="mt-2 text-sm text-fail">{error}</p> : null}
      </div>
      <DialogFooter>
        <SecondaryButton onClick={onClose} disabled={busy}>닫기</SecondaryButton>
        <DestructiveButton onClick={() => onLock(reason)} disabled={busy || !valid}>{busy ? "처리 중…" : actorPage.locked ? "사유 바꾸기" : "잠그기"}</DestructiveButton>
      </DialogFooter>
    </ModalShell>
  );
}

function HandleDialog({
  actorPage,
  busy,
  error,
  onClose,
  onChange,
}: {
  readonly actorPage: AdminActorPage;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onChange: (handle: string) => void;
}) {
  const titleId = useId();
  const inputId = useId();
  const [value, setValue] = useState(actorPage.handle ?? "");
  const handle = normalizeActorHandle(value);
  const validFormat = isActorHandleAddress(handle);
  const changed = handle !== actorPage.handle;
  return (
    <ModalShell open onClose={() => { if (!busy) onClose(); }} labelledBy={titleId} placement="responsiveSheet" className="w-full overflow-hidden rounded-t-modal border border-border bg-card shadow-[var(--shadow-modal)] md:w-[min(520px,calc(100vw-40px))] md:rounded-modal">
      <DialogHeader id={titleId} title="아이디를 바꿀까요?" />
      <div className="px-5 py-5 md:px-6">
        <p role="note" className="rounded-control border border-warn/30 bg-warn-bg px-3 py-2 text-sm leading-6">
          옛 링크({adminActorHandleLabel(actorPage.handle)})는 바로 끊기고, 다른 배우가 옛 아이디를 곧바로 쓸 수 있어요. 옛 주소로 이어 주지 않아요.
        </p>
        <label htmlFor={inputId} className="mt-4 block text-sm font-semibold">새 아이디</label>
        <div className="mt-2 flex items-center gap-1">
          <span aria-hidden="true" className="text-muted">@</span>
          <FieldInput id={inputId} value={value} onChange={(event) => setValue(event.target.value)} maxLength={30} autoCapitalize="none" autoComplete="off" spellCheck={false} aria-invalid={Boolean(handle) && !validFormat} />
        </div>
        <p className="mt-1 text-xs text-muted">영문 소문자, 숫자, 마침표(.), 밑줄(_)로 30자까지. 마침표로 시작·끝나거나 연달아 쓸 수 없어요.</p>
        {error ? <p role="alert" className="mt-2 text-sm text-fail">{error}</p> : null}
      </div>
      <DialogFooter>
        <SecondaryButton onClick={onClose} disabled={busy}>닫기</SecondaryButton>
        <PrimaryButton onClick={() => onChange(handle)} disabled={busy || !validFormat || !changed}>{busy ? "처리 중…" : "아이디 바꾸기"}</PrimaryButton>
      </DialogFooter>
    </ModalShell>
  );
}
