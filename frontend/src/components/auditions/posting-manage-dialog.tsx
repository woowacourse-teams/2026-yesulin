"use client";

import { useCallback, useState } from "react";
import { deletePosting, getPostingManagement, updatePosting } from "@/features/auditions/api";
import { defaultApplicationFields, type ApplicationFieldInput, type AuditionRoundInput } from "@/features/auditions/creation-types";
import { notifyAuditionTreeChanged } from "@/features/auditions/events";
import type { PostingManagementDetail } from "@/features/auditions/management-types";
import type { PostingSummary } from "@/features/auditions/types";
import { errorMessage, useAuditionQuery } from "@/features/auditions/use-audition-query";
import { ApplicationFieldEditor } from "./application-field-editor";
import { CreateError, CreateField, CreateSection } from "./create-form";
import { DialogFooter, DialogHeader, ModalShell } from "./modal-shell";
import { AuditionScheduleEditor as BaseAuditionScheduleEditor, PostingRoleSelector } from "./posting-form-sections";
import { DestructiveButton, FieldInput, FieldTextarea, PrimaryButton, SecondaryButton } from "@/components/ui/controls";

const TITLE_ID = "posting-manage-title";

export function PostingManageDialog({ posting, mode, onClose, onChanged }: {
  readonly posting: PostingSummary;
  readonly mode: "EDIT" | "DELETE";
  readonly onClose: () => void;
  readonly onChanged: () => void;
}) {
  if (mode === "DELETE") return <DeletePostingDialog posting={posting} onClose={onClose} onChanged={onChanged} />;
  return <EditPostingLoader posting={posting} onClose={onClose} onChanged={onChanged} />;
}

function EditPostingLoader({ posting, onClose, onChanged }: Omit<Parameters<typeof PostingManageDialog>[0], "mode">) {
  const load = useCallback(() => getPostingManagement(posting.id), [posting.id]);
  const query = useAuditionQuery(`manage-posting-${posting.id}`, load, "공고 편집 정보를 불러오지 못했습니다.");
  return <ModalShell open onClose={onClose} labelledBy={TITLE_ID} placement="responsiveSheet" className="flex h-[calc(100dvh-8px)] w-full flex-col overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:h-auto md:max-h-[94vh] md:w-[min(860px,95vw)] md:rounded-modal">{query.data ? <EditPostingForm detail={query.data} onClose={onClose} onChanged={onChanged} /> : <><DialogHeader id={TITLE_ID} title="공고 수정" subtitle={query.error || "공고 설정을 불러오고 있습니다."} /><div className="min-h-48 animate-pulse bg-border-soft" /><DialogFooter><SecondaryButton onClick={onClose}>닫기</SecondaryButton></DialogFooter></>}</ModalShell>;
}

function EditPostingForm({ detail, onClose, onChanged }: { readonly detail: PostingManagementDetail; readonly onClose: () => void; readonly onChanged: () => void }) {
  const [title, setTitle] = useState(detail.title);
  const [start, setStart] = useState(detail.recruitmentStart);
  const [end, setEnd] = useState(detail.recruitmentEnd);
  const [roles, setRoles] = useState<Readonly<Record<string, number>>>(() => Object.fromEntries(detail.roles.map((role) => [role.templateId, role.quota])));
  const [rounds, setRounds] = useState<readonly AuditionRoundInput[]>(detail.rounds);
  const [fields, setFields] = useState<readonly ApplicationFieldInput[]>(detail.applicationFields.length ? detail.applicationFields : defaultApplicationFields());
  const [guide, setGuide] = useState(detail.applicationGuide);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setFormError("");
    try {
      await updatePosting(detail.id, {
        title, recruitmentStart: start, recruitmentEnd: end, rounds, applicationGuide: guide,
        roles: Object.entries(roles).map(([templateId, quota]) => ({ templateId, quota })), applicationFields: fields,
      });
      notifyAuditionTreeChanged(); onChanged(); onClose();
    } catch (cause) { setFormError(errorMessage(cause, "공고를 수정하지 못했습니다.")); }
    finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col"><DialogHeader id={TITLE_ID} title="공고 수정" subtitle="모집 시작 전이고 지원자가 없는 공고만 수정할 수 있습니다." /><div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 md:px-6"><CreateSection title="공고와 모집 기간"><div className="grid gap-3 md:grid-cols-2"><div className="md:col-span-2"><CreateField label="공고 제목"><FieldInput required value={title} onChange={(event) => setTitle(event.target.value)} /></CreateField></div><CreateField label="모집 시작일"><FieldInput required type="date" value={start} onChange={(event) => setStart(event.target.value)} /></CreateField><CreateField label="모집 종료일"><FieldInput required type="date" min={start} value={end} onChange={(event) => setEnd(event.target.value)} /></CreateField></div></CreateSection><CreateSection title="모집 배역" description="이번 공고에서 모집할 배역과 인원을 조정합니다."><PostingRoleSelector roles={detail.roleTemplates} selected={roles} onChange={setRoles} /></CreateSection><CreateSection title="전형 일정"><AuditionScheduleEditor rounds={rounds} onChange={setRounds} /></CreateSection><CreateSection title="지원서 항목" description="기본 정보 8개는 항상 필수입니다."><ApplicationFieldEditor fields={fields} onChange={setFields} /><div className="mt-4"><CreateField label="지원 안내"><FieldTextarea value={guide} onChange={(event) => setGuide(event.target.value)} className="min-h-28 resize-y" /></CreateField></div></CreateSection><CreateError id="posting-manage-error" message={formError} /></div><DialogFooter><SecondaryButton onClick={onClose}>취소</SecondaryButton><PrimaryButton type="submit" disabled={saving}>{saving ? "저장 중…" : "변경 사항 저장"}</PrimaryButton></DialogFooter></form>;
}

function DeletePostingDialog({ posting, onClose, onChanged }: Omit<Parameters<typeof PostingManageDialog>[0], "mode">) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const blocked = posting.applicantCount > 0;
  const remove = async () => { setDeleting(true); setError(""); try { await deletePosting(posting.id); notifyAuditionTreeChanged(); onChanged(); onClose(); } catch (cause) { setError(errorMessage(cause, "공고를 삭제하지 못했습니다.")); setDeleting(false); } };
  return <ModalShell open onClose={onClose} labelledBy={TITLE_ID} className="w-[min(520px,calc(100vw-32px))] rounded-modal bg-card shadow-[var(--shadow-modal)]"><DialogHeader id={TITLE_ID} title="공고 삭제" subtitle={posting.title} /><div className="px-5 py-6"><p className="leading-7">{blocked ? `지원자 ${posting.applicantCount}명의 지원 기록을 보호하기 위해 삭제할 수 없습니다. 모집 중단·보관 상태는 별도 정책과 API가 필요합니다.` : "공고를 삭제하면 외부에 공유한 지원 링크도 더 이상 열리지 않습니다. 이 작업은 되돌릴 수 없습니다."}</p>{error ? <p role="alert" className="mt-4 text-sm font-medium text-fail">{error}</p> : null}</div><DialogFooter><SecondaryButton onClick={onClose}>취소</SecondaryButton><DestructiveButton onClick={remove} disabled={blocked || deleting}>{deleting ? "삭제 중…" : "공고 삭제"}</DestructiveButton></DialogFooter></ModalShell>;
}

function AuditionScheduleEditor(props: Parameters<typeof BaseAuditionScheduleEditor>[0]) {
  return <BaseAuditionScheduleEditor {...props} allowCountChange={false} />;
}
