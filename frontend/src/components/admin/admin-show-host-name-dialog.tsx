"use client";

import { useState } from "react";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { useModalClose } from "@/components/shows/use-modal-close";
import { AdminApiError, updateShowHostName } from "@/features/admin/api";
import type { AdminShow, AdminShowHostName } from "@/features/admin/types";

const TITLE_ID = "admin-show-host-name-title";
const INPUT_ID = "admin-show-host-name-input";
const HINT_ID = "admin-show-host-name-hint";
const ERROR_ID = "admin-show-host-name-error";
const MAX_HOST_NAME_LENGTH = 50;

/**
 * 기획사가 계정 이름을 개인 이름으로 적은 경우처럼 운영자가 공연의 주최 이름을 대신 고친다.
 * 기획사 공연은 비우면 계정 기획사명으로 돌아가고, 외부 링크 공연은 주최 이름이 필수다.
 */
export function AdminShowHostNameDialog({ show, onClose, onSaved }: {
  readonly show: AdminShow;
  readonly onClose: () => void;
  readonly onSaved: (result: AdminShowHostName) => void;
}) {
  const [hostName, setHostName] = useState(show.hostName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const close = useModalClose(onClose, saving);
  const companyName = show.companyName ?? "";
  const hostNameRequired = Boolean(show.externalReservationUrl);
  const hostNameError = hostNameRequired && !hostName.trim() ? "주최 이름은 필수입니다." : "";
  const unchanged = hostName.trim() === show.hostName;
  const preview = hostName.trim() || companyName;

  const save = async () => {
    if (hostNameError) return;
    setSaving(true);
    setError("");
    try {
      onSaved(await updateShowHostName(show.showId, hostName));
    } catch (cause) {
      console.error("[주최 이름 변경 실패]", cause);
      setError(cause instanceof AdminApiError ? cause.message : "주최 이름을 바꾸지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell open onClose={close} labelledBy={TITLE_ID} placement="responsiveSheet"
      className="w-full overflow-hidden rounded-t-2xl bg-card shadow-2xl md:w-[min(480px,calc(100vw-48px))] md:rounded-2xl">
      <DialogHeader id={TITLE_ID} title="주최 이름 수정" subtitle={show.title} />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!saving && !unchanged) void save();
        }}
      >
        <div className="space-y-3 p-5">
          <label htmlFor={INPUT_ID} className="block text-sm font-semibold text-foreground">관객에게 보일 주최 이름</label>
          <input
            id={INPUT_ID}
            data-autofocus="true"
            maxLength={MAX_HOST_NAME_LENGTH}
            value={hostName}
            disabled={saving}
            required={hostNameRequired}
            onChange={(event) => setHostName(event.target.value)}
            placeholder={companyName || "예: 극단 달빛"}
            aria-invalid={Boolean(hostNameError) || undefined}
            aria-describedby={`${HINT_ID}${hostNameError ? ` ${ERROR_ID}` : ""}`}
            className="min-h-12 w-full rounded-control border border-border px-3 text-base outline-none focus:border-brand md:text-sm"
          />
          <p id={HINT_ID} className="text-xs leading-5 text-muted">
            {hostNameRequired
              ? "외부 링크 공연은 주최 이름이 필수입니다. "
              : `비워 두면 계정 기획사명${companyName ? ` '${companyName}'` : ""}으로 보여요. `}
            저장하면 관객 화면에 바로 반영되고,
            변경 기록에는 이름 없이 남아요.
          </p>
          {hostNameError ? <p id={ERROR_ID} role="alert" className="text-sm font-medium text-fail">{hostNameError}</p> : null}
          <p className="rounded-control bg-surface px-3 py-2 text-sm text-muted-strong">
            관객 화면: <span className="font-semibold text-foreground">주최 {preview || "표시 안 함"}</span>
          </p>
          {error ? <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg p-3 text-sm text-fail">{error}</p> : null}
        </div>
        <DialogFooter>
          <button type="button" onClick={close} disabled={saving}
            className="min-h-11 rounded-control border border-border px-4 text-sm font-medium text-muted-strong hover:bg-surface">
            취소
          </button>
          <button type="submit" disabled={saving || unchanged || Boolean(hostNameError)} aria-busy={saving || undefined}
            className="min-h-11 rounded-control bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "저장 중…" : "저장"}
          </button>
        </DialogFooter>
      </form>
    </ModalShell>
  );
}
