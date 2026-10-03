"use client";

import { useState } from "react";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { useModalClose } from "@/components/shows/use-modal-close";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { readSettingForm, settingFormFrom, type SettingFormErrors } from "@/features/timetables/setting-form";
import type { TimetableSetting } from "@/features/timetables/types";
import { SettingFields } from "../setting-fields";

const TITLE_ID = "timetable-setting-dialog-title";

/** 시간대·소요 시간·정원을 바꾼다. 보드 편집본에만 반영하고 저장은 보드 저장 버튼으로 한다. */
export function SettingDialog({ setting, published, onApply, onClose }: {
  readonly setting: TimetableSetting;
  readonly published: boolean;
  readonly onApply: (setting: TimetableSetting) => void;
  readonly onClose: () => void;
}) {
  const [form, setForm] = useState(() => settingFormFrom(setting));
  const [errors, setErrors] = useState<SettingFormErrors>({});
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
      className="flex max-h-[92dvh] w-full flex-col overflow-hidden break-keep rounded-t-modal border border-border bg-card shadow-[var(--shadow-modal)] wrap-break-word md:w-[min(720px,calc(100vw-40px))] md:rounded-modal"
    >
      <DialogHeader
        id={TITLE_ID}
        title="시간대 설정"
        subtitle={published
          ? "안내한 배우의 시간이 새 시간대 밖이 되면 직접 옮겨야 저장할 수 있어요."
          : "새 시간대에 맞지 않는 배우는 미배정으로 돌아가요."}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
        <SettingFields form={form} errors={errors} onChange={setForm} />
      </div>
      <DialogFooter>
        <SecondaryButton data-autofocus="true" onClick={close}>닫기</SecondaryButton>
        <PrimaryButton onClick={apply}>보드에 반영</PrimaryButton>
      </DialogFooter>
    </ModalShell>
  );
}
