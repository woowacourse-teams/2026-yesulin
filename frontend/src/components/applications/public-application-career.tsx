"use client";

import type { CareerDraft } from "@/features/applications/application-form-state";
import { usePublicApplication } from "./public-application-context";

const MAX_CAREER_COUNT = 10;
const controlClass = "min-h-12 w-full rounded-control border border-border bg-card px-3 py-2.5 text-base outline-none transition-[border-color,box-shadow] placeholder:text-muted-soft hover:border-muted-soft focus:border-brand focus:ring-2 focus:ring-brand-soft";

export function PublicApplicationCareer() {
  const { state, actions, meta } = usePublicApplication();
  const field = meta.steps[state.stepIndex]!.fields[0]!;
  const addCareer = () => actions.updateCareers([...state.careers, { id: crypto.randomUUID(), title: "", part: "", year: "" }]);
  const patchCareer = (id: string, update: Partial<CareerDraft>) => actions.updateCareers(state.careers.map((career) => career.id === id ? { ...career, ...update } : career));

  return <section><label className="flex cursor-pointer items-start gap-3 rounded-card border border-border bg-surface p-4"><input type="checkbox" checked={state.noCareer} onChange={(event) => actions.updateNoCareer(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-brand" /><span><strong className="block text-sm">아직 공연 경력이 없습니다</strong><span className="mt-1 block text-sm leading-6 text-muted">경력이 없어도 지원할 수 있어요. 자기소개에서 준비 과정을 알려 주세요.</span></span></label>{state.noCareer ? <p className="mt-4 rounded-control border border-brand-line bg-brand-soft px-4 py-3 text-sm text-brand">경력 입력을 건너뛰었어요.</p> : <div className="mt-5 space-y-3">{state.careers.map((career, index) => <CareerCard key={career.id} career={career} index={index} required={field.required} onChange={(update) => patchCareer(career.id, update)} onRemove={() => actions.updateCareers(state.careers.filter((item) => item.id !== career.id))} />)}{state.careers.length < MAX_CAREER_COUNT ? <button type="button" onClick={addCareer} className="min-h-12 w-full rounded-control border border-dashed border-muted-soft bg-card px-4 text-sm font-semibold text-muted-strong hover:border-brand hover:bg-brand-soft hover:text-brand">+ 경력 추가</button> : <p className="text-sm text-muted">경력은 최대 {MAX_CAREER_COUNT}개까지 추가할 수 있어요.</p>}</div>}{state.stepError ? <p role="alert" className="mt-3 text-sm font-medium text-fail">{state.stepError}</p> : null}</section>;
}

function CareerCard({ career, index, required, onChange, onRemove }: { career: CareerDraft; index: number; required: boolean; onChange: (update: Partial<CareerDraft>) => void; onRemove: () => void }) {
  return <article className="rounded-card border border-border bg-card p-4"><div className="mb-4 flex items-center"><strong className="text-sm text-muted-strong">경력 {index + 1}</strong><button type="button" onClick={onRemove} className="ml-auto min-h-9 rounded-control px-3 text-sm font-semibold text-muted hover:bg-fail-bg hover:text-fail">삭제</button></div><label className="block"><span className="mb-2 flex text-sm font-semibold">작품명{required ? <span className="text-fail">*</span> : null}</span><input value={career.title} onChange={(event) => onChange({ title: event.target.value })} placeholder="예: 뮤지컬 <빨래>" className={controlClass} /></label><div className="mt-4 grid gap-4 sm:grid-cols-2"><label><span className="mb-2 flex text-sm font-semibold">맡은 배역{required ? <span className="text-fail">*</span> : null}</span><input value={career.part} onChange={(event) => onChange({ part: event.target.value })} placeholder="앙상블 / 조연 / 주연" className={controlClass} /></label><label><span className="mb-2 flex text-sm font-semibold">연도{required ? <span className="text-fail">*</span> : null}</span><input type="number" min="1900" max="2100" value={career.year} onChange={(event) => onChange({ year: event.target.value })} placeholder="2024" className={`${controlClass} num`} /></label></div></article>;
}
