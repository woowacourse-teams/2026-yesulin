# 백엔드 API

이 문서는 현재 Controller 18개의 50개 REST Mapping만 다룬다. 구현되지 않은 목표 경로와 프론트 seed/MSW 경로는
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

쓰기 요청은 공개 여부와 관계없이 CSRF header가 필요하다. OAuth 시작 `/oauth2/authorization/{provider}`와 callback
`/login/oauth2/code/{provider}`는 Spring Security 경로이며 아래 REST 50개에 포함하지 않는다.

## Health와 Session — 6개

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/health` | 공개 | 없음 | `200 HealthResponse`, DB 불가 시 `503 HealthResponse` |
| POST | `/api/v1/sessions` | 공개 | `LoginRequest(email, password)` | `200 SessionResponse` |
| GET | `/api/v1/sessions/current` | 세션 | 없음 | `200 SessionResponse` |
| DELETE | `/api/v1/sessions/current` | 공개 | 없음 | `204` |
| POST | `/api/v1/auth/email-verifications` | Pending Producer | 없음 | `204` |
| GET | `/api/v1/auth/email-verifications` | 공개 | query `token`, `redirectUri` | `302 Location: redirectUri` |

로그인은 email 형식과 password 존재를 검증한다. 로그아웃은 세션이 없어도 204를 반환한다.
기획사/제작사 가입과 인증 메일 재전송은 5분 유효한 일회용 token을 발급한다. GET 인증은 성공 시 같은 브라우저의
PENDING 세션을 ACTIVE로 갱신하고 요청의 `redirectUri`로 302 redirect한다. 서버 설정의
`EMAIL_VERIFICATION_REDIRECT_URI`는 발송 메일 링크에 넣을 기본 Frontend 경로다.

## 기획사/제작사 — 4개

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/producers` | 공개 | `SignUpProducerRequest` | `201 ProducerResult`, `Location` |
| GET | `/api/v1/producers/me` | Producer | 없음 | `200 ProducerProfileResult` |
| PATCH | `/api/v1/producers/me` | Producer | `UpdateProducerProfileRequest` | `200 ProducerProfileResult` |
| GET | `/api/v1/producers/me/navigation-tree` | Active Producer | 없음 | `200 ProducerNavigationResponse` |

가입은 회사명 100자, email 320자, password 8~64자, 비밀번호 일치와 `termsAgreed=true`를 검증한다.
프로필 PATCH는 전달한 필드만 바꾸며 회사명·담당자명은 빈 값으로 지울 수 없다.

## 공연 — 8개

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/performances` | Active Producer | `CreatePerformanceRequest` | `201 PerformanceResponse`, `Location` |
| GET | `/api/v1/performances` | Active Producer | 없음 | `200 PerformanceListResponse` |
| GET | `/api/v1/performances/{performanceId}` | Active Producer | 없음 | `200 PerformanceResponse` |
| PUT | `/api/v1/performances/{performanceId}` | Active Producer | `UpdatePerformanceRequest` | `200 PerformanceResponse` |
| PATCH | `/api/v1/performances/{performanceId}/basic-information` | Active Producer | `UpdatePerformanceBasicInformationRequest` | `200 PerformanceResult` |
| PATCH | `/api/v1/performances/{performanceId}/poster` | Active Producer | `UpdatePerformancePosterRequest` | `200 PerformanceResult` |
| POST | `/api/v1/performance-posters/upload-requests` | Active Producer | `PerformancePosterUploadRequest` | `201 FileUploadResult` |
| PATCH | `/api/v1/performance-posters/{fileId}/completion` | Active Producer | 없음 | `204` |

공연 제목은 200자, 장소명 200자, 도로명·상세주소 300자다. 위도·경도는 함께 전달하고 각각 -90~90,
-180~180 범위다. 공연 배역 이름은 100자, 설명은 개행 없는 300자다. 포스터는 JPEG·PNG·WebP 최대 30MB다.

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

## 배우 프로필과 보관함 — 13개

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

프로필 기본 정보는 이름, 양수 키·몸무게, 미래가 아닌 생년월일, 성별, `000-0000-0000` 연락처, email과 거주 지역이다.
거주 지역은 100자 문자열이고, 프론트가 `시·도 시·군·구` 형태로만 채운다.
추가 정보는 학력·링크·국적·소개·특기·취미·군필 상태·경력을 가진다. 링크 최대 5개, 경력 최대 10개다.
배우 사진은 JPEG·PNG·WebP 최대 20MB, 사진 보관함 최대 3개, 영상 보관함 최대 3개다.

## 지원서 — 3개

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auditions/{auditionId}/submissions` | 세션 | `SubmitSubmissionRequest` | `201 SubmitSubmissionResponse`, `Location` |
| GET | `/api/v1/applicants/me/submissions` | 세션 | 없음 | `200 ApplicantSubmissionListResponse` |
| GET | `/api/v1/applicants/me/submissions/{submissionId}` | 세션 | 없음 | `200 ApplicantSubmissionDetailResponse` |

현재 세 Controller method는 세션만 직접 읽고 `APPLICANT` 역할 annotation을 사용하지 않는다. 프론트는 배우 세션으로만
호출하지만 서버 수준 역할 제한 보완은 [미구현 사항](../../docs/implementation-gaps.md)으로 관리한다.

제출 request는 `basicInformation`, `additionalInformation`, 하나 이상의 `selectedRoleIds`, `formAnswers`, 두 필수
동의를 포함한다. 서버는 공고 양식과 정확히 일치하는 답변, 선택 배역, 모집 기간, 중복 제출, 사진 소유권·READY를 검증한다.
생성 response는 `submissionId`만 반환한다.

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

## 주요 오류 코드

| 영역 | 주요 코드 |
| --- | --- |
| 인증 | `AUTH_UNAUTHENTICATED`, `AUTH_INVALID_CREDENTIALS`, `AUTH_FORBIDDEN`, `AUTH_INACTIVE_MEMBER`, `AUTH_INVALID_EMAIL_VERIFICATION`, `AUTH_EXPIRED_EMAIL_VERIFICATION` |
| 기획사 | `PRODUCER_INVALID_*`, `PRODUCER_NOT_FOUND`, `PRODUCER_DUPLICATE_EMAIL` |
| 공연 | `PERFORMANCE_ROLE_MODIFICATION_NOT_ALLOWED`, `PERFORMANCE_INVALID_*`, `PERFORMANCE_NOT_FOUND`, `PERFORMANCE_ROLE_NOT_FOUND` |
| 공고 | `AUDITION_INVALID_*`, `AUDITION_*_NOT_FOUND`, `AUDITION_PUBLISHING_NOT_READY`, `AUDITION_INVALID_STATUS` |
| 파일 | `FILE_UNSUPPORTED_CONTENT_TYPE`, `FILE_NOT_FOUND`, `FILE_UPLOAD_NOT_FOUND`, `FILE_METADATA_MISMATCH`, `FILE_NOT_READY` |
| 프로필·보관함 | `PROFILE_INVALID`, `*_INVALID_*`, `*_NOT_FOUND`, `*_LIMIT_EXCEEDED`, 영상 중복 |
| 지원서 | `SUBMISSION_INVALID*`, `SUBMISSION_NOT_FOUND`, `DUPLICATE_SUBMISSION`, `RECRUITMENT_CLOSED` |
| 심사 | `INVALID_SCREENING_REVIEW`, `SCREENING_REVIEW_NOT_FOUND`, `SCREENING_ROUND_NOT_READY` |

인가 공통 오류는 `401 AUTH_UNAUTHENTICATED`, `403 AUTH_FORBIDDEN`, `403 AUTH_INACTIVE_MEMBER`다.
