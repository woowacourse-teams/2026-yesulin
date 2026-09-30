"use client";

import { useCallback, useEffect, useState } from "react";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { AdminApiError, deleteUnusedFiles, fetchUnusedFiles } from "@/features/admin/api";
import { selectableFileIds, summarizeDeletion } from "@/features/admin/file-management";
import type { AdminFileDeletionResult, AdminUnusedFilesPage, AdminUnusedFileStatus } from "@/features/admin/types";
import { logout } from "@/features/auth/session-api";
import { AdminLoginForm } from "./admin-login-form";
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
    return <AdminLoginForm onSuccess={() => { setPhase("loading"); refresh(); }} />;
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

      <section className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5" aria-label="파일 조회 조건">
        <label htmlFor="unused-file-status" className="block text-sm font-medium text-neutral-800">상태</label>
        <select id="unused-file-status" value={statusFilter} onChange={(event) => changeFilter(event.target.value as StatusFilter)}
          className="mt-2 min-h-11 w-full rounded border border-neutral-300 bg-white px-3 text-sm sm:w-64">
          <option value="ALL">전체</option>
          <option value="PENDING">업로드 대기</option>
          <option value="READY">업로드 완료</option>
          <option value="DELETING">삭제 재시도 필요</option>
        </select>
      </section>

      {error ? <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" onClick={refresh} className="underline">다시 시도</button></p> : null}
      {phase === "loading" ? <p role="status" className="text-sm text-neutral-500">파일을 불러오는 중…</p> : null}

      {result && summary ? (
        <section aria-label="삭제 결과" className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
          <h2 className="font-semibold text-neutral-900">삭제 결과 · 완료 {summary.deleted}개, 실패 {summary.failed}개</h2>
          <ul className="mt-2 space-y-1 text-neutral-700">
            {result.results.map((item) => (
              <li key={item.fileId}>파일 #{item.fileId}: {item.status === "DELETED" ? "삭제 완료" : item.status === "ALREADY_DELETED" ? "이미 삭제됨" : FAILURE_LABELS[item.code ?? ""] ?? "삭제 실패"}</li>
            ))}
          </ul>
          {summary.retryableIds.length > 0 ? <p className="mt-3 text-red-700">재시도 가능: {summary.retryableIds.map((id) => `#${id}`).join(", ")} · 목록에서 다시 선택해 주세요.</p> : null}
        </section>
      ) : null}

      {filesPage && phase === "ready" ? (
        <section className="space-y-3" aria-label="미사용 파일 목록">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex min-h-11 items-center gap-2 text-sm text-neutral-800">
              <input type="checkbox" checked={allSelected} disabled={availableIds.length === 0} onChange={toggleAll} />
              이 페이지의 삭제 가능 파일 모두 선택
            </label>
            <span className="text-sm text-neutral-600">선택 {selectedIds.length}개 · 페이지 {page + 1}</span>
          </div>
          {filesPage.files.length === 0 ? <p className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">조회된 미사용 파일이 없어요.</p> : null}
          {filesPage.files.map((file) => (
            <article key={file.fileId} className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <input type="checkbox" aria-label={`파일 ${file.fileId} 선택`} checked={selectedIds.includes(file.fileId)}
                  disabled={!file.deletable} onChange={() => toggleFile(file.fileId)} className="mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-neutral-900">파일 #{file.fileId}</strong>
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{STATUS_LABELS[file.status]}</span>
                    <span className="text-xs text-neutral-500">{file.storageScope === "PUBLIC" ? "공개" : "비공개"}</span>
                    <span className={`text-xs font-medium ${file.deletable ? "text-red-700" : "text-neutral-500"}`}>
                      {file.deletable ? "삭제 가능" : "7일 미만 · 삭제 불가"}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-xs text-neutral-600 sm:grid-cols-2 lg:grid-cols-4">
                    <div><dt>소유자 ID</dt><dd className="mt-1 text-neutral-900">{file.ownerId}</dd></div>
                    <div><dt>등록 시각</dt><dd className="mt-1 text-neutral-900">{formatDateTime(file.createdAt)}</dd></div>
                    <div><dt>미사용 시작</dt><dd className="mt-1 text-neutral-900">{formatDateTime(file.unusedSince)}</dd></div>
                    <div><dt>삭제 가능 시각</dt><dd className="mt-1 text-neutral-900">{formatDateTime(file.deletableAt)}</dd></div>
                  </dl>
                </div>
              </div>
            </article>
          ))}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button type="button" disabled={page === 0} onClick={() => changePage(page - 1)} className="min-h-11 rounded border border-neutral-300 px-4 text-sm disabled:opacity-50">이전</button>
            <button type="button" disabled={!filesPage.hasNext} onClick={() => changePage(page + 1)} className="min-h-11 rounded border border-neutral-300 px-4 text-sm disabled:opacity-50">다음</button>
          </div>
        </section>
      ) : null}

      <div className="sticky bottom-0 rounded-xl border border-neutral-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <button type="button" disabled={selectedIds.length === 0} onClick={() => { setDeleteError(null); setConfirming(true); }}
          className="min-h-11 w-full rounded bg-red-600 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
          선택한 {selectedIds.length}개 파일 삭제
        </button>
      </div>

      <ModalShell open={confirming} onClose={closeConfirmation} labelledBy="admin-file-delete-title" placement="responsiveSheet"
        className="w-full rounded-t-2xl bg-white shadow-2xl md:w-[min(520px,calc(100vw-48px))] md:rounded-2xl">
        <DialogHeader id="admin-file-delete-title" title="파일 삭제 확인" subtitle="S3 원본을 삭제해요. 복구하기 어려운 작업이에요." />
        <div className="space-y-4 p-5">
          <p className="text-sm text-neutral-700">선택한 {selectedIds.length}개 파일을 다시 확인해 주세요.</p>
          <p className="max-h-24 overflow-y-auto break-words rounded bg-neutral-50 p-3 text-xs text-neutral-700">
            {selectedIds.map((id) => `#${id}`).join(", ")}
          </p>
          <label htmlFor="admin-file-deletion-password" className="block text-sm font-semibold text-neutral-800">기존 삭제 확인 비밀번호</label>
          <input id="admin-file-deletion-password" data-autofocus="true" type="password" autoComplete="off" value={password}
            disabled={deleting} onChange={(event) => setPassword(event.target.value)}
            className="min-h-12 w-full rounded border border-neutral-300 px-3 text-base outline-none focus:border-neutral-900" />
          {deleteError ? <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{deleteError}</p> : null}
        </div>
        <DialogFooter>
          <button type="button" onClick={closeConfirmation} disabled={deleting} className="min-h-11 rounded border border-neutral-300 px-4 text-sm">취소</button>
          <button type="button" onClick={() => void confirmDeletion()} disabled={!password || deleting}
            className="min-h-11 rounded bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
            {deleting ? "삭제 중…" : "비밀번호 확인 후 삭제"}
          </button>
        </DialogFooter>
      </ModalShell>
    </AdminShell>
  );
}
