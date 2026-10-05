"use client";

import { useId } from "react";
import { FieldInput, FieldTextarea } from "@/components/ui/controls";
import { formatPhoneInput } from "@/features/timetables/contacts";
import type { ProfileFormErrors } from "@/features/timetables/profile-form";
import { TIMETABLE_LIMITS, type TimetableProfile } from "@/features/timetables/types";

const INVALID_CLASS = "aria-invalid:border-fail aria-invalid:ring-2 aria-invalid:ring-fail-bg";

/**
 * 일정표 이름·단체명·담당자 번호와 배우에게 보여 줄 장소·안내 사항. 설명은 placeholder로만 준다.
 * 잘못된 칸은 빨간 테두리로 표시하고, 비어 있는 칸이 아니라 형식이 틀린 칸에만 이유를 적는다.
 */
export function ProfileFields({ form, errors, onChange, disabled = false }: {
  readonly form: TimetableProfile;
  readonly errors: ProfileFormErrors;
  readonly onChange: (form: TimetableProfile) => void;
  readonly disabled?: boolean;
}) {
  const id = useId();
  const field = (name: keyof TimetableProfile) => ({
    id: `${id}-${name}`,
    value: form[name],
    disabled,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] && form[name].trim() ? `${id}-${name}-error` : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...form, [name]: event.target.value }),
  });
  const error = (name: keyof TimetableProfile) => (
    errors[name] && form[name].trim() ? <p id={`${id}-${name}-error`} className="mt-2 text-sm text-fail">{errors[name]}</p> : null
  );
  const label = (name: keyof TimetableProfile, text: string, required: boolean) => (
    <label htmlFor={`${id}-${name}`} className="text-sm font-semibold text-foreground">
      {text} {required ? <span className="text-fail">*</span> : <span className="font-normal text-muted">(선택)</span>}
    </label>
  );

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        {label("title", "일정표 이름", true)}
        <FieldInput {...field("title")} maxLength={TIMETABLE_LIMITS.titleLength} placeholder="예: 정기공연 2차 오디션" className={`mt-2 ${INVALID_CLASS}`} />
        {error("title")}
      </div>
      <div>
        {label("organizerName", "단체명", true)}
        <FieldInput {...field("organizerName")} maxLength={TIMETABLE_LIMITS.organizerNameLength} placeholder="예: 극단 하늘" className={`mt-2 ${INVALID_CLASS}`} />
        {error("organizerName")}
      </div>
      <div>
        {label("organizerPhone", "담당자 휴대폰", true)}
        <FieldInput
          {...field("organizerPhone")}
          onChange={(event) => onChange({ ...form, organizerPhone: formatPhoneInput(event.target.value) })}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={13}
          placeholder="010-1234-5678"
          className={`mt-2 ${INVALID_CLASS}`}
        />
        {error("organizerPhone")}
      </div>
      <div className="sm:col-span-2">
        {label("location", "오디션 장소", false)}
        <FieldInput {...field("location")} maxLength={TIMETABLE_LIMITS.locationLength} placeholder="예: 대학로 ○○빌딩 3층 연습실" className={`mt-2 ${INVALID_CLASS}`} />
        {error("location")}
      </div>
      <div className="sm:col-span-2">
        {label("guide", "안내 사항", false)}
        <FieldTextarea {...field("guide")} rows={3} maxLength={TIMETABLE_LIMITS.guideLength} placeholder="예: 지정 대사 1분, 움직이기 편한 복장" className={`mt-2 resize-y ${INVALID_CLASS}`} />
        {error("guide")}
      </div>
    </div>
  );
}
