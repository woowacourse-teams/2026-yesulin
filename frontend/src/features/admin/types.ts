import type { VenueAddress } from "../auditions/creation-types";

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
  /** 운영자가 등록한 공연의 외부 예매 주소. 기획사 공연은 빈 문자열이다. */
  readonly externalReservationUrl: string;
  /** 관객이 예매하기를 눌러 외부 예매 페이지로 이동한 횟수. 기획사 공연은 0이다. */
  readonly externalReservationVisits: number;
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

export type AdminAuditionPostStatus = "PENDING" | "PUBLISHED" | "HIDDEN";

/** 공고를 처음 만든 경로. 다시 가져오거나 고쳐도 바뀌지 않는다. */
export type AdminAuditionPostCreation = "AUTO_IMPORT" | "ADMIN_IMPORT" | "ADMIN_WRITE" | "PRODUCER_WRITE";

/** OTR에서 가져오거나 운영자·기획사가 직접 쓴 공고. `/api/v1/admin/audition-posts` 응답과 같다. */
export type AdminAuditionPost = {
  readonly id: number;
  /** 원문 출처. 직접 쓴 공고는 `YESULIN`이다. */
  readonly source: string;
  /** 원문 번호. 직접 쓴 공고는 null이다. */
  readonly externalId: string | null;
  readonly sourceUrl: string | null;
  readonly category: string;
  readonly title: string;
  /** 저장된 작성자(원문 닉네임이나 운영자가 쓴 이름). 기획사에 연결된 공고는 공개 화면에 `ownerName`이 보인다. */
  readonly authorName: string;
  readonly deadlineText: string;
  readonly closed: boolean;
  readonly status: AdminAuditionPostStatus;
  readonly createdVia: AdminAuditionPostCreation;
  readonly viewCount: number;
  /** 숨긴 상태에서 상세 주소를 열어 OTR 원문으로 보낸 수. 조회수와 따로 센다. */
  readonly redirectCount: number;
  readonly imageCount: number;
  readonly attachmentCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** 운영자나 소유 기획사가 마지막으로 직접 고친 시각. 고친 적이 없거나 원문으로 다시 가져왔으면 null. */
  readonly editedAt: string | null;
  /** 이 공고를 고칠 수 있는 기획사 회원 ID. 연결되지 않았으면 null. */
  readonly ownerId: number | null;
  /** 연결된 기획사 이름. 연결이 없거나 기획사 정보가 없어졌으면 null. */
  readonly ownerName: string | null;
  /** 공고를 올린 공연사 ID. 공연사를 공개해야 공개 상세에 함께 보인다. 연결되지 않았으면 null. */
  readonly companyId: number | null;
};

/** 기획사 한 곳의 공고 수와 자동 연결된 원문 작성자. */
export type AdminAuditionPostOwner = {
  readonly ownerId: number;
  /** 기획사 정보가 없어졌으면 null. */
  readonly companyName: string | null;
  readonly pendingCount: number;
  readonly publishedCount: number;
  readonly hiddenCount: number;
  /** 연결된 공고 중 가장 최근에 만든 시각. 공고가 없으면 null. */
  readonly latestCreatedAt: string | null;
  readonly authorLinks: readonly AdminAuditionPostAuthorLink[];
};

export type AdminAuditionPostAuthorLink = {
  readonly id: number;
  readonly source: string;
  readonly sourceAuthorId: string;
  /** 연결할 때의 원문 닉네임. */
  readonly sourceAuthorName: string;
};

/** 기획사에 연결되지 않은 원문 공고의 작성자. */
export type AdminUnlinkedAuthor = {
  readonly source: string;
  /** 원문 작성자 번호. 번호를 읽기 전에 가져온 공고만 있으면 null이고, 이때는 자동 연결을 걸 수 없다. */
  readonly sourceAuthorId: string | null;
  readonly authorName: string;
  readonly postCount: number;
  readonly latestCreatedAt: string;
};

/** 공고 관리 업체별 보기. `/api/v1/admin/audition-post-owners` 응답과 같다. */
export type AdminAuditionPostOwnerOverview = {
  readonly owners: readonly AdminAuditionPostOwner[];
  readonly unlinkedAuthors: readonly AdminUnlinkedAuthor[];
  /** 원문 작성자 번호를 아직 읽지 않은 원문 공고 수. 원문에 번호가 없는 공고도 포함한다. */
  readonly missingAuthorIdCount: number;
};

export type AdminAuditionPostAuthorLinkResult = AdminAuditionPostAuthorLink & {
  readonly ownerId: number;
  readonly ownerName: string;
  /** 함께 연결한 이 작성자의 기존 공고 수. */
  readonly connectedPostCount: number;
};

/** 원문 작성자 번호 채우기 한 번의 결과. */
export type AdminAuditionPostAuthorFill = {
  readonly checked: number;
  readonly filled: number;
  readonly connected: number;
  readonly failed: number;
  /** 이어서 읽을 위치. 더 읽을 공고가 없으면 null. */
  readonly nextBeforeId: number | null;
  readonly remaining: number;
};

export type AdminAuditionPostImport = {
  readonly post: AdminAuditionPost;
  /** 처음 가져왔으면 true, 원문으로 다시 가져와 교체했으면 false. */
  readonly created: boolean;
  /** 형식·크기 기준에 맞지 않아 옮기지 않은 첨부파일. */
  readonly skippedAttachments: readonly { readonly filename: string; readonly reason: string }[];
};

export type AdminCompanyStatus = "PENDING" | "PUBLISHED" | "HIDDEN";

/** 공고를 올린 공연사 정보. `/api/v1/admin/companies` 응답과 같다. 비워 둔 항목은 null이다. */
export type AdminCompany = {
  readonly id: number;
  readonly name: string;
  readonly representativeName: string | null;
  /** 공연사가 대표자 이름 공개에 동의했는지. false면 공개 화면에 대표자 이름이 없다. */
  readonly representativeNamePublic: boolean;
  readonly homepage: string | null;
  /** `YYYY-MM-DD` */
  readonly foundedOn: string | null;
  /** 공연사가 직접 알려 준 주소. 지도는 이 주소만 사용한다. */
  readonly address: VenueAddress | null;
  /** 공식 사업장 주소라 상세 주소와 지도를 공개하는지. false면 시·군·구까지만 보인다. */
  readonly addressPublic: boolean;
  /** 주소가 없을 때 대신 보일 지역(예: `서울`). */
  readonly region: string | null;
  readonly phone: string | null;
  readonly description: string | null;
  /** 정보를 확인한 출처. 운영자만 본다. */
  readonly sourceNote: string | null;
  readonly status: AdminCompanyStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** 공연사 정보 저장 본문. 이름 말고는 비워 둘 수 있고, 비운 항목은 지운다. */
export type AdminCompanyWrite = {
  readonly name: string;
  readonly representativeName: string;
  readonly representativeNamePublic: boolean;
  readonly homepage: string;
  readonly foundedOn: string | null;
  readonly address: VenueAddress | null;
  readonly addressPublic: boolean;
  readonly region: string;
  readonly phone: string;
  readonly description: string;
  readonly sourceNote: string;
};

/** 원문 공고를 올린 작성자 한 명. 같은 작성자의 공고를 한 공연사로 묶는다. */
export type AdminCompanyAuthor = {
  readonly source: string;
  /** 원문 작성자 번호. 번호를 읽기 전에 가져온 공고만 있으면 null이고, 이때는 묶을 수 없다. */
  readonly sourceAuthorId: string | null;
  /** 가장 최근 공고의 닉네임. */
  readonly authorName: string;
  readonly postCount: number;
  /** 아직 공연사에 연결되지 않은 공고 수. */
  readonly companylessCount: number;
  readonly latestCreatedAt: string;
  readonly linkId: number | null;
  readonly companyId: number | null;
  readonly companyName: string | null;
};

export type AdminCompanyAuthorOverview = {
  readonly authors: readonly AdminCompanyAuthor[];
  /** 원문 작성자 번호를 아직 읽지 않은 원문 공고 수. */
  readonly missingAuthorIdCount: number;
};

