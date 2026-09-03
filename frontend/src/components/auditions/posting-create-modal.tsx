"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AuditionRequestError, createPosting } from "@/features/auditions/api";
import { auditionDateWarnings, stageMinimumDate, validateAuditionDates, type AuditionDateField } from "@/features/auditions/audition-date-policy";
import { defaultApplicationFields, MAX_REQUESTED_PHOTO_COUNT, MAX_VIDEO_REQUIREMENTS, type ApplicationFieldInput, type AuditionRoundInput, type PerformanceRoleTemplate } from "@/features/auditions/creation-types";
import { notifyAuditionTreeChanged } from "@/features/auditions/events";
import { publicApplicationRoute } from "@/features/auditions/routes";
import type { PerformanceId } from "@/features/auditions/types";
import { errorMessage } from "@/features/auditions/use-audition-query";
import { ApplicationFieldEditor } from "./application-field-editor";
import { CalendarDateRangeField } from "./calendar-date-range-field";
import { CreateError, CreateField, CreateSection } from "./create-form";
import { DialogFooter, DialogHeader, ModalShell } from "./modal-shell";
import { AuditionScheduleEditor, PostingRoleSelector, type SelectedPostingRoles } from "./posting-form-sections";
import { PostingCreatedPanel, POSTING_CREATED_TITLE_ID } from "./posting-created-panel";
import { RoleApplicationMode } from "./role-application-mode";
import { FieldInput, PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { postingCreationDraftKey } from "@/features/auditions/producer-creation-draft-store";
import { ProducerCreationDraftStatus, useProducerCreationDraft } from "./use-producer-creation-draft";
import { emptyVenueAddress, PerformanceVenueField } from "./performance-venue-field";

const TITLE_ID = "posting-create-title";
const INITIAL_FIELDS: readonly ApplicationFieldInput[] = defaultApplicationFields();
const INITIAL_ROUNDS: readonly AuditionRoundInput[] = [{ round: 1, name: "1차 서류 심사", date: "", note: "제출한 지원서를 검토합니다.", venue: "", venueAddress: emptyVenueAddress() }];
type ErrorSection = "TITLE" | "ROLES" | "SCHEDULE" | "APPLICATION" | "GENERAL";
type FormError = { readonly message: string; readonly section: ErrorSection };
type PostingCreationDraft = {
  readonly auditionId?: string;
  readonly title: string;
  readonly recruitmentEnd: string;
  readonly rehearsalVenue: string;
  readonly rehearsalVenueAddress: ReturnType<typeof emptyVenueAddress>;
  readonly allowsMultipleRoles: boolean;
  readonly selectedRoles: SelectedPostingRoles;
  readonly rounds: readonly AuditionRoundInput[];
  readonly applicationFields: readonly ApplicationFieldInput[];
};

const SECTION_IDS: Record<Exclude<ErrorSection, "GENERAL">, string> = {
  TITLE: "posting-create-title-section",
  ROLES: "posting-create-roles",
  SCHEDULE: "posting-create-schedule",
  APPLICATION: "posting-create-application",
};

function isEmptyPostingDraft(draft: PostingCreationDraft) {
  return !draft.title.trim() && !draft.recruitmentEnd && !draft.rehearsalVenue.trim() && !draft.rehearsalVenueAddress.roadAddress
    && !draft.allowsMultipleRoles && Object.keys(draft.selectedRoles).length === 0
    && JSON.stringify(draft.rounds) === JSON.stringify(INITIAL_ROUNDS)
    && JSON.stringify(draft.applicationFields) === JSON.stringify(INITIAL_FIELDS);
}

/** 항목 검증 실패는 코드가 하나뿐이라 어떤 입력이 거부됐는지로 구간을 정한다. */
function sectionForFields(fields: readonly string[]): ErrorSection {
  const startsWithAny = (...prefixes: readonly string[]) =>
    fields.some((field) => prefixes.some((prefix) => field.startsWith(prefix)));
  if (startsWithAny("title")) return "TITLE";
  if (startsWithAny("roles", "multipleRoleApplicationsAllowed", "performanceRoleId")) return "ROLES";
  if (startsWithAny("recruitment", "stages")) return "SCHEDULE";
  if (startsWithAny("basicFields", "additionalFields", "photoRequirements", "videoRequirements", "additionalQuestions")) {
    return "APPLICATION";
  }
  return "GENERAL";
}

function sectionForError(cause: unknown): ErrorSection {
  if (!(cause instanceof AuditionRequestError)) return "GENERAL";
  const code = cause.code ?? "";
  // 실제 Backend 오류 코드
  if (code === "AUDITION_INVALID_SCHEDULE") return "SCHEDULE";
  if (code === "AUDITION_INVALID_ROLE_SECTION") return "ROLES";
  if (code === "AUDITION_INVALID_FORM") return "APPLICATION";
  if (code === "AUDITION_INVALID_TITLE") return "TITLE";
  if (code === "INVALID_REQUEST") return sectionForFields(Object.keys(cause.detail));
  // 목 시나리오 오류 코드
  if (["POSTER_REQUIRED"].includes(code)) return "GENERAL";
  if (["TITLE_REQUIRED"].includes(code)) return "TITLE";
  if (["ROLE_REQUIRED", "INVALID_QUOTA", "INVALID_ROLE_CONDITION", "UNKNOWN_ROLE_TEMPLATE"].includes(code)) return "ROLES";
  if (["PERIOD_REQUIRED", "INVALID_PERIOD", "RECRUITMENT_END_PAST", "INVALID_ROUND_COUNT", "INVALID_ROUND_ORDER", "INVALID_ROUND_DATE", "ROUND_AFTER_PERFORMANCE_END"].includes(code)) return "SCHEDULE";
  if (["INVALID_FIELD_LABEL", "FIELD_LABEL_TOO_LONG", "INVALID_PHOTO_REQUIREMENTS", "INVALID_VIDEO_REQUIREMENTS", "INVALID_CUSTOM_LENGTH"].includes(code)) return "APPLICATION";
  return "GENERAL";
}

export function PostingCreateModal({ performanceId, performanceTitle, performancePosterUrl, performanceStart, performanceEnd, roleTemplates, onClose, onCreated }: {
  readonly performanceId: PerformanceId;
  readonly performanceTitle: string;
  readonly performancePosterUrl: string;
  readonly performanceStart: string;
  readonly performanceEnd: string;
  readonly roleTemplates: readonly PerformanceRoleTemplate[];
  readonly onClose: () => void;
  readonly onCreated: () => void;
}) {
  const [auditionId, setAuditionId] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState("");
  const [recruitmentEnd, setRecruitmentEnd] = useState("");
  const [rehearsalVenue, setRehearsalVenue] = useState("");
  const [rehearsalVenueAddress, setRehearsalVenueAddress] = useState(emptyVenueAddress);
  const [allowsMultipleRoles, setAllowsMultipleRoles] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<SelectedPostingRoles>({});
  const [rounds, setRounds] = useState(INITIAL_ROUNDS);
  const [applicationFields, setApplicationFields] = useState(INITIAL_FIELDS);
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<FormError | null>(null);
  const [created, setCreated] = useState<{ readonly title: string; readonly applicationUrl: string } | null>(null);
  const selectedRoleCount = Object.keys(selectedRoles).length;
  const dateInput = { performanceStart, performanceEnd, recruitmentStart: "", recruitmentEnd, rounds };
  const dateIssues = validateAuditionDates(dateInput);
  const dateWarnings = auditionDateWarnings(dateInput);
  const visibleDateError = (field: AuditionDateField, value: string) => {
    const issue = dateIssues.find((candidate) => candidate.field === field);
    return issue && (submitAttempted || Boolean(value)) ? issue.message : undefined;
  };
  const roundDateErrors = rounds.map((round, index) => visibleDateError(`round.${index}.date`, round.date));
  const stageMinimumDates = rounds.map((_, index) => stageMinimumDate(dateInput, index));
  const clearDateFormError = () => setFormError((current) => current?.section === "SCHEDULE" ? null : current);
  const restoreDraft = useCallback((draft: PostingCreationDraft) => {
    const availableRoleIds = new Set(roleTemplates.map((role) => role.id));
    setAuditionId(draft.auditionId ?? crypto.randomUUID());
    setTitle(draft.title);
    setRecruitmentEnd(draft.recruitmentEnd);
    setRehearsalVenue(draft.rehearsalVenue);
    setRehearsalVenueAddress(draft.rehearsalVenueAddress);
    setSelectedRoles(Object.fromEntries(Object.entries(draft.selectedRoles).filter(([id]) => availableRoleIds.has(id))));
    setAllowsMultipleRoles(draft.allowsMultipleRoles && Object.keys(draft.selectedRoles).filter((id) => availableRoleIds.has(id)).length >= 2);
    setRounds(draft.rounds);
    setApplicationFields(draft.applicationFields);
  }, [roleTemplates]);
  const draft = useProducerCreationDraft({
    draftKey: postingCreationDraftKey(performanceId),
    value: {
      auditionId, title, recruitmentEnd, rehearsalVenue, rehearsalVenueAddress,
      allowsMultipleRoles, selectedRoles, rounds, applicationFields,
    },
    restore: restoreDraft,
    isEmpty: isEmptyPostingDraft,
  });
  const { flush: flushDraft } = draft;

  useEffect(() => {
    if (!formError) return;
    // 구간을 특정하지 못한 오류도 화면 밖에 남지 않도록 오류 문구 자체로 이동한다.
    const target = formError.section === "GENERAL"
      ? document.getElementById("posting-create-error")
      : document.getElementById(SECTION_IDS[formError.section]);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [formError]);

  const close = useCallback(() => {
    if (created) { onCreated(); onClose(); return; }
    void flushDraft().finally(onClose);
  }, [created, flushDraft, onClose, onCreated]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    if (!performanceStart) { setFormError({ message: "공고를 만들기 전에 공연 정보에서 공연 기간을 먼저 입력해 주세요.", section: "GENERAL" }); return; }
    const dateIssue = validateAuditionDates(dateInput)[0];
    if (dateIssue) { setFormError({ message: dateIssue.message, section: "SCHEDULE" }); return; }
    const roles = Object.values(selectedRoles);
    if (!performancePosterUrl || roles.length === 0) { setFormError(!performancePosterUrl ? { message: "공연 포스터를 먼저 등록해 주세요.", section: "GENERAL" } : { message: "모집 분야를 하나 이상 선택해 주세요.", section: "ROLES" }); return; }
    const photoField = applicationFields.find((field) => field.id === "PHOTOS" && field.enabled);
    const photoRequirements = photoField?.config.photoRequirements ?? [];
    const photoTotal = photoRequirements.reduce((sum, item) => sum + item.count, 0);
    if (photoField && (photoRequirements.some((item) => !item.description.trim() || item.count < 1) || photoTotal > MAX_REQUESTED_PHOTO_COUNT)) { setFormError({ message: `프로필 사진 요구사항을 확인하고 전체 ${MAX_REQUESTED_PHOTO_COUNT}장 이하로 입력해 주세요.`, section: "APPLICATION" }); return; }
    const videoField = applicationFields.find((field) => field.id === "VIDEO" && field.enabled);
    const videoRequirements = videoField?.config.videoRequirements ?? [];
    if (videoField && (videoRequirements.length < 1 || videoRequirements.length > MAX_VIDEO_REQUIREMENTS || videoRequirements.some((item) => !item.description.trim()))) { setFormError({ message: `제출 영상 요구사항을 1개 이상 ${MAX_VIDEO_REQUIREMENTS}개 이하로 입력해 주세요.`, section: "APPLICATION" }); return; }
    setSaving(true); setFormError(null);
    try {
      const posting = {
        performanceId, isOpenCall: false, allowsMultipleRoles, posterUrl: performancePosterUrl,
        detailImageUrl: "", title, performanceStart, performanceEnd, recruitmentStart: "", recruitmentEnd,
        rehearsalVenue, rehearsalVenueAddress,
        roles, rounds, applicationFields, applicationGuide: "",
      } as const;
      const response = await createPosting(posting, auditionId);
      await draft.discard().catch(() => undefined);
      notifyAuditionTreeChanged();
      setCreated({ title: title.trim(), applicationUrl: `${window.location.origin}${publicApplicationRoute(response.createdPostingId)}` });
    } catch (cause) { console.error("[공고 생성 실패]", cause); setFormError({ message: errorMessage(cause, "공고를 추가하지 못했습니다."), section: sectionForError(cause) }); }
    finally { setSaving(false); }
  };

  return <ModalShell key={created ? "created" : "form"} open onClose={close} labelledBy={created ? POSTING_CREATED_TITLE_ID : TITLE_ID} placement="responsiveSheet" className="flex h-[calc(100dvh-8px)] w-full flex-col overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:h-auto md:max-h-[94vh] md:w-[min(900px,95vw)] md:rounded-modal">
    {created ? <PostingCreatedPanel postingTitle={created.title} applicationUrl={created.applicationUrl} onClose={close} /> : <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader id={TITLE_ID} title="새 공고 추가" subtitle={`${performanceTitle} 공연의 모집 공고와 배우가 작성할 지원서 양식을 만듭니다.`} />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 md:px-6">
        <ProducerCreationDraftStatus status={draft.status} savedAt={draft.savedAt} />
        <CreateSection id={SECTION_IDS.TITLE} title="1. 공고명" description="지원 링크를 연 배우가 가장 먼저 보는 제목입니다. 어떤 공연에서 누구를 언제 뽑는지 한 줄로 드러나게 적어 주세요.">
          <CreateError id="posting-create-title-error" message={formError?.section === "TITLE" ? formError.message : ""} />
          <div className={formError?.section === "TITLE" ? "mt-4" : ""}><CreateField label="공고명"><FieldInput data-autofocus="true" required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 2026 하반기 주·조연 배우 모집" /></CreateField></div>
          <div className="mt-5 flex gap-3 rounded-control border border-border-soft bg-surface p-3 text-sm leading-6 text-muted-strong"><Image src={performancePosterUrl} alt="" width={48} height={62} unoptimized className="h-[62px] w-12 rounded object-cover" /><div className="min-w-0"><strong className="block truncate text-foreground">{performanceTitle}</strong><span className="block">공연 기간 · {performanceStart ? `${performanceStart} ${performanceEnd ? `~ ${performanceEnd}` : "~ 오픈런"}` : "공연 정보에서 기간을 입력해 주세요"}</span><span className="block truncate">배역 · {roleTemplates.map((role) => role.name).join(" · ") || "등록된 배역 없음"}</span></div></div>
        </CreateSection>
        <CreateSection id={SECTION_IDS.ROLES} title="2. 모집 배역" description="공연에 등록한 배역 중 모집할 배역을 고르고, 이 공고에 적용할 지원 조건을 설정합니다.">
          <CreateError id="posting-create-roles-error" message={formError?.section === "ROLES" ? formError.message : ""} />
          <div className={formError?.section === "ROLES" ? "mt-4" : ""}>
          <PostingRoleSelector roles={roleTemplates} selected={selectedRoles} onChange={(next) => { setSelectedRoles(next); if (Object.keys(next).length < 2) setAllowsMultipleRoles(false); }} />
          </div>
        </CreateSection>
        <CreateSection title="3. 지원 방식" description="지원자가 모집 배역을 선택하는 방법을 정합니다.">
          <RoleApplicationMode selectedRoleCount={selectedRoleCount} allowsMultipleRoles={allowsMultipleRoles} onChange={setAllowsMultipleRoles} />
        </CreateSection>
        <CreateSection id={SECTION_IDS.SCHEDULE} title="4. 모집·전형 일정" description="공고를 게시하는 순간 모집이 시작됩니다. 마감일과 이후 전형 일정을 설정해 주세요.">
          <CreateError id="posting-create-schedule-error" message={formError?.section === "SCHEDULE" ? formError.message : ""} />
          <div className={formError?.section === "SCHEDULE" ? "mt-4" : ""}><CalendarDateRangeField includeTime single start={recruitmentEnd} end="" startError={visibleDateError("recruitmentEnd", recruitmentEnd)} onStartChange={(value) => { setRecruitmentEnd(value); clearDateFormError(); }} onEndChange={() => undefined} startLabel="모집 마감" /></div>
          <p className="mt-2 text-sm leading-6 text-muted">모든 모집 날짜와 시간은 한국 시간(Asia/Seoul) 기준입니다.</p>
          <div className="mt-5 border-t border-border-soft pt-5"><h4 className="text-sm font-bold">연습 장소 <span className="font-normal text-muted">(선택)</span></h4><p className="mt-1 text-sm leading-6 text-muted-strong">공연장과 별도로 안내할 연습 장소가 있다면 입력해 주세요.</p><div className="mt-3"><PerformanceVenueField optional venueLabel="연습 장소명" addressLabel="연습 장소 주소" mapLabel="연습 장소 지도" venue={rehearsalVenue} address={rehearsalVenueAddress} onVenueChange={setRehearsalVenue} onAddressChange={setRehearsalVenueAddress} /></div></div>
          <div className="mt-4"><h4 className="mb-2 text-sm font-bold">지원 전형 일정</h4><AuditionScheduleEditor rounds={rounds} dateErrors={roundDateErrors} minimumDates={stageMinimumDates} maximumDate={performanceEnd || undefined} onChange={(value) => { setRounds(value); clearDateFormError(); }} /></div>
          {dateWarnings.length ? <ul role="status" className="mt-3 space-y-1 rounded-control border border-warn/20 bg-warn-bg px-4 py-3 text-sm leading-6 text-warn">{dateWarnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul> : null}
        </CreateSection>
        <CreateSection id={SECTION_IDS.APPLICATION} title="5. 지원 폼" description="기본정보, 추가정보, 사진, 영상과 추가 질문을 구성합니다."><CreateError id="posting-create-application-error" message={formError?.section === "APPLICATION" ? formError.message : ""} /><div className={formError?.section === "APPLICATION" ? "mt-4" : ""}><ApplicationFieldEditor fields={applicationFields} onChange={setApplicationFields} /></div></CreateSection>
        <CreateError id="posting-create-error" message={formError?.section === "GENERAL" ? formError.message : ""} />
      </div>
      <DialogFooter><SecondaryButton onClick={close}>취소</SecondaryButton><PrimaryButton type="submit" disabled={saving}>{saving ? "추가 중…" : "공고 추가"}</PrimaryButton></DialogFooter>
    </form>}
  </ModalShell>;
}
