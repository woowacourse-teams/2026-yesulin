export type CareerIdentity = {
  readonly year: number | string;
  readonly title: string;
  readonly part: string;
};

export function careerIdentity(career: CareerIdentity) {
  return JSON.stringify([Number(career.year), career.title.trim(), career.part.trim()]);
}

export function sameCareer(left: CareerIdentity, right: CareerIdentity) {
  return careerIdentity(left) === careerIdentity(right);
}
