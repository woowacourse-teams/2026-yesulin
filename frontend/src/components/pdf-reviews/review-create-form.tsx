"use client";

import { useId, useState } from "react";
import { FieldInput, PrimaryButton } from "@/components/ui/controls";
import { createPdfReview, isUnauthorized } from "@/features/pdf-reviews/api";
import { parseRoleLines, type ReviewDetail } from "@/features/pdf-reviews/types";

import styles from "./screening.module.css";

type Props = { readonly onCreated: (review: ReviewDetail) => void; readonly onUnauthorized: () => void; readonly onBusyChange?: (busy: boolean) => void };

export function ReviewCreateForm({ onCreated, onUnauthorized, onBusyChange }: Props) {
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
        roles: !roles.length ? "배역을 1개 이상 입력해 주세요."
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
    onBusyChange?.(true);
    try {
      const created = await createPdfReview(title.trim(), checked.roles);
      setTitle(""); setRolesText(""); setErrors({});
      onCreated(created);
    } catch (cause) {
      if (isUnauthorized(cause)) onUnauthorized();
      setServerError(cause instanceof Error ? cause.message : "심사를 만들지 못했습니다.");
    } finally { setBusy(false); onBusyChange?.(false); }
  }

  return <form onSubmit={event => void submit(event)} noValidate aria-label="새 심사함 만들기" className={styles.create}>
    <label htmlFor={`${id}-title`} className="block px-1 text-sm font-semibold">심사함 이름</label>
    <FieldInput id={`${id}-title`} value={title} placeholder="예: 드림스쿨 배우 오디션" autoComplete="off" data-autofocus="true" disabled={busy}
      aria-invalid={!!errors.title} aria-describedby={errors.title ? `${id}-title-error` : undefined}
      onChange={event => setTitle(event.target.value)} onBlur={() => setErrors(current => ({ ...current, title: validate().errors.title }))} className="mt-2" />
    {errors.title ? <p id={`${id}-title-error`} className="mt-2 px-1 text-sm text-fail">{errors.title}</p> : null}
    <label htmlFor={`${id}-roles`} className="mt-4 block px-1 text-sm font-semibold">모집 배역</label>
    <FieldInput id={`${id}-roles`} value={rolesText} placeholder="예: 예린, 허징, 진방글, 앙상블" autoComplete="off" disabled={busy}
      aria-invalid={!!errors.roles} aria-describedby={errors.roles ? `${id}-roles-error` : undefined}
      onChange={event => setRolesText(event.target.value)} onBlur={() => setErrors(current => ({ ...current, roles: validate().errors.roles }))} className="mt-2 resize-y" />
    {errors.roles ? <p id={`${id}-roles-error`} className="mt-2 px-1 text-sm text-fail">{errors.roles}</p> : null}
    {serverError ? <p role="alert" className="mt-3 break-words rounded-control bg-fail-bg p-3 text-sm text-fail">{serverError}</p> : null}
    <PrimaryButton type="submit" disabled={busy} className={`${styles.primary} ${styles.createSubmit}`}>{busy ? "만드는 중…" : <>심사함 만들기<span aria-hidden="true">→</span></>}</PrimaryButton>
  </form>;
}
