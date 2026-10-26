export type ReviewKey = string | number;

export type MatchStatus = "WAITING" | "MATCHED" | "NEEDS_CHECK";
export type ReviewDecision = "PENDING" | "PASS" | "FAIL" | "HOLD";
export type DecisionFilter = "PENDING" | "PASS" | "FAIL";

/** 기존 보류 항목도 판정 대기에서 계속 확인할 수 있다. */
export function matchesDecision(entry: Pick<ReviewEntry, "decision">, filter: DecisionFilter) {
  return filter === "PENDING" ? entry.decision === "PENDING" || entry.decision === "HOLD" : entry.decision === filter;
}

export type ReviewSummary = {
  readonly id: ReviewKey;
  readonly title: string;
  readonly createdAt: string;
  readonly roleCount: number;
  readonly entryCount: number;
};

export type ReviewRole = { readonly id: ReviewKey; readonly name: string };

export type ReviewEntry = {
  readonly id: ReviewKey;
  readonly jobId: string;
  readonly originalFilename: string;
  readonly applicantName: string | null;
  readonly roleId: ReviewKey | null;
  readonly matchStatus: MatchStatus;
  readonly matchEvidence: string | null;
  readonly memo: string | null;
  readonly decision: ReviewDecision;
};

export type ReviewDetail = {
  readonly id: ReviewKey;
  readonly title: string;
  readonly createdAt: string;
  readonly roles: readonly ReviewRole[];
  readonly entries: readonly ReviewEntry[];
};

export type ReviewProgress = {
  readonly total: number;
  readonly uploading: number;
  readonly waiting: number;
  readonly completed: number;
  readonly partial: number;
  readonly failed: number;
  /** 실패·일부 완료도 처리 종료에 포함한다. 브라우저의 아직 미접수 파일은 포함하지 않는다. */
  readonly complete: boolean;
};

export const matchStatusLabels: Record<MatchStatus, string> = {
  WAITING: "내용 정리 중", MATCHED: "지원 배역 확인됨", NEEDS_CHECK: "미기재",
};

export const decisionLabels: Record<ReviewDecision, string> = {
  PENDING: "미검토", PASS: "합격", FAIL: "불합격", HOLD: "보류",
};

export const decisionOptions = Object.keys(decisionLabels) as ReviewDecision[];

export type EntryFilter = "ALL" | "WAITING" | "NEEDS_CHECK" | { readonly roleId: ReviewKey };

export const sameKey = (a: ReviewKey | null | undefined, b: ReviewKey | null | undefined) =>
  a != null && b != null && String(a) === String(b);

/** 자동으로 명확히 매칭된 항목만 배역에 속하고, 나머지는 '미기재'로 남긴다. */
export function matchesFilter(entry: ReviewEntry, filter: EntryFilter) {
  if (filter === "ALL") return true;
  if (filter === "WAITING" || filter === "NEEDS_CHECK") return entry.matchStatus === filter;
  return entry.matchStatus === "MATCHED" && sameKey(entry.roleId, filter.roleId);
}

/** 배역 입력란은 쉼표·줄바꿈 단위다. 공백만 있는 줄은 버리고 같은 이름은 오류로 돌려준다. */
export function parseRoleLines(text: string): { readonly roles: string[]; readonly duplicate: string | null } {
  const roles = text.split(/[,\r\n]+/).map(line => line.trim()).filter(Boolean);
  const duplicate = roles.find((role, index) => roles.indexOf(role) !== index) ?? null;
  return { roles, duplicate };
}
