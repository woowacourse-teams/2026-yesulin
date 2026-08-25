import type { Gender, ReviewStatus, ScreeningSearchCondition } from "./types";

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

export function toScreeningSearchCondition(
  filters: AuditionFilters,
  keyword = filters.query,
): ScreeningSearchCondition {
  const numeric = (field: NumericField) => {
    const condition = filters.numeric[field];
    return condition ? { operator: condition.op.toUpperCase() as "GTE" | "LTE", value: condition.value } : undefined;
  };
  return {
    work: filters.work,
    status: filters.work === "DONE" && filters.status !== "ALL" ? filters.status : undefined,
    keyword,
    genders: [...filters.genders].sort(),
    age: numeric("age"),
    height: numeric("height"),
    weight: numeric("weight"),
    mismatchOnly: filters.mismatchOnly || undefined,
  };
}

export const screeningSearchKey = (condition: ScreeningSearchCondition) => JSON.stringify(condition);
