import { MAX_VIDEO_REQUIREMENTS, type ApplicationFieldInput, type PhotoRequirement, type VideoRequirement } from "@/features/auditions/creation-types";
import { FieldInput } from "@/components/ui/controls";

const fieldCardClass = "flex min-h-12 min-w-0 items-center gap-2 rounded-control border border-border bg-card px-3 py-2.5";

export function ApplicationFieldEditor({ fields, onChange }: {
  readonly fields: readonly ApplicationFieldInput[];
  readonly onChange: (fields: readonly ApplicationFieldInput[]) => void;
}) {
  const patch = (id: string, update: Partial<ApplicationFieldInput>) => onChange(fields.map((field) => field.id === id ? { ...field, ...update } : field));
  const basic = fields.filter((field) => !field.custom && field.section === "BASIC");
  const additional = fields.filter((field) => !field.custom && field.section === "ADDITIONAL");
  const photos = fields.find((field) => field.id === "PHOTOS");
  const video = fields.find((field) => field.id === "VIDEO");
  const custom = fields.filter((field) => field.custom);

  const addCustom = () => {
    const id = `custom-${Date.now()}`;
    onChange([...fields, { id, label: "", enabled: true, required: false, custom: true, section: "CUSTOM", inputType: "TEXTAREA", order: custom.length * 10 + 10, layout: "FULL", config: { placeholder: "답변을 입력해 주세요.", maxLength: 2000 } }]);
  };

  return <div className="space-y-5">
    <FieldGroup title="기본정보" description="선택한 기본정보는 지원서에서 필수로 입력받습니다.">
      <FieldChecks fields={basic} onToggle={(field, enabled) => patch(field.id, { ...field, enabled, required: enabled })} />
    </FieldGroup>
    <FieldGroup title="추가정보" description="배우 프로필에서 불러올 수 있으며, 선택한 항목은 빈 값도 허용합니다.">
      <FieldChecks fields={additional} onToggle={(field, enabled) => patch(field.id, { enabled, required: false })} />
    </FieldGroup>
    {photos ? <FieldGroup title="프로필 사진" description="어떤 사진을 몇 장 받을지 정해 주세요. 전체 합계는 최대 10장입니다.">
      <label className={fieldCardClass}><input type="checkbox" checked={photos.enabled} onChange={(event) => patch(photos.id, { enabled: event.target.checked, required: event.target.checked })} className="h-5 w-5 accent-brand" /><span className="text-sm font-semibold">프로필 사진 받기</span></label>
      {photos.enabled ? <PhotoRequirements value={photos.config.photoRequirements ?? []} onChange={(requirements) => patch(photos.id, { config: { ...photos.config, photoRequirements: requirements, maxCount: requirements.reduce((sum, item) => sum + item.count, 0) } })} /> : null}
    </FieldGroup> : null}
    {video ? <FieldGroup title="영상 링크" description={`필요한 영상을 설명별로 추가해 주세요. 배우는 각 설명에 맞는 링크를 제출하며, 최대 ${MAX_VIDEO_REQUIREMENTS}개까지 받을 수 있습니다.`}>
      <VideoRequirements value={video.config.videoRequirements ?? []} onChange={(requirements) => patch(video.id, { enabled: requirements.length > 0, required: requirements.length > 0, config: { ...video.config, videoRequirements: requirements, maxCount: MAX_VIDEO_REQUIREMENTS } })} />
    </FieldGroup> : null}
    <FieldGroup title="추가 질문" description="질문 문구는 최대 255자, 배우가 작성하는 답변은 최대 2,000자입니다. 질문마다 필수 여부를 정할 수 있습니다.">
      {custom.map((field) => <div key={field.id} className="flex flex-wrap gap-2 sm:flex-nowrap"><FieldInput required maxLength={255} value={field.label} onChange={(event) => patch(field.id, { label: event.target.value.slice(0, 255) })} placeholder="예: 지원 동기를 적어 주세요." className="min-w-52 flex-1" /><RequirementSelect required={field.required} label={field.label || "추가 질문"} onChange={(required) => patch(field.id, { required })} /><button type="button" onClick={() => onChange(fields.filter((item) => item.id !== field.id))} className="min-h-11 rounded-control border border-border bg-card px-3 text-sm text-muted-strong hover:text-fail">삭제</button></div>)}
      <button type="button" onClick={addCustom} className="min-h-11 w-full rounded-control border border-dashed border-muted-soft bg-card px-3 py-2.5 text-sm font-semibold text-muted-strong hover:border-brand-line hover:bg-brand-soft hover:text-brand">추가 질문 만들기</button>
    </FieldGroup>
  </div>;
}

function VideoRequirements({ value, onChange }: { readonly value: readonly VideoRequirement[]; readonly onChange: (value: readonly VideoRequirement[]) => void }) {
  const patch = (id: string, update: Partial<VideoRequirement>) => onChange(value.map((item) => item.id === id ? { ...item, ...update } : item));
  return <div className="space-y-2">
    {value.length === 0 ? <p className="rounded-control border border-dashed border-border bg-card px-4 py-5 text-center text-sm text-muted">아직 요청할 영상이 없습니다.</p> : null}
    {value.map((item, index) => <div key={item.id} className="grid gap-2 sm:grid-cols-[1fr_auto]"><FieldInput required maxLength={255} value={item.description} onChange={(event) => patch(item.id, { description: event.target.value.slice(0, 255) })} placeholder="예: 자유 연기 영상" aria-label={`영상 요구 ${index + 1} 설명`} /><button type="button" onClick={() => onChange(value.filter((candidate) => candidate.id !== item.id))} className="min-h-11 rounded-control border border-border bg-card px-3 text-sm text-muted-strong hover:text-fail">삭제</button></div>)}
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-muted-strong">{value.length}개 / 최대 {MAX_VIDEO_REQUIREMENTS}개</span><button type="button" disabled={value.length >= MAX_VIDEO_REQUIREMENTS} onClick={() => onChange([...value, { id: `video-${Date.now()}`, description: "" }])} className="min-h-11 rounded-control border border-dashed border-muted-soft bg-card px-3 text-sm font-semibold text-muted-strong hover:border-brand-line hover:bg-brand-soft hover:text-brand disabled:opacity-40">링크 추가하기</button></div>
  </div>;
}

function FieldGroup({ title, description, children }: { readonly title: string; readonly description: string; readonly children: React.ReactNode }) {
  return <section className="space-y-2 rounded-card border border-border bg-surface p-4"><div><h4 className="text-sm font-bold">{title}</h4><p className="mt-1 text-sm leading-6 text-muted">{description}</p></div>{children}</section>;
}

function FieldChecks({ fields, onToggle }: { readonly fields: readonly ApplicationFieldInput[]; readonly onToggle: (field: ApplicationFieldInput, enabled: boolean) => void }) {
  return <div className="grid gap-2 sm:grid-cols-2">{fields.map((field) => <label key={field.id} className={fieldCardClass}><input type="checkbox" checked={field.enabled} onChange={(event) => onToggle(field, event.target.checked)} className="h-5 w-5 shrink-0 accent-brand" /><span className={field.enabled ? "text-sm text-foreground" : "text-sm text-muted"}>{field.label}</span></label>)}</div>;
}

function PhotoRequirements({ value, onChange }: { readonly value: readonly PhotoRequirement[]; readonly onChange: (value: readonly PhotoRequirement[]) => void }) {
  const total = value.reduce((sum, item) => sum + item.count, 0);
  const patch = (id: string, update: Partial<PhotoRequirement>) => onChange(value.map((item) => item.id === id ? { ...item, ...update } : item));
  return <div className="space-y-2">
    {value.map((item, index) => <div key={item.id} className="grid gap-2 sm:grid-cols-[1fr_100px_auto]"><FieldInput required maxLength={255} value={item.description} onChange={(event) => patch(item.id, { description: event.target.value.slice(0, 255) })} placeholder="예: 전신 사진" aria-label={`사진 요구 ${index + 1} 설명`} /><FieldInput required type="number" min={1} max={10} value={item.count} onChange={(event) => patch(item.id, { count: Number(event.target.value) })} aria-label={`${item.description || `사진 요구 ${index + 1}`} 장수`} /><button type="button" disabled={value.length === 1} onClick={() => onChange(value.filter((candidate) => candidate.id !== item.id))} className="min-h-11 rounded-control border border-border bg-card px-3 text-sm text-muted-strong disabled:opacity-40">삭제</button></div>)}
    <div className="flex flex-wrap items-center justify-between gap-2"><span className={`text-sm font-semibold ${total > 10 ? "text-fail" : "text-muted-strong"}`}>총 {total}장 / 최대 10장</span><button type="button" disabled={total >= 10} onClick={() => onChange([...value, { id: `photo-${Date.now()}`, description: "", count: 1 }])} className="min-h-11 rounded-control border border-dashed border-muted-soft bg-card px-3 text-sm font-semibold text-muted-strong disabled:opacity-40">사진 종류 추가</button></div>
  </div>;
}

function RequirementSelect({ required, label, onChange }: { readonly required: boolean; readonly label: string; readonly onChange: (required: boolean) => void }) {
  return <select aria-label={`${label} 필수 여부`} value={required ? "required" : "optional"} onChange={(event) => onChange(event.target.value === "required")} className="min-h-11 shrink-0 rounded-control border border-border bg-card px-2 text-sm text-muted-strong"><option value="required">필수</option><option value="optional">선택</option></select>;
}
