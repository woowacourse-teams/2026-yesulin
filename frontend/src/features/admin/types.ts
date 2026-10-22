import type { VenueAddress } from "../auditions/creation-types";
import type { CompanyField, CompanyWrite } from "../companies/profile-draft";
import type { EventPhase } from "../events/types";

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
  /** 홈페이지·SNS 같은 링크. 최대 3개. */
  readonly links: readonly string[];
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
  readonly history: string | null;
  /** 대표 사진 공개 주소. 없으면 null이다. */
  readonly photoUrl: string | null;
  /** 정보를 확인한 출처. 운영자만 본다. */
  readonly sourceNote: string | null;
  readonly status: AdminCompanyStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** 공연사 정보 저장 본문. 이름 말고는 비워 둘 수 있고, 비운 항목은 지운다. */
export type AdminCompanyWrite = CompanyWrite;

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


/** 운영자 공고 목록에서 연 공고의 공연사 정보. */
export type AdminPostCompanyProfile = {
  /** 이 공고의 공연사. 연결이 없으면 같은 원문 작성자로 이전에 쓴 공연사다. 둘 다 없으면 null. */
  readonly company: AdminCompany | null;
  /** 공고에는 연결되지 않았지만 같은 원문 작성자로 이전에 쓴 정보를 찾았는지. */
  readonly sharedByAuthor: boolean;
  /** 새로 쓸 때 이름 칸에 미리 넣을 원문 작성자 이름. */
  readonly suggestedName: string;
  /** 원문 작성자 번호. 있으면 저장할 때 같은 작성자의 공고에도 연결된다. */
  readonly sourceAuthorId: string | null;
};

/** 공개 화면에서 누구나 보낸 공연사 정보 수정 요청. `/api/v1/admin/company-edit-requests` 응답 항목과 같다. */
export type AdminCompanyEditRequest = {
  readonly id: number;
  /** 지금 공연사 정보. */
  readonly company: AdminCompany;
  /** 요청한 공연사 정보. 비워 달라는 항목은 null이다. 사진은 {@link adminEditRequestPhotoUrl}로 본다. */
  readonly proposal: Omit<AdminCompany, "id" | "sourceNote" | "status" | "createdAt" | "updatedAt" | "photoUrl"> & {
    /** 사진을 함께 보냈는지. */
    readonly photoAttached: boolean;
  };
  /** 요청자가 바꾼 항목. 적용할 때 이 항목만 요청 값으로 덮어쓴다. */
  readonly changedFields: readonly CompanyField[];
  readonly reason: string;
  /** 요청자가 남긴 연락처. 처리하면 지운다. */
  readonly contact: string | null;
  readonly createdAt: string;
};

/** 공연예술통합전산망(KOPIS)에 등록된 기획·제작사. 공연사 정보를 쓸 때 처음 값으로만 쓴다. */
export type KopisCompany = {
  /** KOPIS 기획제작사 ID(예: `AG019413`). */
  readonly kopisId: string | null;
  readonly name: string;
  readonly genre: string | null;
  readonly phone: string | null;
  readonly homepage: string | null;
  /** KOPIS에 등록된 최근 작품 이름. */
  readonly recentWorks: readonly string[];
};

export type KopisCompanySearchResult = {
  /** KOPIS를 불렀는지. 인증키가 없거나 응답하지 않으면 false다. */
  readonly available: boolean;
  /** 회사 형태 표시를 뗀, 실제로 찾은 이름. */
  readonly query: string;
  readonly companies: readonly KopisCompany[];
};

/** 브라우저가 공연사 사진을 저장소로 바로 올릴 주소. 백엔드 `CompanyPhotoUploadResult`와 같다. */
export type CompanyPhotoUpload = {
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly expiresAt: string;
  /** 운영자 업로드의 공개 주소. 공연사를 저장할 때 이 주소로 확정한다. */
  readonly photoUrl: string | null;
  /** 수정 요청 업로드의 키. 요청을 보낼 때 이 키로 확정한다. */
  readonly uploadKey: string | null;
};

/** 수정 요청과 함께 온 사진. 적용 전이라 공개 주소가 없어 운영자 API로 본다. */
export function adminEditRequestPhotoUrl(requestId: number): string {
  return `/api/v1/admin/company-edit-requests/${requestId}/photo`;
}

export type AdminEventStatus = "PENDING" | "PUBLISHED" | "HIDDEN";

/** 이벤트 메인 배너 설정. 켜려면 PC·모바일 배너 이미지와 대체 문구가 모두 있어야 한다. */
export type AdminEventBanner = {
  readonly enabled: boolean;
  /** PC 배너(3.2:1) 공개 주소 */
  readonly desktopImageUrl: string | null;
  /** 모바일 배너(4:3) 공개 주소 */
  readonly mobileImageUrl: string | null;
  /** 배너 이미지에 적힌 문구를 옮긴 대체 문구 */
  readonly alt: string | null;
  /** `YYYY-MM-DD`. 이 날까지 노출하고, 없으면 내릴 때까지 노출한다. */
  readonly endsOn: string | null;
  /** 0~99. 작은 순서가 먼저 보인다. */
  readonly order: number;
};

/** 공고 알림 오픈채팅방 인원 기록 한 건. */
export type AdminAlertChatMemberEntry = {
  readonly id: number;
  readonly memberCount: number;
  readonly recordedAt: string;
};

/** 공고 알림 오픈채팅방 인원. 백엔드 `AdminAlertChatMembersResult`와 같다. */
export type AdminAlertChatMembers = {
  /** 지금 올라오는 공고에 적용하는 인원. 아직 적지 않았으면 기록 전 인원이다. */
  readonly currentMemberCount: number;
  /** 처음 적기 전에 올라왔거나 올린 시각을 모르는 공고에 적용하는 인원. */
  readonly initialMemberCount: number;
  /** 적은 기록. 최근 것부터다. */
  readonly history: readonly AdminAlertChatMemberEntry[];
};

/** 잘못 친 숫자를 막는 상한. 백엔드 `AlertChatMemberCount.MAX_MEMBER_COUNT`와 같다. */
export const ALERT_CHAT_MAX_MEMBER_COUNT = 10_000;

/** 운영 화면의 이벤트 글. 백엔드 `AdminEventResult`와 같다. */
export type AdminEvent = {
  readonly id: number;
  readonly title: string;
  readonly summary: string | null;
  readonly body: string;
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  readonly applyUrl: string | null;
  readonly applyLabel: string | null;
  readonly coverImageUrl: string | null;
  readonly banner: AdminEventBanner;
  /** 지금 메인 배너에 보이는지. 공개 상태와 노출 종료일까지 본 결과다. */
  readonly bannerVisible: boolean;
  readonly status: AdminEventStatus;
  readonly phase: EventPhase;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** 이벤트를 통째로 저장하는 요청. 백엔드 `WriteEventRequest`와 같고, 빈 값은 지운다. */
export type AdminEventWrite = {
  readonly title: string;
  readonly summary: string | null;
  readonly body: string;
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  readonly applyUrl: string | null;
  readonly applyLabel: string | null;
  readonly coverImageUrl: string | null;
  readonly banner: AdminEventBanner;
};

/** 브라우저가 이벤트 이미지를 저장소로 바로 올릴 주소. 백엔드 `EventImageUploadResult`와 같다. */
export type EventImageUpload = {
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly expiresAt: string;
  /** 올린 뒤의 공개 주소. 이벤트를 저장할 때 이 주소로 확정한다. */
  readonly imageUrl: string;
};
