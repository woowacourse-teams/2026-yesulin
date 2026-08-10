"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import type { ApplicantAnswerValue, ApplicantProfileResponse, BodyMeasurements, CareerEntry } from "@/features/applicants/types";
import type { ApplicationFieldInput, ApplicationFieldSection } from "@/features/auditions/creation-types";
import { answerValueText } from "@/features/applicants/presentation";
import { FieldInput, FieldSelect, FieldTextarea } from "@/components/auditions/ui-controls";

type SectionProps = {
  readonly section: ApplicationFieldSection;
  readonly fields: readonly ApplicationFieldInput[];
  readonly profile: ApplicantProfileResponse;
  readonly values: Readonly<Record<string, ApplicantAnswerValue>>;
  readonly removed: ReadonlySet<string>;
  readonly onChange: (key: string, value: ApplicantAnswerValue) => void;
  readonly onRequestRemove: (key: string) => void;
};

export function ProfileSectionPanel(props: SectionProps) {
  const { section, fields, profile, values, removed, onChange, onRequestRemove } = props;
  if (section === "CAREER") return <CareerSection value={careerValue(values.CAREER)} onChange={(value) => onChange("CAREER", value)} />;
  if (section === "MATERIALS") return <MaterialsSection profile={profile} photoValue={stringList(values.PHOTOS)} videoValue={typeof values.VIDEO === "string" ? values.VIDEO : ""} onChange={onChange} />;
  if (section === "CUSTOM") return <CustomSection profile={profile} values={values} removed={removed} onChange={onChange} onRequestRemove={onRequestRemove} />;
  return <div className="mt-6 grid gap-5 md:grid-cols-2">{fields.filter((field) => field.section === section).map((field) => <StandardField key={field.id} field={field} value={values[field.id]} onChange={(value) => onChange(field.id, value)} />)}</div>;
}

function StandardField({ field, value, onChange }: { readonly field: ApplicationFieldInput; readonly value?: ApplicantAnswerValue; readonly onChange: (value: ApplicantAnswerValue) => void }) {
  const id = `profile-${field.id}`;
  const width = field.layout === "FULL" || field.inputType === "TEXTAREA" || field.inputType === "COMPOSITE" ? "md:col-span-2" : "";
  if (field.inputType === "COMPOSITE") {
    const body = isBody(value) ? value : { height: 0, weight: 0 };
    return <fieldset className={width}><legend className="mb-2 text-sm font-semibold">{field.label}</legend><div className="grid gap-3 sm:grid-cols-2">{field.config.fields?.map((part) => <label key={part.key} htmlFor={`${id}-${part.key}`}><span className="mb-2 block text-sm text-muted-strong">{part.label}</span><div className="relative"><FieldInput id={`${id}-${part.key}`} type="number" value={body[part.key as keyof BodyMeasurements] || ""} placeholder={part.placeholder} onChange={(event) => onChange({ ...body, [part.key]: Number(event.target.value) })} className="pr-12" /><span className="absolute right-3 top-3 text-sm text-muted">{part.unit}</span></div></label>)}</div></fieldset>;
  }
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
  return <label htmlFor={id} className={width}><span className="mb-2 block text-sm font-semibold">{field.label}</span>{field.inputType === "TEXTAREA" ? <FieldTextarea id={id} rows={6} value={text} placeholder={field.config.placeholder} onChange={(event) => onChange(event.target.value)} /> : field.inputType === "SELECT" ? <FieldSelect id={id} value={text} onChange={(event) => onChange(event.target.value)}><option value="">선택하지 않음</option>{field.config.options?.map((option) => <option key={option}>{option}</option>)}</FieldSelect> : <FieldInput id={id} type={field.inputType === "DATE" ? "date" : field.inputType === "TEL" ? "tel" : field.inputType === "URL" ? "url" : "text"} value={text} placeholder={field.config.placeholder} onChange={(event) => onChange(event.target.value)} />}</label>;
}

function CareerSection({ value, onChange }: { readonly value: readonly CareerEntry[]; readonly onChange: (value: ApplicantAnswerValue) => void }) {
  const patch = (index: number, update: Partial<CareerEntry>) => onChange(value.map((career, candidate) => candidate === index ? { ...career, ...update } : career));
  return <div className="mt-6"><p className="text-sm leading-6 text-muted">최근 경력부터 정리하면 지원서 검토 화면에서도 같은 순서로 보여요.</p><div className="mt-4 space-y-4">{value.map((career, index) => <article key={`${career.title}-${index}`} className="rounded-card border border-border bg-surface p-4"><div className="mb-3 flex items-center"><strong className="text-sm">경력 {index + 1}</strong><button type="button" onClick={() => onChange(value.filter((_, candidate) => candidate !== index))} className="ml-auto min-h-11 rounded-control px-3 text-sm font-semibold text-fail hover:bg-fail-bg">삭제</button></div><div className="grid gap-3 sm:grid-cols-[100px_1fr_160px]"><label><span className="mb-1 block text-xs text-muted">연도</span><FieldInput type="number" value={career.year} onChange={(event) => patch(index, { year: Number(event.target.value) })} /></label><label><span className="mb-1 block text-xs text-muted">작품명</span><FieldInput value={career.title} onChange={(event) => patch(index, { title: event.target.value })} /></label><label><span className="mb-1 block text-xs text-muted">배역</span><FieldInput value={career.part} onChange={(event) => patch(index, { part: event.target.value })} /></label></div></article>)}{value.length === 0 ? <div className="rounded-card border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted">저장한 경력이 없어요. 경력이 없어도 프로필을 저장할 수 있습니다.</div> : null}<button type="button" onClick={() => onChange([...value, { year: new Date().getFullYear(), title: "", part: "" }])} className="min-h-12 w-full rounded-control border border-dashed border-border text-sm font-semibold text-muted-strong hover:border-brand-line hover:bg-brand-soft hover:text-brand">+ 경력 추가</button></div></div>;
}

function MaterialsSection({ profile, photoValue, videoValue, onChange }: { readonly profile: ApplicantProfileResponse; readonly photoValue: readonly string[]; readonly videoValue: string; readonly onChange: (key: string, value: ApplicantAnswerValue) => void }) {
  const previews = profile.answers.find((answer) => answer.key === "PHOTOS")?.previewUrls ?? [];
  const selectPhotos = (event: ChangeEvent<HTMLInputElement>) => { const files = Array.from(event.target.files ?? []).slice(0, 4); if (files.length) onChange("PHOTOS", files.map((file, index) => `mock-${Date.now()}-${index}-${file.name}`)); };
  return <div className="mt-6 space-y-8"><section><div className="flex items-center justify-between gap-4"><div><h3 className="font-bold">프로필 사진</h3><p className="mt-1 text-sm text-muted">최대 4장 · JPG, PNG, WEBP · 파일당 10MB 이하</p></div><span className="num text-sm font-semibold text-brand">{photoValue.length} / 4</span></div>{previews.length ? <div className="mt-4 flex gap-3 overflow-x-auto">{previews.map((url, index) => <div key={url} className="relative h-40 w-[120px] shrink-0 overflow-hidden rounded-control border border-border"><Image src={url} alt={`저장한 프로필 사진 ${index + 1}`} fill unoptimized sizes="120px" className="object-cover" />{index === 0 ? <span className="absolute inset-x-0 bottom-0 bg-brand py-1 text-center text-xs font-semibold text-white">대표 사진</span> : null}</div>)}</div> : <p className="mt-4 rounded-control border border-dashed border-border bg-surface p-5 text-sm text-muted">저장한 사진이 없어요.</p>}<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectPhotos} className="mt-4 block min-h-12 w-full rounded-control border border-dashed border-border bg-surface px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:font-semibold file:text-brand" /><p className="mt-2 text-xs text-muted">새 파일을 선택하면 저장 시 현재 사진 구성이 교체됩니다.</p></section><section className="border-t border-border-soft pt-7"><label htmlFor="profile-video" className="block font-bold">연기 영상</label><p className="mt-1 text-sm text-muted">유튜브 일부공개 링크를 저장하면 공고에서 영상 제출을 요청할 때 다시 사용할 수 있어요.</p><FieldInput id="profile-video" type="url" value={videoValue} onChange={(event) => onChange("VIDEO", event.target.value)} placeholder="https://youtu.be/..." className="mt-3" /></section></div>;
}

function CustomSection({ profile, values, removed, onChange, onRequestRemove }: Pick<SectionProps, "profile" | "values" | "removed" | "onChange" | "onRequestRemove">) {
  const answers = profile.answers.filter((answer) => answer.custom && !removed.has(answer.key));
  if (!answers.length) return <div className="mt-6 rounded-card border border-dashed border-border bg-surface px-5 py-10 text-center"><strong>저장된 추가 답변이 없어요</strong><p className="mt-2 text-sm leading-6 text-muted">공연사가 요청한 공고별 질문에 답하면 출처와 함께 이곳에 남을 수 있어요.</p></div>;
  return <div className="mt-6 space-y-4">{answers.map((answer) => <article key={answer.key} className="rounded-card border border-border p-4"><div className="flex items-start gap-4"><div className="min-w-0 flex-1"><h3 className="font-semibold">{answer.label}</h3><p className="mt-1 text-xs text-muted">출처 · {answer.lastUsedPostingTitle ?? "이전 지원서"}</p></div><button type="button" onClick={() => onRequestRemove(answer.key)} className="min-h-11 rounded-control px-3 text-sm font-semibold text-fail hover:bg-fail-bg">삭제</button></div><FieldTextarea value={typeof values[answer.key] === "string" ? values[answer.key] as string : answerValueText(values[answer.key]!)} onChange={(event) => onChange(answer.key, event.target.value)} rows={3} className="mt-4" /></article>)}</div>;
}

function isBody(value: unknown): value is BodyMeasurements { return typeof value === "object" && value !== null && !Array.isArray(value) && "height" in value && "weight" in value; }
function isCareer(value: unknown): value is CareerEntry { return typeof value === "object" && value !== null && "year" in value && "title" in value && "part" in value; }
function careerValue(value: ApplicantAnswerValue | undefined) { return Array.isArray(value) ? value.filter(isCareer) : []; }
function stringList(value: ApplicantAnswerValue | undefined) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
