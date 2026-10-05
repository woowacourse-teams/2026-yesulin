"use client";

import { useState } from "react";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { useModalClose } from "@/components/shows/use-modal-close";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { readProfileForm, type ProfileFormErrors } from "@/features/timetables/profile-form";
import type { TimetableProfile } from "@/features/timetables/types";
import { ProfileFields } from "../profile-fields";

const TITLE_ID = "timetable-profile-dialog-title";

/** 일정표 이름·단체명·담당자 번호·장소·안내 사항을 바로 저장한다. */
export function ProfileDialog({ profile, onSave, onClose }: {
  readonly profile: TimetableProfile;
  readonly onSave: (profile: TimetableProfile) => Promise<boolean>;
  readonly onClose: () => void;
}) {
  const [form, setForm] = useState(profile);
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [saving, setSaving] = useState(false);
  const close = useModalClose(onClose, saving);

  const save = async () => {
    const result = readProfileForm(form);
    setErrors(result.errors);
    if (!result.profile) return;
    setSaving(true);
    const saved = await onSave(result.profile);
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <ModalShell
      open
      onClose={close}
      labelledBy={TITLE_ID}
      placement="responsiveSheet"
      className="flex max-h-[92dvh] w-full flex-col overflow-hidden break-keep rounded-t-modal border border-border bg-card shadow-[var(--shadow-modal)] wrap-break-word md:w-[min(640px,calc(100vw-40px))] md:rounded-modal"
    >
      <DialogHeader id={TITLE_ID} title="일정표 정보 수정" subtitle="이미 보낸 문자의 내용은 바뀌지 않아요." />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
        <ProfileFields form={form} errors={errors} onChange={setForm} disabled={saving} />
      </div>
      <DialogFooter>
        <SecondaryButton data-autofocus="true" onClick={close} disabled={saving}>닫기</SecondaryButton>
        <PrimaryButton onClick={save} disabled={saving} aria-busy={saving || undefined}>{saving ? "저장 중…" : "저장"}</PrimaryButton>
      </DialogFooter>
    </ModalShell>
  );
}
