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

export const defaultStatusForWork = (work: WorkMode): StatusFilter =>
  work === "DONE" ? "PASS" : "ALL";

export const shouldClearMismatchOnlyAfterBulkReview = (status: ReviewStatus) =>
  status === "FAIL";

export type AuditionFilters = {
  readonly work: WorkMode;
  readonly status: StatusFilter;
  readonly query: string;
  readonly genders: ReadonlySet<Gender>;
  readonly numeric: Readonly<Record<NumericField, NumericCondition | null>>;
  readonly mismatchOnly: boolean;
  readonly view: "card" | "table" | "single";
};

/**
 * 목록에서 상세 지원서를 열었다 돌아와도 같은 심사 맥락을 보존한다.
 * Set과 수치 조건도 URL에서 복원할 수 있는 값만 담는다.
 */
export type AuditionListRouteState = Pick<
  AuditionFilters,
  "work" | "status" | "query" | "genders" | "numeric" | "mismatchOnly" | "view"
>;

export type AuditionListRouteQuery = {
  readonly work?: string;
  readonly status?: string;
  readonly view?: string;
  readonly q?: string;
  readonly genders?: string;
  readonly age?: string;
  readonly height?: string;
  readonly weight?: string;
  readonly mismatch?: string;
};

export const emptyNumeric = (): Record<NumericField, NumericCondition | null> => ({
  age: null,
  height: null,
  weight: null,
});

export const initialFilters = (work: WorkMode): AuditionFilters => ({
  work,
  status: defaultStatusForWork(work),
  query: "",
  genders: new Set(),
  numeric: emptyNumeric(),
  mismatchOnly: false,
  view: "card",
});

export function listRouteStateFromRoute(route: AuditionListRouteQuery): AuditionListRouteState {
  const work: WorkMode = route.work === "DONE" ? "DONE" : "PENDING";
  const validDoneStatuses: readonly StatusFilter[] = ["ALL", "PASS", "FAIL", "ETC"];
  const status = work === "DONE" && validDoneStatuses.includes(route.status as StatusFilter)
    ? route.status as StatusFilter
    : defaultStatusForWork(work);
  return {
    work,
    status,
    query: route.q?.trim() ?? "",
    genders: parseGenders(route.genders),
    numeric: {
      age: parseNumericCondition(route.age),
      height: parseNumericCondition(route.height),
      weight: parseNumericCondition(route.weight),
    },
    mismatchOnly: route.mismatch === "1",
    view: route.view === "table" || route.view === "single" ? route.view : "card",
  };
}

export function initialFiltersFromRoute(route: AuditionListRouteQuery): AuditionFilters {
  return listRouteStateFromRoute(route);
}

export const activeDetailFilterCount = (filters: AuditionFilters) =>
  filters.genders.size
  + NUMERIC_FIELDS.filter((field) => filters.numeric[field] !== null).length;

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

function parseGenders(value: string | undefined): ReadonlySet<Gender> {
  if (!value) return new Set();
  return new Set(value.split(",").filter((gender): gender is Gender => gender === "MALE" || gender === "FEMALE"));
}

function parseNumericCondition(value: string | undefined): NumericCondition | null {
  if (!value) return null;
  const [op, rawValue] = value.split(":", 2);
  const parsed = Number(rawValue);
  if ((op !== "gte" && op !== "lte") || !Number.isSafeInteger(parsed) || parsed < 0) return null;
  return { op, value: parsed };
}
