"use client";

import { useState } from "react";
import { createPosting } from "@/features/auditions/api";
import {
  defaultApplicationFields,
  type ApplicationFieldInput,
  type PerformanceRoleTemplate,
  type AuditionRoundInput,
} from "@/features/auditions/creation-types";
import { notifyAuditionTreeChanged } from "@/features/auditions/events";
import { publicApplicationRoute } from "@/features/auditions/routes";
import type { PerformanceId } from "@/features/auditions/types";
import { errorMessage } from "@/features/auditions/use-audition-query";
import { CreateError, CreateField, CreateSection } from "./create-form";
import {
  DialogFooter,
  DialogHeader,
  ModalShell,
} from "./modal-shell";
import {
  PostingRoleSelector,
  AuditionScheduleEditor,
} from "./posting-form-sections";
import { ApplicationFieldEditor } from "./application-field-editor";
import { FieldInput, FieldTextarea, PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { PostingCreatedPanel, POSTING_CREATED_TITLE_ID } from "./posting-created-panel";

const TITLE_ID = "posting-create-title";
const ROLES_ERROR_ID = "posting-roles-error";
const FORM_ERROR_ID = "posting-create-error";
const INITIAL_FIELDS: readonly ApplicationFieldInput[] = defaultApplicationFields();
const INITIAL_ROUNDS: readonly AuditionRoundInput[] = [
  { round: 1, name: "서류 심사", date: "", note: "온라인 서류 심사" },
  { round: 2, name: "대면 오디션", date: "", note: "대면 오디션" },
];

export function PostingCreateModal({
  performanceId,
  performanceTitle,
  roleTemplates,
  onClose,
  onCreated,
}: {
  performanceId: PerformanceId;
  performanceTitle: string;
  roleTemplates: readonly PerformanceRoleTemplate[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [allowsMultipleRoles, setAllowsMultipleRoles] = useState(false);
  const [recruitmentStart, setRecruitmentStart] = useState("");
  const [recruitmentEnd, setRecruitmentEnd] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Readonly<Record<string, number>>>({});
  const [rounds, setRounds] = useState(INITIAL_ROUNDS);
  const [applicationFields, setApplicationFields] = useState(INITIAL_FIELDS);
  const [applicationGuide, setApplicationGuide] = useState("");
  const [saving, setSaving] = useState(false);
  const [rolesError, setRolesError] = useState("");
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<{ readonly title: string; readonly applicationUrl: string } | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedStart = String(formData.get("recruitmentStart") ?? "");
    const submittedEnd = String(formData.get("recruitmentEnd") ?? "");
    const submittedRounds = rounds.map((round) => ({
      ...round,
      date: String(formData.get(`round-${round.round}-date`) ?? round.date),
    }));
    const roles = Object.entries(selectedRoles).map(([templateId, quota]) => ({ templateId, quota }));
    if (roles.length === 0) {
      setRolesError("모집할 배역을 하나 이상 선택해 주세요.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const response = await createPosting({
        performanceId,
        allowsMultipleRoles,
        title,
        recruitmentStart: submittedStart,
        recruitmentEnd: submittedEnd,
        roles,
        rounds: submittedRounds,
        applicationFields,
        applicationGuide,
      });
      notifyAuditionTreeChanged();
      onCreated();
      setCreated({
        title: title.trim(),
        applicationUrl: `${window.location.origin}${publicApplicationRoute(response.createdPostingId)}`,
      });
    } catch (cause: unknown) {
      setFormError(errorMessage(cause, "공고를 추가하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      key={created ? "created" : "form"}
      open
      onClose={onClose}
      labelledBy={created ? POSTING_CREATED_TITLE_ID : TITLE_ID}
      placement="responsiveSheet"
      className="flex h-[calc(100dvh-8px)] w-full flex-col overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:h-auto md:max-h-[94vh] md:w-[min(860px,95vw)] md:rounded-modal"
    >
      {created ? (
        <PostingCreatedPanel postingTitle={created.title} applicationUrl={created.applicationUrl} onClose={onClose} />
      ) : (
      <form
        onSubmit={submit}
        aria-describedby={formError ? FORM_ERROR_ID : undefined}
        className="flex min-h-0 flex-1 flex-col"
      >
        <DialogHeader
          id={TITLE_ID}
          title="새 공고 추가"
          subtitle={`${performanceTitle}의 모집 기간, 배역, 전형 일정과 지원서 항목을 설정합니다.`}
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-6">
          <CreateSection title="공고와 모집 기간">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <CreateField label="공고 제목">
                  <FieldInput
                    data-autofocus="true"
                    required
                    name="postingTitle"
                    autoComplete="off"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="예: 2026 시즌 배우 모집"
                  />
                </CreateField>
              </div>
              <CreateField label="모집 시작일">
                <FieldInput required type="date" name="recruitmentStart" value={recruitmentStart} onChange={(event) => setRecruitmentStart(event.target.value)} />
              </CreateField>
              <CreateField label="모집 종료일">
                <FieldInput required type="date" name="recruitmentEnd" min={recruitmentStart} value={recruitmentEnd} onChange={(event) => setRecruitmentEnd(event.target.value)} />
              </CreateField>
            </div>
          </CreateSection>

          <CreateSection title="배역 선택 방식" description="지원자가 한 지원서에서 선택할 수 있는 배역 수를 정합니다.">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {([
                { value: false, title: "한 배역만 지원", description: "지원자는 공고의 모집 배역 중 하나를 선택합니다." },
                { value: true, title: "복수 배역 지원", description: "지원자는 한 지원서에서 여러 배역을 선택할 수 있습니다." },
              ] as const).map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  aria-pressed={allowsMultipleRoles === option.value}
                  onClick={() => { setAllowsMultipleRoles(option.value); setRolesError(""); }}
                  className={`min-h-24 rounded-card border p-4 text-left ${allowsMultipleRoles === option.value ? "border-brand-line bg-brand-soft" : "border-border bg-card hover:border-muted-soft"}`}
                >
                  <strong className="block text-sm">{option.title}</strong>
                  <span className="mt-1 block text-xs leading-5 text-muted-strong">{option.description}</span>
                </button>
              ))}
            </div>
          </CreateSection>

          <CreateSection title="모집 배역" description="공연에 등록된 배역 중 이번 공고에서 모집할 배역과 인원을 선택합니다.">
            <fieldset aria-describedby={rolesError ? ROLES_ERROR_ID : undefined} aria-invalid={rolesError ? true : undefined}>
              <legend className="sr-only">모집 배역 선택</legend>
              <PostingRoleSelector
                roles={roleTemplates}
                selected={selectedRoles}
                onChange={(next) => {
                  setSelectedRoles(next);
                  if (Object.keys(next).length > 0) setRolesError("");
                }}
              />
            </fieldset>
            <CreateError id={ROLES_ERROR_ID} message={rolesError} />
          </CreateSection>

          <CreateSection title="지원 전형 일정" description="기본 2차까지 제공하며, 필요하면 전형을 하나 더 추가하고 이름을 바꿀 수 있습니다.">
            <AuditionScheduleEditor rounds={rounds} onChange={setRounds} />
          </CreateSection>

          <CreateSection title="지원서에서 받을 내용" description="항목마다 사용 여부와 필수 여부를 정하고, 필요한 항목을 직접 추가할 수 있습니다.">
            <ApplicationFieldEditor fields={applicationFields} onChange={setApplicationFields} />
            <div className="mt-3.5">
              <CreateField label="지원 안내" hint="준비물, 영상 형식, 유의사항처럼 지원자가 제출 전에 알아야 할 내용을 적습니다.">
                <FieldTextarea
                  name="applicationGuide"
                  autoComplete="off"
                  value={applicationGuide}
                  onChange={(event) => setApplicationGuide(event.target.value)}
                  placeholder="예: 프로필 사진은 최근 6개월 이내 촬영본을 첨부해 주세요."
                  className="min-h-28 resize-y"
                />
              </CreateField>
            </div>
          </CreateSection>
          <CreateError id={FORM_ERROR_ID} message={formError} />
        </div>
        <DialogFooter>
          <SecondaryButton onClick={onClose}>취소</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "추가 중…" : "공고 추가"}
          </PrimaryButton>
        </DialogFooter>
      </form>
      )}
    </ModalShell>
  );
}
