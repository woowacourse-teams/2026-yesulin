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

export type AdminAuditLogPage = {
  readonly logs: readonly AdminAuditLog[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
};

export type AdminLogFormat = "STRUCTURED" | "LEGACY";
export type AdminLogLevel = "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR";

export type AdminLogEntry = {
  readonly format: AdminLogFormat;
  readonly timestamp: string | null;
  readonly level: AdminLogLevel | null;
  readonly logger: string | null;
  readonly thread: string | null;
  readonly requestId: string | null;
  readonly message: string | null;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly raw: string;
};

export type AdminLog = {
  readonly lines: readonly string[];
  readonly entries: readonly AdminLogEntry[];
  /** 읽기 상한 때문에 더 오래된 내용을 보지 못했다는 표시다. */
  readonly truncated: boolean;
  /** 로그 파일을 읽을 수 없으면 false다. */
  readonly available: boolean;
  readonly readAt: string;
};

export type AdminSubmissionRole = {
  readonly roleId: number;
  readonly roleName: string;
};

export type AdminSubmissionSummary = {
  readonly submissionId: string;
  readonly applicantName: string | null;
  readonly applicantEmail: string | null;
  readonly applicantPhone: string | null;
  readonly submittedAt: string;
  readonly selectedRoles: readonly AdminSubmissionRole[];
};

export type AdminSubmissionDetail = {
  readonly submissionId: string;
  readonly auditionId: string;
  readonly performanceTitle: string;
  readonly auditionTitle: string;
  readonly companyName: string;
  readonly posterUrl: string;
  readonly submittedAt: string;
  readonly applicant: {
    readonly basicInformation: {
      readonly name: string | null;
      readonly height: number | null;
      readonly weight: number | null;
      readonly birthDate: string | null;
      readonly gender: "MALE" | "FEMALE" | null;
      readonly phone: string | null;
      readonly email: string | null;
      readonly address: string | null;
    };
    readonly additionalInformation: {
      readonly school: string | null;
      readonly links: readonly string[];
      readonly nationality: string | null;
      readonly coverLetter: string | null;
      readonly specialty: string | null;
      readonly hobbies: string | null;
      readonly militaryServiceStatus: "COMPLETED" | "NOT_COMPLETED" | "NOT_APPLICABLE" | null;
      readonly careers: readonly { readonly year: number; readonly title: string; readonly roleName: string }[];
    };
    readonly ageAtRecruitmentDeadline: number | null;
  };
  readonly selectedRoles: readonly AdminSubmissionRole[];
  readonly formAnswers: {
    readonly questionAnswers: readonly {
      readonly questionId: number;
      readonly question: string;
      readonly answer: string;
    }[];
    readonly photoRequirementAnswers: readonly {
      readonly photoRequirementId: number;
      readonly requirementDescription: string;
      readonly fileId: number;
      readonly url: string;
    }[];
    readonly videoRequirementAnswers: readonly {
      readonly videoRequirementId: number;
      readonly requirementDescription: string;
      readonly url: string;
    }[];
  };
  readonly consents: readonly {
    readonly type: string;
    readonly documentVersion: string;
    readonly recipientName: string | null;
    readonly agreedAt: string;
  }[];
};
