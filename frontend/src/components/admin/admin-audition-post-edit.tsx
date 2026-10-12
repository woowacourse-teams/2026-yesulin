"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { BodyEditorLoading } from "@/components/audition-posts/editor/body-editor-loading";
import { FieldInput, FieldSelect, PrimaryButton } from "@/components/ui/controls";
import { AdminApiError, fetchAuditionPostForEdit, updateAuditionPost } from "@/features/admin/api";
import { adminAuditionPostRoutes, parseTags } from "@/features/admin/audition-posts";
import type { AdminAuditionPostDetail } from "@/features/admin/types";
import { formatFileSize } from "@/features/audition-posts/format";
import { AUDITION_POST_CATEGORIES, auditionPostRoutes } from "@/features/audition-posts/types";
import { formatDateTime } from "./admin-format";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminActionLink, AdminShell } from "./admin-shell";

// 편집기는 브라우저에서만 그리고, 수정 화면에 들어왔을 때만 불러온다.
const AuditionPostBodyEditor = dynamic(
  () => import("@/components/audition-posts/editor/audition-post-body-editor").then((module) => module.AuditionPostBodyEditor),
  { ssr: false, loading: () => <BodyEditorLoading /> },
);

type Phase = "loading" | "ready" | "missing" | "failed" | "unauthorized";

type Form = {
  readonly category: string;
  readonly title: string;
  readonly pay: string;
  readonly deadlineText: string;
  readonly authorName: string;
  readonly tags: string;
};

type FieldName = keyof Form;
type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_IDS: Record<FieldName, string> = {
  category: "post-category",
  title: "post-title",
  pay: "post-pay",
  deadlineText: "post-deadline",
  authorName: "post-author",
  tags: "post-tags",
};

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 50;

function toForm(post: AdminAuditionPostDetail): Form {
  return {
    category: post.category,
    title: post.title,
    pay: post.pay,
    deadlineText: post.deadlineText,
    authorName: post.authorName,
    tags: post.tags.join(", "),
  };
}

/** 서버 도메인 검증과 같은 기준을 먼저 확인해 한 번에 모두 알려 준다. */
function validate(form: Form): FieldErrors {
  const errors: FieldErrors = {};
  const tags = parseTags(form.tags);
  if (!AUDITION_POST_CATEGORIES.some((category) => category === form.category)) errors.category = "분류를 골라 주세요.";
  if (!form.title.trim()) errors.title = "제목을 입력해 주세요.";
  else if (form.title.trim().length > 300) errors.title = "제목은 300자 이하로 써 주세요.";
  if (form.pay.trim().length > 200) errors.pay = "페이는 200자 이하로 써 주세요.";
  if (form.deadlineText.trim().length > 50) errors.deadlineText = "마감은 50자 이하로 써 주세요.";
  if (form.authorName.trim().length > 100) errors.authorName = "작성자는 100자 이하로 써 주세요.";
  if (tags.length > MAX_TAGS) errors.tags = `태그는 ${MAX_TAGS}개까지 넣을 수 있어요.`;
  else if (tags.some((tag) => tag.length > MAX_TAG_LENGTH)) errors.tags = `태그 하나는 ${MAX_TAG_LENGTH}자 이하로 써 주세요.`;
  return errors;
}

/**
 * 운영자가 가져온 공고의 분류·제목·페이·마감·작성자·태그·본문을 고친다. 본문 사진과 첨부는 빼기만 할 수 있다.
 * 본문을 건드리지 않으면 원래 본문을 그대로 두도록 본문 없이 저장한다.
 */
export function AdminAuditionPostEdit({ postId }: { readonly postId: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [post, setPost] = useState<AdminAuditionPostDetail | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [bodyHtml, setBodyHtml] = useState<string | null>(null);
  const [removedAttachments, setRemovedAttachments] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reset = useCallback((next: AdminAuditionPostDetail) => {
    setPost(next);
    setForm(toForm(next));
    setBodyHtml(null);
    setRemovedAttachments(new Set());
    setErrors({});
  }, []);

  useEffect(() => {
    let active = true;
    fetchAuditionPostForEdit(postId)
      .then((next) => {
        if (!active) return;
        reset(next);
        setPhase("ready");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          setPhase("unauthorized");
          return;
        }
        if (cause instanceof AdminApiError && cause.status === 404) {
          setPhase("missing");
          return;
        }
        setLoadError(cause instanceof Error ? cause.message : "공고를 불러오지 못했습니다.");
        setPhase("failed");
      });
    return () => { active = false; };
  }, [postId, reloadToken, reset]);

  const dirty = useMemo(() => {
    if (!post || !form) return false;
    const original = toForm(post);
    return bodyHtml !== null
      || removedAttachments.size > 0
      || (Object.keys(original) as FieldName[]).some((name) => original[name] !== form[name]);
  }, [post, form, bodyHtml, removedAttachments]);

  // 저장하지 않은 수정이 있으면 새로고침·창 닫기 전에 브라우저가 한 번 묻는다.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (phase === "unauthorized") return <AdminSessionEnded />;

  const update = (name: FieldName, value: string) => {
    setForm((current) => current ? { ...current, [name]: value } : current);
    setErrors((current) => ({ ...current, [name]: undefined }));
    setSaved(false);
  };

  const toggleAttachment = (url: string) => {
    setRemovedAttachments((current) => {
      const next = new Set(current);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
    setSaved(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!post || !form) return;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    const firstInvalid = (Object.keys(FIELD_IDS) as FieldName[]).find((name) => nextErrors[name]);
    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus();
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    let updated = false;
    try {
      await updateAuditionPost(postId, {
        category: form.category,
        title: form.title.trim(),
        pay: form.pay.trim(),
        deadlineText: form.deadlineText.trim(),
        authorName: form.authorName.trim(),
        bodyHtml,
        tags: parseTags(form.tags),
        attachmentUrls: post.attachments.map((attachment) => attachment.url).filter((url) => !removedAttachments.has(url)),
      });
      updated = true;
      reset(await fetchAuditionPostForEdit(postId));
      setSaved(true);
    } catch (cause) {
      if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
        setPhase("unauthorized");
        return;
      }
      setSaveError(updated
        ? "저장했지만 저장된 내용을 다시 불러오지 못했어요. 새로고침해 주세요."
        : cause instanceof Error ? cause.message : "공고를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      current="posts"
      title="공고 고치기"
      description="가져온 공고의 내용을 고쳐요. 공개 상태는 바뀌지 않고, 공개 중인 공고는 저장하면 바로 반영돼요. 고친 공고를 원문으로 다시 가져오면 고친 내용이 원문으로 돌아가요."
      actions={<AdminActionLink href={adminAuditionPostRoutes.list}>목록으로</AdminActionLink>}
    >
      {phase === "loading" ? <p role="status" className="text-sm text-muted">공고를 불러오는 중이에요.</p> : null}
      {phase === "missing" ? (
        <p className="rounded-card border border-border bg-card px-4 py-8 text-center text-sm text-muted">
          공고를 찾을 수 없어요. <Link href={adminAuditionPostRoutes.list} className="font-semibold text-brand underline underline-offset-2">목록으로 돌아가기</Link>
        </p>
      ) : null}
      {phase === "failed" ? (
        <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">
          {loadError} <button type="button" onClick={() => setReloadToken((value) => value + 1)} className="font-semibold underline">다시 시도</button>
        </p>
      ) : null}

      {phase === "ready" && post && form ? (
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <PostSummary post={post} />

          <section aria-labelledby="post-fields" className="rounded-card border border-border bg-card p-4 sm:p-5">
            <h2 id="post-fields" className="text-base font-bold">기본 정보</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field name="category" label="분류" error={errors.category}>
                <FieldSelect
                  id={FIELD_IDS.category}
                  value={form.category}
                  onChange={(event) => update("category", event.target.value)}
                  aria-invalid={errors.category ? true : undefined}
                  aria-describedby={errors.category ? `${FIELD_IDS.category}-error` : undefined}
                >
                  {AUDITION_POST_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </FieldSelect>
              </Field>
              <TextField name="authorName" label="작성자" form={form} error={errors.authorName} onChange={update} />
              <div className="sm:col-span-2">
                <TextField name="title" label="제목" form={form} error={errors.title} onChange={update} />
              </div>
              <TextField name="pay" label="페이" form={form} error={errors.pay} onChange={update} hint="'협의'처럼 원문 표현 그대로 써도 돼요." />
              <TextField
                name="deadlineText"
                label="마감"
                form={form}
                error={errors.deadlineText}
                onChange={update}
                hint="2026-10-31처럼 쓰면 그날까지 모집 중으로 계산해요. '상시'처럼 써도 돼요."
              />
              <div className="sm:col-span-2">
                <TextField name="tags" label="태그" form={form} error={errors.tags} onChange={update} hint={`쉼표로 나눠 주세요. ${MAX_TAGS}개까지 넣을 수 있어요.`} />
              </div>
            </div>
          </section>

          <section aria-labelledby="post-body-label" className="rounded-card border border-border bg-card p-4 sm:p-5">
            <h2 id="post-body-label" className="text-base font-bold">본문</h2>
            <p id="post-body-hint" className="mt-1 text-sm text-muted">
              본문 사진은 지울 수만 있어요. 다른 사이트의 사진을 붙여 넣으면 저장할 때 빠져요.
              {bodyHtml === null ? " 본문을 고치지 않으면 지금 본문을 그대로 둬요." : " 본문을 고쳤어요."}
            </p>
            <div className="mt-3">
              <AuditionPostBodyEditor
                key={post.updatedAt}
                id="post-body"
                labelledBy="post-body-label"
                describedBy="post-body-hint"
                initialHtml={post.bodyHtml}
                onChange={(html) => { setBodyHtml(html); setSaved(false); }}
              />
            </div>
          </section>

          <AttachmentList post={post} removed={removedAttachments} onToggle={toggleAttachment} />

          <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-surface/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:-mx-8 lg:px-8">
            <PrimaryButton type="submit" disabled={saving || !dirty} className="min-h-12 px-6">
              {saving ? "저장하는 중…" : "저장"}
            </PrimaryButton>
            <p role="status" className="text-sm text-muted-strong">
              {saved ? "저장했어요." : dirty ? "저장하지 않은 수정이 있어요." : "아직 고친 내용이 없어요."}
            </p>
            {saveError ? <p role="alert" className="w-full text-sm text-fail">{saveError}</p> : null}
          </div>
        </form>
      ) : null}
    </AdminShell>
  );
}

function PostSummary({ post }: { readonly post: AdminAuditionPostDetail }) {
  return (
    <section aria-label="공고 출처와 상태" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-border bg-card px-4 py-3 text-sm sm:px-5">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${post.status === "PUBLISHED" ? "bg-pass-bg text-pass" : "bg-border-soft text-muted-strong"}`}>
        {post.status === "PUBLISHED" ? "공개 중" : "숨김"}
      </span>
      <span className="num text-muted">{post.source} {post.externalId}</span>
      <span className="text-muted">{post.editedAt ? `마지막 수정 ${formatDateTime(post.editedAt)}` : "고친 적 없음"}</span>
      <span className="ml-auto flex flex-wrap gap-3">
        <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline underline-offset-2">원문</a>
        {post.status === "PUBLISHED" ? (
          <Link href={auditionPostRoutes.detail(post.id)} target="_blank" className="font-semibold text-brand underline underline-offset-2">공개 화면</Link>
        ) : null}
      </span>
    </section>
  );
}

function AttachmentList({ post, removed, onToggle }: {
  readonly post: AdminAuditionPostDetail;
  readonly removed: ReadonlySet<string>;
  readonly onToggle: (url: string) => void;
}) {
  return (
    <section aria-labelledby="post-attachments" className="rounded-card border border-border bg-card p-4 sm:p-5">
      <h2 id="post-attachments" className="text-base font-bold">
        첨부파일 <span className="num text-muted">{post.attachments.length}</span>
      </h2>
      {post.attachments.length === 0 ? <p className="mt-2 text-sm text-muted">첨부파일이 없어요.</p> : (
        <ul className="mt-3 flex flex-col gap-2">
          {post.attachments.map((attachment) => {
            const isRemoved = removed.has(attachment.url);
            return (
              <li key={attachment.url} className={`flex min-h-12 flex-wrap items-center gap-3 rounded-control border px-4 py-2 text-sm ${isRemoved ? "border-fail/30 bg-fail-bg" : "border-border bg-surface"}`}>
                <a href={attachment.url} download={attachment.name} className={`min-w-0 flex-1 break-all font-semibold ${isRemoved ? "text-muted line-through" : "hover:text-brand"}`}>
                  {attachment.name}
                </a>
                <span className="num shrink-0 text-xs text-muted">{formatFileSize(attachment.size)}</span>
                {isRemoved ? <span className="shrink-0 text-xs font-semibold text-fail">저장하면 지워져요</span> : null}
                <button
                  type="button"
                  aria-pressed={isRemoved}
                  aria-label={`${attachment.name} ${isRemoved ? "빼기 취소" : "빼기"}`}
                  onClick={() => onToggle(attachment.url)}
                  className="min-h-11 shrink-0 rounded-control border border-border bg-card px-3 text-sm font-semibold text-muted-strong hover:border-brand-line hover:text-brand"
                >
                  {isRemoved ? "되살리기" : "빼기"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Field({ name, label, hint, error, children }: {
  readonly name: FieldName;
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly children: ReactNode;
}) {
  const id = FIELD_IDS[name];
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      {children}
      {error ? <p id={`${id}-error`} className="text-sm text-fail">{error}</p> : null}
      {!error && hint ? <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function TextField({ name, label, hint, form, error, onChange }: {
  readonly name: Exclude<FieldName, "category">;
  readonly label: string;
  readonly hint?: string;
  readonly form: Form;
  readonly error?: string;
  readonly onChange: (name: FieldName, value: string) => void;
}) {
  const id = FIELD_IDS[name];
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <Field name={name} label={label} hint={hint} error={error}>
      <FieldInput
        id={id}
        value={form[name]}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
      />
    </Field>
  );
}
