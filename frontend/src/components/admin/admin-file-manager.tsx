"use client";

import { useCallback, useEffect, useState } from "react";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { AdminApiError, deleteUnusedFiles, fetchUnusedFiles } from "@/features/admin/api";
import { selectableFileIds, summarizeDeletion } from "@/features/admin/file-management";
import type { AdminFileDeletionResult, AdminUnusedFilesPage, AdminUnusedFileStatus } from "@/features/admin/types";
import { logout } from "@/features/auth/session-api";
import { AdminSessionEnded } from "./admin-session-ended";
import { formatDateTime } from "./admin-format";
import { AdminActionButton, AdminShell } from "./admin-shell";

type StatusFilter = AdminUnusedFileStatus | "ALL";
type Phase = "loading" | "ready" | "unauthorized" | "failed";

const STATUS_LABELS: Record<AdminUnusedFileStatus, string> = {
  PENDING: "업로드 대기",
  READY: "업로드 완료",
  DELETING: "삭제 재시도 필요",
};

const FAILURE_LABELS: Record<string, string> = {
  FILE_TOO_RECENT: "미사용 7일 미만",
  FILE_STILL_IN_USE: "사용처에 다시 연결됨",
  FILE_NOT_FOUND: "파일을 찾을 수 없음",
  FILE_DELETION_FAILED: "저장소 삭제 실패 · 다시 시도 가능",
};

const PAGE_BUTTON_CLASS =
  "min-h-11 rounded-control border border-border bg-card px-4 text-sm font-semibold text-muted-strong hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50";

export function AdminFileManager() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [filesPage, setFilesPage] = useState<AdminUnusedFilesPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<readonly number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminFileDeletionResult | null>(null);

  useEffect(() => {
    let active = true;
    fetchUnusedFiles({ status: statusFilter === "ALL" ? undefined : statusFilter, page, size: 100 })
      .then((next) => {
        if (!active) return;
        setFilesPage(next);
        setSelectedIds((current) => current.filter((id) => next.files.some((file) => file.fileId === id && file.deletable)));
        setError(null);
        setPhase("ready");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          setFilesPage(null);
          setPhase("unauthorized");
          return;
        }
        setError(cause instanceof Error ? cause.message : "파일 목록을 불러오지 못했습니다.");
        setPhase("failed");
      });
    return () => { active = false; };
  }, [statusFilter, page, reloadToken]);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);
  const availableIds = selectableFileIds(filesPage?.files ?? []);
  const allSelected = availableIds.length > 0 && availableIds.every((id) => selectedIds.includes(id));
  const summary = result ? summarizeDeletion(result) : null;

  function changeFilter(value: StatusFilter) {
    setStatusFilter(value);
    setPage(0);
    setSelectedIds([]);
    setResult(null);
    setPhase("loading");
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    setSelectedIds([]);
    setResult(null);
    setPhase("loading");
  }

  function toggleFile(fileId: number) {
    setSelectedIds((current) => current.includes(fileId)
      ? current.filter((id) => id !== fileId)
      : [...current, fileId]);
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : availableIds);
  }

  function closeConfirmation() {
    if (deleting) return;
    setConfirming(false);
    setPassword("");
    setDeleteError(null);
  }

  async function confirmDeletion() {
    if (!password || selectedIds.length === 0 || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const next = await deleteUnusedFiles(selectedIds, password);
      setResult(next);
      setSelectedIds([]);
      setConfirming(false);
      refresh();
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) {
        setFilesPage(null);
        setPhase("unauthorized");
        setConfirming(false);
      } else {
        setDeleteError(cause instanceof Error ? cause.message : "파일을 삭제하지 못했습니다.");
      }
    } finally {
      setPassword("");
      setDeleting(false);
    }
  }

  async function signOut() {
    await logout().catch(() => null);
    setFilesPage(null);
    setSelectedIds([]);
    setResult(null);
    setPassword("");
    setPhase("unauthorized");
  }

  if (phase === "unauthorized") {
    return <AdminSessionEnded />;
  }

  return (
    <AdminShell
      current="files"
      title="파일 관리"
      description="참조 없는 업로드를 직접 확인해요. 7일 이상 지난 파일만 삭제할 수 있어요."
      actions={(
        <>
          <AdminActionButton onClick={refresh}>새로고침</AdminActionButton>
          <AdminActionButton onClick={() => void signOut()}>로그아웃</AdminActionButton>
        </>
      )}
    >
      <section className="rounded-card border border-border bg-card p-4 sm:p-5" aria-label="파일 조회 조건">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-muted-strong sm:w-64">
          상태
          <select value={statusFilter} onChange={(event) => changeFilter(event.target.value as StatusFilter)}
            className="min-h-12 rounded-control border border-border bg-card px-3 text-foreground">
            <option value="ALL">전체</option>
            <option value="PENDING">업로드 대기</option>
            <option value="READY">업로드 완료</option>
            <option value="DELETING">삭제 재시도 필요</option>
          </select>
        </label>
      </section>

      {error ? (
        <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">
          {error} <button type="button" onClick={refresh} className="font-semibold underline">다시 시도</button>
        </p>
      ) : null}
      {phase === "loading" ? <p role="status" className="text-sm text-muted">파일을 불러오는 중이에요.</p> : null}

      {result && summary ? (
        <section aria-labelledby="file-deletion-result-heading" className="rounded-card border border-border bg-card px-5 py-4 text-sm">
          <h2 id="file-deletion-result-heading" className="font-semibold text-foreground">
            삭제 결과 · 완료 <span className="num">{summary.deleted}</span>개, 실패 <span className="num">{summary.failed}</span>개
          </h2>
          <ul className="mt-2 space-y-1 text-muted-strong">
            {result.results.map((item) => (
              <li key={item.fileId}>파일 #<span className="num">{item.fileId}</span>: {item.status === "DELETED" ? "삭제 완료" : item.status === "ALREADY_DELETED" ? "이미 삭제됨" : FAILURE_LABELS[item.code ?? ""] ?? "삭제 실패"}</li>
            ))}
          </ul>
          {summary.retryableIds.length > 0 ? <p className="mt-3 text-fail">재시도 가능: {summary.retryableIds.map((id) => `#${id}`).join(", ")} · 목록에서 다시 선택해 주세요.</p> : null}
        </section>
      ) : null}

      {filesPage && phase === "ready" ? (
        <section className="flex flex-col gap-3" aria-label="미사용 파일 목록">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-strong">
              <input type="checkbox" checked={allSelected} disabled={availableIds.length === 0} onChange={toggleAll} className="size-4 accent-brand" />
              이 페이지의 삭제 가능 파일 모두 선택
            </label>
            <span className="text-sm text-muted">선택 <span className="num">{selectedIds.length}</span>개 · 페이지 <span className="num">{page + 1}</span></span>
          </div>
          {filesPage.files.length === 0 ? <p className="rounded-card border border-border bg-card px-4 py-8 text-center text-sm text-muted">조회된 미사용 파일이 없어요.</p> : null}
          {filesPage.files.map((file) => (
            <article key={file.fileId} className="rounded-card border border-border bg-card p-4 sm:px-5">
              <div className="flex items-start gap-3">
                <input type="checkbox" aria-label={`파일 ${file.fileId} 선택`} checked={selectedIds.includes(file.fileId)}
                  disabled={!file.deletable} onChange={() => toggleFile(file.fileId)} className="mt-0.5 size-4 accent-brand" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm font-semibold text-foreground">파일 #<span className="num">{file.fileId}</span></strong>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${file.status === "DELETING" ? "bg-warn-bg text-warn" : "bg-surface text-muted-strong"}`}>
                      {STATUS_LABELS[file.status]}
                    </span>
                    <span className="text-xs text-muted">{file.storageScope === "PUBLIC" ? "공개" : "비공개"}</span>
                    <span className={`text-xs font-semibold ${file.deletable ? "text-fail" : "text-muted"}`}>
                      {file.deletable ? "삭제 가능" : "7일 미만 · 삭제 불가"}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-3 text-xs text-muted sm:grid-cols-2 lg:grid-cols-4">
                    <div><dt>소유자 ID</dt><dd className="num mt-1 text-sm text-foreground">{file.ownerId}</dd></div>
                    <div><dt>등록 시각</dt><dd className="num mt-1 text-sm text-foreground">{formatDateTime(file.createdAt)}</dd></div>
                    <div><dt>미사용 시작</dt><dd className="num mt-1 text-sm text-foreground">{formatDateTime(file.unusedSince)}</dd></div>
                    <div><dt>삭제 가능 시각</dt><dd className="num mt-1 text-sm text-foreground">{formatDateTime(file.deletableAt)}</dd></div>
                  </dl>
                </div>
              </div>
            </article>
          ))}
          <nav aria-label="미사용 파일 페이지" className="flex items-center justify-between gap-3 pt-1">
            <button type="button" disabled={page === 0} onClick={() => changePage(page - 1)} className={PAGE_BUTTON_CLASS}>이전</button>
            <button type="button" disabled={!filesPage.hasNext} onClick={() => changePage(page + 1)} className={PAGE_BUTTON_CLASS}>다음</button>
          </nav>
        </section>
      ) : null}

      <div className="sticky bottom-0 rounded-card border border-border bg-card/95 p-3 backdrop-blur">
        <button type="button" disabled={selectedIds.length === 0} onClick={() => { setDeleteError(null); setConfirming(true); }}
          className="min-h-11 w-full rounded-control bg-fail px-5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
          선택한 {selectedIds.length}개 파일 삭제
        </button>
      </div>

      <ModalShell open={confirming} onClose={closeConfirmation} labelledBy="admin-file-delete-title" placement="responsiveSheet"
        className="w-full overflow-hidden rounded-t-2xl bg-card shadow-2xl md:w-[min(520px,calc(100vw-48px))] md:rounded-2xl">
        <DialogHeader id="admin-file-delete-title" title="파일 삭제 확인" subtitle="S3 원본을 삭제해요. 복구하기 어려운 작업이에요." />
        <div className="space-y-4 p-5">
          <p className="text-sm text-muted-strong">선택한 {selectedIds.length}개 파일을 다시 확인해 주세요.</p>
          <p className="num max-h-24 overflow-y-auto break-words rounded-control bg-surface p-3 text-xs text-muted-strong">
            {selectedIds.map((id) => `#${id}`).join(", ")}
          </p>
          <label htmlFor="admin-file-deletion-password" className="block">
            <span className="mb-2 block text-sm font-semibold text-foreground">기존 삭제 확인 비밀번호</span>
            <input id="admin-file-deletion-password" data-autofocus="true" type="password" autoComplete="off" value={password}
              disabled={deleting} onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 w-full rounded-control border border-border px-3 text-base outline-none focus:border-brand" />
          </label>
          {deleteError ? <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg p-3 text-sm text-fail">{deleteError}</p> : null}
        </div>
        <DialogFooter>
          <button type="button" onClick={closeConfirmation} disabled={deleting}
            className="min-h-11 rounded-control border border-border px-4 text-sm font-medium text-muted-strong hover:bg-surface">
            취소
          </button>
          <button type="button" onClick={() => void confirmDeletion()} disabled={!password || deleting}
            className="min-h-11 rounded-control bg-fail px-4 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {deleting ? "삭제 중…" : "비밀번호 확인 후 삭제"}
          </button>
        </DialogFooter>
      </ModalShell>
    </AdminShell>
  );
}
