"use client";

import { useState } from "react";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { CreateError, CreateField } from "@/components/auditions/create-form";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { FieldInput, PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
import { otrAuditionLink, type OtrAudition } from "@/features/otr-auditions/types";
import { useOtrAuditions } from "./otr-audition-context";

const TITLE_ID = "otr-audition-create-title";

export function OtrAuditionCreateModal({ onClose, onCreated }: {
  readonly onClose: () => void;
  readonly onCreated: (audition: OtrAudition) => void;
}) {
  const { create } = useOtrAuditions();
  const [otrId, setOtrId] = useState("");
  const [title, setTitle] = useState("");
  const [roles, setRoles] = useState<readonly string[]>([""]);
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const validOtrId = /^[0-9]{1,30}$/.test(otrId.trim());

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedRoles = roles.map((role) => role.trim());
    if (!validOtrId || !title.trim() || !deadline || normalizedRoles.some((role) => !role)) {
      setError("OTR 공고 번호, 제목, 배역과 마감일을 모두 입력해 주세요.");
      return;
    }
    if (new Set(normalizedRoles).size !== normalizedRoles.length) {
      setError("같은 배역을 중복해서 입력할 수 없습니다.");
      return;
    }
    setSaving(true);
    try {
      const created = await create({ otrId: otrId.trim(), title: title.trim(), roles: normalizedRoles, deadline });
      onCreated(created);
    } catch (cause) {
      setError(cause instanceof AuditionRequestError ? cause.message : "공고를 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return <ModalShell open onClose={onClose} labelledBy={TITLE_ID} placement="responsiveSheet" className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:w-[min(680px,calc(100vw-40px))] md:rounded-modal">
    <DialogHeader id={TITLE_ID} title="OTR 공고 만들기" subtitle="OTR 공고 번호와 모집 정보를 등록합니다. 지원서와 심사는 아직 연결되지 않습니다." />
    <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-6">
        {error ? <CreateError message={error} /> : null}
        <CreateField label="OTR 공고 번호" htmlFor="otr-audition-id" hint="OTR 공고 주소의 vid 숫자를 입력해 주세요.">
          <FieldInput id="otr-audition-id" inputMode="numeric" pattern="[0-9]+" maxLength={30} required value={otrId} onChange={(event) => setOtrId(event.target.value)} placeholder="예: 12345" data-autofocus="true" />
        </CreateField>
        {validOtrId ? <a href={otrAuditionLink(otrId.trim())} target="_blank" rel="noopener noreferrer" className="block break-all text-sm font-medium text-brand underline">{otrAuditionLink(otrId.trim())} ↗</a> : null}
        <CreateField label="공고 제목" htmlFor="otr-audition-title">
          <FieldInput id="otr-audition-title" maxLength={200} required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="OTR에 게시한 공고 제목" />
        </CreateField>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-muted-strong">모집 배역</legend>
          <div className="space-y-2">{roles.map((role, index) => <div key={index} className="flex gap-2">
            <FieldInput aria-label={`배역 ${index + 1}`} maxLength={100} required value={role} onChange={(event) => setRoles((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="예: 햄릿" />
            {roles.length > 1 ? <TextButton aria-label={`배역 ${index + 1} 삭제`} onClick={() => setRoles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>삭제</TextButton> : null}
          </div>)}</div>
          {roles.length < 20 ? <SecondaryButton onClick={() => setRoles((current) => [...current, ""])} className="mt-3">배역 추가</SecondaryButton> : null}
        </fieldset>
        <CreateField label="모집 마감일" htmlFor="otr-audition-deadline" hint="일자만 저장합니다. 접수 종료 처리는 지원서 기능과 함께 추가됩니다.">
          <FieldInput id="otr-audition-deadline" type="date" required value={deadline} onChange={(event) => setDeadline(event.target.value)} />
        </CreateField>
      </div>
      <DialogFooter><SecondaryButton onClick={onClose} disabled={saving}>취소</SecondaryButton><PrimaryButton type="submit" disabled={saving}>{saving ? "저장 중…" : "공고 저장"}</PrimaryButton></DialogFooter>
    </form>
  </ModalShell>;
}
