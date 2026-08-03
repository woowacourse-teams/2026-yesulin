"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createPerformance,
  updatePerformance,
  uploadPerformanceThumbnail,
} from "@/features/performance/api";
import type {
  Performance,
  PerformanceCategory,
  PerformanceRole,
  RoleGender,
  SavePerformanceRequest,
} from "@/features/performance/types";

type RoleDraft = {
  id: string;
  name: string;
  description: string;
  gender: RoleGender;
  birthYearMin: string;
  birthYearMax: string;
  heightMin: string;
  heightMax: string;
  weightMin: string;
  weightMax: string;
  mbti: string;
  qualification: string;
};

type PerformanceDraft = {
  title: string;
  description: string;
  category: PerformanceCategory;
  thumbnailUrl: string;
  roles: RoleDraft[];
};

type FormError = {
  path: string;
  message: string;
};

const mbtiOptions = [
  "ISTJ",
  "ISFJ",
  "INFJ",
  "INTJ",
  "ISTP",
  "ISFP",
  "INFP",
  "INTP",
  "ESTP",
  "ESFP",
  "ENFP",
  "ENTP",
  "ESTJ",
  "ESFJ",
  "ENFJ",
  "ENTJ",
] as const;

export function CreatePerformanceForm() {
  const router = useRouter();

  return (
    <PerformanceEditor
      heading="새 공연 등록"
      description="공고에서 반복해 사용할 공연 정보와 모집 배역을 먼저 등록합니다."
      submitLabel="공연 등록"
      initialDraft={createEmptyDraft()}
      onSave={async (body) => {
        await createPerformance(body);
        router.push("/producers/performances");
      }}
    />
  );
}

export function EditPerformanceForm({ performance }: { performance: Performance }) {
  const router = useRouter();

  return (
    <PerformanceEditor
      heading="공연 정보 수정"
      description="수정한 정보는 이후 생성하는 공고에 사용할 수 있습니다."
      submitLabel="변경사항 저장"
      initialDraft={toPerformanceDraft(performance)}
      onSave={async (body) => {
        await updatePerformance(performance.id, body);
        router.push("/producers/performances");
      }}
    />
  );
}

function PerformanceEditor({
  heading,
  description,
  submitLabel,
  initialDraft,
  onSave,
}: {
  heading: string;
  description: string;
  submitLabel: string;
  initialDraft: PerformanceDraft;
  onSave: (body: SavePerformanceRequest) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [thumbnailFile, setThumbnailFile] = useState<{ fileName: string; dataUrl: string } | null>(null);
  const [errors, setErrors] = useState<FormError[]>([]);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateRole(roleId: string, field: keyof RoleDraft, value: string) {
    setDraft((current) => ({
      ...current,
      roles: current.roles.map((role) =>
        role.id === roleId ? { ...role, [field]: value } : role,
      ),
    }));
  }

  function addRole() {
    setDraft((current) => ({ ...current, roles: [...current.roles, createEmptyRole()] }));
  }

  function removeRole(roleId: string) {
    setDraft((current) => ({
      ...current,
      roles: current.roles.filter((role) => role.id !== roleId),
    }));
  }

  async function handleThumbnailChange(file: File | undefined) {
    if (!file) return;
    setNotice("");

    if (!file.type.startsWith("image/")) {
      setErrors([{ path: "thumbnail", message: "이미지 파일만 업로드할 수 있습니다." }]);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors([{ path: "thumbnail", message: "썸네일은 5MB 이하로 등록해주세요." }]);
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setThumbnailFile({ fileName: file.name, dataUrl });
    setDraft((current) => ({ ...current, thumbnailUrl: dataUrl }));
    setErrors((current) => current.filter((error) => error.path !== "thumbnail"));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateDraft(draft);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setNotice("필수 입력값을 확인해주세요.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
      return;
    }

    setSubmitting(true);
    setErrors([]);
    setNotice("");

    try {
      const thumbnailUrl = thumbnailFile
        ? (
            await uploadPerformanceThumbnail({
              fileName: thumbnailFile.fileName,
              dataUrl: thumbnailFile.dataUrl,
            })
          ).thumbnailUrl
        : draft.thumbnailUrl;

      await onSave({
        title: draft.title.trim(),
        description: draft.description.trim(),
        category: draft.category,
        thumbnailUrl,
        roles: draft.roles.map(toPerformanceRole),
      });
    } catch (requestError) {
      setNotice(requestError instanceof Error ? requestError.message : "공연을 저장하지 못했습니다.");
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <Link href="/producers/performances" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground">
            <ArrowLeftIcon /> 공연 관리
          </Link>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Performance editor</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <p className="text-xs font-semibold text-muted"><span className="text-danger">*</span> 필수 입력</p>
      </header>

      {notice ? (
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-danger">
          {notice}
        </div>
      ) : null}

      <div className="mt-7 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <FormSection number="01" title="공연 기본 정보" description="지원자가 공연을 이해할 수 있는 핵심 정보를 입력해주세요.">
            <div className="grid gap-6 sm:grid-cols-2">
              <fieldset>
                <legend className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  카테고리 <span className="text-danger">*</span>
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  <CategoryButton
                    label="연극"
                    selected={draft.category === "PLAY"}
                    onClick={() => setDraft((current) => ({ ...current, category: "PLAY" }))}
                  />
                  <CategoryButton
                    label="뮤지컬"
                    selected={draft.category === "MUSICAL"}
                    onClick={() => setDraft((current) => ({ ...current, category: "MUSICAL" }))}
                  />
                </div>
              </fieldset>

              <Field label="공연 제목" required error={findError(errors, "title")}>
                <input
                  name="performanceTitle"
                  autoComplete="off"
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="예: 연극 식당: 매일이 크리스마스…"
                  aria-invalid={Boolean(findError(errors, "title"))}
                  className="min-h-11 w-full rounded-xl border border-border-strong bg-white px-4 text-sm outline-none placeholder:text-[#9a9c9e] focus:border-foreground"
                />
              </Field>
            </div>

            <Field label="공연 소개" required error={findError(errors, "description")}>
              <textarea
                name="performanceDescription"
                autoComplete="off"
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="작품의 줄거리, 분위기와 특징을 소개해주세요…"
                rows={6}
                maxLength={1000}
                aria-invalid={Boolean(findError(errors, "description"))}
                className="w-full resize-y rounded-xl border border-border-strong bg-white px-4 py-3 text-sm leading-6 outline-none placeholder:text-[#9a9c9e] focus:border-foreground"
              />
              <p className="mt-2 text-right text-xs text-muted">{draft.description.length}/1,000</p>
            </Field>
          </FormSection>

          <FormSection
            number="02"
            title="모집 배역"
            description="공고를 만들 때 다시 사용할 배역과 지원 자격을 등록합니다."
            action={
              <button type="button" onClick={addRole} className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong bg-white px-4 text-sm font-medium shadow-sm hover:bg-secondary">
                <PlusIcon /> 배역 추가
              </button>
            }
          >
            {findError(errors, "roles") ? (
              <p role="alert" className="mb-4 text-sm font-medium text-danger">{findError(errors, "roles")}</p>
            ) : null}
            <div className="space-y-4">
              {draft.roles.map((role, index) => (
                <RoleEditor
                  key={role.id}
                  role={role}
                  index={index}
                  errors={errors}
                  removable={draft.roles.length > 1}
                  onChange={updateRole}
                  onRemove={removeRole}
                />
              ))}
            </div>
          </FormSection>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-8">
          <ThumbnailField
            thumbnailUrl={draft.thumbnailUrl}
            error={findError(errors, "thumbnail")}
            onChange={handleThumbnailChange}
          />
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold">등록 후 할 수 있는 일</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
              <li>• 공연에 연결된 모집 공고 만들기</li>
              <li>• 공고별 지원자와 진행 상태 관리</li>
              <li>• 공연 전시 여부 변경</li>
            </ul>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 z-30 mt-8 flex items-center justify-between gap-4 border-t border-border bg-background/95 py-4 backdrop-blur">
        <Link href="/producers/performances" className="inline-flex h-10 items-center justify-center rounded-md border border-border-strong bg-white px-5 text-sm font-medium shadow-sm hover:bg-secondary">
          취소
        </Link>
        <button type="submit" disabled={submitting} className="inline-flex h-10 min-w-36 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-white shadow transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60">
          {submitting ? "저장 중…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function FormSection({
  number,
  title,
  description,
  action,
  children,
}: {
  number: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-elev-1 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div className="flex gap-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-xs font-semibold">{number}</span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="mt-6 space-y-6">{children}</div>
    </section>
  );
}

function RoleEditor({
  role,
  index,
  errors,
  removable,
  onChange,
  onRemove,
}: {
  role: RoleDraft;
  index: number;
  errors: FormError[];
  removable: boolean;
  onChange: (roleId: string, field: keyof RoleDraft, value: string) => void;
  onRemove: (roleId: string) => void;
}) {
  const path = `roles.${index}`;

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">배역 {index + 1}</h3>
        {removable ? (
          <button type="button" onClick={() => onRemove(role.id)} className="min-h-9 rounded-lg px-3 text-xs font-medium text-danger hover:bg-red-50">
            배역 삭제
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label="배역명" required error={findError(errors, `${path}.name`)}>
          <input
            name={`role-${index}-name`}
            autoComplete="off"
            value={role.name}
            onChange={(event) => onChange(role.id, "name", event.target.value)}
            placeholder="예: 주인공 민수…"
            aria-invalid={Boolean(findError(errors, `${path}.name`))}
            className="min-h-11 w-full rounded-xl border border-border-strong bg-white px-4 text-sm outline-none focus:border-foreground"
          />
        </Field>
        <Field label="성별" required error={findError(errors, `${path}.gender`)}>
          <select
            name={`role-${index}-gender`}
            value={role.gender}
            onChange={(event) => onChange(role.id, "gender", event.target.value)}
            className="min-h-11 w-full rounded-xl border border-border-strong bg-white px-4 text-sm outline-none focus:border-foreground"
          >
            <option value="ANY">무관</option>
            <option value="MALE">남성</option>
            <option value="FEMALE">여성</option>
          </select>
        </Field>
      </div>

      <div className="mt-5">
        <Field label="배역 설명" required error={findError(errors, `${path}.description`)}>
          <textarea
            name={`role-${index}-description`}
            autoComplete="off"
            value={role.description}
            onChange={(event) => onChange(role.id, "description", event.target.value)}
            placeholder="인물의 성격, 관계와 극 중 역할을 설명해주세요…"
            aria-invalid={Boolean(findError(errors, `${path}.description`))}
            rows={3}
            className="w-full resize-y rounded-xl border border-border-strong bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-foreground"
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="별도 지원 자격" hint="선택">
          <input
            name={`role-${index}-qualification`}
            autoComplete="off"
            value={role.qualification}
            onChange={(event) => onChange(role.id, "qualification", event.target.value)}
            placeholder="예: 무대를 사랑하고 아이들을 좋아하시는 분…"
            className="min-h-11 w-full rounded-xl border border-border-strong bg-white px-4 text-sm outline-none focus:border-foreground"
          />
        </Field>
      </div>

      <details className="mt-5 rounded-xl border border-border bg-white">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold">
          추천을 위한 선택 정보 <span className="ml-1 text-xs font-medium text-muted">출생연도 · 신체 · MBTI</span>
        </summary>
        <div className="grid gap-5 border-t border-border p-4 sm:grid-cols-2">
          <RangeField name={`role-${index}-birthYear`} label="출생연도" unit="년" min={role.birthYearMin} max={role.birthYearMax} onMinChange={(value) => onChange(role.id, "birthYearMin", value)} onMaxChange={(value) => onChange(role.id, "birthYearMax", value)} />
          <RangeField name={`role-${index}-height`} label="키" unit="cm" min={role.heightMin} max={role.heightMax} onMinChange={(value) => onChange(role.id, "heightMin", value)} onMaxChange={(value) => onChange(role.id, "heightMax", value)} />
          <RangeField name={`role-${index}-weight`} label="몸무게" unit="kg" min={role.weightMin} max={role.weightMax} onMinChange={(value) => onChange(role.id, "weightMin", value)} onMaxChange={(value) => onChange(role.id, "weightMax", value)} />
          <Field label="MBTI" hint="선택">
            <select name={`role-${index}-mbti`} value={role.mbti} onChange={(event) => onChange(role.id, "mbti", event.target.value)} className="min-h-11 w-full rounded-xl border border-border-strong bg-white px-3 text-sm outline-none">
              <option value="">선택하지 않음</option>
              {mbtiOptions.map((mbti) => <option key={mbti} value={mbti}>{mbti}</option>)}
            </select>
          </Field>
        </div>
      </details>
    </article>
  );
}

function ThumbnailField({ thumbnailUrl, error, onChange }: { thumbnailUrl: string; error?: string; onChange: (file: File | undefined) => void }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-elev-1">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">공연 썸네일 <span className="text-danger">*</span></h2>
        <span className="text-xs text-muted">세로형 권장</span>
      </div>
      <label className="mt-4 block cursor-pointer">
        <span className="sr-only">공연 썸네일 선택</span>
        <div className={`relative aspect-[3/4] overflow-hidden rounded-2xl border ${error ? "border-danger" : "border-border-strong"} bg-surface`}>
          {thumbnailUrl ? (
            <Image src={thumbnailUrl} alt="선택한 공연 썸네일 미리보기" fill sizes="320px" className="object-cover" unoptimized={thumbnailUrl.startsWith("data:")} />
          ) : (
            <div className="grid h-full place-items-center px-6 text-center">
              <div>
                <UploadIcon />
                <p className="mt-3 text-sm font-semibold">이미지 선택</p>
                <p className="mt-1 text-xs leading-5 text-muted">JPG, PNG, WEBP · 최대 5MB</p>
              </div>
            </div>
          )}
        </div>
        <input name="performanceThumbnail" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onChange(event.target.files?.[0])} className="sr-only" />
      </label>
      {error ? <p role="alert" className="mt-2 text-xs font-medium text-danger">{error}</p> : null}
      {thumbnailUrl ? <p className="mt-3 text-center text-xs font-semibold text-muted">이미지를 누르면 변경할 수 있습니다.</p> : null}
    </section>
  );
}

function Field({ label, required = false, hint, error, children }: { label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        {label}
        {required ? <span className="text-danger">*</span> : null}
        {hint ? <span className="text-xs font-medium text-muted">{hint}</span> : null}
      </span>
      {children}
      {error ? <span role="alert" className="mt-2 block text-xs font-medium text-danger">{error}</span> : null}
    </label>
  );
}

function RangeField({ name, label, unit, min, max, onMinChange, onMaxChange }: { name: string; label: string; unit: string; min: string; max: string; onMinChange: (value: string) => void; onMaxChange: (value: string) => void }) {
  return (
    <Field label={label} hint="선택">
      <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
        <input name={`${name}Min`} aria-label={`${label} 최소`} autoComplete="off" type="number" value={min} onChange={(event) => onMinChange(event.target.value)} placeholder="최소" className="min-h-11 min-w-0 rounded-xl border border-border-strong px-3 text-sm outline-none" />
        <span className="text-xs text-muted">–</span>
        <input name={`${name}Max`} aria-label={`${label} 최대`} autoComplete="off" type="number" value={max} onChange={(event) => onMaxChange(event.target.value)} placeholder="최대" className="min-h-11 min-w-0 rounded-xl border border-border-strong px-3 text-sm outline-none" />
        <span className="text-xs text-muted">{unit}</span>
      </div>
    </Field>
  );
}

function CategoryButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={`min-h-11 rounded-xl border text-sm font-semibold transition ${selected ? "border-primary bg-primary text-white" : "border-border-strong bg-white hover:bg-secondary"}`}>
      {label}
    </button>
  );
}

function createEmptyDraft(): PerformanceDraft {
  return {
    title: "",
    description: "",
    category: "PLAY",
    thumbnailUrl: "",
    roles: [createEmptyRole("new-role-1")],
  };
}

function createEmptyRole(id = crypto.randomUUID()): RoleDraft {
  return { id, name: "", description: "", gender: "ANY", birthYearMin: "", birthYearMax: "", heightMin: "", heightMax: "", weightMin: "", weightMax: "", mbti: "", qualification: "" };
}

function toPerformanceDraft(performance: Performance): PerformanceDraft {
  return { title: performance.title, description: performance.description, category: performance.category, thumbnailUrl: performance.thumbnailUrl, roles: performance.roles.map(toRoleDraft) };
}

function toRoleDraft(role: PerformanceRole): RoleDraft {
  return { id: role.id, name: role.name, description: role.description, gender: role.gender, birthYearMin: toInputValue(role.birthYearMin), birthYearMax: toInputValue(role.birthYearMax), heightMin: toInputValue(role.heightMin), heightMax: toInputValue(role.heightMax), weightMin: toInputValue(role.weightMin), weightMax: toInputValue(role.weightMax), mbti: role.mbti ?? "", qualification: role.qualification ?? "" };
}

function toPerformanceRole(role: RoleDraft): PerformanceRole {
  return { id: role.id, name: role.name.trim(), description: role.description.trim(), gender: role.gender, birthYearMin: toNullableNumber(role.birthYearMin), birthYearMax: toNullableNumber(role.birthYearMax), heightMin: toNullableNumber(role.heightMin), heightMax: toNullableNumber(role.heightMax), weightMin: toNullableNumber(role.weightMin), weightMax: toNullableNumber(role.weightMax), mbti: role.mbti || null, qualification: role.qualification.trim() || null };
}

function validateDraft(draft: PerformanceDraft): FormError[] {
  const errors: FormError[] = [];
  if (!draft.thumbnailUrl) errors.push({ path: "thumbnail", message: "공연 썸네일을 등록해주세요." });
  if (!draft.title.trim()) errors.push({ path: "title", message: "공연 제목을 입력해주세요." });
  if (!draft.description.trim()) errors.push({ path: "description", message: "공연 소개를 입력해주세요." });
  if (draft.roles.length === 0) errors.push({ path: "roles", message: "모집 배역을 한 개 이상 등록해주세요." });
  draft.roles.forEach((role, index) => {
    if (!role.name.trim()) errors.push({ path: `roles.${index}.name`, message: "배역명을 입력해주세요." });
    if (!role.description.trim()) errors.push({ path: `roles.${index}.description`, message: "배역 설명을 입력해주세요." });
  });
  return errors;
}

function findError(errors: FormError[], path: string) {
  return errors.find((error) => error.path === path)?.message;
}

function toNullableNumber(value: string) {
  return value ? Number(value) : null;
}

function toInputValue(value: number | null) {
  return value === null ? "" : String(value);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(new Error("이미지를 읽지 못했습니다.")));
    reader.readAsDataURL(file);
  });
}

function ArrowLeftIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none"><path d="m12.5 4.5-5.5 5.5 5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PlusIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function UploadIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="mx-auto h-8 w-8 text-muted" fill="none"><path d="M12 16V5m0 0L8 9m4-4 4 4M5 15v4h14v-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
