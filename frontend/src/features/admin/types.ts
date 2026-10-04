export type MemberStatus = "PENDING" | "ACTIVE";

export type AdminOtrRedirectReport = {
  readonly environment: "DEV" | "PROD" | "LOCAL";
  readonly startDate: string;
  readonly endDate: string;
  readonly totalClicks: number;
  readonly links: readonly {
    readonly otrId: string;
    readonly clicks: number;
    readonly lastClickedAt: string;
  }[];
  readonly available: boolean;
  readonly truncated: boolean;
  readonly readAt: string;
};

export type AuditionStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export type AdminShowStatus = "DRAFT" | "OPEN" | "CLOSED";

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
  readonly otrAuditions: number;
  readonly otrSubmissions: number;
  readonly newOtrSubmissionsInLastWeek: number;
  readonly shows: number;
  readonly openShows: number;
  /** 현재 확정 상태인 예매 매수 합계다. */
  readonly reservedTickets: number;
  readonly newReservationsInLastWeek: number;
};

export type AdminNewMembers = {
  readonly applicants: number;
  readonly producers: number;
};

/** 배우는 소셜 계정, 기획사는 이메일로 가입한다. 여러 소셜 계정을 연결한 배우는 경로마다 센다. */
export type AdminSignupMethods = {
  readonly kakao: number;
  readonly naver: number;
  readonly google: number;
  readonly email: number;
  readonly unknownApplicants: number;
};

export type AdminMemberStats = {
  readonly applicants: number;
  readonly producers: number;
  readonly signupMethods: AdminSignupMethods;
  readonly today: AdminNewMembers;
  readonly lastWeek: AdminNewMembers;
  readonly lastMonth: AdminNewMembers;
};

/** 한국 날짜 하루의 활동 수다. 예매는 그날 생성돼 현재 확정 상태인 예매만 센다. */
export type AdminDailyActivity = {
  readonly date: string;
  readonly applicantSignups: number;
  readonly producerSignups: number;
  readonly submissions: number;
  readonly otrSubmissions: number;
  readonly reservations: number;
  readonly reservedTickets: number;
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

/** 회차 하나의 예매 집계다. 매수·건수는 확정 예매만, 취소 건수는 취소된 예매만 센다. */
export type AdminShowSession = {
  readonly sessionId: number;
  readonly startsAt: string;
  readonly capacity: number;
  readonly reservedTickets: number;
  readonly reservationCount: number;
  readonly canceledReservationCount: number;
};

/** 무료 공연 한 건의 예매 집계다. 예매자 이름·휴대폰과 예매번호는 받지 않는다. */
export type AdminShow = {
  readonly showId: string;
  readonly title: string;
  readonly status: AdminShowStatus;
  /** 기획사 계정의 회사명. */
  readonly companyName: string | null;
  /** 공연에 따로 적은 주최 이름. 비어 있으면 관객에게 `companyName`이 보인다. */
  readonly hostName: string;
  readonly createdAt: string;
  readonly totalCapacity: number;
  readonly reservedTickets: number;
  readonly reservationCount: number;
  readonly canceledReservationCount: number;
  readonly sessions: readonly AdminShowSession[];
};

export type AdminShowHostName = {
  readonly showId: string;
  readonly hostName: string;
  readonly companyName: string;
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

export type AdminUnusedFileStatus = "PENDING" | "READY" | "DELETING";

export type AdminUnusedFile = {
  readonly fileId: number;
  readonly ownerId: number;
  readonly status: AdminUnusedFileStatus;
  readonly storageScope: "PUBLIC" | "PRIVATE";
  readonly createdAt: string;
  readonly unusedSince: string;
  readonly deletableAt: string;
  readonly deletable: boolean;
};

export type AdminUnusedFilesPage = {
  readonly files: readonly AdminUnusedFile[];
  readonly page: number;
  readonly size: number;
  readonly hasNext: boolean;
};

export type AdminFileDeletionResult = {
  readonly results: readonly {
    readonly fileId: number;
    readonly status: "DELETED" | "ALREADY_DELETED" | "FAILED";
    readonly code: string | null;
  }[];
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

/** 일정표 문자 발송 대기열. 문자 업체를 연결하기 전까지 운영자가 번호와 본문을 복사해 직접 보낸다. */
export type AdminTimetableMessageType =
  | "ORGANIZER_LINK"
  | "ORGANIZER_TIME_REQUEST"
  | "ACTOR_INVITATION"
  | "ACTOR_SCHEDULE_CHANGED";

export type AdminTimetableMessageStatus = "PENDING" | "SENT";

export type AdminTimetableMessage = {
  readonly id: number;
  readonly type: AdminTimetableMessageType;
  readonly status: AdminTimetableMessageStatus;
  readonly timetableTitle: string;
  readonly organizerName: string;
  readonly recipientName: string;
  readonly recipientPhone: string;
  readonly body: string;
  readonly createdAt: string;
  readonly sentAt: string | null;
};

export type AdminTimetableMessages = {
  /** 목록 상한과 관계없는 전체 대기 건수. */
  readonly pendingCount: number;
  readonly messages: readonly AdminTimetableMessage[];
};

export type AdminAuditionPostStatus = "PUBLISHED" | "HIDDEN";

/** 운영자가 OTR에서 가져온 공고. `/api/v1/admin/audition-posts` 응답과 같다. */
export type AdminAuditionPost = {
  readonly id: number;
  readonly source: string;
  readonly externalId: string;
  readonly sourceUrl: string;
  readonly category: string;
  readonly title: string;
  readonly authorName: string;
  readonly deadlineText: string;
  readonly closed: boolean;
  readonly status: AdminAuditionPostStatus;
  readonly imageCount: number;
  readonly attachmentCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type AdminAuditionPostImport = {
  readonly post: AdminAuditionPost;
  /** 처음 가져왔으면 true, 원문으로 다시 가져와 교체했으면 false. */
  readonly created: boolean;
  /** 형식·크기 기준에 맞지 않아 옮기지 않은 첨부파일. */
  readonly skippedAttachments: readonly { readonly filename: string; readonly reason: string }[];
};
