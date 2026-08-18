"use client";

import { useCallback, useEffect, useState } from "react";
import { AuditionRequestError, createPosting } from "@/features/auditions/api";
import { defaultApplicationFields, type ApplicationFieldInput, type AuditionRoundInput, type PerformanceRoleTemplate } from "@/features/auditions/creation-types";
import { notifyAuditionTreeChanged } from "@/features/auditions/events";
import { publicApplicationRoute } from "@/features/auditions/routes";
import type { PerformanceId } from "@/features/auditions/types";
import { errorMessage } from "@/features/auditions/use-audition-query";
import { ApplicationFieldEditor } from "./application-field-editor";
import { CalendarDateRangeField } from "./calendar-date-range-field";
import { CreateError, CreateField, CreateSection } from "./create-form";
import { DialogFooter, DialogHeader, ModalShell } from "./modal-shell";
import { AuditionScheduleEditor, PostingRoleSelector, type SelectedPostingRoles } from "./posting-form-sections";
import { PosterUploadField } from "./poster-upload-field";
import { PostingCreatedPanel, POSTING_CREATED_TITLE_ID } from "./posting-created-panel";
import { emptyVenueAddress, PerformanceVenueField } from "./performance-venue-field";
import { FieldInput, FieldTextarea, PrimaryButton, SecondaryButton } from "@/components/ui/controls";

const TITLE_ID = "posting-create-title";
const INITIAL_FIELDS: readonly ApplicationFieldInput[] = defaultApplicationFields();
const INITIAL_ROUNDS: readonly AuditionRoundInput[] = [{ round: 1, name: "1차 서류 심사", date: "", note: "제출한 지원서를 검토합니다." }];
type ErrorSection = "POSTER" | "TITLE" | "ROLES" | "SCHEDULE" | "GUIDE" | "APPLICATION" | "GENERAL";
type FormError = { readonly message: string; readonly section: ErrorSection };

const SECTION_IDS: Record<Exclude<ErrorSection, "GENERAL">, string> = {
  POSTER: "posting-create-poster",
  TITLE: "posting-create-title-section",
  ROLES: "posting-create-roles",
  SCHEDULE: "posting-create-schedule",
  GUIDE: "posting-create-guide",
  APPLICATION: "posting-create-application",
};

function sectionForError(cause: unknown): ErrorSection {
  if (!(cause instanceof AuditionRequestError)) return "GENERAL";
  if (["POSTER_REQUIRED"].includes(cause.code ?? "")) return "POSTER";
  if (["TITLE_REQUIRED"].includes(cause.code ?? "")) return "TITLE";
  if (["ROLE_REQUIRED", "INVALID_QUOTA", "INVALID_ROLE_CONDITION", "UNKNOWN_ROLE_TEMPLATE"].includes(cause.code ?? "")) return "ROLES";
  if (["PERFORMANCE_START_REQUIRED", "INVALID_PERFORMANCE_PERIOD", "PERIOD_REQUIRED", "INVALID_PERIOD", "INVALID_ROUND_COUNT", "INVALID_ROUND_ORDER", "INVALID_ROUND_DATE"].includes(cause.code ?? "")) return "SCHEDULE";
  if (["INVALID_FIELD_LABEL", "FIELD_LABEL_TOO_LONG", "INVALID_PHOTO_REQUIREMENTS", "INVALID_VIDEO_REQUIREMENTS", "INVALID_CUSTOM_LENGTH"].includes(cause.code ?? "")) return "APPLICATION";
  if (["APPLICATION_GUIDE_TOO_LONG"].includes(cause.code ?? "")) return "GUIDE";
  return "GENERAL";
}

export function PostingCreateModal({ performanceId, performanceTitle, performancePosterUrl, roleTemplates, onClose, onCreated }: {
  readonly performanceId: PerformanceId;
  readonly performanceTitle: string;
  readonly performancePosterUrl: string;
  readonly roleTemplates: readonly PerformanceRoleTemplate[];
  readonly onClose: () => void;
  readonly onCreated: () => void;
}) {
  const [posterUrl, setPosterUrl] = useState(performancePosterUrl);
  const [detailImageUrl, setDetailImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [performanceStart, setPerformanceStart] = useState("");
  const [performanceEnd, setPerformanceEnd] = useState("");
  const [recruitmentStart, setRecruitmentStart] = useState("");
  const [recruitmentEnd, setRecruitmentEnd] = useState("");
  const [rehearsalVenue, setRehearsalVenue] = useState("");
  const [rehearsalVenueAddress, setRehearsalVenueAddress] = useState(emptyVenueAddress);
  const [allowsMultipleRoles, setAllowsMultipleRoles] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<SelectedPostingRoles>({});
  const [rounds, setRounds] = useState(INITIAL_ROUNDS);
  const [applicationFields, setApplicationFields] = useState(INITIAL_FIELDS);
  const [applicationGuide, setApplicationGuide] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<FormError | null>(null);
  const [created, setCreated] = useState<{ readonly title: string; readonly applicationUrl: string } | null>(null);

  useEffect(() => {
    if (!formError || formError.section === "GENERAL") return;
    document.getElementById(SECTION_IDS[formError.section])?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [formError]);

  const close = useCallback(() => { if (created) onCreated(); onClose(); }, [created, onClose, onCreated]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const roles = Object.values(selectedRoles);
    if (!posterUrl || roles.length === 0) { setFormError(!posterUrl ? { message: "공고 포스터를 등록해 주세요.", section: "POSTER" } : { message: "모집 분야를 하나 이상 선택해 주세요.", section: "ROLES" }); return; }
    const photoField = applicationFields.find((field) => field.id === "PHOTOS" && field.enabled);
    const photoRequirements = photoField?.config.photoRequirements ?? [];
    const photoTotal = photoRequirements.reduce((sum, item) => sum + item.count, 0);
    if (photoField && (photoRequirements.some((item) => !item.description.trim() || item.count < 1) || photoTotal > 10)) { setFormError({ message: "프로필 사진 요구사항과 전체 장수를 확인해 주세요.", section: "APPLICATION" }); return; }
    const videoField = applicationFields.find((field) => field.id === "VIDEO" && field.enabled);
    const videoRequirements = videoField?.config.videoRequirements ?? [];
    if (videoField && (videoRequirements.length < 1 || videoRequirements.length > 10 || videoRequirements.some((item) => !item.description.trim()))) { setFormError({ message: "영상 링크 요구사항을 1개 이상 10개 이하로 입력해 주세요.", section: "APPLICATION" }); return; }
    setSaving(true); setFormError(null);
    try {
      const response = await createPosting({ performanceId, isOpenCall: false, allowsMultipleRoles, posterUrl, detailImageUrl, title, performanceStart, performanceEnd, recruitmentStart, recruitmentEnd, rehearsalVenue, rehearsalVenueAddress, roles, rounds, applicationFields, applicationGuide });
      notifyAuditionTreeChanged();
      setCreated({ title: title.trim(), applicationUrl: `${window.location.origin}${publicApplicationRoute(response.createdPostingId)}` });
    } catch (cause) { setFormError({ message: errorMessage(cause, "공고를 추가하지 못했습니다."), section: sectionForError(cause) }); }
    finally { setSaving(false); }
  };

  return <ModalShell key={created ? "created" : "form"} open onClose={close} labelledBy={created ? POSTING_CREATED_TITLE_ID : TITLE_ID} placement="responsiveSheet" className="flex h-[calc(100dvh-8px)] w-full flex-col overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:h-auto md:max-h-[94vh] md:w-[min(900px,95vw)] md:rounded-modal">
    {created ? <PostingCreatedPanel postingTitle={created.title} applicationUrl={created.applicationUrl} onClose={close} /> : <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader id={TITLE_ID} title="새 공고 추가" subtitle={`${performanceTitle}의 공고 스냅샷과 지원 양식을 만듭니다.`} />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 md:px-6">
        <CreateSection id={SECTION_IDS.POSTER} title="1. 대표 이미지와 공고명" description="공연 포스터가 대표 이미지로 복사되어 있습니다. 이 공고에서만 다른 이미지로 바꿀 수 있어요.">
          <CreateError id="posting-create-poster-error" message={formError?.section === "POSTER" ? formError.message : ""} />
          <div className={`${formError?.section === "POSTER" ? "mt-4 " : ""}grid grid-cols-[120px_minmax(0,1fr)] items-start gap-4 md:grid-cols-[150px_minmax(0,1fr)]`}>
            <PosterUploadField label="공고 대표 이미지" value={posterUrl} onChange={setPosterUrl} />
            <div id={SECTION_IDS.TITLE} className="min-w-0">
              <CreateError id="posting-create-title-error" message={formError?.section === "TITLE" ? formError.message : ""} />
              <div className={formError?.section === "TITLE" ? "mt-4" : ""}><CreateField label="공고명"><FieldInput data-autofocus="true" required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 2026 하반기 주·조연 배우 모집" /></CreateField></div>
              <p className="mt-3 text-sm leading-6 text-muted">대표 이미지는 공고 목록과 공유 링크 미리보기에 사용합니다.</p>
            </div>
          </div>
        </CreateSection>
        <CreateSection id={SECTION_IDS.ROLES} title="2. 배역 관리" description="공연에 등록한 배역 중 모집 분야를 고르고, 이 공고에 적용할 지원 조건을 설정합니다.">
          <CreateError id="posting-create-roles-error" message={formError?.section === "ROLES" ? formError.message : ""} />
          <div className={formError?.section === "ROLES" ? "mt-4" : ""}>
          <PostingRoleSelector roles={roleTemplates} selected={selectedRoles} onChange={(next) => { setSelectedRoles(next); if (Object.keys(next).length < 2) setAllowsMultipleRoles(false); }} />
          <label className={`mt-3 flex min-h-12 items-start gap-3 rounded-card border p-4 ${Object.keys(selectedRoles).length > 1 ? "cursor-pointer border-border bg-card" : "cursor-not-allowed border-border-soft bg-surface text-muted"}`}><input type="checkbox" disabled={Object.keys(selectedRoles).length < 2} checked={allowsMultipleRoles} onChange={(event) => setAllowsMultipleRoles(event.target.checked)} className="mt-0.5 h-5 w-5 accent-brand disabled:opacity-50" /><span><strong className="block text-sm">복수 배역 지원 허용</strong><span className="mt-1 block text-sm text-muted">{Object.keys(selectedRoles).length > 1 ? "한 지원서로 선택한 여러 배역에 함께 지원할 수 있습니다." : "모집 배역을 2개 이상 선택하면 설정할 수 있습니다."}</span></span></label>
          </div>
        </CreateSection>
        <CreateSection id={SECTION_IDS.SCHEDULE} title="3. 일정 및 장소" description="공연 장소는 공연 정보에서 관리하고, 이 공고에는 공연·모집·전형 일정과 연습 장소를 기록합니다.">
          <CreateError id="posting-create-schedule-error" message={formError?.section === "SCHEDULE" ? formError.message : ""} />
          <div className={formError?.section === "SCHEDULE" ? "mt-4" : ""}><CalendarDateRangeField start={performanceStart} end={performanceEnd} onStartChange={setPerformanceStart} onEndChange={setPerformanceEnd} startLabel="공연 시작일" endLabel="공연 종료일" endOptional /></div>
          <div className="mt-4"><CalendarDateRangeField includeTime start={recruitmentStart} end={recruitmentEnd} onStartChange={setRecruitmentStart} onEndChange={setRecruitmentEnd} startLabel="모집 시작" endLabel="모집 종료" /></div>
          <div className="mt-4"><h4 className="mb-2 text-sm font-bold">지원 전형 일정</h4><AuditionScheduleEditor rounds={rounds} onChange={setRounds} /></div>
          <div className="mt-5 border-t border-border-soft pt-5">
            <div className="mb-3"><h4 className="text-sm font-bold">연습 장소 (선택)</h4><p className="mt-1 text-sm text-muted">공연 장소와 다른 연습실을 안내할 때만 입력해 주세요.</p></div>
            <PerformanceVenueField optional venueLabel="연습 장소명" mapLabel="연습 장소 지도" venue={rehearsalVenue} address={rehearsalVenueAddress} onVenueChange={setRehearsalVenue} onAddressChange={setRehearsalVenueAddress} />
          </div>
        </CreateSection>
        <CreateSection id={SECTION_IDS.GUIDE} title="4. 지원 안내" description="준비물, 영상 형식, 유의사항처럼 제출 전에 알아야 할 내용을 적습니다. 최대 2,000자입니다."><CreateError id="posting-create-guide-error" message={formError?.section === "GUIDE" ? formError.message : ""} /><div className={formError?.section === "GUIDE" ? "mt-4" : ""}><FieldTextarea maxLength={2000} value={applicationGuide} onChange={(event) => setApplicationGuide(event.target.value.slice(0, 2000))} placeholder="예: 최근 6개월 이내 촬영한 사진을 제출해 주세요." className="min-h-28 resize-y" /><p className="num mt-2 text-right text-xs text-muted">{applicationGuide.length.toLocaleString("ko-KR")} / 2,000자</p></div></CreateSection>
        <CreateSection title="5. 공고 상세 이미지 (선택)" description="모집 일정, 연습 장소처럼 이미지로 만든 안내를 추가하면 배우가 보는 공고 상세 본문에 표시됩니다.">
          <div className="max-w-[560px]"><PosterUploadField label="공고 상세 이미지" value={detailImageUrl} onChange={setDetailImageUrl} required={false} variant="detail" /></div>
        </CreateSection>
        <CreateSection id={SECTION_IDS.APPLICATION} title="6. 지원 폼" description="기본정보, 추가정보, 사진, 영상과 커스텀 질문을 구성합니다."><CreateError id="posting-create-application-error" message={formError?.section === "APPLICATION" ? formError.message : ""} /><div className={formError?.section === "APPLICATION" ? "mt-4" : ""}><ApplicationFieldEditor fields={applicationFields} onChange={setApplicationFields} /></div></CreateSection>
        <CreateError id="posting-create-error" message={formError?.section === "GENERAL" ? formError.message : ""} />
      </div>
      <DialogFooter><SecondaryButton onClick={onClose}>취소</SecondaryButton><PrimaryButton type="submit" disabled={saving}>{saving ? "추가 중…" : "공고 추가"}</PrimaryButton></DialogFooter>
    </form>}
  </ModalShell>;
}
