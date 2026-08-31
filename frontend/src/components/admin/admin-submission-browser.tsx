"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteAdminSubmission,
  fetchAdminSubmission,
  fetchAdminSubmissions,
} from "@/features/admin/api";
import type {
  AdminAudition,
  AdminSubmissionDetail,
  AdminSubmissionSummary,
} from "@/features/admin/types";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { formatDateTime, orDash } from "./admin-format";

type Props = {
  readonly audition: AdminAudition;
  readonly onDeleted: () => void;
};

export function AdminSubmissionBrowser({ audition, onDeleted }: Props) {
  const [submissions, setSubmissions] = useState<readonly AdminSubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminSubmissionDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailRequestSequence = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSubmissions(await fetchAdminSubmissions(audition.auditionId));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "지원서 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [audition.auditionId]);

  useEffect(() => {
    let active = true;
    fetchAdminSubmissions(audition.auditionId)
      .then((next) => {
        if (!active) return;
        setSubmissions(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "지원서 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [audition.auditionId]);

  async function openDetail(submissionId: string) {
    const requestSequence = ++detailRequestSequence.current;
    setSelectedId(submissionId);
    setDetail(null);
    setDetailError(null);
    try {
      const response = await fetchAdminSubmission(submissionId);
      if (detailRequestSequence.current === requestSequence) setDetail(response);
    } catch (cause) {
      if (detailRequestSequence.current === requestSequence) {
        setDetailError(cause instanceof Error ? cause.message : "지원서 상세를 불러오지 못했습니다.");
      }
    }
  }

  function closeDetail() {
    detailRequestSequence.current += 1;
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
  }

  async function handleDeleted() {
    closeDetail();
    await load();
    onDeleted();
  }

  if (loading) return <p role="status" className="px-4 py-5 text-sm text-neutral-500">지원서를 불러오는 중입니다.</p>;
  if (error) return <div className="flex items-center gap-3 px-4 py-5"><p role="alert" className="text-sm text-red-600">{error}</p><button type="button" onClick={() => void load()} className="rounded border border-neutral-300 px-3 py-1 text-sm">다시 시도</button></div>;

  return (
    <div className="bg-neutral-50 px-3 py-4 sm:px-5">
      {submissions.length === 0 ? <p className="py-3 text-center text-sm text-neutral-500">이 공고에 제출된 지원서가 없습니다.</p> : null}
      <div className="grid gap-2">
        {submissions.map((submission) => (
          <article key={submission.submissionId} className="grid gap-3 rounded border border-neutral-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <strong className="text-sm text-neutral-900">{orDash(submission.applicantName)}</strong>
                <span className="text-xs text-neutral-500">{submission.selectedRoles.map((role) => role.roleName).join(" · ")}</span>
              </div>
              <p className="mt-1 break-all text-xs text-neutral-500">{orDash(submission.applicantEmail)} · {orDash(submission.applicantPhone)}</p>
              <p className="mt-1 font-mono text-[11px] text-neutral-400">{submission.submissionId} · {formatDateTime(submission.submittedAt)}</p>
            </div>
            <button type="button" onClick={() => void openDetail(submission.submissionId)} className="min-h-11 rounded border border-neutral-300 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50">상세 및 삭제</button>
          </article>
        ))}
      </div>
      <AdminSubmissionDialog
        open={selectedId !== null}
        submissionId={selectedId}
        detail={detail}
        error={detailError}
        onClose={closeDetail}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

function AdminSubmissionDialog({ open, submissionId, detail, error, onClose, onDeleted }: {
  readonly open: boolean;
  readonly submissionId: string | null;
  readonly detail: AdminSubmissionDetail | null;
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onDeleted: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const matchingDetail = detail?.submissionId === submissionId ? detail : null;

  function close() {
    if (deleting) return;
    setConfirming(false);
    setPassword("");
    setDeleteError(null);
    onClose();
  }

  async function confirmDelete() {
    if (!submissionId || !password || matchingDetail === null) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAdminSubmission(submissionId, password);
      setPassword("");
      await onDeleted();
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "지원서를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ModalShell open={open} onClose={close} labelledBy="admin-submission-title" placement="responsiveSheet" className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl md:w-[min(900px,calc(100vw-48px))] md:rounded-2xl">
      <DialogHeader id="admin-submission-title" title={confirming ? "지원서 삭제 확인" : "지원서 상세"} subtitle={confirming ? "이 작업은 지원서와 심사 기록을 즉시 삭제합니다." : "제출 당시 저장된 읽기 전용 스냅샷입니다."} />
      <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        {!detail && !error ? <p role="status" className="py-12 text-center text-sm text-neutral-500">상세를 불러오는 중입니다.</p> : null}
        {matchingDetail && !confirming ? <SubmissionDetailContent detail={matchingDetail} /> : null}
        {matchingDetail && confirming ? <DeleteConfirmation detail={matchingDetail} password={password} error={deleteError} disabled={deleting} onPasswordChange={setPassword} /> : null}
      </div>
      <DialogFooter>
        <button type="button" data-autofocus={confirming ? undefined : "true"} onClick={confirming ? () => { setConfirming(false); setPassword(""); setDeleteError(null); } : close} disabled={deleting} className="min-h-11 rounded border border-neutral-300 px-4 text-sm font-medium text-neutral-700">{confirming ? "돌아가기" : "닫기"}</button>
        {matchingDetail && !confirming ? <button type="button" onClick={() => setConfirming(true)} className="min-h-11 rounded bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700">이 지원서 삭제</button> : null}
        {matchingDetail && confirming ? <button type="button" onClick={() => void confirmDelete()} disabled={!password || deleting} className="min-h-11 rounded bg-red-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{deleting ? "삭제 중…" : "비밀번호 확인 후 삭제"}</button> : null}
      </DialogFooter>
    </ModalShell>
  );
}

function DeleteConfirmation({ detail, password, error, disabled, onPasswordChange }: {
  readonly detail: AdminSubmissionDetail;
  readonly password: string;
  readonly error: string | null;
  readonly disabled: boolean;
  readonly onPasswordChange: (value: string) => void;
}) {
  const name = detail.applicant.basicInformation.name;
  return <div className="space-y-5"><div className="rounded border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"><strong className="block">삭제 대상</strong><span>{detail.auditionTitle} · {orDash(name)}</span><code className="mt-2 block break-all text-xs">{detail.submissionId}</code><p className="mt-3">지원서·동의·심사 기록과 파일 연결이 삭제됩니다. S3 파일 원본은 보존됩니다.</p></div><label htmlFor="admin-deletion-password" className="block"><span className="mb-2 block text-sm font-semibold text-neutral-800">별도 삭제 확인 비밀번호</span><input id="admin-deletion-password" data-autofocus="true" type="password" autoComplete="off" value={password} disabled={disabled} onChange={(event) => onPasswordChange(event.target.value)} className="min-h-12 w-full rounded border border-neutral-300 px-3 text-base outline-none focus:border-neutral-900" /></label>{error ? <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}</div>;
}

function SubmissionDetailContent({ detail }: { readonly detail: AdminSubmissionDetail }) {
  const basic = detail.applicant.basicInformation;
  const additional = detail.applicant.additionalInformation;
  const basicRows = [["이름", basic.name], ["이메일", basic.email], ["연락처", basic.phone], ["생년월일", basic.birthDate], ["마감일 기준 나이", detail.applicant.ageAtRecruitmentDeadline === null ? null : `${detail.applicant.ageAtRecruitmentDeadline}세`], ["성별", basic.gender === "MALE" ? "남성" : basic.gender === "FEMALE" ? "여성" : null], ["키 / 몸무게", basic.height || basic.weight ? `${basic.height ?? "-"}cm / ${basic.weight ?? "-"}kg` : null], ["주소", basic.address]] as const;
  const militaryService = additional.militaryServiceStatus === "COMPLETED" ? "군필" : additional.militaryServiceStatus === "NOT_COMPLETED" ? "미필" : additional.militaryServiceStatus === "NOT_APPLICABLE" ? "해당 없음" : null;
  return <div className="space-y-5"><section><p className="text-xs font-semibold text-neutral-500">{detail.companyName}</p><h3 className="mt-1 text-xl font-bold text-neutral-900">{detail.performanceTitle} · {detail.auditionTitle}</h3><p className="mt-2 text-sm text-neutral-500">{detail.selectedRoles.map((role) => role.roleName).join(" · ")} · {formatDateTime(detail.submittedAt)} 제출</p><code className="mt-2 block break-all text-xs text-neutral-400">{detail.submissionId}</code></section><DetailSection title="기본 정보"><dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2">{basicRows.map(([label, value]) => <div key={label}><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-neutral-900">{orDash(value)}</dd></div>)}</dl></DetailSection><DetailSection title="추가 정보"><dl className="space-y-3"><DetailRow label="학교" value={additional.school} /><DetailRow label="국적" value={additional.nationality} /><DetailRow label="병역" value={militaryService} /><DetailRow label="특기 / 취미" value={[additional.specialty, additional.hobbies].filter(Boolean).join(" · ")} /><DetailRow label="자기소개" value={additional.coverLetter} /><DetailRow label="링크" value={additional.links.join("\n")} /><DetailRow label="경력" value={additional.careers.map((career) => `${career.year} · ${career.title} · ${career.roleName}`).join("\n")} /></dl></DetailSection><DetailSection title="추가 질문">{detail.formAnswers.questionAnswers.length ? <dl className="space-y-4">{detail.formAnswers.questionAnswers.map((answer) => <DetailRow key={answer.questionId} label={answer.question} value={answer.answer} />)}</dl> : <EmptyValue />}</DetailSection><DetailSection title="제출 사진과 영상">{detail.formAnswers.photoRequirementAnswers.length ? <div className="flex flex-wrap gap-3">{detail.formAnswers.photoRequirementAnswers.map((photo) => <figure key={`${photo.photoRequirementId}-${photo.fileId}`}><Image src={photo.url} alt={photo.requirementDescription} width={120} height={160} unoptimized className="h-40 w-[120px] rounded border border-neutral-200 object-cover" /><figcaption className="mt-1 max-w-[120px] text-xs text-neutral-500">{photo.requirementDescription}</figcaption></figure>)}</div> : null}{detail.formAnswers.videoRequirementAnswers.map((video) => <a key={video.videoRequirementId} href={video.url} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm text-blue-700 underline">{video.requirementDescription}: {video.url}</a>)}{!detail.formAnswers.photoRequirementAnswers.length && !detail.formAnswers.videoRequirementAnswers.length ? <EmptyValue /> : null}</DetailSection><DetailSection title="동의 기록">{detail.consents.length ? <dl className="space-y-4">{detail.consents.map((consent) => <DetailRow key={consent.type} label={`${consent.type} · ${consent.documentVersion}`} value={`${consent.recipientName ? `${consent.recipientName} · ` : ""}${formatDateTime(consent.agreedAt)}`} />)}</dl> : <EmptyValue />}</DetailSection></div>;
}

function DetailSection({ title, children }: { readonly title: string; readonly children: React.ReactNode }) { return <section className="rounded border border-neutral-200 p-4"><h4 className="mb-4 text-sm font-semibold text-neutral-700">{title}</h4>{children}</section>; }
function DetailRow({ label, value }: { readonly label: string; readonly value: string | null }) { return <div><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-900">{orDash(value)}</dd></div>; }
function EmptyValue() { return <p className="text-sm text-neutral-400">제출된 내용이 없습니다.</p>; }
