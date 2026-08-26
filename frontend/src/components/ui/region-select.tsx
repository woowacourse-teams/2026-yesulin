"use client";

import { FieldSelect } from "./controls";
import {
  formatKoreaRegion,
  KOREA_REGIONS,
  parseKoreaRegion,
  sigunguOptions,
} from "@/features/applicants/korea-regions";

/**
 * 거주 지역을 시·도와 시·군·구 두 단계로만 고르게 한다.
 * 값은 "서울특별시 마포구"처럼 한 문자열로 올려보내 Backend 계약을 그대로 쓴다.
 */
export function RegionSelect({ id, value, required, invalid, describedBy, onChange }: {
  readonly id: string;
  readonly value: string;
  readonly required?: boolean;
  readonly invalid?: boolean;
  readonly describedBy?: string;
  readonly onChange: (value: string) => void;
}) {
  const region = parseKoreaRegion(value);
  const options = sigunguOptions(region.sido);
  const unreadable = value.trim() && !region.sido ? value.trim() : "";
  const selectSido = (sido: string) => onChange(sido ? formatKoreaRegion({ sido, sigungu: "" }) : "");
  const selectSigungu = (sigungu: string) => onChange(formatKoreaRegion({ sido: region.sido, sigungu }));

  return <div>
    <div className="grid grid-cols-2 gap-3">
      <FieldSelect
        id={id}
        name={`${id}-sido`}
        required={required}
        value={region.sido}
        aria-label="시·도"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => selectSido(event.target.value)}
      >
        <option value="">시·도 선택</option>
        {KOREA_REGIONS.map((candidate) => <option key={candidate.sido} value={candidate.sido}>{candidate.sido}</option>)}
      </FieldSelect>
      <FieldSelect
        name={`${id}-sigungu`}
        required={required && options.length > 0}
        disabled={!region.sido || options.length === 0}
        value={region.sigungu}
        aria-label="시·군·구"
        aria-invalid={invalid || undefined}
        onChange={(event) => selectSigungu(event.target.value)}
      >
        <option value="">{!region.sido ? "시·도를 먼저 선택" : options.length === 0 ? "해당 없음" : "시·군·구 선택"}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </FieldSelect>
    </div>
    {unreadable ? <p className="mt-2 text-sm leading-6 text-muted">이전에 저장한 주소: {unreadable} · 시·도와 시·군·구를 다시 선택하면 이 값을 대체합니다.</p> : null}
  </div>;
}
