"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AuditionPostScreen } from "@/components/audition-posts/audition-post-screen";
import { FieldInput, FieldTextarea, PrimaryButton, SecondaryLink } from "@/components/ui/controls";
import { getCompany, requestCompanyEdit, uploadCompanyRequestPhoto } from "@/features/companies/api";
import {
  changedFields,
  COMPANY_FIELD_LABELS,
  draftOf,
  undecidedFields,
  writeOf,
  type CompanyDraft,
} from "@/features/companies/profile-draft";
import { COMPANY_CORRECTION_URL, companyRoutes, type Company } from "@/features/companies/types";
import { CompanyProfileFields } from "./company-profile-fields";

const MAX_REASON_LENGTH = 1000;
const MAX_CONTACT_LENGTH = 100;

type RequestState =
  | { readonly status: "loading" }
  | { readonly status: "missing" }
  | { readonly status: "ready"; readonly company: Company }
  | { readonly status: "sent"; readonly company: Company };

/**
 * 공개된 공연사 정보의 수정 요청. 누구나 지금 공개 정보를 고쳐 보내고, 운영자가 확인한 뒤 반영한다.
 * 공개되지 않은 항목은 "비공개"로 체크된 채 시작하고, 바꾼 항목만 운영자에게 전한다.
 */
export function CompanyEditRequestRoute({ companyId }: { readonly companyId: string }) {
  const [state, setState] = useState<RequestState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    getCompany(companyId)
      .then((company) => { if (active) setState({ status: "ready", company }); })
      .catch((cause) => {
        console.error("[공연사 조회 실패]", cause);
        if (active) setState({ status: "missing" });
      });
    return () => { active = false; };
  }, [companyId]);

  return (
    <AuditionPostScreen>
      {state.status === "loading" ? <p role="status" className="mt-6 text-sm text-muted">공연사 정보를 불러오는 중이에요.</p> : null}
      {state.status === "missing" ? <MissingCompany /> : null}
      {state.status === "ready" ? (
        <EditRequestForm company={state.company} onSent={() => setState({ status: "sent", company: state.company })} />
      ) : null}
      {state.status === "sent" ? <RequestSent company={state.company} /> : null}
    </AuditionPostScreen>
  );
}

/** 공개 화면에 보이는 정보로 입력 칸을 채운다. 공개되지 않은 항목은 비공개로 체크해 둔다. */
function initialDraft(company: Company): CompanyDraft {
  return draftOf({
    ...company,
    representativeNamePublic: company.representativeName !== null,
    addressPublic: company.address !== null,
    region: company.address ? null : company.location,
  });
}

function EditRequestForm({ company, onSent }: { readonly company: Company; readonly onSent: () => void }) {
  const [initial] = useState(() => initialDraft(company));
  const [draft, setDraft] = useState(initial);
  const [reason, setReason] = useState("");
  const [contact, setContact] = useState("");
  const [checked, setChecked] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const undecided = new Set(checked ? undecidedFields(draft) : []);
  const reasonMissing = checked && !reason.trim();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChecked(true);
    const changed = changedFields(initial, draft);
    const missing = undecidedFields(draft);
    if (!draft.name.trim()) return setError("공연사 이름을 입력해 주세요.");
    if (missing.length) {
      return setError(`${missing.map((field) => COMPANY_FIELD_LABELS[field]).join(", ")}: 값을 적거나 비공개를 체크해 주세요.`);
    }
    if (!changed.length) return setError("바꾼 항목이 없어요. 고칠 내용을 입력해 주세요.");
    if (!reason.trim()) return setError("요청 사유를 적어 주세요.");
    setSending(true);
    setError(null);
    try {
      await requestCompanyEdit(company.id, {
        company: writeOf(draft),
        changedFields: changed,
        reason: reason.trim(),
        contact: contact.trim(),
        photoUploadKey: changed.includes("PHOTO") ? draft.photoUploadKey : null,
      });
      onSent();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "수정 요청을 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="mt-3 space-y-4">
      <header className="rounded-card border border-border bg-card px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-sm font-semibold text-brand">공연사 정보 수정 요청</p>
        <h1 className="mt-2 text-[clamp(22px,3vw,28px)] font-bold leading-snug tracking-[-0.03em]">{company.name}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-strong">
          지금 공개된 정보가 채워져 있어요. 틀린 곳을 고치거나 빠진 정보를 넣어 보내 주세요. 운영자가 사실을 확인한 뒤 반영해요.
          공개하고 싶지 않은 항목은 &quot;비공개&quot;를 체크해 주세요.
        </p>
      </header>

      <section aria-label="공연사 정보" className="rounded-card border border-border bg-card px-5 py-6 sm:px-8">
        <CompanyProfileFields
          draft={draft}
          onChange={setDraft}
          undecided={undecided}
          mode="request"
          uploadPhoto={async (photo) => ({
            uploadKey: await uploadCompanyRequestPhoto(company.id, photo),
            // 운영자가 적용하기 전에는 공개 주소가 없으므로 고른 사진을 이 화면에서만 미리 보여 준다.
            url: URL.createObjectURL(photo),
          })}
        />
      </section>

      <section aria-label="요청 내용" className="flex flex-col gap-4 rounded-card border border-border bg-card px-5 py-6 sm:px-8">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="edit-request-reason" className="text-sm font-semibold">
            요청 사유<span className="ml-1 text-fail" aria-hidden="true">*</span>
          </label>
          <FieldTextarea
            id="edit-request-reason"
            rows={3}
            value={reason}
            maxLength={MAX_REASON_LENGTH}
            required
            aria-invalid={reasonMissing || undefined}
            placeholder="예: 공연사 대표입니다. 2024년에 사무실을 옮겼어요. 공식 홈페이지에 새 주소가 있어요."
            onChange={(event) => setReason(event.target.value)}
          />
          <p className="text-xs text-muted">무엇을 왜 고치는지, 확인할 수 있는 근거가 있으면 함께 적어 주세요.</p>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="edit-request-contact" className="text-sm font-semibold">
            연락처<span className="ml-1 text-xs font-normal text-muted">선택</span>
          </label>
          <FieldInput
            id="edit-request-contact"
            value={contact}
            maxLength={MAX_CONTACT_LENGTH}
            autoComplete="email"
            placeholder="이메일이나 전화번호"
            onChange={(event) => setContact(event.target.value)}
          />
          <p className="text-xs text-muted">확인이 필요할 때만 연락드려요. 요청을 처리하면 연락처는 지워요.</p>
        </div>
      </section>

      {error ? <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href={COMPANY_CORRECTION_URL} target="_blank" rel="noreferrer" className="text-xs font-semibold text-muted-strong underline underline-offset-2 hover:text-brand">
          정보를 아예 내리고 싶다면 카카오톡 채널로 알려 주세요<span className="sr-only"> 새 창</span>
        </a>
        <div className="flex flex-wrap gap-2">
          <SecondaryLink href={companyRoutes.detail(company.id)}>취소</SecondaryLink>
          <PrimaryButton type="submit" disabled={sending}>{sending ? "보내는 중…" : "수정 요청 보내기"}</PrimaryButton>
        </div>
      </div>
    </form>
  );
}

function RequestSent({ company }: { readonly company: Company }) {
  return (
    <section role="status" className="mt-3 rounded-card border border-border bg-card px-6 py-14 text-center">
      <h1 className="text-lg font-bold">수정 요청을 보냈어요</h1>
      <p className="mt-2 text-sm leading-6 text-muted-strong">운영자가 내용을 확인한 뒤 공연사 정보에 반영해요.</p>
      <Link
        href={companyRoutes.detail(company.id)}
        className="mt-4 inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
      >
        {company.name} 정보로 돌아가기
      </Link>
    </section>
  );
}

function MissingCompany() {
  return (
    <section className="mt-3 rounded-card border border-border bg-card px-6 py-14 text-center">
      <h1 className="text-lg font-bold">공연사 정보를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm text-muted-strong">아직 공개하지 않았거나 주소가 바뀌었을 수 있어요.</p>
    </section>
  );
}
