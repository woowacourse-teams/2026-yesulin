import type { Applicant, Gender, ReviewStatus } from "./types";

/** 나이·키·몸무게처럼 '이상/이하' 한 조건만 거는 수치 필터. */
export const NUMERIC_FIELDS = ["age", "height", "weight"] as const;
export type NumericField = (typeof NUMERIC_FIELDS)[number];

export const NUMERIC_FIELD_META = {
  age: { label: "나이", unit: "세", initial: 25 },
  height: { label: "키", unit: "cm", initial: 165 },
  weight: { label: "몸무게", unit: "kg", initial: 60 },
} as const satisfies Record<NumericField, { label: string; unit: string; initial: number }>;

export type NumericCondition = { readonly op: "gte" | "lte"; readonly value: number };

/** 검토 대기 / 검토 완료. 심사자는 둘 중 하나에만 집중한다. */
export type WorkMode = "PENDING" | "DONE";
export type StatusFilter = ReviewStatus | "ALL";

export type AuditionFilters = {
  readonly work: WorkMode;
  readonly status: StatusFilter;
  readonly query: string;
  readonly genders: ReadonlySet<Gender>;
  readonly numeric: Readonly<Record<NumericField, NumericCondition | null>>;
  readonly mismatchOnly: boolean;
  readonly view: "card" | "table";
};

export const emptyNumeric = (): Record<NumericField, NumericCondition | null> => ({
  age: null,
  height: null,
  weight: null,
});

export const initialFilters = (work: WorkMode): AuditionFilters => ({
  work,
  status: "ALL",
  query: "",
  genders: new Set(),
  numeric: emptyNumeric(),
  mismatchOnly: false,
  view: "card",
});

export const activeDetailFilterCount = (filters: AuditionFilters) =>
  filters.genders.size
  + NUMERIC_FIELDS.filter((field) => filters.numeric[field] !== null).length
  + (filters.mismatchOnly ? 1 : 0);

const matchesNumeric = (value: number | null, condition: NumericCondition | null) =>
  !condition || (value !== null && (condition.op === "gte" ? value >= condition.value : value <= condition.value));

/** 검토 대기/완료와 상태 칩만 적용한 목록. 조건 불일치 배지 수를 세는 기준이다. */
export function applyWorkFilter(
  applicants: readonly Applicant[],
  filters: AuditionFilters,
): readonly Applicant[] {
  return applicants.filter((applicant) => {
    const { status } = applicant.review;
    if (filters.work === "PENDING") return status === "PENDING";
    if (status === "PENDING") return false;
    return filters.status === "ALL" || status === filters.status;
  });
}

export function applyFilters(
  applicants: readonly Applicant[],
  filters: AuditionFilters,
): readonly Applicant[] {
  return applyWorkFilter(applicants, filters).filter((applicant) => {
    const query = filters.query.trim().toLocaleLowerCase("ko-KR");
    if (query) {
      const searchable = [
        applicant.name,
        applicant.school,
        applicant.phone,
        applicant.email,
        applicant.roleName,
      ];
      if (!searchable.some((value) => value.toLocaleLowerCase("ko-KR").includes(query))) return false;
    }
    if (filters.genders.size > 0 && !filters.genders.has(applicant.gender)) return false;
    if (!matchesNumeric(applicant.age, filters.numeric.age)) return false;
    if (!matchesNumeric(applicant.height, filters.numeric.height)) return false;
    if (!matchesNumeric(applicant.weight, filters.numeric.weight)) return false;
    if (filters.mismatchOnly && applicant.mismatchReasons.length === 0) return false;
    return true;
  });
}

export const countMismatches = (applicants: readonly Applicant[], filters: AuditionFilters) =>
  applyWorkFilter(applicants, filters).filter((applicant) => applicant.mismatchReasons.length > 0).length;
