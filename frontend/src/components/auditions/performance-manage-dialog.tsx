"use client";

import { useCallback, useState } from "react";
import { deletePerformance, getPostings, updatePerformance } from "@/features/auditions/api";
import { notifyAuditionTreeChanged } from "@/features/auditions/events";
import type { PerformanceSummary } from "@/features/auditions/types";
import { errorMessage, useAuditionQuery } from "@/features/auditions/use-audition-query";
import { CreateError, CreateField, CreateSection } from "./create-form";
import { DialogFooter, DialogHeader, ModalShell } from "./modal-shell";
import { PerformanceRoleEditor, type RoleDraft } from "./performance-role-editor";
import { DestructiveButton, FieldInput, PrimaryButton, SecondaryButton } from "@/components/ui/controls";

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
  const load = useCallback(() => getPostings(performance.id), [performance.id]);
  const query = useAuditionQuery(`manage-performance-${performance.id}`, load, "공연 편집 정보를 불러오지 못했습니다.");
  return <ModalShell open onClose={onClose} labelledBy={TITLE_ID} placement="responsiveSheet" className="flex h-[calc(100dvh-8px)] w-full flex-col overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:h-auto md:max-h-[92vh] md:w-[min(760px,94vw)] md:rounded-modal">
    {query.data ? <EditPerformanceForm performance={performance} roles={query.data.roleTemplates.map((role, index) => ({ ...role, key: index + 1 }))} onClose={onClose} onChanged={onChanged} /> : <><DialogHeader id={TITLE_ID} title="공연 수정" subtitle={query.error || "공연의 배역과 기본 정보를 불러오고 있습니다."} /><div className="min-h-48 animate-pulse bg-border-soft" /><DialogFooter><SecondaryButton onClick={onClose}>닫기</SecondaryButton></DialogFooter></>}
  </ModalShell>;
}

function EditPerformanceForm({ performance, roles: initialRoles, onClose, onChanged }: Omit<Parameters<typeof PerformanceManageDialog>[0], "mode"> & { readonly roles: readonly RoleDraft[] }) {
  const [title, setTitle] = useState(performance.title);
  const [venue, setVenue] = useState(performance.venue);
  const [roles, setRoles] = useState<readonly RoleDraft[]>(initialRoles);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setFormError("");
    try {
      await updatePerformance(performance.id, { title, venue, roleTemplates: roles.map((role) => ({ id: role.id, name: role.name, description: role.description, gender: role.gender, ageMin: role.ageMin, ageMax: role.ageMax })) });
      notifyAuditionTreeChanged(); onChanged(); onClose();
    } catch (cause) { setFormError(errorMessage(cause, "공연을 수정하지 못했습니다.")); }
    finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col"><DialogHeader id={TITLE_ID} title="공연 수정" subtitle="배역 템플릿 변경은 이미 만들어진 공고의 모집 배역에 영향을 주지 않습니다." /><div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 md:px-6"><CreateSection title="공연 기본 정보"><div className="grid gap-4 md:grid-cols-2"><CreateField label="공연 제목"><FieldInput required value={title} onChange={(event) => setTitle(event.target.value)} /></CreateField><CreateField label="공연 장소"><FieldInput required value={venue} onChange={(event) => setVenue(event.target.value)} /></CreateField></div><p className="mt-3 text-sm text-muted">포스터 교체는 공통 파일 업로드 방식이 확정된 뒤 연결합니다.</p></CreateSection><CreateSection title="배역 템플릿" description="목록 전체를 저장합니다. 기존 공고에는 복사된 배역이 유지돼요."><PerformanceRoleEditor roles={roles} onChange={setRoles} /></CreateSection><CreateError id="performance-manage-error" message={formError} /></div><DialogFooter><SecondaryButton onClick={onClose}>취소</SecondaryButton><PrimaryButton type="submit" disabled={saving}>{saving ? "저장 중…" : "변경 사항 저장"}</PrimaryButton></DialogFooter></form>;
}

function DeletePerformanceDialog({ performance, onClose, onChanged }: Omit<Parameters<typeof PerformanceManageDialog>[0], "mode">) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const blocked = performance.postingCount > 0;
  const remove = async () => {
    setDeleting(true); setError("");
    try { await deletePerformance(performance.id); notifyAuditionTreeChanged(); onChanged(); onClose(); }
    catch (cause) { setError(errorMessage(cause, "공연을 삭제하지 못했습니다.")); setDeleting(false); }
  };
  return <ModalShell open onClose={onClose} labelledBy={TITLE_ID} className="w-[min(520px,calc(100vw-32px))] rounded-modal bg-card shadow-[var(--shadow-modal)]"><DialogHeader id={TITLE_ID} title="공연 삭제" subtitle={performance.title} /><div className="px-5 py-6 md:px-6"><p className="leading-7">{blocked ? `이 공연에는 공고 ${performance.postingCount}건이 있어 삭제할 수 없습니다. 공고를 먼저 정리해 주세요.` : "공고가 없는 공연과 배역 템플릿을 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다."}</p>{error ? <p role="alert" className="mt-4 text-sm font-medium text-fail">{error}</p> : null}</div><DialogFooter><SecondaryButton onClick={onClose}>취소</SecondaryButton><DestructiveButton onClick={remove} disabled={blocked || deleting}>{deleting ? "삭제 중…" : "공연 삭제"}</DestructiveButton></DialogFooter></ModalShell>;
}
