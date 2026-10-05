"use client";

import { useState } from "react";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { useModalClose } from "@/components/shows/use-modal-close";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { readSettingForm, settingFormFrom, windowKey, type SettingFormErrors } from "@/features/timetables/setting-form";
import type { TimetableSetting } from "@/features/timetables/types";
import { SettingFields } from "../setting-fields";

const TITLE_ID = "timetable-extend-dialog-title";

/**
 * 저장한 날짜·시간은 고정하고 날짜·시간을 더하거나 인원을 늘린다. 서버도 줄이거나 바꾸는 요청을 거절한다.
 * 보드 편집본에만 반영하고 저장은 보드 저장 버튼으로 한다.
 */
export function SettingDialog({ setting, saved, onApply, onClose }: {
  readonly setting: TimetableSetting;
  /** 서버에 저장된 설정. 여기 있는 시간대와 인원은 줄일 수 없다. */
  readonly saved: TimetableSetting;
  readonly onApply: (setting: TimetableSetting) => void;
  readonly onClose: () => void;
}) {
  const [form, setForm] = useState(() => settingFormFrom(setting));
  const [errors, setErrors] = useState<SettingFormErrors>({});
  const [locked] = useState(() => ({
    windowKeys: new Set(saved.windows.map(windowKey)),
    minCapacity: saved.slotCapacity,
  }));
  const close = useModalClose(onClose, false);

  const apply = () => {
    const result = readSettingForm(form);
    setErrors(result.errors);
    if (result.setting) onApply(result.setting);
  };

  return (
    <ModalShell
      open
      onClose={close}
      labelledBy={TITLE_ID}
      placement="responsiveSheet"
      className="flex max-h-[92dvh] w-full flex-col overflow-hidden break-keep rounded-t-modal border border-border bg-card shadow-[var(--shadow-modal)] wrap-break-word md:w-[min(760px,calc(100vw-40px))] md:rounded-modal"
    >
      <DialogHeader id={TITLE_ID} title="시간 늘리기" subtitle="저장한 날짜·시간은 그대로 두고 더하기만 할 수 있어요." />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
        <SettingFields form={form} errors={errors} onChange={setForm} locked={locked} />
      </div>
      <DialogFooter>
        <SecondaryButton data-autofocus="true" onClick={close}>닫기</SecondaryButton>
        <PrimaryButton onClick={apply}>보드에 반영</PrimaryButton>
      </DialogFooter>
    </ModalShell>
  );
}
