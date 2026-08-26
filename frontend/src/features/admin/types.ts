export type MemberStatus = "PENDING" | "ACTIVE";

export type AuditionStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export type AdminOverview = {
  readonly applicants: number;
  readonly producers: number;
  readonly pendingProducers: number;
  readonly activeProducers: number;
  readonly performances: number;
  readonly auditions: number;
  readonly draftAuditions: number;
  readonly publishedAuditions: number;
  readonly closedAuditions: number;
  readonly submissions: number;
  readonly newProducersInLastWeek: number;
  readonly newSubmissionsInLastWeek: number;
};

export type AdminProducer = {
  readonly memberId: number;
  readonly email: string;
  readonly status: MemberStatus;
  readonly joinedAt: string;
  readonly companyName: string | null;
  readonly contactName: string | null;
  readonly contactRole: string | null;
  readonly phone: string | null;
  readonly performanceCount: number;
  readonly auditionCount: number;
};

export type AdminAudition = {
  readonly auditionId: string;
  readonly title: string;
  readonly status: AuditionStatus;
  readonly companyName: string | null;
  readonly performanceTitle: string | null;
  readonly createdAt: string;
  readonly publishedAt: string | null;
  readonly submissionCount: number;
};

export type AdminAuditLog = {
  readonly id: number;
  readonly actorMemberId: number;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: number;
  readonly detail: string;
  readonly createdAt: string;
};
