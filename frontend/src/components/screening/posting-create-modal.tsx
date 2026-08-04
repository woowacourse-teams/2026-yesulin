"use client";

import { useState } from "react";
import { createPosting } from "@/features/screening/api";
import {
  APPLICATION_FIELD_OPTIONS,
  type ApplicationFieldInput,
  type PerformanceRoleTemplate,
  type ScreeningRoundInput,
} from "@/features/screening/creation-types";
import { notifyScreeningTreeChanged } from "@/features/screening/events";
import type { PerformanceId } from "@/features/screening/types";
import { errorMessage } from "@/features/screening/use-screening-query";
import { CreateError, CreateField, CreateSection, createInputClass } from "./create-form";
import {
  DialogFooter,
  DialogHeader,
  ModalShell,
  dialogButton,
  dialogPrimaryButton,
} from "./modal-shell";
import {
  PostingRoleSelector,
  ScreeningScheduleEditor,
} from "./posting-form-sections";
import { ApplicationFieldEditor } from "./application-field-editor";

const TITLE_ID = "posting-create-title";
const INITIALLY_DISABLED = new Set(["SCHOOL", "MOTIVATION"]);
const INITIAL_FIELDS: readonly ApplicationFieldInput[] = APPLICATION_FIELD_OPTIONS.map((field) => ({
  id: field.key,
  key: field.key,
  label: field.label,
  enabled: !INITIALLY_DISABLED.has(field.key),
  required: field.defaultRequired,
  custom: false,
}));
const INITIAL_ROUNDS: readonly ScreeningRoundInput[] = [
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
  const [recruitmentStart, setRecruitmentStart] = useState("");
  const [recruitmentEnd, setRecruitmentEnd] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Readonly<Record<string, number>>>({});
  const [rounds, setRounds] = useState(INITIAL_ROUNDS);
  const [applicationFields, setApplicationFields] = useState(INITIAL_FIELDS);
  const [applicationGuide, setApplicationGuide] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      setError("모집할 배역을 하나 이상 선택해 주세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createPosting({
        performanceId,
        title,
        recruitmentStart: submittedStart,
        recruitmentEnd: submittedEnd,
        roles,
        rounds: submittedRounds,
        applicationFields,
        applicationGuide,
      });
      notifyScreeningTreeChanged();
      onCreated();
      onClose();
    } catch (cause: unknown) {
      setError(errorMessage(cause, "공고를 추가하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      labelledBy={TITLE_ID}
      className="flex max-h-[94vh] w-[min(860px,95vw)] flex-col overflow-hidden rounded-[12px] bg-card shadow-[0_20px_60px_rgba(0,0,0,0.24)]"
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <DialogHeader
          id={TITLE_ID}
          title="새 공고 추가"
          subtitle={`${performanceTitle}의 모집 기간, 배역, 전형 일정과 지원서 항목을 설정합니다.`}
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-[22px] py-5">
          <CreateSection title="공고와 모집 기간">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <CreateField label="공고 제목">
                  <input
                    autoFocus
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="예: 2026 시즌 배우 모집"
                    className={createInputClass}
                  />
                </CreateField>
              </div>
              <CreateField label="모집 시작일">
                <input required type="date" name="recruitmentStart" value={recruitmentStart} onChange={(event) => setRecruitmentStart(event.target.value)} className={createInputClass} />
              </CreateField>
              <CreateField label="모집 종료일">
                <input required type="date" name="recruitmentEnd" min={recruitmentStart} value={recruitmentEnd} onChange={(event) => setRecruitmentEnd(event.target.value)} className={createInputClass} />
              </CreateField>
            </div>
          </CreateSection>

          <CreateSection title="모집 배역" description="공연에 등록된 배역 중 이번 공고에서 모집할 배역과 인원을 선택합니다.">
            <PostingRoleSelector roles={roleTemplates} selected={selectedRoles} onChange={setSelectedRoles} />
          </CreateSection>

          <CreateSection title="지원 전형 일정" description="기본 2차까지 제공하며, 필요하면 전형을 하나 더 추가하고 이름을 바꿀 수 있습니다.">
            <ScreeningScheduleEditor rounds={rounds} onChange={setRounds} />
          </CreateSection>

          <CreateSection title="지원서에서 받을 내용" description="항목마다 사용 여부와 필수 여부를 정하고, 필요한 항목을 직접 추가할 수 있습니다.">
            <ApplicationFieldEditor fields={applicationFields} onChange={setApplicationFields} />
            <div className="mt-3.5">
              <CreateField label="지원 안내" hint="준비물, 영상 형식, 유의사항처럼 지원자가 제출 전에 알아야 할 내용을 적습니다.">
                <textarea
                  value={applicationGuide}
                  onChange={(event) => setApplicationGuide(event.target.value)}
                  placeholder="예: 프로필 사진은 최근 6개월 이내 촬영본을 첨부해 주세요."
                  className={`${createInputClass} min-h-24 resize-y`}
                />
              </CreateField>
            </div>
          </CreateSection>
          <CreateError message={error} />
        </div>
        <DialogFooter>
          <button type="button" onClick={onClose} className={dialogButton}>취소</button>
          <button type="submit" disabled={saving} className={`${dialogPrimaryButton} disabled:opacity-50`}>
            {saving ? "추가 중..." : "공고 추가"}
          </button>
        </DialogFooter>
      </form>
    </ModalShell>
  );
}
