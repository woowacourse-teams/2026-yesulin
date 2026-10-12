"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { DestructiveButton, FieldInput, FieldSelect, PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import {
  AUDITION_POST_ATTACHMENT_EXTENSIONS,
  checkAuditionPostFile,
  parseTags,
  type AuditionPostFileKind,
  type AuditionPostWrite,
  type EditableAuditionPost,
  type UploadAuditionPostFile,
} from "@/features/audition-posts/editing";
import { formatFileSize } from "@/features/audition-posts/format";
import { AUDITION_POST_CATEGORIES } from "@/features/audition-posts/types";
import { BodyEditorLoading } from "./body-editor-loading";

// 편집기는 브라우저에서만 그리고, 작성·수정 화면에 들어왔을 때만 불러온다.
const AuditionPostBodyEditor = dynamic(
  () => import("./audition-post-body-editor").then((module) => module.AuditionPostBodyEditor),
  { ssr: false, loading: () => <BodyEditorLoading /> },
);

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

type FormAttachment = {
  readonly name: string;
  readonly size: number;
  readonly url: string;
  /** 이번에 새로 올린 첨부. 빼면 목록에서 바로 사라지고, 저장하지 않으면 서버가 하루 뒤 지운다. */
  readonly uploaded: boolean;
};

const FIELD_IDS: Record<FieldName, string> = {
  category: "post-category",
  title: "post-title",
  pay: "post-pay",
  deadlineText: "post-deadline",
  authorName: "post-author",
  tags: "post-tags",
};

const EMPTY_FORM: Form = { category: "", title: "", pay: "", deadlineText: "", authorName: "", tags: "" };
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 50;
const ATTACHMENT_ACCEPT = AUDITION_POST_ATTACHMENT_EXTENSIONS.map((extension) => `.${extension}`).join(",");

function toForm(post: EditableAuditionPost): Form {
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

/** 업로드는 원인 오류를 `cause`에 담는다. 서버가 거절한 이유(형식·크기)가 있으면 그것을 먼저 보여 준다. */
function uploadErrorMessage(cause: unknown): string {
  const inner = cause instanceof Error ? cause.cause : undefined;
  if (inner instanceof Error && "status" in inner) return inner.message;
  return cause instanceof Error ? cause.message : "파일을 올리지 못했어요. 다시 시도해 주세요.";
}

async function uploadWithReason(upload: UploadAuditionPostFile, kind: AuditionPostFileKind, file: File): Promise<string> {
  try {
    return await upload(kind, file);
  } catch (cause) {
    throw new Error(uploadErrorMessage(cause), { cause });
  }
}

const ACTION_CLASS = "whitespace-nowrap";

/**
 * 운영자와 기획사가 공고를 쓰거나 고치는 폼. 사진은 본문 편집기의 사진 도구로, 첨부는 첨부 목록에서 올린다. 올린 파일은
 * 저장할 때 서버가 이 공고의 파일로 확정한다. 고칠 때 본문을 건드리지 않으면 원래 본문을 그대로 두도록 본문 없이 저장한다.
 * 기획사 공고의 작성자는 서버가 기획사 이름으로 정하므로 기획사 화면에서는 작성자를 고칠 수 없다.
 */
export function AuditionPostForm({ post, notice, submitLabel, createHint, authorEditable = true, fixedAuthorName, uploadFile, onSubmit }: {
  /** 고칠 공고. 새로 쓸 때는 null이다. */
  readonly post: EditableAuditionPost | null;
  /** 방금 저장한 결과처럼 저장 줄에 보여 줄 안내. */
  readonly notice?: string;
  readonly submitLabel: string;
  /** 새로 쓸 때 아직 입력이 없으면 저장 줄에 보여 줄 안내. */
  readonly createHint?: string;
  /** false면 작성자를 보여 주기만 한다. */
  readonly authorEditable?: boolean;
  /** 작성자를 고칠 수 없을 때 새 공고에 보여 줄 이름. 서버가 같은 기획사 이름으로 정한다. */
  readonly fixedAuthorName?: string;
  readonly uploadFile: UploadAuditionPostFile;
  readonly onSubmit: (write: AuditionPostWrite) => Promise<void>;
}) {
  const router = useRouter();
  const allowLeaveRef = useRef(false);
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);
  const creating = post === null;
  const [form, setForm] = useState<Form>(() => (post ? toForm(post) : EMPTY_FORM));
  const [bodyHtml, setBodyHtml] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<readonly FormAttachment[]>(
    () => post?.attachments.map((attachment) => ({ ...attachment, uploaded: false })) ?? [],
  );
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const uploading = imageUploading || attachmentUploading;
  const [saveError, setSaveError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(notice ?? null);
  const uploadImage = useCallback((file: File) => uploadWithReason(uploadFile, "IMAGE", file), [uploadFile]);
  const uploadAttachment = useCallback((file: File) => uploadWithReason(uploadFile, "ATTACHMENT", file), [uploadFile]);

  const dirty = useMemo(() => {
    const original = post ? toForm(post) : EMPTY_FORM;
    return bodyHtml !== null
      || removed.size > 0
      || attachments.some((attachment) => attachment.uploaded)
      || (Object.keys(original) as FieldName[]).some((name) => original[name] !== form[name]);
  }, [post, form, bodyHtml, removed, attachments]);

  // 저장하지 않은 내용이 있으면 새로고침·창 닫기 전에 브라우저가 한 번 묻는다.
  useEffect(() => {
    if ((!dirty && !uploading) || saving) return;
    const warn = (event: BeforeUnloadEvent) => { if (!allowLeaveRef.current) event.preventDefault(); };
    const interceptLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download") || link.getAttribute("href")?.startsWith("#")) return;
      const destination = new URL(link.href);
      if (destination.protocol !== "http:" && destination.protocol !== "https:") return;
      if (destination.href === window.location.href) return;
      event.preventDefault();
      setLeaveTarget(destination.href);
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", interceptLink, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", interceptLink, true);
    };
  }, [dirty, uploading, saving]);

  const changed = () => setStatus(null);

  const update = (name: FieldName, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    changed();
  };

  const toggleAttachment = (attachment: FormAttachment) => {
    if (attachment.uploaded) {
      setAttachments((current) => current.filter((item) => item.url !== attachment.url));
    } else {
      setRemoved((current) => {
        const next = new Set(current);
        if (next.has(attachment.url)) next.delete(attachment.url);
        else next.add(attachment.url);
        return next;
      });
    }
    changed();
  };

  const addAttachment = (attachment: FormAttachment) => {
    setAttachments((current) => [...current, attachment]);
    changed();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || uploading) return;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    const firstInvalid = (Object.keys(FIELD_IDS) as FieldName[]).find((name) => nextErrors[name]);
    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus();
      return;
    }
    setSaving(true);
    setSaveError(null);
    setStatus(null);
    try {
      await onSubmit({
        category: form.category,
        title: form.title.trim(),
        pay: form.pay.trim(),
        deadlineText: form.deadlineText.trim(),
        authorName: form.authorName.trim(),
        bodyHtml: creating ? bodyHtml ?? "" : bodyHtml,
        tags: parseTags(form.tags),
        attachmentUrls: attachments.map((attachment) => attachment.url).filter((url) => !removed.has(url)),
      });
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "공고를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const statusText = status
    ?? (dirty ? "저장하지 않은 내용이 있어요." : creating ? createHint ?? "" : "아직 고친 내용이 없어요.");

  return (
    <form onSubmit={submit} noValidate>
      <fieldset disabled={saving} className="flex min-w-0 flex-col gap-5">
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
              {form.category ? null : <option value="" disabled>분류를 골라 주세요</option>}
              {AUDITION_POST_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </FieldSelect>
          </Field>
          {authorEditable ? (
            <TextField name="authorName" label="작성자" form={form} error={errors.authorName} onChange={update} hint={creating ? "공고를 낸 단체 이름을 써 주세요." : undefined} />
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold">작성자</span>
              <p className="flex min-h-11 items-center text-base text-foreground">{post?.authorName || fixedAuthorName || "기획사 이름"}</p>
              <p className="text-xs text-muted">작성자는 기획사 이름으로 표시돼요. 바꾸려면 예술in에 문의해 주세요.</p>
            </div>
          )}
          <div className="sm:col-span-2">
            <TextField name="title" label="제목" form={form} error={errors.title} onChange={update} />
          </div>
          <TextField name="pay" label="페이" form={form} error={errors.pay} onChange={update} hint="'협의'처럼 글로 써도 돼요." />
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
          사진은 &apos;사진&apos; 도구로 올려 주세요. 다른 사이트의 사진을 붙여 넣으면 저장할 때 빠져요. 지원 방법(이메일·링크)을 꼭 적어 주세요.
          {!creating && bodyHtml === null ? " 본문을 고치지 않으면 지금 본문을 그대로 둬요." : null}
        </p>
        <div className="mt-3">
          <AuditionPostBodyEditor
            id="post-body"
            labelledBy="post-body-label"
            describedBy="post-body-hint"
            initialHtml={post?.bodyHtml ?? ""}
            onChange={(html) => { setBodyHtml(html); changed(); }}
            onUploadImage={uploadImage}
            onUploadStateChange={setImageUploading}
            disabled={saving}
          />
        </div>
      </section>

      <AttachmentList attachments={attachments} removed={removed} upload={uploadAttachment} onToggle={toggleAttachment} onAdd={addAttachment} onUploadStateChange={setAttachmentUploading} />

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-surface/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:-mx-8 lg:px-8">
        <PrimaryButton type="submit" disabled={saving || uploading || (!creating && !dirty)} className={`${ACTION_CLASS} px-6`}>
          {saving ? "저장하는 중…" : submitLabel}
        </PrimaryButton>
        <p role="status" className="text-sm text-muted-strong">{uploading ? "파일을 올리는 중이에요. 업로드가 끝나면 저장할 수 있어요." : statusText}</p>
        {saveError ? <p role="alert" className="w-full text-sm text-fail">{saveError}</p> : null}
      </div>
      </fieldset>
      <ModalShell open={leaveTarget !== null} onClose={() => setLeaveTarget(null)} labelledBy="post-leave-title" placement="responsiveSheet" className="w-full rounded-t-2xl bg-card shadow-modal md:w-[min(480px,calc(100vw-48px))] md:rounded-modal">
        <DialogHeader id="post-leave-title" title="저장하지 않은 내용이 있어요" subtitle="이동하면 입력한 내용과 추가한 파일이 공고에 저장되지 않아요." />
        <DialogFooter>
          <SecondaryButton onClick={() => setLeaveTarget(null)} className={ACTION_CLASS}>계속 작성</SecondaryButton>
          <DestructiveButton className={ACTION_CLASS} onClick={() => {
            if (!leaveTarget) return;
            allowLeaveRef.current = true;
            const destination = new URL(leaveTarget);
            if (destination.origin === window.location.origin) router.push(destination.pathname + destination.search + destination.hash);
            else window.location.assign(destination.href);
          }}>저장하지 않고 이동</DestructiveButton>
        </DialogFooter>
      </ModalShell>
    </form>
  );
}

function AttachmentList({ attachments, removed, upload, onToggle, onAdd, onUploadStateChange }: {
  readonly attachments: readonly FormAttachment[];
  readonly removed: ReadonlySet<string>;
  readonly upload: (file: File) => Promise<string>;
  readonly onToggle: (attachment: FormAttachment) => void;
  readonly onAdd: (attachment: FormAttachment) => void;
  readonly onUploadStateChange: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = checkAuditionPostFile("ATTACHMENT", file);
    if (problem) {
      setError(problem);
      return;
    }
    setUploading(file.name);
    onUploadStateChange(true);
    setError(null);
    try {
      const url = await upload(file);
      onAdd({ name: file.name, size: file.size, url, uploaded: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "파일을 올리지 못했어요. 다시 시도해 주세요.");
    } finally {
      setUploading(null);
      onUploadStateChange(false);
    }
  };

  return (
    <section aria-labelledby="post-attachments" className="rounded-card border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="post-attachments" className="text-base font-bold">
          첨부파일 <span className="num text-muted">{attachments.length}</span>
        </h2>
        <SecondaryButton
          disabled={uploading !== null}
          onClick={() => inputRef.current?.click()}
          aria-describedby="post-attachments-hint"
          className={`${ACTION_CLASS} ml-auto`}
        >
          {uploading ? "올리는 중…" : "첨부 올리기"}
        </SecondaryButton>
        <input ref={inputRef} type="file" accept={ATTACHMENT_ACCEPT} onChange={(event) => void choose(event)} className="sr-only" tabIndex={-1} aria-hidden="true" />
      </div>
      <p id="post-attachments-hint" className="mt-1 text-xs text-muted">지원서 양식(한글·워드)·PDF·악보·음원을 50MB까지 올릴 수 있어요.</p>
      {uploading ? <p role="status" className="mt-2 text-sm text-muted">{uploading} 올리는 중이에요.</p> : null}
      {error ? <p role="alert" className="mt-2 text-sm text-fail">{error}</p> : null}
      {attachments.length === 0 ? <p className="mt-2 text-sm text-muted">첨부파일이 없어요.</p> : (
        <ul className="mt-3 flex flex-col gap-2">
          {attachments.map((attachment) => {
            const isRemoved = removed.has(attachment.url);
            return (
              <li key={attachment.url} className={`flex min-h-12 flex-wrap items-center gap-3 rounded-control border px-4 py-2 text-sm ${isRemoved ? "border-fail/30 bg-fail-bg" : "border-border bg-surface"}`}>
                <a href={attachment.url} download={attachment.name} className={`min-w-0 flex-1 break-all font-semibold ${isRemoved ? "text-muted line-through" : "hover:text-brand"}`}>
                  {attachment.name}
                </a>
                <span className="num shrink-0 text-xs text-muted">{formatFileSize(attachment.size)}</span>
                {attachment.uploaded ? <span className="shrink-0 text-xs font-semibold text-brand">새로 올림</span> : null}
                {isRemoved ? <span className="shrink-0 text-xs font-semibold text-fail">저장하면 지워져요</span> : null}
                <SecondaryButton
                  aria-pressed={attachment.uploaded ? undefined : isRemoved}
                  aria-label={`${attachment.name} ${isRemoved ? "빼기 취소" : "빼기"}`}
                  onClick={() => onToggle(attachment)}
                  className={`${ACTION_CLASS} shrink-0`}
                >
                  {isRemoved ? "되살리기" : "빼기"}
                </SecondaryButton>
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
