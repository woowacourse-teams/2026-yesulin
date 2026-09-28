# 백엔드 API

이 문서는 현재 구현된 REST Mapping만 다룬다. 구현되지 않은 목표 경로와 프론트 seed/MSW 경로는
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
`/login/oauth2/code/{provider}`는 Spring Security 경로이며 아래 REST 목록에 포함하지 않는다.

## 오디션 안내 문자

일반 공고 prefix: `/api/v1/audition-roles/{roleId}/screening-rounds/{round}`.
OTR 공고 prefix: `/api/v1/otr-auditions/{auditionId}/roles/{roleOrder}/screening-rounds/1`.
OTR의 auditionId는 OTR 원문 번호가 아닌 내부 공개 UUID이고, roleOrder는 1부터 시작하는 배역 순번이다.
두 경로는 아래의 동일한 suffix·요청·응답 계약을 사용한다.
모두 Active Producer와 해당 공고 소유권을 요구한다. 쓰기는 CSRF가 필요하며, round는 stage ID가 아닌 순번이다.
OTR은 해당 공고·배역의 1차 PASS만 대상으로 하며 targetStageId=null로 별도 일정을 안내한다.
발송 직전에도 같은 출처에서 소유권·합격 여부를 재검증한다. 심사 마감 여부는 발송을 막지 않는다.
발송 내역·상세·재발송·호환용 초안은 공고 종류와 OTR 공고 UUID까지 구분한다.
본인 공고의 발송 내역이 없으면 200과 빈 배열을 반환하며, 없는 공고·다른 소유자·잘못된 배역/차수는
404 SMS_NOT_FOUND다. 미인증 401, 역할/상태 불일치 403은 공통 인증 규칙을 따른다.

| Method | suffix | 요청 / 응답 |
| --- | --- | --- |
| GET | `/sms-settings` | 발송 활성 여부, 발신번호, footer, messageHeader, 다음 전형, 합격자 이름·연락처 |
| GET | `/sms-draft` | `{version, command}`. 없으면 version 0, command null |
| PUT | `/sms-draft` | `{version, command}` → 증가한 version과 저장 내용 |
| POST | `/sms-previews` | command → 개인별 문구·유형·바이트·가격·오류, 경고, total, sender, token, sendable |
| POST | `/sms-batches` | `Idempotency-Key: UUID`, `{command, previewToken}` → 202 batch |
| GET | `/sms-batches` | 해당 배역·차수 최근 100개 `{batch, firstRecipientName, retainedCount, deliveredCount, failedCount, pendingCount, unknownCount, messageType}` |
| GET | `/sms-batches/{batchId}` | `{batch, deliveries}` |
| POST | `/sms-batches/{batchId}/retry-preview` | `{deliveryIds}` → 이전 스냅샷 기준 새 비용 미리보기 |
| POST | `/sms-batches/{batchId}/retries` | `Idempotency-Key`, `{deliveryIds, previewToken}` → 202 새 batch |

command: `{targetStageId, template, recipients: [{submissionId, appointment}]}`.
appointment는 `2026-10-01T14:30`처럼 한국 시간의 날짜·시간이다. 마지막 차수만 targetStageId=null이다.
초안의 미완성 일시는 null로 저장할 수 있지만 발송에서는 거부한다. 대상은 1~500명 이내이며 운영 상한도 적용한다.
template에는 `{오디션일시}`가 필요하며, `{이름}`은 template 또는 messageHeader에 있어야 한다.
서버는 DB의 제작사명·공고명으로 인사와 오디션 대상자 선정 안내인 `messageHeader`를 구성하고,
그 안의 `{이름}`을 수신자 이름으로 치환한다. 기본 template은 `오디션 일시: {오디션일시}`와 선택적 추가 안내사항이다.
header를 앞에, `문의: {공연사 연락처}`인 footer를 끝에 각각 빈 줄로 구분해 추가한다.
`footer`도 이 문의 문구다. 개인별 preview의 body가 저장·발송되는 최종 본문이며, 발송 내역은 당시 본문을 유지한다.
오류는 수신자별 error에 모아 반환한다. 단가 미설정이면 price/total=null, sendable=false다.
금액은 부가세 포함 KRW이며 내부 계산·발송 검증용으로 유지하되 공연사 UI에는 표시하지 않는다.
최종 본문을 EUC-KR로 검증하며 SMS 90 / LMS 2,000바이트 한도를 적용한다.

batch: `id, ownerId, roleId, sourceRound, sourceStageId, targetStageId, idempotencyKey, fingerprint, sender,
createdAt, retryOf, estimatedCost, count, scopeKey`.
scopeKey는 일반 공고 `STANDARD`, OTR `OTR:{공개 공고 UUID}`다. OTR의 roleId는 배역 순번이며
별도 전형 엔티티가 없으므로 sourceStageId도 null이다. 기존 일반 공고 기록은 STANDARD로 유지된다.
delivery: `id, batchId, submissionId, name, phone, appointment, body, type, price, status, providerId, code, updatedAt`.
202는 전달 성공이 아니다. status는 QUEUED / SENDING / ACCEPTED / DELIVERED / FAILED / UNKNOWN이다.
UNKNOWN은 자동 재전송하지 않는다. FAILED 중 code=RETRIED는 후속 시도가 있으므로 다시 재시도할 수 없다.
솔라피 발송 요청의 HTTP 401/403은 인증·접근 거절로 `FAILED`, `SOLAPI_HTTP_401/403`을 저장한다.
설정 확인 후 사용자가 재발송해야 하며 자동 재발송하지 않는다. 타임아웃·불명확한 오류는 UNKNOWN으로 유지한다.
삭제·보관 기간 만료 후에는 배치 집계만 남고 deliveries가 비거나 줄어들 수 있다.
목록의 상태별 인원은 남아 있는 수신자 기록만 집계하며 `count-retainedCount`는 기록 없음으로 표시한다.
`firstRecipientName`은 남아 있는 이름 중 하나이며 `messageType`은 SMS / LMS / SMS/LMS 또는 기록이 없을 때 null이다.
초안 API는 기존 데이터 정리·호환성을 위해 유지하지만 현재 문자 작성 UI에서는 조회·저장하지 않는다.

- `409 SMS_DISABLED`: 비활성 또는 요금·발신번호·상한 미설정. 초안·미리보기는 사용 가능.
- `409 SMS_CONFLICT`: 미리보기 변경, 동일 키의 다른 내용, 초안 버전 충돌.
- `409 SMS_LIMIT_EXCEEDED`: 계정 전체 일일 예약 건수 또는 요청 상한 초과.
- `404 SMS_NOT_FOUND`: 본인 공고/배역/발송 기록이 아니거나 없는 경우.
- `400 INVALID_REQUEST`: 합격자가 아닌 대상, 과거 일시, 잘못된 재전송 대상 등.

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

## 공연 — 10개

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/performances` | Active Producer | `CreatePerformanceRequest` | `201 PerformanceResponse`, `Location` |
| GET | `/api/v1/performances` | Active Producer | 없음 | `200 PerformanceListResponse` |
| GET | `/api/v1/performances/{performanceId}` | Active Producer | 없음 | `200 PerformanceResponse` |
| PUT | `/api/v1/performances/{performanceId}` | Active Producer | `UpdatePerformanceRequest` | `200 PerformanceResponse` |
| PATCH | `/api/v1/performances/{performanceId}/basic-information` | Active Producer | `UpdatePerformanceBasicInformationRequest` | `200 PerformanceResult` |
| PATCH | `/api/v1/performances/{performanceId}/period` | Active Producer | `UpdatePerformancePeriodRequest` | `200 PerformanceResult` |
| PATCH | `/api/v1/performances/{performanceId}/poster` | Active Producer | `UpdatePerformancePosterRequest` | `200 PerformanceResult` |
| DELETE | `/api/v1/performances/{performanceId}` | Active Producer | 없음 | `204` |
| POST | `/api/v1/performance-posters/upload-requests` | Active Producer | `PerformancePosterUploadRequest` | `201 FileUploadResult` |
| PATCH | `/api/v1/performance-posters/{fileId}/completion` | Active Producer | 없음 | `204` |

공연 제목은 200자, 장소명 200자, 도로명·상세주소 300자다. 공연 장소는 선택이며 입력할 때는 장소명과 주소를 함께
전달한다. 공연 시작일은 필수, 종료일은 선택(오픈런)이다. 위도·경도는 함께 전달하고 각각 -90~90, -180~180 범위다.
공연 배역 이름은 100자, 설명은 개행 없는 300자다. 포스터는 JPEG·PNG·WebP 최대 30MB다. 전체 수정 PUT은 포스터·기본
정보와 배역 목록을 함께 교체한다. 연결된 공고가 하나라도 있으면 전체·기본 정보 수정과 삭제를
`PERFORMANCE_HAS_AUDITIONS`로 거부하지만, 기존 기간 충돌을 확정하기 위한 `/period` 수정은 허용한다.

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

공고 생성은 client UUID, 양의 performanceId, 제목 200자와 선택 연습 장소를 받는다. 공연 기간은 공연에서 읽어
공고와 지원서 스냅샷에 보존한다. 배역은 1개 이상이고 모집 인원은 1명 이상이며 성별은 `MALE/FEMALE/ANY`다.
일정은 사용자가 입력하는 모집 종료 시각과 1~5차 전형(차수별 선택 오디션 장소)을 받는다. 모집 시작 시각은
게시할 때 서버가 기록한다. 지원 폼은 사진·영상 요구 각 최대 3개와 텍스트 질문 최대 10개다. 사진 요구 장수의
전체 합도 도메인에서 최대 3장으로 검증한다.

공개 공고 response의 `postingSnapshotVersion`은 공고 ID와 개인정보 제3자 제공 대상 기획사·제작사명으로 만든
서버 발급 버전이다. 지원자는 화면에서 확인한 이 값을 제출 request에 그대로 포함해야 한다.

연습 장소나 차수별 오디션 장소를 입력하지 않은 경우 관련 응답 필드는 `null`이다.

게시에는 배역·일정·지원 폼과 미래 모집 종료 시각이 필요하다. 공개 조회는 `DRAFT`가 아닌 공고를 반환하며,
실제 제출 가능 여부는 제출 시 모집 기간 검증이 최종 판단한다.

삭제는 배역·일정·지원 폼과 해당 배역의 심사 기록을 함께 지운다. 접수된 지원서가 한 건이라도 있으면
`AUDITION_INVALID_STATUS`로 거부한다.

## OTR 공고와 지원·심사 — 9개

기존 공연·공고와 별도의 저장 모델이다. `PRODUCER + ACTIVE`만 호출할 수 있고 다른 공연사의 목록은 볼 수 없다.

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/otr-auditions` | Active Producer | `CreateOtrAuditionRequest(otrId, title, roles, deadline)` | `201 OtrAuditionResult`, `Location` |
| GET | `/api/v1/otr-auditions` | Active Producer | 없음 | `200 OtrAuditionListResponse` |
| GET | `/api/v1/otr-auditions/{auditionId}` | Active Producer | 없음 | `200 OtrAuditionResult` |
| GET | `/api/v1/public/otr-auditions/{auditionId}` | 공개 | 없음 | `200 PublicOtrAuditionResult` |
| POST | `/api/v1/otr-auditions/{auditionId}/submissions` | Applicant | `SubmitOtrSubmissionRequest` | `201 OtrSubmissionResult`, `Location` |
| GET | `/api/v1/otr-auditions/{auditionId}/roles/{roleOrder}/screening-rounds/1/submissions` | Active Producer | `ScreeningFilterRequest` query | `200 ScreeningBoardResponse` |
| GET | `/api/v1/otr-auditions/{auditionId}/roles/{roleOrder}/screening-rounds/1/submissions/{submissionId}` | Active Producer | 없음 | `200 ScreeningSubmissionDetailResponse` |
| PATCH | `/api/v1/otr-auditions/{auditionId}/roles/{roleOrder}/screening-rounds/1/reviews` | Active Producer | `SaveScreeningReviewsRequest` | `200 ScreeningReviewsResult` |
| PATCH | `/api/v1/otr-auditions/{auditionId}/roles/{roleOrder}/screening-rounds/1/completion` | Active Producer | 없음 | `200 ScreeningCompletionResult` |

`otrId`는 숫자 1~30자, 제목은 200자 이하, 배역은 1~20개이며 각 이름은 100자 이하다. 마감일은 ISO 날짜다.
같은 공연사 내 OTR 번호 중복은 `409 OTR_AUDITION_DUPLICATE_OTR_ID`다. 응답의 `otrLink`는
`https://otr.co.kr/audition/?vid={otrId}`로 계산한다. 생성·목록 응답의 `applicationPath`는
`/apply/standard/{공고 UUID}`다. 이 경로는 공고 상세를 거치지 않고 고정 지원 폼을 연다.

공개 조회는 공연사명, `postingSnapshotVersion`과 `open`을 반환한다. 제출은 그 버전을 그대로 보내야 하며
공연사명이 바뀌면 `409 OTR_AUDITION_STALE_POSTING_SNAPSHOT`으로 재확인·재동의를 요청한다.
마감일은 한국 시간(`Asia/Seoul`)의 날짜이며 마감일 23:59:59까지
지원 가능하고 다음 날 00:00부터 `409 OTR_AUDITION_CLOSED`다. 제출 시 서버가 다시 확인한다.
지원서는 `type=OTR`, 공고의 배역 하나, 기본 정보 전체(이름·키·몸무게·생년월일·성별·연락처·이메일·거주지),
선택 추가 정보, 서로 다른 READY 사진 파일 ID 최대 3개, 서로 다른 YouTube 영상 URL 최대 3개와
개인정보 수집·이용 및 공연사 제공 동의를 받는다.
사진은 지원자 소유인지 검증한다. 같은 지원자의 동일 OTR 공고 재지원은 `409 OTR_AUDITION_DUPLICATE_SUBMISSION`이다.
OTR 심사는 기존 심사 화면의 계약을 사용하되 별도 경로와 저장 테이블에 기록한다. `roleOrder`는 공고의
배역 순서(1부터 시작), `submissionId`는 OTR 지원서의 공개 UUID다. OTR에는 별도 일정 입력이 없어
1차 서류 심사 한 차수를 제공한다. 배역별 심사 종료는 OTR 지원 마감 다음 날부터 가능하며,
그 전에는 `409 SCREENING_ROUND_NOT_READY`를 반환한다. 종료 후 심사 결과 수정은 거부한다.

## 무료 공연과 비회원 예매 — 17개

오디션용 공연·공고와 별도의 저장 모델이다. 관리 API는 `PRODUCER + ACTIVE`만 호출할 수 있고 자기 공연만 보이며,
다른 기획사의 공연·회차·예매는 `404`로 숨긴다. 관객 API는 로그인 없이 호출하지만 쓰기 요청은 CSRF 헤더가 필요하다.
공연 `showId`는 공개 UUID, `sessionId`와 `reservationId`는 숫자다.

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/public/shows` | 공개 | 없음 | `200 PublicShowListResponse` |
| GET | `/api/v1/public/shows/{showId}` | 공개 | 없음 | `200 PublicShowResponse` |
| POST | `/api/v1/public/shows/{showId}/sessions/{sessionId}/reservations` | 공개 | `CreateReservationRequest(bookerName, bookerPhone, ticketCount, privacyAgreed)` | `201 ReservationReceiptResult` |
| GET | `/api/v1/shows` | Active Producer | 없음 | `200 ProducerShowListResponse` |
| POST | `/api/v1/shows` | Active Producer | `SaveShowRequest` | `201 ProducerShowResponse`, `Location` |
| GET | `/api/v1/shows/{showId}` | Active Producer | 없음 | `200 ProducerShowResponse` |
| PUT | `/api/v1/shows/{showId}` | Active Producer | `SaveShowRequest` | `200 ProducerShowResponse` |
| DELETE | `/api/v1/shows/{showId}` | Active Producer | 없음 | `204` |
| POST | `/api/v1/shows/{showId}/opening` | Active Producer | 없음 | `200 ProducerShowResponse` |
| POST | `/api/v1/shows/{showId}/closing` | Active Producer | 없음 | `200 ProducerShowResponse` |
| POST | `/api/v1/shows/{showId}/sessions` | Active Producer | `SaveShowSessionRequest(startsAt, capacity)` | `201 ProducerShowResponse` |
| PUT | `/api/v1/shows/{showId}/sessions/{sessionId}` | Active Producer | `SaveShowSessionRequest` | `200 ProducerShowResponse` |
| DELETE | `/api/v1/shows/{showId}/sessions/{sessionId}` | Active Producer | 없음 | `200 ProducerShowResponse` |
| GET | `/api/v1/shows/{showId}/sessions/{sessionId}/reservations` | Active Producer | 없음 | `200 ProducerReservationListResult` |
| POST | `/api/v1/reservations/{reservationId}/cancellation` | Active Producer | 없음 | `200 ProducerReservationResult` |
| POST | `/api/v1/show-images/upload-requests` | Active Producer | `ShowImageUploadRequest(originalFilename, contentType, size)` | `201 FileUploadResult` |
| PATCH | `/api/v1/show-images/{fileId}/completion` | Active Producer | 없음 | `204` |

`SaveShowRequest`는 `title`(200자 이하), `genre`(`MUSICAL`·`PLAY`), `description`(2000자 이하), `venue`(장소명·도로명주소 필수),
`runningMinutes`(1~1440), `ageRating`(50자 이하), `inquiryPhone`(`02-123-4567` 형식), `posterFileId`,
`imageFileIds`(서로 다른 파일 최대 3개)다. 선택 값으로 `directionsNote`(오시는 길 추가 안내, 1000자 이하),
`links`(예매 안내 외부 링크 최대 3개, 각 `label` 30자 이하·`url` 500자 이하의 http/https 주소, 도메인에 점 필수),
`remainingSeatsVisible`(관객에게 잔여석 숫자 공개 여부)을 받는다. 보내지 않으면 안내 없음·링크 없음·잔여석 공개로 저장하며,
`ProducerShowResponse`는 세 값을 그대로 돌려준다. 잘못된 링크 주소는 `400 SHOW_INVALID_INPUT`이다.
포스터와 상세 이미지는 요청한 기획사가 올린 READY 공개 파일이어야 하며
`show-images` 업로드로 받는다. 새 공연은 `DRAFT`이고, 시작 전인 회차가 하나 이상 있어야 `opening`으로 `OPEN`이 된다.
`closing`은 `OPEN`에서만 `CLOSED`로 바꾸며 `opening`으로 다시 열 수 있다. 회차 시작 시각은 ISO-8601 UTC이고 현재 이후여야 한다.

관객 목록은 `OPEN` 공연만, 상세는 `OPEN`·`CLOSED` 공연을 반환하고 `DRAFT`는 `404 SHOW_NOT_FOUND`다.
상세 회차는 정원·예매 수 대신 `remainingSeats`, `maxTicketCount`(`min(10, 잔여석)`, 0이면 매진),
`bookable`(공연 `OPEN`, 시작 전, 잔여석 있음)만 준다. 공연이 잔여석을 숨기면(`remainingSeatsVisible=false`)
`remainingSeats`는 `null`이고 나머지는 같다. 상세에는 `directionsNote`와 `links`(`label`, `url`)도 포함한다.
예매는 1~10매, 휴대폰 `010-1234-5678` 형식, 개인정보 수집·이용 동의가 필요하다. 서버는 회차 행을 잠근 뒤
같은 회차의 같은 휴대폰 확정 예매(`409 RESERVATION_DUPLICATE`)와 시작 시각 경과(`409 SHOW_SESSION_BOOKING_CLOSED`),
잔여석 부족(`409 SHOW_SESSION_NOT_ENOUGH_SEATS`)을 확인한다. 응답의 `code`는 8자리 예매번호다.
취소된 예매는 같은 번호로 다시 예매할 수 있다.

관객 본인 취소는 없다. 기획사가 전화 요청을 받아 `cancellation`으로 취소하며 이미 취소된 예매는 그대로 반환한다.
정원은 확정 매수보다 줄일 수 없고(`409 SHOW_SESSION_CAPACITY_BELOW_RESERVED`), 예매 기록이 있는 회차와 공연은
삭제할 수 없다(`409 SHOW_SESSION_HAS_RESERVATIONS`, `409 SHOW_HAS_RESERVATIONS`).

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
추가 정보의 학력은 `educationLevel`(`NONE`·`HIGH_SCHOOL`·`UNIVERSITY`), `school`, `major`로 표현한다. 학력 없음은 학교·전공 없이, 고등학교 졸업은 학교만, 대학교 졸업은 학교와 전공을 함께 보낸다. 링크 최대 5개, 경력 최대 10개다.
배우 사진은 JPEG·PNG·WebP 최대 20MB, 사진 보관함 최대 3개, 영상 보관함 최대 3개다.
비공개 사진 내용은 파일 소유 배우나 그 파일이 첨부된 지원서의 공고 소유 공연사만 조회한다. 사진을 찾을 수 없거나 접근할
수 없으면 모두 `404 FILE_NOT_FOUND`를 반환하고, `Cache-Control: no-store, must-revalidate`를 사용한다.

## 지원서 — 3개

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auditions/{auditionId}/submissions` | Applicant | `Idempotency-Key` header, `SubmitSubmissionRequest` | `201 SubmitSubmissionResponse`, `Location` |
| GET | `/api/v1/applicants/me/submissions` | Applicant | 없음 | `200 ApplicantSubmissionListResponse` |
| GET | `/api/v1/applicants/me/submissions/{submissionId}` | Applicant | 없음 | `200 ApplicantSubmissionDetailResponse` |

세 endpoint는 서버에서 `APPLICANT` 역할을 검증한다. 세션이 없으면 `401 AUTH_UNAUTHENTICATED`, 다른 역할 세션이면
`403 AUTH_FORBIDDEN`을 반환한다.

제출 request의 `type`은 `STANDARD`다. 이전 클라이언트처럼 `type`이 없으면 서버가 `STANDARD`로 처리한다.
그 밖에 공개 공고에서 받은 `postingSnapshotVersion`, `basicInformation`, `additionalInformation`, 하나 이상의
`selectedRoleIds`, `formAnswers`, 두 필수 동의를 포함한다. 서버는 공고 양식과 정확히 일치하는 답변, 선택 배역,
모집 기간, 중복 제출, 사진 소유권·READY를 검증한다. 제출 전에 기획사·제작사명이 바뀌어 버전이 오래됐으면 아무
기록도 저장하지 않고 `409 SUBMISSION_STALE_POSTING_SNAPSHOT`을 반환한다.
생성 response는 `submissionId`와 서버가 기록한 `submittedAt`을 반환한다.

제출의 `Idempotency-Key`는 UUID이며 필수다. 같은 배우가 같은 키와 같은 내용으로 재요청하면 지원서를 다시 만들지 않고
최초의 `201`, `Location`, `submissionId`, `submittedAt`을 반환한다. 같은 키를 다른 공고나 다른 요청 내용에 재사용하면
`409 IDEMPOTENCY_KEY_REUSED`다. 다른 키로 같은 공고에 다시 지원하면 기존 규칙대로 `409 DUPLICATE_SUBMISSION`이다.
서버는 요청 원문 대신 SHA-256 hash와 최초 성공 결과를 지원서와 같은 트랜잭션으로 저장한다.

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
| PATCH | `/api/v1/audition-roles/{roleId}/screening-rounds/{round}/completion` | Active Producer | 없음 | `200 ScreeningCompletionResult` |

필터는 work, status, keyword, gender, 나이·키·몸무게 비교와 mismatchOnly를 지원한다. 결과 저장은 하나 이상의
submission ID와 변경할 status·memo·note 중 하나 이상을 요구한다. status는 대소문자 무관
`PENDING/PASS/FAIL/ETC`다. 현재 진행 중인 차수는 `PENDING`이 남아 있어도 마감할 수 있다. 응답은
`round`, `acceptedCount`, `unselectedCount`, `promotedCount`, `nextRound`, `allRoundsClosed`를 반환한다.
미선택자는 `PENDING`으로 보존하며, `PASS`만 다음 차수로 승격한다. 다음 차수 대상이 없으면 이후 빈 차수도
자동 마감한다. 마감한 차수의 결과는 수정하거나 되돌릴 수 없다.

## 운영 대시보드 — 11개

개발팀 전용 경로다. 모두 `ADMIN` 세션만 통과하며 다른 역할은 `403 AUTH_FORBIDDEN`이다.

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/overview` | Admin | 없음 | `200 AdminOverview` |
| GET | `/api/v1/admin/producers` | Admin | `status` query (`PENDING`/`ACTIVE`, 선택) | `200 AdminProducersResponse` |
| GET | `/api/v1/admin/auditions` | Admin | `status` query (`DRAFT`/`PUBLISHED`/`CLOSED`, 선택) | `200 AdminAuditionsResponse` |
| GET | `/api/v1/admin/auditions/{auditionId}/submissions` | Admin | 없음 | `200 AdminSubmissionsResponse` |
| GET | `/api/v1/admin/submissions/{submissionId}` | Admin | 없음 | `200 ApplicantSubmissionDetailResponse` |
| GET | `/api/v1/admin/audit-logs` | Admin | `page` query (선택, 0부터) | `200 AdminAuditLogsResponse` |
| GET | `/api/v1/admin/logs` | Admin | `keyword`, `limit` query (선택) | `200 AdminLogResponse` |
| GET | `/api/v1/admin/files/unreferenced` | Admin | `status` (`PENDING`/`READY`/`DELETING`), `page`(0부터), `size`(1~100) query, 모두 선택 | `200 UnusedFilesResult` |
| DELETE | `/api/v1/admin/files/{fileId}` | Admin | `DeleteAdminFileRequest(confirmationPassword)` | `204` |
| PATCH | `/api/v1/admin/members/{memberId}/status` | Admin | `ChangeMemberStatusRequest(status)` | `200 MemberStatusResult` |
| DELETE | `/api/v1/admin/submissions/{submissionId}` | Admin | `DeleteAdminSubmissionRequest(confirmationPassword)` | `204` |

`AdminOverview`는 회원·공연·공고·지원서 집계와 최근 7일 신규 수만 담고 개인 식별 정보를 담지 않는다.
미사용 파일 목록은 7일 미만도 포함한다. `files`의 각 항목은 `fileId`, `ownerId`, `status`, `storageScope`,
`createdAt`, `unusedSince`, `deletableAt`, `deletable`을 담는다. 응답에 `page`, `size`, `hasNext`가 포함된다.
파일 DELETE는 `PENDING`이면 업로드 요청 시각, `READY`이면 업로드 완료·마지막 연결 해제 시각부터 7일 이상
지난 경우만 허용한다. 요청 시 참조를 다시 검사하고 기존 지원서 삭제와 같은 확인 비밀번호를 요구한다.
사용 중이면 `409 FILE_STILL_IN_USE`, 7일 미만이면 `409 FILE_TOO_RECENT`, 없는 ID는 `404 FILE_NOT_FOUND`다.
S3 삭제 실패 시 `DELETING` 상태가 남으며 같은 DELETE 요청으로 재시도할 수 있다. 완료된 삭제를 재요청하면 `204`다.
기획사 목록은 이메일 미인증(`PENDING`) 계정을 앞에 두고 최근 가입 순으로 정렬한다. 공고 목록은 최근 생성 순으로 전체를 반환한다.
공고별 지원서 목록과 상세는 제출 당시 스냅샷을 반환한다. 상세의 비공개 제출 사진은 운영자 세션으로 콘텐츠 API에서 읽는다.
운영자 변경 기록은 최신순으로 페이지당 10건씩 반환한다. `AdminAuditLogsResponse`는 `logs`, `page`, `size`,
`totalElements`, `totalPages`를 담는다.

지원서 삭제는 `YESULIN_ADMIN_DELETION_PASSWORD_HASH`에 설정된 BCrypt 해시와 매 요청의 확인 비밀번호가 일치해야 한다.
성공하면 지원서의 동의·심사 기록·파일 참조와 해당 배역의 심사 완료 표시를 한 트랜잭션에서 지우며,
`file_assets`와 S3 객체는 보존한다. 성공한 삭제만 개인정보 없이 `admin_audit_logs`에 남긴다. 비밀번호 불일치 또는
해시 미설정은 `403 ADMIN_DELETION_CONFIRMATION_FAILED`, 없는 지원서는 `404 SUBMISSION_NOT_FOUND`다.
관리자 계정별 최근 10분 내 확인 실패 5회 시 삭제 확인만 10분 잠근다. 잠금 중에는 올바른 비밀번호도
`403 ADMIN_DELETION_CONFIRMATION_FAILED`로 거부하고 `message`에 남은 대기 초를 안내한다. 조회·로그인은 영향받지 않는다.
확인 성공은 실패 이력을 초기화하며 잠금 중 재요청은 잠금을 연장하지 않는다. 메모리 제한의 재시작·다중 서버 제약은
[배포 문서](operations/deployment.md)를 따른다.

로그 조회는 `logging.file.name`이 가리키는 파일의 끝부분만 읽는다. 파일 경로는 요청으로 바꿀 수 없고 쓰기도 하지 않는다.
`limit`은 1~500이며 기본값은 200이다. `keyword`는 대소문자를 구분하지 않는 부분 일치다. 한 번에 읽는 바이트에
상한이 있다. 생략된 더 오래된 줄이 있으면 `truncated=true`이며, 읽기 상한과 줄 수 상한 어느 쪽 때문이든 참이 된다.
파일을 읽을 수 없으면 `available=false`다. `AdminLogResponse.lines`는 기존 프론트 호환을 위해 원문 줄을 유지하고,
`entries`는 각 줄을 다음 공통 필드로 구조화한다.

| 필드 | 설명 |
| --- | --- |
| `format` | 새 JSON Lines는 `STRUCTURED`, 기존 텍스트와 파싱 불가 줄은 `LEGACY` |
| `timestamp` | 파싱 가능한 로그 시각. 없으면 `null` |
| `level` | `TRACE`·`DEBUG`·`INFO`·`WARN`·`ERROR`. 알 수 없으면 `null` |
| `logger`, `thread`, `requestId`, `message` | JSON 또는 기존 표준 텍스트에서 추출한 공통 필드 |
| `attributes` | JSON의 이벤트별 추가 필드. 공통 필드는 중복해서 넣지 않는다. |
| `raw` | 원본 한 줄. 기존·파싱 불가 로그도 손실 없이 표시할 수 있게 한다. |

배포 직후 같은 파일에 기존 텍스트와 새 JSON이 섞여 있어도 모두 반환한다. JSON 한 줄이 손상됐으면 그 줄만
`LEGACY`로 반환하고 전체 조회는 계속한다. `lines`는 관리자 프론트가 `entries`로 전환된 뒤 별도 계약 변경에서 제거한다.

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
| 무료 공연 | `SHOW_NOT_FOUND`, `SHOW_SESSION_NOT_FOUND`, `SHOW_INVALID_INPUT`, `SHOW_INVALID_STATUS`, `SHOW_NOT_OPENABLE`, `SHOW_NOT_OPEN`, `SHOW_HAS_RESERVATIONS`, `SHOW_SESSION_BOOKING_CLOSED`, `SHOW_SESSION_NOT_ENOUGH_SEATS`, `SHOW_SESSION_CAPACITY_BELOW_RESERVED`, `SHOW_SESSION_HAS_RESERVATIONS` |
| 예매 | `RESERVATION_NOT_FOUND`, `RESERVATION_INVALID_INPUT`, `RESERVATION_DUPLICATE` |
| 운영 | `MEMBER_NOT_FOUND`, `MEMBER_STATUS_CHANGE_NOT_ALLOWED`, `ADMIN_DELETION_CONFIRMATION_FAILED` |

인가 공통 오류는 `401 AUTH_UNAUTHENTICATED`, `403 AUTH_FORBIDDEN`, `403 AUTH_INACTIVE_MEMBER`다.
