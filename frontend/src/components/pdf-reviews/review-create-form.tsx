"use client";

import { useId, useState } from "react";
import { FieldInput, FieldTextarea, PrimaryButton } from "@/components/ui/controls";
import { createPdfReview, isUnauthorized } from "@/features/pdf-reviews/api";
import { parseRoleLines, type ReviewDetail } from "@/features/pdf-reviews/types";

type Props = { readonly onCreated: (review: ReviewDetail) => void; readonly onUnauthorized: () => void };

export function ReviewCreateForm({ onCreated, onUnauthorized }: Props) {
  const id = useId();
  const [title, setTitle] = useState("");
  const [rolesText, setRolesText] = useState("");
  const [errors, setErrors] = useState<{ title?: string; roles?: string }>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  function validate(nextTitle = title, nextRoles = rolesText) {
    const { roles, duplicate } = parseRoleLines(nextRoles);
    return {
      roles,
      errors: {
        title: nextTitle.trim() ? undefined : "심사 제목을 입력해 주세요.",
        roles: !roles.length ? "배역을 한 줄에 하나씩 1개 이상 입력해 주세요."
          : duplicate ? `'${duplicate}' 배역이 두 번 입력되었습니다. 하나만 남겨 주세요.` : undefined,
      },
    };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const checked = validate();
    setErrors(checked.errors); setServerError("");
    if (checked.errors.title || checked.errors.roles) return;
    setBusy(true);
    try {
      const created = await createPdfReview(title.trim(), checked.roles);
      setTitle(""); setRolesText(""); setErrors({});
      onCreated(created);
    } catch (cause) {
      if (isUnauthorized(cause)) onUnauthorized();
      setServerError(cause instanceof Error ? cause.message : "심사를 만들지 못했습니다.");
    } finally { setBusy(false); }
  }

  return <form onSubmit={event => void submit(event)} noValidate aria-label="새 심사 만들기" className="rounded-card border border-border bg-card p-4">
    <h2 className="mb-3 px-1 text-sm font-bold">새 심사 만들기</h2>
    <label htmlFor={`${id}-title`} className="block px-1 text-sm font-semibold">심사 제목</label>
    <FieldInput id={`${id}-title`} value={title} placeholder="예: 뮤지컬 ○○ 1차 서류 심사" autoComplete="off"
      aria-invalid={!!errors.title} aria-describedby={errors.title ? `${id}-title-error` : undefined}
      onChange={event => setTitle(event.target.value)} onBlur={() => setErrors(current => ({ ...current, title: validate().errors.title }))} className="mt-2" />
    {errors.title ? <p id={`${id}-title-error`} className="mt-2 px-1 text-sm text-fail">{errors.title}</p> : null}
    <label htmlFor={`${id}-roles`} className="mt-4 block px-1 text-sm font-semibold">배역</label>
    <p id={`${id}-roles-hint`} className="mt-1 px-1 text-xs leading-5 text-muted-strong">한 줄에 배역 하나씩 입력하세요. 최소 1개가 필요합니다.</p>
    <FieldTextarea id={`${id}-roles`} value={rolesText} rows={5} placeholder={"예:\n엘리자벳\n프란츠 요제프"} autoComplete="off"
      aria-invalid={!!errors.roles} aria-describedby={errors.roles ? `${id}-roles-hint ${id}-roles-error` : `${id}-roles-hint`}
      onChange={event => setRolesText(event.target.value)} onBlur={() => setErrors(current => ({ ...current, roles: validate().errors.roles }))} className="mt-2 resize-y" />
    {errors.roles ? <p id={`${id}-roles-error`} className="mt-2 px-1 text-sm text-fail">{errors.roles}</p> : null}
    {serverError ? <p role="alert" className="mt-3 break-words rounded-control bg-fail-bg p-3 text-sm text-fail">{serverError}</p> : null}
    <PrimaryButton type="submit" disabled={busy} className="mt-4 min-h-12 w-full">{busy ? "만드는 중…" : "심사 만들기"}</PrimaryButton>
  </form>;
}
