"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/auditions/toast";
import { NotebookFooter, NotebookHeader } from "@/components/landing/notebook-site-layout";
import { WorkspaceBreadcrumb, WorkspacePageHeading } from "@/components/landing/workspace-page-heading";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { createTimetable } from "@/features/timetables/api";
import { EMPTY_PROFILE, readProfileForm, type ProfileFormErrors } from "@/features/timetables/profile-form";
import { emptySettingForm, readSettingForm, selectedDates, type SettingForm, type SettingFormErrors } from "@/features/timetables/setting-form";
import { timetableRoutes } from "@/features/timetables/types";
import { ProfileFields } from "./profile-fields";
import { SettingFields } from "./setting-fields";
import { TimetableCreateSummary } from "./timetable-create-summary";

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
    <div className="public-notebook timetable-create-theme">
      <a href="#timetable-create-main" className="notebook-skip">본문으로 바로가기</a>
      <NotebookHeader />
      <main id="timetable-create-main" className="notebook-container workspace-page">
        <WorkspaceBreadcrumb items={[{ label: "오디션 일정표" }]} />
        <WorkspacePageHeading eyebrow="오디션 준비" title="오디션 일정표 만들기"
          description={<>작품 정보와 가능한 날짜를 알려주세요.<br />일정표를 만든 뒤 합격자를 등록하고 시간을 배정할 수 있어요.</>}
          action={<Link href="#timetable-guide" className="workspace-text-link">일정표는 어떻게 사용하나요?</Link>}
        />
        <form ref={formRef} onSubmit={submit} noValidate className="timetable-create-layout">
          <div className="timetable-create-fields">
            <section aria-labelledby="timetable-profile-title" className="workspace-panel">
              <div className="workspace-panel-heading"><h2 id="timetable-profile-title">작품과 담당자 정보</h2><span className="workspace-caption">* 필수 항목</span></div>
              <p className="workspace-panel-description">배우에게 안내할 작품명과 연락처를 입력해주세요.</p>
              <div className="mt-6">
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
              </div>
            </section>
            <section aria-labelledby="timetable-setting-title" className="workspace-panel">
              <div className="workspace-panel-heading"><h2 id="timetable-setting-title">날짜와 시간 설정</h2><span className="workspace-tag">{selectedDates(setting).length}일 선택</span></div>
              <p className="workspace-panel-description">여러 날짜를 선택할 수 있어요. 쉬는 시간은 가능 시간에서 제외해주세요.</p>
              <div className="mt-6">
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
              </div>
            </section>
          </div>
          <TimetableCreateSummary profile={profile} setting={setting} submitting={submitting} />
        </form>
      </main>
      <NotebookFooter />
    </div>
  );
}
