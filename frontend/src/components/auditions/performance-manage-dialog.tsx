"use client";

import { useCallback, useState } from "react";
import { deletePerformance, getPerformanceManagement, updatePerformance } from "@/features/auditions/api";
import { notifyAuditionTreeChanged } from "@/features/auditions/events";
import type { PerformanceSummary } from "@/features/auditions/types";
import { errorMessage, useAuditionQuery } from "@/features/auditions/use-audition-query";
import { CreateError, CreateField, CreateSection } from "./create-form";
import { DialogFooter, DialogHeader, ModalShell } from "./modal-shell";
import {
  emptyRoleDraft,
  PerformanceRoleEditor,
  PerformanceRoleReadOnlyList,
  type RoleDraft,
} from "./performance-role-editor";
import { DestructiveButton, FieldInput, PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { PosterUploadField } from "./poster-upload-field";
import { PerformanceVenueField } from "./performance-venue-field";
import { validatePerformanceInput } from "@/features/auditions/performance-validation";
import type { PerformanceManagementDetail } from "@/features/auditions/management-types";

const TITLE_ID = "performance-manage-title";

export function PerformanceManageDialog({ performance, mode, onClose, onChanged }: {
  readonly performance: PerformanceSummary;
  readonly mode: "EDIT" | "DELETE";
  readonly onClose: () => void;
  readonly onChanged: () => void;
}) {
  if (mode === "DELETE") return <DeletePerformanceDialog performance={performance} onClose={onClose} onChanged={onChanged} />;
  return <EditPerformanceLoader performance={performance} onClose={onClose} onChanged={onChanged} />;
}

function EditPerformanceLoader({ performance, onClose, onChanged }: Omit<Parameters<typeof PerformanceManageDialog>[0], "mode">) {
  const load = useCallback(() => getPerformanceManagement(performance.id), [performance.id]);
  const query = useAuditionQuery(`manage-performance-${performance.id}`, load, "공연 편집 정보를 불러오지 못했습니다.");
  return <ModalShell open onClose={onClose} labelledBy={TITLE_ID} placement="responsiveSheet" className="flex h-[calc(100dvh-8px)] w-full flex-col overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:h-auto md:max-h-[92vh] md:w-[min(760px,94vw)] md:rounded-modal">
    {query.data ? <EditPerformanceForm detail={query.data} postingCount={performance.postingCount} onClose={onClose} onChanged={onChanged} /> : <><DialogHeader id={TITLE_ID} title="공연 수정" subtitle={query.error || "공연의 배역과 기본 정보를 불러오고 있습니다."} /><div className="min-h-48 animate-pulse bg-border-soft" /><DialogFooter><SecondaryButton onClick={onClose}>닫기</SecondaryButton></DialogFooter></>}
  </ModalShell>;
}

function EditPerformanceForm({ detail, postingCount, onClose, onChanged }: {
  readonly detail: PerformanceManagementDetail;
  readonly postingCount: number;
  readonly onClose: () => void;
  readonly onChanged: () => void;
}) {
  const [title, setTitle] = useState(detail.title);
  const [venue, setVenue] = useState(detail.venue);
  const [venueAddress, setVenueAddress] = useState(detail.venueAddress);
  const [posterUrl, setPosterUrl] = useState(detail.posterUrl);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [roles, setRoles] = useState<readonly RoleDraft[]>(() =>
    detail.roleTemplates.map((role) => ({ ...emptyRoleDraft(), ...role })),
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  if (postingCount > 0) {
    return <><DialogHeader id={TITLE_ID} title="공연 수정 불가" subtitle="공고가 등록된 공연은 내용을 변경할 수 없습니다." /><div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 md:px-6"><p className="rounded-card border border-warn/30 bg-warn-bg p-4 text-sm leading-6 text-muted-strong">이 공연에는 공고 {postingCount}건이 연결되어 있습니다. 공연과 배역을 수정하려면 연결된 공고를 먼저 삭제해 주세요.</p><CreateSection title="현재 배역"><PerformanceRoleReadOnlyList roles={detail.roleTemplates} /></CreateSection></div><DialogFooter><SecondaryButton onClick={onClose}>닫기</SecondaryButton></DialogFooter></>;
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validatePerformanceInput({ title, venue, venueAddress, roles });
    if (validationError) { setFormError(validationError); return; }
    setSaving(true); setFormError("");
    try {
      await updatePerformance(detail.id, {
        posterFileId: detail.posterFileId,
        title,
        venue,
        venueAddress,
        posterUrl,
        roles: roles.map(({ name, description }) => ({ name, description })),
      }, posterFile);
      notifyAuditionTreeChanged(); onChanged(); onClose();
    } catch (cause) { console.error("[공연 수정 실패]", cause); setFormError(errorMessage(cause, "공연을 수정하지 못했습니다.")); }
    finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col"><DialogHeader id={TITLE_ID} title="공연 수정" subtitle="공고를 등록하기 전까지 공연 정보와 배역을 수정할 수 있습니다." /><div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 md:px-6"><CreateSection title="공연 기본 정보"><div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 md:grid-cols-[150px_1fr]"><PosterUploadField label="공연 포스터" value={posterUrl} onChange={setPosterUrl} onFileChange={setPosterFile} /><CreateField label="공연 제목"><FieldInput required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} /></CreateField></div><div className="mt-5"><PerformanceVenueField venue={venue} address={venueAddress} onVenueChange={setVenue} onAddressChange={setVenueAddress} /></div></CreateSection><CreateSection title="배역" description="배역 이름과 설명을 수정하거나 새 배역을 추가할 수 있습니다."><PerformanceRoleEditor roles={roles} onChange={setRoles} /></CreateSection><CreateError id="performance-manage-error" message={formError} /></div><DialogFooter><SecondaryButton onClick={onClose}>취소</SecondaryButton><PrimaryButton type="submit" disabled={saving}>{saving ? "저장 중…" : "변경 사항 저장"}</PrimaryButton></DialogFooter></form>;
}

function DeletePerformanceDialog({ performance, onClose, onChanged }: Omit<Parameters<typeof PerformanceManageDialog>[0], "mode">) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const blocked = performance.postingCount > 0;
  const remove = async () => {
    setDeleting(true); setError("");
    try { await deletePerformance(performance.id); notifyAuditionTreeChanged(); onChanged(); onClose(); }
    catch (cause) { console.error("[공연 삭제 실패]", cause); setError(errorMessage(cause, "공연을 삭제하지 못했습니다.")); setDeleting(false); }
  };
  return <ModalShell open onClose={onClose} labelledBy={TITLE_ID} className="w-[min(520px,calc(100vw-32px))] rounded-modal bg-card shadow-[var(--shadow-modal)]"><DialogHeader id={TITLE_ID} title="공연 삭제" subtitle={performance.title} /><div className="px-5 py-6 md:px-6"><p className="leading-7">{blocked ? `이 공연에는 공고 ${performance.postingCount}건이 있어 삭제할 수 없습니다. 공고를 먼저 정리해 주세요.` : "공고가 없는 공연과 배역 템플릿을 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다."}</p>{error ? <p role="alert" className="mt-4 text-sm font-medium text-fail">{error}</p> : null}</div><DialogFooter><SecondaryButton onClick={onClose}>취소</SecondaryButton><DestructiveButton onClick={remove} disabled={blocked || deleting}>{deleting ? "삭제 중…" : "공연 삭제"}</DestructiveButton></DialogFooter></ModalShell>;
}
