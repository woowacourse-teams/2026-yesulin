"use client";

import { useCallback, useState } from "react";
import { deletePosting, getPostingManagement, updatePosting } from "@/features/auditions/api";
import { validateAuditionDates } from "@/features/auditions/audition-date-policy";
import type { AuditionRoundInput } from "@/features/auditions/creation-types";
import { notifyAuditionTreeChanged } from "@/features/auditions/events";
import type { PostingManagementDetail } from "@/features/auditions/management-types";
import type { PostingSummary } from "@/features/auditions/types";
import { errorMessage, useAuditionQuery } from "@/features/auditions/use-audition-query";
import { CreateError, CreateField, CreateSection } from "./create-form";
import { DialogFooter, DialogHeader, ModalShell } from "./modal-shell";
import { AuditionScheduleEditor } from "./posting-form-sections";
import { CalendarDateRangeField } from "./calendar-date-range-field";
import { emptyVenueAddress, PerformanceVenueField } from "./performance-venue-field";
import { DestructiveButton, FieldInput, PrimaryButton, SecondaryButton } from "@/components/ui/controls";

const TITLE_ID = "posting-manage-title";

export function PostingManageDialog({ posting, mode, onClose, onChanged }: {
  readonly posting: PostingSummary;
  readonly mode: "EDIT" | "DELETE";
  readonly onClose: () => void;
  readonly onChanged: () => void;
}) {
  if (mode === "DELETE") return <DeletePostingDialog posting={posting} onClose={onClose} onChanged={onChanged} />;
  return <EditPostingLoader posting={posting} onClose={onClose} onChanged={onChanged} />;
}

function EditPostingLoader({ posting, onClose, onChanged }: Omit<Parameters<typeof PostingManageDialog>[0], "mode">) {
  const load = useCallback(() => getPostingManagement(posting.id), [posting.id]);
  const query = useAuditionQuery(`manage-posting-${posting.id}`, load, "공고 편집 정보를 불러오지 못했습니다.");
  return <ModalShell open onClose={onClose} labelledBy={TITLE_ID} placement="responsiveSheet" className="flex h-[calc(100dvh-8px)] w-full flex-col overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:h-auto md:max-h-[94vh] md:w-[min(780px,95vw)] md:rounded-modal">
    {query.data ? <EditPostingForm detail={query.data} onClose={onClose} onChanged={onChanged} /> : <><DialogHeader id={TITLE_ID} title="공고 수정" subtitle={query.error || "공고 정보를 불러오고 있습니다."} /><div className="min-h-48 animate-pulse bg-border-soft" /><DialogFooter><SecondaryButton onClick={onClose}>닫기</SecondaryButton></DialogFooter></>}
  </ModalShell>;
}

function EditPostingForm({ detail, onClose, onChanged }: { readonly detail: PostingManagementDetail; readonly onClose: () => void; readonly onChanged: () => void }) {
  const started = detail.phase !== "UPCOMING" || detail.applicantCount > 0;
  const [title, setTitle] = useState(detail.title);
  const [recruitmentEnd, setRecruitmentEnd] = useState(detail.recruitmentEnd);
  const [rehearsalVenue, setRehearsalVenue] = useState(detail.rehearsalVenue ?? "");
  const [rehearsalVenueAddress, setRehearsalVenueAddress] = useState(detail.rehearsalVenueAddress ?? emptyVenueAddress());
  const [rounds, setRounds] = useState<readonly AuditionRoundInput[]>(detail.rounds);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 이미 마감된 공고도 수정 대상이라 "모집 종료가 현재보다 이후" 규칙만 빼고 검사한다.
    const dateIssue = validateAuditionDates({ performanceStart: detail.performanceStart, performanceEnd: detail.performanceEnd, recruitmentStart: detail.recruitmentStart, recruitmentEnd, rounds })
      .find((issue) => issue.code !== "RECRUITMENT_END_PAST");
    if (dateIssue) { setFormError(dateIssue.message); return; }
    setSaving(true); setFormError("");
    try {
      await updatePosting(detail.id, { title: title.trim(), recruitmentEnd, rehearsalVenue, rehearsalVenueAddress, rounds });
      notifyAuditionTreeChanged(); onChanged(); onClose();
    } catch (cause) { console.error("[공고 수정 실패]", cause); setFormError(errorMessage(cause, "공고를 수정하지 못했습니다.")); }
    finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
    <DialogHeader id={TITLE_ID} title="공고 수정" subtitle="공고명, 모집 마감, 장소와 전형 일정을 수정할 수 있습니다." />
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 md:px-6">
      {started ? <p className="rounded-card border border-warn-line bg-warn-soft p-4 text-sm leading-6 text-muted-strong">모집이 시작됐거나 첫 지원서가 있어 모집 시작은 잠겼습니다. 모집 종료는 기존 일시보다 뒤로만 연장할 수 있고, 완료된 전형은 수정할 수 없습니다.</p> : null}
      <CreateSection title="공고명" description="지원자에게 표시되는 공고 제목입니다."><CreateField label="공고명"><FieldInput required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 2026 하반기 주·조연 배우 모집" /></CreateField></CreateSection>
      <CreateSection title="공연 일정" description="공연 정보에서 관리합니다."><p className="rounded-control border border-border-soft bg-surface px-4 py-3 text-sm leading-6 text-muted-strong">{detail.performanceStart} {detail.performanceEnd ? `~ ${detail.performanceEnd}` : "~ 오픈런"}</p></CreateSection>
      <CreateSection title="모집 일정" description="공고를 게시한 시각부터 모집이 시작됩니다.">{detail.recruitmentStart ? <p className="mb-4 rounded-control border border-border-soft bg-surface px-4 py-3 text-sm leading-6 text-muted-strong"><strong className="text-foreground">모집 시작</strong><br />{detail.recruitmentStart.replace("T", " ")}</p> : <p className="mb-4 rounded-control border border-border-soft bg-surface px-4 py-3 text-sm leading-6 text-muted-strong">아직 게시 전입니다. 게시하는 시각이 모집 시작 시각으로 저장됩니다.</p>}<CalendarDateRangeField includeTime single start={recruitmentEnd} end="" onStartChange={setRecruitmentEnd} onEndChange={() => undefined} startLabel="모집 마감" /></CreateSection>
      <CreateSection title="연습 장소" description="공연장과 별도로 안내할 연습 장소가 있다면 입력해 주세요."><PerformanceVenueField optional venueLabel="연습 장소명" addressLabel="연습 장소 주소" mapLabel="연습 장소 지도" venue={rehearsalVenue} address={rehearsalVenueAddress} onVenueChange={setRehearsalVenue} onAddressChange={setRehearsalVenueAddress} /></CreateSection>
      <CreateSection title="전형 일정" description="완료된 차수는 잠기고, 아직 진행하지 않은 전형은 최대 5차까지 수정할 수 있습니다. 오디션 장소는 공개 공고에도 표시됩니다."><AuditionScheduleEditor rounds={rounds} onChange={setRounds} lockedRounds={detail.lockedRounds} /></CreateSection>
      <CreateError id="posting-manage-error" message={formError} />
    </div>
    <DialogFooter><SecondaryButton onClick={onClose}>취소</SecondaryButton><PrimaryButton type="submit" disabled={saving}>{saving ? "저장 중…" : "공고 저장"}</PrimaryButton></DialogFooter>
  </form>;
}

function DeletePostingDialog({ posting, onClose, onChanged }: Omit<Parameters<typeof PostingManageDialog>[0], "mode">) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const blocked = posting.applicantCount > 0;
  const remove = async () => { setDeleting(true); setError(""); try { await deletePosting(posting.id); notifyAuditionTreeChanged(); onChanged(); onClose(); } catch (cause) { console.error("[공고 삭제 실패]", cause); setError(errorMessage(cause, "공고를 삭제하지 못했습니다.")); setDeleting(false); } };
  return <ModalShell open onClose={onClose} labelledBy={TITLE_ID} className="w-[min(520px,calc(100vw-32px))] rounded-modal bg-card shadow-[var(--shadow-modal)]"><DialogHeader id={TITLE_ID} title="공고 삭제" subtitle={posting.title} /><div className="px-5 py-6"><p className="leading-7">{blocked ? `배우 ${posting.applicantCount}명의 지원 기록을 보호하기 위해 삭제할 수 없습니다.` : "공고를 삭제하면 공유한 지원 링크도 더 이상 열리지 않습니다. 이 작업은 되돌릴 수 없습니다."}</p>{error ? <p role="alert" className="mt-4 text-sm font-medium text-fail">{error}</p> : null}</div><DialogFooter><SecondaryButton onClick={onClose}>취소</SecondaryButton><DestructiveButton onClick={remove} disabled={blocked || deleting}>{deleting ? "삭제 중…" : "공고 삭제"}</DestructiveButton></DialogFooter></ModalShell>;
}
