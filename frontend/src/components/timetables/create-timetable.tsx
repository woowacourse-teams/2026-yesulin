"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/auditions/toast";
import { PrimaryButton } from "@/components/ui/controls";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { createTimetable } from "@/features/timetables/api";
import { EMPTY_PROFILE, readProfileForm, type ProfileFormErrors } from "@/features/timetables/profile-form";
import { emptySettingForm, readSettingForm, type SettingForm, type SettingFormErrors } from "@/features/timetables/setting-form";
import { timetableRoutes } from "@/features/timetables/types";
import { ProfileFields } from "./profile-fields";
import { SettingFields } from "./setting-fields";
import { TimetableHeader } from "./timetable-header";

/** 로그인 없이 일정표를 만든다. 만들면 관리 링크(이 화면 다음 주소)가 열쇠가 된다. */
export function CreateTimetable() {
  const router = useRouter();
  const toast = useToast();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [setting, setSetting] = useState<SettingForm>(() => emptySettingForm());
  const [profileErrors, setProfileErrors] = useState<ProfileFormErrors>({});
  const [settingErrors, setSettingErrors] = useState<SettingFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  /** 잘못된 첫 칸으로 화면을 옮기고 바로 고칠 수 있게 포커스한다. 달력이면 첫 날짜 버튼에 포커스한다. */
  const focusFirstInvalid = () => {
    requestAnimationFrame(() => {
      const target = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]');
      if (!target) return;
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      const focusable = target.matches("input, textarea, select")
        ? target
        : target.querySelector<HTMLElement>("button[data-date]:not(:disabled)");
      focusable?.focus({ preventScroll: true });
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const profileResult = readProfileForm(profile);
    const settingResult = readSettingForm(setting);
    setProfileErrors(profileResult.errors);
    setSettingErrors(settingResult.errors);
    if (!profileResult.profile || !settingResult.setting) {
      toast("입력을 확인해 주세요.", { type: "error" });
      focusFirstInvalid();
      return;
    }
    setSubmitting(true);
    try {
      const created = await createTimetable(profileResult.profile, settingResult.setting);
      router.push(`${timetableRoutes.manage(created.manageKey)}?created=1`);
    } catch (cause) {
      toast(cause instanceof AuditionRequestError ? cause.message : "일정표를 만들지 못했어요. 다시 시도해 주세요.", { type: "error" });
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh break-keep bg-surface pb-24 text-foreground wrap-break-word">
      <TimetableHeader />
      <div className="mx-auto max-w-[720px] px-4 py-8 md:px-8 md:py-10">
        <h1 className="text-[clamp(24px,4vw,30px)] font-bold tracking-[-0.03em]">오디션 일정표 생성</h1>
        <form ref={formRef} onSubmit={submit} noValidate className="mt-6 space-y-5">
          <section aria-label="일정표 정보" className="rounded-card border border-border bg-card px-5 py-6 md:px-6">
            <ProfileFields
              form={profile}
              errors={profileErrors}
              disabled={submitting}
              onChange={(next) => {
                // 고친 칸의 오류 표시는 바로 지운다. 다시 검사는 생성 버튼을 누를 때 한다.
                setProfileErrors((current) => Object.fromEntries(
                  Object.entries(current).filter(([key]) => next[key as keyof typeof next] === profile[key as keyof typeof profile]),
                ));
                setProfile(next);
              }}
            />
          </section>
          <section aria-label="오디션 날짜와 시간" className="rounded-card border border-border bg-card px-5 py-6 md:px-6">
            <SettingFields
              form={setting}
              errors={settingErrors}
              disabled={submitting}
              onChange={(next) => {
                if (next.windows.length > 0) {
                  setSettingErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== "windows")));
                }
                setSetting(next);
              }}
            />
          </section>
          <PrimaryButton type="submit" disabled={submitting} aria-busy={submitting || undefined} className="min-h-12 w-full text-base">
            {submitting ? "생성 중…" : "일정표 생성"}
          </PrimaryButton>
        </form>
      </div>
    </main>
  );
}
