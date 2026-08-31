# 백엔드 API

이 문서는 현재 Controller 24개의 63개 REST Mapping만 다룬다. 구현되지 않은 목표 경로와 프론트 seed/MSW 경로는
포함하지 않는다. 공통 형식은 [API 공통 규칙](../../docs/api-conventions.md)을 따른다.

## 인증 표기

| 표기 | 실제 조건 |
| --- | --- |
| 공개 | 세션 없이 호출 가능 |
| 세션 | `MemberPrincipal` 세션 필요, 역할 제한 없음 |
| Applicant | `APPLICANT` 세션 |
| Producer | `PRODUCER` 세션, PENDING·ACTIVE 모두 가능 |
| Pending Producer | `PRODUCER + PENDING` 세션 |
| Active Producer | `PRODUCER + ACTIVE` 세션 |
| Admin | `ADMIN` 세션. 가입 경로가 없고 서버 설정으로만 만든 운영자 계정 |

쓰기 요청은 공개 여부와 관계없이 CSRF header가 필요하다. OAuth 시작 `/oauth2/authorization/{provider}`와 callback
`/login/oauth2/code/{provider}`는 Spring Security 경로이며 아래 REST 62개에 포함하지 않는다.

## Health와 인증 — 9개

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/health` | 공개 | 없음 | `200 HealthResponse`, DB 불가 시 `503 HealthResponse` |
| POST | `/api/v1/sessions` | 공개 | `LoginRequest(email, password)` | `200 SessionResponse` |
| GET | `/api/v1/sessions/current` | 세션 | 없음 | `200 SessionResponse` |
| DELETE | `/api/v1/sessions/current` | 공개 | 없음 | `204` |
| POST | `/api/v1/auth/email-verifications` | Pending Producer | 없음 | `204` |
| GET | `/api/v1/auth/email-verifications` | 공개 | query `token`, `redirectUri` | `302 Location: redirectUri` |
| POST | `/api/v1/auth/password-resets` | 공개 | `PasswordResetMailRequest(email)` | `204` |
| GET | `/api/v1/auth/password-resets` | 공개 | query `token` | `204` |
| PATCH | `/api/v1/auth/password-resets` | 공개 | `PasswordResetChangeRequest(token, password, passwordConfirm)` | `204` |

로그인은 email 형식과 password 존재를 검증한다. 로그아웃은 세션이 없어도 204를 반환한다.
기획사/제작사 가입과 인증 메일 재전송은 5분 유효한 일회용 token을 발급한다. GET 인증은 성공 시 같은 브라우저의
PENDING 세션을 ACTIVE로 갱신하고 요청의 `redirectUri`로 302 redirect한다. 서버 설정의
`EMAIL_VERIFICATION_REDIRECT_URI`는 발송 메일 링크에 넣을 기본 Frontend 경로다.

비밀번호 재설정 메일 요청은 계정 존재 여부를 노출하지 않고 항상 204를 반환한다. 기획사/제작사 이메일 계정에만 5분
유효한 일회용 링크를 보내며, GET으로 링크를 확인한 뒤 PATCH에서 8~64자의 새 비밀번호와 확인 값을 받는다.
`PASSWORD_RESET_URL`은 메일 링크가 여는 Frontend `/forgot-password` 경로다.

## 기획사/제작사 — 4개

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/producers` | 공개 | `SignUpProducerRequest` | `201 ProducerResult`, `Location` |
| GET | `/api/v1/producers/me` | Producer | 없음 | `200 ProducerProfileResult` |
| PATCH | `/api/v1/producers/me` | Producer | `UpdateProducerProfileRequest` | `200 ProducerProfileResult` |
| GET | `/api/v1/producers/me/navigation-tree` | Active Producer | 없음 | `200 ProducerNavigationResponse` |

가입은 회사명 100자, email 320자, password 8~64자, 비밀번호 일치와 `termsAgreed=true`를 검증한다.
프로필 PATCH는 전달한 필드만 바꾸며 회사명·담당자명은 빈 값으로 지울 수 없다.

## 공연 — 9개

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/performances` | Active Producer | `CreatePerformanceRequest` | `201 PerformanceResponse`, `Location` |
| GET | `/api/v1/performances` | Active Producer | 없음 | `200 PerformanceListResponse` |
| GET | `/api/v1/performances/{performanceId}` | Active Producer | 없음 | `200 PerformanceResponse` |
| PUT | `/api/v1/performances/{performanceId}` | Active Producer | `UpdatePerformanceRequest` | `200 PerformanceResponse` |
| PATCH | `/api/v1/performances/{performanceId}/basic-information` | Active Producer | `UpdatePerformanceBasicInformationRequest` | `200 PerformanceResult` |
| PATCH | `/api/v1/performances/{performanceId}/poster` | Active Producer | `UpdatePerformancePosterRequest` | `200 PerformanceResult` |
| DELETE | `/api/v1/performances/{performanceId}` | Active Producer | 없음 | `204` |
| POST | `/api/v1/performance-posters/upload-requests` | Active Producer | `PerformancePosterUploadRequest` | `201 FileUploadResult` |
| PATCH | `/api/v1/performance-posters/{fileId}/completion` | Active Producer | 없음 | `204` |

공연 제목은 200자, 장소명 200자, 도로명·상세주소 300자다. 위도·경도는 함께 전달하고 각각 -90~90,
-180~180 범위다. 공연 배역 이름은 100자, 설명은 개행 없는 300자다. 포스터는 JPEG·PNG·WebP 최대 30MB다.
전체 수정 PUT은 포스터·기본 정보와 배역 목록을 함께 교체한다. 연결된 공고가 하나라도 있으면 공연의 전체·부분
수정과 삭제를 모두 `PERFORMANCE_HAS_AUDITIONS`로 거부한다.

## 공고 — 13개

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auditions` | Active Producer | `CreateAuditionRequest` | `201 AuditionResult`, `Location` |
| GET | `/api/v1/auditions` | Active Producer | `performanceId`, 선택 `keyword`, `phase` | `200 AuditionManagementListResponse` |
| GET | `/api/v1/auditions/{auditionId}` | Active Producer | 없음 | `200 AuditionResult` |
| DELETE | `/api/v1/auditions/{auditionId}` | Active Producer | 없음 | `204` |
| PUT | `/api/v1/auditions/{auditionId}/basic-information` | Active Producer | `UpdateAuditionBasicInformationRequest` | `200 AuditionResult` |
| GET | `/api/v1/auditions/{auditionId}/roles` | Active Producer | 없음 | `200 AuditionRolesManagementResponse` |
| PUT | `/api/v1/auditions/{auditionId}/roles` | Active Producer | `SaveAuditionRolesRequest` | `200 AuditionRolesResult` |
| GET | `/api/v1/auditions/{auditionId}/schedule` | Active Producer | 없음 | `200 AuditionScheduleResult` |
| PUT | `/api/v1/auditions/{auditionId}/schedule` | Active Producer | `SaveAuditionScheduleRequest` | `200 AuditionScheduleResult` |
| GET | `/api/v1/auditions/{auditionId}/application-form` | Active Producer | 없음 | `200 AuditionFormResult` |
| PUT | `/api/v1/auditions/{auditionId}/application-form` | Active Producer | `SaveAuditionFormRequest` | `200 AuditionFormResult` |
| PUT | `/api/v1/auditions/{auditionId}/publication` | Active Producer | 없음 | `200 AuditionResult` |
| GET | `/api/v1/public/auditions/{auditionId}` | 공개 | 없음 | `200 PublicAuditionResponse` |

공고 생성은 client UUID, 양의 performanceId, 제목 200자와 공연 기간을 받는다. 배역은 1개 이상이고 모집 인원은
1명 이상이며 성별은 `MALE/FEMALE/ANY`다. 일정은 1~5차, 지원 폼은 사진·영상 요구 각 최대 3개와 텍스트 질문
최대 10개다. 사진 요구 장수의 전체 합도 도메인에서 최대 3장으로 검증한다.

게시에는 배역·일정·지원 폼과 미래 모집 종료 시각이 필요하다. 공개 조회는 `DRAFT`가 아닌 공고를 반환하며,
실제 제출 가능 여부는 제출 시 모집 기간 검증이 최종 판단한다.

삭제는 배역·일정·지원 폼과 해당 배역의 심사 기록을 함께 지운다. 접수된 지원서가 한 건이라도 있으면
`AUDITION_INVALID_STATUS`로 거부한다.

## 배우 프로필과 보관함·비공개 파일 — 14개

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/applicants/me/profile` | Applicant | 없음 | `200 ApplicantProfileResult` |
| PATCH | `/api/v1/applicants/me/profile` | Applicant | `UpdateApplicantProfileRequest` | `200 ApplicantProfileResult` |
| POST | `/api/v1/actor-photos/upload-requests` | Applicant | `ActorPhotoUploadRequest` | `201 FileUploadResult` |
| PATCH | `/api/v1/actor-photos/{fileId}/completion` | Applicant | 없음 | `204` |
| GET | `/api/v1/applicants/me/photo-library/photos` | Applicant | 없음 | `200 PhotoLibraryResult` |
| POST | `/api/v1/applicants/me/photo-library/photos` | Applicant | `AddPhotoToLibraryRequest(fileId)` | `201 PhotoLibraryItemResult` |
| PATCH | `/api/v1/applicants/me/photo-library/photos/{photoId}/representative` | Applicant | 없음 | `200 PhotoLibraryResult` |
| PATCH | `/api/v1/applicants/me/photo-library/photos/{photoId}` | Applicant | `MovePhotoRequest(displayOrder)` | `200 PhotoLibraryResult` |
| DELETE | `/api/v1/applicants/me/photo-library/photos/{photoId}` | Applicant | 없음 | `204` |
| GET | `/api/v1/applicants/me/video-library/videos` | Applicant | 없음 | `200 VideoLibraryResult` |
| POST | `/api/v1/applicants/me/video-library/videos` | Applicant | `AddVideoToLibraryRequest(url)` | `201 VideoLibraryItemResult` |
| PATCH | `/api/v1/applicants/me/video-library/videos/{videoId}` | Applicant | `MoveVideoRequest(displayOrder)` | `200 VideoLibraryResult` |
| DELETE | `/api/v1/applicants/me/video-library/videos/{videoId}` | Applicant | 없음 | `204` |
| GET | `/api/v1/files/{fileId}/content` | 세션 | 없음 | `200` 원본 Content-Type의 파일 바이트 |

프로필 기본 정보는 이름, 양수 키·몸무게, 미래가 아닌 생년월일, 성별, `000-0000-0000` 연락처, email과 거주 지역이다.
거주 지역은 100자 문자열이고, 프론트가 `시·도 시·군·구` 형태로만 채운다.
추가 정보는 학력·링크·국적·소개·특기·취미·군필 상태·경력을 가진다. 링크 최대 5개, 경력 최대 10개다.
배우 사진은 JPEG·PNG·WebP 최대 20MB, 사진 보관함 최대 3개, 영상 보관함 최대 3개다.
비공개 사진 내용은 파일 소유 배우나 그 파일이 첨부된 지원서의 공고 소유 공연사만 조회한다. 사진을 찾을 수 없거나 접근할
수 없으면 모두 `404 FILE_NOT_FOUND`를 반환하고, `Cache-Control: no-store, must-revalidate`를 사용한다.

## 지원서 — 3개

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auditions/{auditionId}/submissions` | Applicant | `SubmitSubmissionRequest` | `201 SubmitSubmissionResponse`, `Location` |
| GET | `/api/v1/applicants/me/submissions` | Applicant | 없음 | `200 ApplicantSubmissionListResponse` |
| GET | `/api/v1/applicants/me/submissions/{submissionId}` | Applicant | 없음 | `200 ApplicantSubmissionDetailResponse` |

세 endpoint는 서버에서 `APPLICANT` 역할을 검증한다. 세션이 없으면 `401 AUTH_UNAUTHENTICATED`, 다른 역할 세션이면
`403 AUTH_FORBIDDEN`을 반환한다.

제출 request는 `basicInformation`, `additionalInformation`, 하나 이상의 `selectedRoleIds`, `formAnswers`, 두 필수
동의를 포함한다. 서버는 공고 양식과 정확히 일치하는 답변, 선택 배역, 모집 기간, 중복 제출, 사진 소유권·READY를 검증한다.
생성 response는 `submissionId`만 반환한다.

## 업로드 진단 — 1개

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/upload-diagnostics` | Applicant 또는 Producer | `UploadDiagnosticRequest` | `204` |

쓰기 요청이므로 CSRF header가 필요하다. 클라이언트가 생성한 UUID를 `X-Request-Id`로 보내면 응답 header와 Spring
MDC에 같은 값이 남는다. Request는 업로드 흐름·단계·1~2회 시도·실패 또는 재시도 성공·허용된 오류 코드·선택적
HTTP status·서비스 워커 제어 여부·거친 플랫폼과 브라우저 분류만 받는다. 파일명, 파일 내용, URL, 전체 User-Agent,
지원서 답변은 받거나 로그에 남기지 않는다.

## 심사 — 4개

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/audition-roles/{roleId}/screening-rounds/{round}/submissions` | Active Producer | `ScreeningFilterRequest` query | `200 ScreeningBoardResponse` |
| GET | `/api/v1/audition-roles/{roleId}/screening-rounds/{round}/submissions/{submissionId}` | Active Producer | 없음 | `200 ScreeningSubmissionDetailResponse` |
| PATCH | `/api/v1/audition-roles/{roleId}/screening-rounds/{round}/reviews` | Active Producer | `SaveScreeningReviewsRequest` | `200 ScreeningReviewsResult` |
| PATCH | `/api/v1/audition-roles/{roleId}/screening/completion` | Active Producer | 없음 | `204` |

필터는 work, status, keyword, gender, 나이·키·몸무게 비교와 mismatchOnly를 지원한다. 결과 저장은 하나 이상의
submission ID와 변경할 status·memo·note 중 하나 이상을 요구한다. status는 대소문자 무관
`PENDING/PASS/FAIL/ETC`다. 배역 전체 종료는 모든 차수의 pending 수가 0이어야 한다.

## 운영 대시보드 — 6개

개발팀 전용 경로다. 모두 `ADMIN` 세션만 통과하며 다른 역할은 `403 AUTH_FORBIDDEN`이다.

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/overview` | Admin | 없음 | `200 AdminOverview` |
| GET | `/api/v1/admin/producers` | Admin | `status` query (`PENDING`/`ACTIVE`, 선택) | `200 AdminProducersResponse` |
| GET | `/api/v1/admin/auditions` | Admin | `status` query (`DRAFT`/`PUBLISHED`/`CLOSED`, 선택) | `200 AdminAuditionsResponse` |
| GET | `/api/v1/admin/auditions/{auditionId}/submissions` | Admin | 없음 | `200 AdminSubmissionsResponse` |
| GET | `/api/v1/admin/submissions/{submissionId}` | Admin | 없음 | `200 ApplicantSubmissionDetailResponse` |
| GET | `/api/v1/admin/audit-logs` | Admin | 없음 | `200 AdminAuditLogsResponse` |
| GET | `/api/v1/admin/logs` | Admin | `keyword`, `limit` query (선택) | `200 AdminLogResponse` |
| PATCH | `/api/v1/admin/members/{memberId}/status` | Admin | `ChangeMemberStatusRequest(status)` | `200 MemberStatusResult` |
| DELETE | `/api/v1/admin/submissions/{submissionId}` | Admin | `DeleteAdminSubmissionRequest(confirmationPassword)` | `204` |

`AdminOverview`는 회원·공연·공고·지원서 집계와 최근 7일 신규 수만 담고 개인 식별 정보를 담지 않는다.
기획사 목록은 이메일 미인증(`PENDING`) 계정을 앞에 두고 최근 가입 순으로 정렬한다. 공고 목록은 최근 생성 순으로 전체를 반환한다.
공고별 지원서 목록과 상세는 제출 당시 스냅샷을 반환한다. 상세의 비공개 제출 사진은 운영자 세션으로 콘텐츠 API에서 읽는다.

지원서 삭제는 `YESULIN_ADMIN_DELETION_PASSWORD_HASH`에 설정된 BCrypt 해시와 매 요청의 확인 비밀번호가 일치해야 한다.
성공하면 지원서의 동의·심사 기록·파일 참조와 해당 배역의 심사 완료 표시를 한 트랜잭션에서 지우며,
`file_assets`와 S3 객체는 보존한다. 성공한 삭제만 개인정보 없이 `admin_audit_logs`에 남긴다. 비밀번호 불일치 또는
해시 미설정은 `403 ADMIN_DELETION_CONFIRMATION_FAILED`, 없는 지원서는 `404 SUBMISSION_NOT_FOUND`다.

로그 조회는 `logging.file.name`이 가리키는 파일의 끝부분만 읽는다. 파일 경로는 요청으로 바꿀 수 없고 쓰기도 하지 않는다.
`limit`은 1~500이며 기본값은 200이다. `keyword`는 대소문자를 구분하지 않는 부분 일치다. 한 번에 읽는 바이트에
상한이 있다. 생략된 더 오래된 줄이 있으면 `truncated=true`이며, 읽기 상한과 줄 수 상한 어느 쪽 때문이든 참이 된다.
파일을 읽을 수 없으면 `available=false`다.

상태 변경 대상은 `PRODUCER` 계정뿐이다. `ACTIVE` 전환은 이메일 인증을 대신하는 수동 활성화다. 배우와 운영자 계정은 `409 MEMBER_STATUS_CHANGE_NOT_ALLOWED`,
없는 회원은 `404 MEMBER_NOT_FOUND`다. 성공한 변경은 `admin_audit_logs`에 실행 운영자·대상·`이전 -> 이후`로 남는다.

## 주요 오류 코드

| 영역 | 주요 코드 |
| --- | --- |
| 인증 | `AUTH_UNAUTHENTICATED`, `AUTH_INVALID_CREDENTIALS`, `AUTH_FORBIDDEN`, `AUTH_INACTIVE_MEMBER`, `AUTH_INVALID_EMAIL_VERIFICATION`, `AUTH_EXPIRED_EMAIL_VERIFICATION`, `AUTH_INVALID_PASSWORD_RESET`, `AUTH_EXPIRED_PASSWORD_RESET` |
| 기획사 | `PRODUCER_INVALID_*`, `PRODUCER_NOT_FOUND`, `PRODUCER_DUPLICATE_EMAIL` |
| 공연 | `PERFORMANCE_HAS_AUDITIONS`, `PERFORMANCE_INVALID_*`, `PERFORMANCE_NOT_FOUND`, `PERFORMANCE_ROLE_NOT_FOUND` |
| 공고 | `AUDITION_INVALID_*`, `AUDITION_*_NOT_FOUND`, `AUDITION_PUBLISHING_NOT_READY`, `AUDITION_INVALID_STATUS` |
| 파일 | `FILE_UNSUPPORTED_CONTENT_TYPE`, `FILE_NOT_FOUND`, `FILE_UPLOAD_NOT_FOUND`, `FILE_METADATA_MISMATCH`, `FILE_NOT_READY` |
| 프로필·보관함 | `PROFILE_INVALID`, `*_INVALID_*`, `*_NOT_FOUND`, `*_LIMIT_EXCEEDED`, 영상 중복 |
| 지원서 | `SUBMISSION_INVALID*`, `SUBMISSION_NOT_FOUND`, `DUPLICATE_SUBMISSION`, `RECRUITMENT_CLOSED` |
| 심사 | `INVALID_SCREENING_REVIEW`, `SCREENING_REVIEW_NOT_FOUND`, `SCREENING_ROUND_NOT_READY` |
| 운영 | `MEMBER_NOT_FOUND`, `MEMBER_STATUS_CHANGE_NOT_ALLOWED`, `ADMIN_DELETION_CONFIRMATION_FAILED` |

인가 공통 오류는 `401 AUTH_UNAUTHENTICATED`, `403 AUTH_FORBIDDEN`, `403 AUTH_INACTIVE_MEMBER`다.
