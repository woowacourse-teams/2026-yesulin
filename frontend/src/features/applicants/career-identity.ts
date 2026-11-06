export type CareerIdentity = {
  readonly year: number | string;
  readonly month?: number | string | null;
  readonly title: string;
  readonly part: string;
};

export function careerIdentity(career: CareerIdentity) {
  return JSON.stringify([Number(career.year), Number(career.month) || null, career.title.trim(), career.part.trim()]);
}

export function sameCareer(left: CareerIdentity, right: CareerIdentity) {
  return careerIdentity(left) === careerIdentity(right);
}

/** 월을 모르는 과거 경력은 같은 해의 마지막에 둔다. 같은 연월의 원래 순서는 유지한다. */
export function compareCareerRecency(left: Pick<CareerIdentity, "year" | "month">, right: Pick<CareerIdentity, "year" | "month">) {
  return Number(right.year) - Number(left.year) || (Number(right.month) || 0) - (Number(left.month) || 0);
}

export function careerDateLabel(year: number | string, month?: number | string | null) {
  return month ? `${year}.${String(month).padStart(2, "0")}` : String(year);
}
