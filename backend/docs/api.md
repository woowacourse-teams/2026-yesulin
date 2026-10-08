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

## OTR 공고 알림 경유 링크

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/otr` | 공개 | query `vid`: OTR 원문 번호(숫자 1~30자) | `302 Location: /posts/{postId}` 또는 `https://otr.co.kr/audition/?vid={vid}` |
| HEAD | 동일 경로 | 공개 | 동일 | `302`, 집계에서 제외 |

검증한 번호로 예술in에 공개 중인 공고가 있으면 상대 경로 `/posts/{postId}`로, 없거나 숨겼으면 OTR 원문으로 이동한다.
게시 여부만 DB에서 조회하고 저장이나 OTR 원문 존재 확인은 하지 않는다.
응답은 `Cache-Control: no-store`로 캐시하지 않으며 `Referrer-Policy: no-referrer`를 설정한다.
임의의 목적지 URL은 받지 않는다. 번호 누락·형식 오류는 `400 INVALID_REQUEST`다.
이 경로는 로그인·CSRF 없이 열 수 있다. HEAD는 Spring MVC의 GET mapping 지원으로 처리한다.

기존 `HTTP_REQUEST` 로그에서 `endpoint=/api/v1/otr`, `method=GET`, `status=302`만 집계한다.
검증된 OTR 번호는 `otrId` 필드로 남긴다. 전체 쿼리 문자열은 로그에 기록하지 않는다.
집계는 고유 방문자 수가 아닌 GET 요청 횟수다. 반복 클릭·미리보기 봇의 GET 요청도 포함될 수 있다.
클릭별 별도 로그·DB 카운터·GA 이벤트는 추가하지 않는다. 관리자 개요에서 파일 로그 기반 집계를 조회한다.
공유 링크는 `{프론트 origin}/otr?vid={번호}`다. Next.js의 `/otr` rewrite가 쿼리를 유지한 채
`{API_ORIGIN}/api/v1/otr?vid={번호}`로 전달한다. 프론트 화면이나 클라이언트 JS를 실행하지 않는다.

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

## 가져온 공고(메인 목록) — 6개

운영자가 공고 알림을 받은 OTR 공고를 우리 공고로 옮긴 `AuditionPost`다. 공개 상세에만 원문 출처·주소를 담는다.
공개 API는 로그인 없이 호출하고, 운영 API는 `ADMIN`만 호출한다.
`postId`는 숫자 ID다. 모두 공개 대상인 공고라 다른 공고와 달리 UUID를 쓰지 않는다.

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/public/audition-posts` | 공개 | `page`(0부터, 기본 0), `size`(1~48, 기본 12), `includeClosed`(기본 false) query | `200 PublicAuditionPostPageResult(posts, page, size, totalPages, totalElements, openCount, allCount)` |
| GET | `/api/v1/public/audition-posts/{postId}` | 공개 | 없음 | `200 PublicAuditionPostResult`, 숨김이면 `302 Location: {원문 주소}` |
| POST | `/api/v1/public/audition-posts/{postId}/views` | 공개 | 없음 | `204`, 숨김·없는 공고는 `404` |
| POST | `/api/v1/public/audition-posts/{postId}/redirects` | 공개 | 없음 | `204`, 공개 중·없는 공고는 `404` |
| GET | `/api/v1/admin/audition-posts` | Admin | 없음 | `200 AdminAuditionPostsResponse(posts)` |
| POST | `/api/v1/admin/audition-posts/otr-imports` | Admin | `ImportOtrAuditionPostRequest(otrId)` | 처음이면 `201`, 다시 가져오면 `200 AuditionPostImportResult` |
| PATCH | `/api/v1/admin/audition-posts/{postId}/status` | Admin | `ChangeAuditionPostStatusRequest(status: PUBLISHED/HIDDEN)` | `200 AdminAuditionPostResult` |

공개 목록은 `PUBLISHED`만 원문 작성 시각 최신순으로 반환한다. 작성 시각을 읽지 못한 공고는 뒤에 온다.
기본은 모집 중(마감일이 없거나 한국 날짜로 오늘 이후)인 공고만 세고, `includeClosed=true`면 마감된 공고도 포함한다.
`totalElements`·`totalPages`는 요청 조건 기준이고, `openCount`·`allCount`는 조건과 관계없는 모집 중·전체 공개 공고 수다.
목록 항목은 `id`, `category`, `title`, `authorName`, `pay`, `deadlineText`(원문 표현),
`deadline`(날짜일 때만 `YYYY-MM-DD`), `closed`(한국 날짜 기준), `postedAt`(Instant), `thumbnailUrl`(본문 첫 사진, 없으면 null),
`attachmentCount`, `viewCount`를 담는다. 조회수는 상세 화면이 열릴 때 브라우저가 탭 세션당 한 번 보내는 POST로만 늘고,
서버 렌더링·메타데이터 조회는 세지 않는다. 다시 가져와도 유지한다. 상세는 여기에 `bodyHtml`, `tags`, `attachments(name, contentType, size, url)`, 원문 출처 `source`(예: `OTR`)·`sourceUrl`,
`updatedAt`을 더한다. 숨긴 공고 상세는 본문 없이 `302 Location: {sourceUrl}`로 원문 공고에 보낸다.
`Cache-Control: no-store`, `Referrer-Policy: no-referrer`를 붙인다. 프론트 서버 렌더링은 이동을 따라가지 않고 `Location`만 읽어
브라우저를 원문으로 보낸다. 없는 공고는 `404 AUDITION_POST_NOT_FOUND`이고, 조회수 기록은 숨김도 404다.
원문 이동 수는 프론트 서버가 숨긴 공고를 원문으로 보내기 직전에 `redirects` POST를 한 번 보내 늘린다. 상세 GET은 세지 않는다.
DB에서 1을 더하고 다시 가져와도 유지한다.
page·size 범위 오류는 `400 INVALID_REQUEST`다.

`bodyHtml`은 서버가 Jsoup relaxed 허용 목록에서 `div`와 크기 속성을 뺀 태그만 남긴 HTML이다. 인라인 스타일과 스크립트는 없다.
링크는 `target="_blank" rel="noopener noreferrer nofollow"`이고, 사진 `src`는 응답할 때 공개 저장소 주소로 채운다.
첨부 `url`은 공개 저장소 주소이며 객체에 `Content-Disposition: attachment`와 원래 파일 이름이 설정돼 있다.

가져오기는 `otrId` 앞뒤 공백을 허용하는 숫자 1~30자다. 서버가 OTR 상세·첨부를 직접 내려받는 동안 요청이 길어질 수 있다.
`AuditionPostImportResult`는 `post`(`AdminAuditionPostResult`), `created`, 옮기지 않은 첨부 `skippedAttachments(filename, reason)`를
담는다. OTR 접속·구조 오류는 `409 AUDITION_POST_SOURCE_UNAVAILABLE`, 지원하지 않거나 20MB를 넘는 본문 사진은
`409 AUDITION_POST_FILE_REJECTED`, 같은 번호의 동시 가져오기 충돌은 `409 AUDITION_POST_IMPORT_CONFLICT`다.
분류가 연극·퍼포먼스·뮤지컬·단원·기획사가 아니면 파일을 받기 전에 `409 AUDITION_POST_CATEGORY_NOT_SUPPORTED`로 거절한다.
가져온 공고는 자동·직접 모두 `HIDDEN`으로 만들고, 다시 가져오면 공개 상태를 유지한다.
운영 목록은 최근 가져온 200건을 상태와 관계없이 출처·원문 번호·원문 주소, 자동 가져오기 여부(`autoImported`),
조회수 `viewCount`와 원문 이동 수 `redirectCount`와 함께 반환한다. 가져오기와 공개 상태 변경은 `admin_audit_logs`에 남긴다.

## 무료 공연과 비회원 예매 — 19개

오디션용 공연·공고와 별도의 저장 모델이다. 관리 API는 `PRODUCER + ACTIVE`만 호출할 수 있고 자기 공연만 보이며,
다른 기획사의 공연·회차·예매는 `404`로 숨긴다. 관객 API는 로그인 없이 호출하지만 쓰기 요청은 CSRF 헤더가 필요하다.
공연 `showId`는 공개 UUID, `sessionId`와 `reservationId`는 숫자다.

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/public/shows` | 공개 | 없음 | `200 PublicShowListResponse` |
| GET | `/api/v1/public/shows/{showId}` | 공개 | 없음 | `200 PublicShowResponse` |
| POST | `/api/v1/public/shows/{showId}/external-reservation-visits` | 공개 | 없음 | `204` |
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
| PUT | `/api/v1/reservations/{reservationId}/ticket-count` | Active Producer | `ChangeTicketCountRequest(ticketCount)` | `200 ProducerReservationResult` |
| PUT | `/api/v1/reservations/{reservationId}/memo` | Active Producer | `UpdateReservationMemoRequest(memo)` | `200 ProducerReservationResult` |
| POST | `/api/v1/show-images/upload-requests` | Active Producer | `ShowImageUploadRequest(originalFilename, contentType, size)` | `201 FileUploadResult` |
| PATCH | `/api/v1/show-images/{fileId}/completion` | Active Producer | 없음 | `204` |

`SaveShowRequest`는 `title`(200자 이하), `genre`(`MUSICAL`·`PLAY`·`MUSIC`), `description`(2000자 이하), `venue`(장소명·도로명주소 필수),
`runningMinutes`(1~1440), `ageRating`(50자 이하), `inquiryPhone`(`02-123-4567` 형식), `posterFileId`,
`imageFileIds`(서로 다른 파일 최대 3개)다. 선택 값으로 `hostName`(관객에게 보여 줄 주최 이름, 50자 이하),
`links`(예매 안내 외부 링크 최대 3개, 각 `label` 30자 이하·`url` 500자 이하의 http/https 주소, 도메인에 점 필수),
`guides`(오시는 길 아래 추가 안내 최대 5개, 각 `title` 30자 이하·`content` 1000자 이하, 둘 다 필수),
`remainingSeatsVisible`(관객에게 잔여석 숫자 공개 여부)을 받는다. `links`·`remainingSeatsVisible`을 보내지 않으면
링크 없음·잔여석 공개로 저장하고, `hostName`·`guides`를 보내지 않으면 지금 값을 유지한다(새 공연은 계정 회사명으로
주최 표시·안내 없음). 빈 문자열·빈 배열을 보내면 지운다. `ProducerShowResponse`는 네 값을 그대로 돌려준다. `ProducerShowResponse.hostName`은
따로 적은 이름(없으면 빈 문자열)이고 `defaultHostName`은 비워 두면 대신 보일 기획사 계정 회사명이다.
`ProducerShowResponse.externalReservationUrl`은 운영자 공연의 외부 예매 주소이며 기획사 공연은 늘 빈 문자열이다.
`externalReservationVisits`는 관객이 예매하기를 눌러 외부 예매 페이지로 이동한 횟수이고 기획사 공연은 0이다.
기획사 요청으로는 바꿀 수 없고, 운영자가 등록한 공연은 기획사 API에서 찾을 수 없다(`404 SHOW_NOT_FOUND`).
잘못된 링크 주소와 개수·길이를 넘은 안내는 `400 SHOW_INVALID_INPUT`이다.
포스터와 상세 이미지는 요청한 기획사가 올린 READY 공개 파일이어야 하며
`show-images` 업로드로 받는다. 새 공연은 `DRAFT`이고, 시작 전인 회차가 하나 이상 있어야 `opening`으로 `OPEN`이 된다.
`closing`은 `OPEN`에서만 `CLOSED`로 바꾸며 `opening`으로 다시 열 수 있다. 회차 시작 시각은 ISO-8601 UTC이고 현재 이후여야 한다.

관객 목록은 `OPEN` 공연만, 상세는 `OPEN`·`CLOSED` 공연을 반환하고 `DRAFT`는 `404 SHOW_NOT_FOUND`다.
상세 회차는 정원·예매 수 대신 `remainingSeats`, `maxTicketCount`(`min(10, 잔여석)`, 0이면 매진),
`bookable`(공연 `OPEN`, 시작 전, 잔여석 있음)만 준다. 공연이 잔여석을 숨기면(`remainingSeatsVisible=false`)
`remainingSeats`는 `null`이고 나머지는 같다. 상세에는 `guides`(`title`, `content`)와 `links`(`label`, `url`)도 포함한다.
상세의 `externalReservationUrl`은 외부 예매 주소이고 예술in 예매면 빈 문자열이다. 외부 예매 공연의 회차는 잔여석을 알 수 없어
`remainingSeats`가 `null`, `maxTicketCount`가 0이고, `bookable`은 공연 `OPEN`이고 시작 전인지만 뜻한다.
외부 예매 공연에 예매를 요청하면 `409 SHOW_EXTERNAL_RESERVATION`이다.
`external-reservation-visits`는 관객이 외부 링크 공연에서 예매하기를 누를 때 화면이 보내는 이동 기록이다. 관객 정보 없이
공연과 시각만 저장하며 CSRF 토큰이 필요하다. 없는 공연·`DRAFT`는 `404 SHOW_NOT_FOUND`, `OPEN`이 아니면 `409 SHOW_NOT_OPEN`,
외부 링크 공연이 아니면 `409 SHOW_INVALID_STATUS`다.
관객 목록·상세의 `hostName`은 공연에 따로 적은 주최 이름이고, 비어 있으면 기획사 계정의 회사명이다.
예매는 1~10매, 휴대폰 `010-1234-5678` 형식, 개인정보 수집·이용 동의가 필요하다. 서버는 회차 행을 잠근 뒤
같은 회차의 같은 휴대폰 확정 예매(`409 RESERVATION_DUPLICATE`)와 시작 시각 경과(`409 SHOW_SESSION_BOOKING_CLOSED`),
잔여석 부족(`409 SHOW_SESSION_NOT_ENOUGH_SEATS`)을 확인한다. 응답의 `code`는 8자리 예매번호다.
취소된 예매는 같은 번호로 다시 예매할 수 있다.

관객 본인 취소는 없다. 기획사가 전화 요청을 받아 `cancellation`으로 취소하며 이미 취소된 예매는 그대로 반환한다.
`ticket-count`는 확정 예매의 매수를 1~10매로 바꾼다. 회차 행을 잠그고 정원을 넘으면 `409 SHOW_SESSION_NOT_ENOUGH_SEATS`,
취소된 예매면 `409 RESERVATION_NOT_CHANGEABLE`이다. 기획사 예외 처리를 위해 회차 시작·공연 마감 후에도 바꿀 수 있다.
`memo`는 관객별 메모(300자 이하, 빈 문자열이면 삭제)를 저장하며 취소된 예매에도 남길 수 있다. 메모는
`ProducerReservationResult.memo`로만 내보내고 관객 API에는 포함하지 않는다.
정원은 확정 매수보다 줄일 수 없고(`409 SHOW_SESSION_CAPACITY_BELOW_RESERVED`), 예매 기록이 있는 회차와 공연은
삭제할 수 없다(`409 SHOW_SESSION_HAS_RESERVATIONS`, `409 SHOW_HAS_RESERVATIONS`).

## 오디션 일정표 — 12개

로그인 없이 링크 열쇠로 쓰는 독립 일정표다. 관리 API는 기획사의 관리 링크 열쇠, 배우 API는 배우의 개인 링크 열쇠를
`X-Timetable-Key` 헤더로 받는다. 열쇠는 URL-safe Base64 22자다. 열쇠는 요청 로그에 남지 않도록 경로·쿼리에 넣지 않는다. 헤더가 없으면
`400 INVALID_REQUEST`, 형식이 틀리거나 없는 열쇠는 `404 TIMETABLE_NOT_FOUND`다. 쓰기 요청은 CSRF header가 필요하고
응답은 모두 `Cache-Control: no-store`다. 날짜는 `YYYY-MM-DD`, 시각은 한국 시간이며 요청은 `HH:mm`, 응답은 `HH:mm:ss`다.

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/timetables` | 공개 | `CreateTimetableRequest(profile, setting)` | `201 TimetableCreatedResult(manageKey)` |
| GET | `/api/v1/timetables/manage` | 관리 열쇠 | 없음 | `200 TimetableBoardResult` |
| PUT | `/api/v1/timetables/manage/profile` | 관리 열쇠 | `TimetableProfileRequest` | `200 TimetableBoardResult` |
| PUT | `/api/v1/timetables/manage/board` | 관리 열쇠 | `SaveTimetableBoardRequest(setting, assignments)` | `200 TimetableBoardResult` |
| POST | `/api/v1/timetables/manage/actors` | 관리 열쇠 | `RegisterActorsRequest(actors: [{name, phone}])` | `201 TimetableBoardResult` |
| DELETE | `/api/v1/timetables/manage/actors/{actorId}` | 관리 열쇠 | 없음 | `200 TimetableBoardResult` |
| POST | `/api/v1/timetables/manage/publication` | 관리 열쇠 | 없음 | `200 TimetableBoardResult` |
| PUT | `/api/v1/timetables/manage/self-change-lock` | 관리 열쇠 | `ChangeSelfChangeLockRequest(locked)` | `200 TimetableBoardResult` |
| POST | `/api/v1/timetables/manage/requests/{requestId}/resolution` | 관리 열쇠 | 없음 | `200 TimetableBoardResult` |
| GET | `/api/v1/timetables/actor` | 배우 열쇠 | 없음 | `200 ActorTimetableResult` |
| PUT | `/api/v1/timetables/actor/slot` | 배우 열쇠 | `ChangeActorSlotRequest(current, next)` | `200 ActorTimetableResult` |
| POST | `/api/v1/timetables/actor/requests` | 배우 열쇠 | `CreateTimeRequestRequest(message)` | `200 ActorTimetableResult` |

`profile`은 `title`(60자 이하), `organizerName`(40자 이하), `organizerPhone`(`010-1234-5678`), 선택 `location`(200자 이하)·
`guide`(1000자 이하)다. `setting`은 `slotMinutes`(5분 단위 5~240), `slotCapacity`(1~50), `windows`(1~200개의
`{date, startTime, endTime}`, 5분 단위, 같은 날 겹침 불가)다. 일정표를 만들면 관리 열쇠를 응답으로 한 번 주고
담당자 번호로 관리 링크 문자를 대기열에 넣는다. 형식·길이·시간대 규칙 위반은 `400 TIMETABLE_INVALID_INPUT`이다.

`TimetableBoardResult`는 일정표 정보와 `status`(`DRAFT`·`PUBLISHED`), `publishedAt`, `selfChangeLocked`,
`selfChangeNoticeHours`(24), 설정, `actors`와 열린 `requests`를 담는다. 배우는 `id`, `name`, `phone`, `slot`
(`{date, startTime, endTime}` 또는 null), `invited`, 배우가 직접 바꿨을 때만 값이 있는 `previousSlot`·`actorChangedAt`,
등록 시각 `registeredAt`이다. `registeredAt`이 `publishedAt`보다 늦으면 확정 뒤 등록한 추가 합격자다.

보드 저장의 `assignments`는 옮긴 배우만 `{actorId, previous, next}`로 보낸다(null은 미배정, 최대 300개). `previous`가 지금
시간과 다르면 `409 TIMETABLE_ASSIGNMENT_CONFLICT`, 같은 배우가 두 번이면 `400 TIMETABLE_INVALID_INPUT`이다. 시간대 설정을
바꾼 뒤 모든 배정이 시간 칸 안에 있지 않거나 정원을 넘으면 `409 TIMETABLE_SLOT_UNAVAILABLE`, 확정 뒤 안내한 배우를
비우면 `400 TIMETABLE_INVALID_INPUT`이다. 저장한 시간대는 늘리기만 한다. 기존 시간 칸이 하나라도 빠지거나
`slotMinutes`가 바뀌거나 `slotCapacity`가 줄면 `409 TIMETABLE_SETTING_NOT_EXTENDABLE`이다. 확정한 일정표는 옮긴 안내 배우에게 변경 안내, 새로 시간을 받은 배우에게 첫 안내를
대기열에 넣고, 옮긴 배우의 열린 요청을 닫는다. 배우 등록은 1~300명이며 한 일정표에 같은 번호가 있으면
`409 TIMETABLE_DUPLICATE_ACTOR`, 합계 300명을 넘으면 `409 TIMETABLE_TOO_MANY_ACTORS`다. 확정은 배우가 없거나
미배정 배우가 있으면 `409 TIMETABLE_NOT_PUBLISHABLE`이다. 없는 배우·요청은 `404 TIMETABLE_ACTOR_NOT_FOUND`,
`404 TIMETABLE_REQUEST_NOT_FOUND`다.

배우 API는 확정 뒤 안내를 받은 배우만 열 수 있고 그 밖에는 `404 TIMETABLE_NOT_FOUND`다. `ActorTimetableResult`는 일정표
이름·단체명·장소·안내 사항, 배우 이름, `slot`, `selfChange`(`OPEN`·`LOCKED`·`DEADLINE_PASSED`), `changeDeadline`,
`openSlots`(지금 옮길 수 있는 빈 칸), 열린 `request`(`message`, `createdAt`)를 담고 다른 배우의 이름·번호·칸별 인원은 담지 않는다.
직접 변경은 일정표 행을 잠근 뒤 `current`가 지금 시간과 다르면 `409 TIMETABLE_ASSIGNMENT_CONFLICT`, 기획사가 막았거나 지금 시간의
시작까지 24시간이 남지 않았으면 `409 TIMETABLE_SELF_CHANGE_CLOSED`, 옮길 칸이 바운더리 밖·정원 초과·24시간 이내면
`409 TIMETABLE_SLOT_UNAVAILABLE`이다. 성공하면 바로 확정되고 그 배우의 열린 요청을 닫는다. 시간 조정 요청은 300자 이하이며
열린 요청이 있으면 내용을 바꾸고, 담당자 요청 알림은 아직 보내지 않은 알림이 없을 때만 대기열에 넣는다.

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
| POST | `/api/v1/upload-diagnostics` | Applicant 또는 Producer 또는 Admin | `UploadDiagnosticRequest` | `204` |

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

## 운영 대시보드 — 18개

개발팀 전용 경로다. 모두 `ADMIN` 세션만 통과하며 다른 역할은 `403 AUTH_FORBIDDEN`이다.

| Method | URL | 인증 | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/overview` | Admin | 없음 | `200 AdminOverview` |
| GET | `/api/v1/admin/member-stats` | Admin | 없음 | `200 AdminMemberStats` |
| GET | `/api/v1/admin/activity` | Admin | 없음 | `200 AdminActivity` |
| GET | `/api/v1/admin/producers` | Admin | `status` query (`PENDING`/`ACTIVE`, 선택) | `200 AdminProducersResponse` |
| GET | `/api/v1/admin/auditions` | Admin | `status` query (`DRAFT`/`PUBLISHED`/`CLOSED`, 선택) | `200 AdminAuditionsResponse` |
| GET | `/api/v1/admin/auditions/{auditionId}/submissions` | Admin | 없음 | `200 AdminSubmissionsResponse` |
| GET | `/api/v1/admin/submissions/{submissionId}` | Admin | 없음 | `200 ApplicantSubmissionDetailResponse` |
| GET | `/api/v1/admin/shows` | Admin | `status` query (`DRAFT`/`OPEN`/`CLOSED`, 선택) | `200 AdminShowsResponse` |
| GET | `/api/v1/admin/audit-logs` | Admin | `page` query (선택, 0부터) | `200 AdminAuditLogsResponse` |
| GET | `/api/v1/admin/logs` | Admin | `keyword`, `limit`, `date`(`yyyy-MM-dd`) query (선택) | `200 AdminLogResponse` |
| GET | `/api/v1/admin/otr-redirects` | Admin | `days` query (1~14, 기본 14) | `200 OtrRedirectReport` |
| GET | `/api/v1/admin/files/unreferenced` | Admin | `status` (`PENDING`/`READY`/`DELETING`), `page`(0부터), `size`(1~100) query, 모두 선택 | `200 UnusedFilesResult` |
| DELETE | `/api/v1/admin/files/{fileId}` | Admin | `DeleteAdminFileRequest(confirmationPassword)` | `204` |
| POST | `/api/v1/admin/files/deletions` | Admin | `BatchDeleteAdminFilesRequest(fileIds, confirmationPassword)` | `200 BatchFileDeletionResult` |
| PATCH | `/api/v1/admin/members/{memberId}/status` | Admin | `ChangeMemberStatusRequest(status)` | `200 MemberStatusResult` |
| PUT | `/api/v1/admin/shows/{showId}/host-name` | Admin | `ChangeShowHostNameRequest(hostName)` | `200 AdminShowHostNameResult` |
| POST | `/api/v1/admin/shows` | Admin | `AdminSaveShowRequest` | `201 ProducerShowResponse`, `Location` |
| GET | `/api/v1/admin/shows/{showId}` | Admin | 없음 | `200 ProducerShowResponse` |
| PUT | `/api/v1/admin/shows/{showId}` | Admin | `AdminSaveShowRequest` | `200 ProducerShowResponse` |
| DELETE | `/api/v1/admin/shows/{showId}` | Admin | 없음 | `204` |
| POST | `/api/v1/admin/shows/{showId}/opening` | Admin | 없음 | `200 ProducerShowResponse` |
| POST | `/api/v1/admin/shows/{showId}/closing` | Admin | 없음 | `200 ProducerShowResponse` |
| POST | `/api/v1/admin/shows/{showId}/sessions` | Admin | `AdminSaveShowSessionRequest(startsAt)` | `201 ProducerShowResponse` |
| PUT | `/api/v1/admin/shows/{showId}/sessions/{sessionId}` | Admin | `AdminSaveShowSessionRequest(startsAt)` | `200 ProducerShowResponse` |
| DELETE | `/api/v1/admin/shows/{showId}/sessions/{sessionId}` | Admin | 없음 | `200 ProducerShowResponse` |
| POST | `/api/v1/admin/show-images/upload-requests` | Admin | `ShowImageUploadRequest` | `201 FileUploadResult` |
| PATCH | `/api/v1/admin/show-images/{fileId}/completion` | Admin | 없음 | `204` |
| DELETE | `/api/v1/admin/submissions/{submissionId}` | Admin | `DeleteAdminSubmissionRequest(confirmationPassword)` | `204` |
| GET | `/api/v1/admin/timetable-messages` | Admin | `status` query (`PENDING`/`SENT`, 기본 `PENDING`) | `200 AdminTimetableMessagesResult` |
| POST | `/api/v1/admin/timetable-messages/completion` | Admin | `CompleteTimetableMessagesRequest(messageIds)` | `200 AdminTimetableMessagesResponse` |

`AdminOverview`는 회원·공연·공고·지원서, OTR 공고·지원서, 무료 공연·확정 예매 매수 집계와 최근 7일 신규 수만 담고
개인 식별 정보를 담지 않는다. 예매 매수와 최근 7일 예매 수(`newReservationsInLastWeek`)는 현재 확정 상태인 예매만 센다.
`AdminMemberStats`는 배우·기획사 수, 가입 경로(`signupMethods`: 배우의 소셜 계정 `kakao`·`naver`·`google`, 기획사
이메일 가입 `email`, 소셜 계정이 없는 배우 `unknownApplicants`)와 한국 시간 오늘·최근 7일·최근 30일 신규 배우·기획사
수를 담는다. 한 배우가 여러 소셜 계정을 연결하면 경로마다 센다. 로그인·방문 기록은 저장하지 않으므로 활성 사용자 수는
제공하지 않는다. `AdminActivity.days`는 오늘을 포함한 최근 14일을 한국 날짜 오래된 순으로 담고, 날마다 신규 배우·기획사,
지원서, OTR 지원서, 현재 확정 상태인 예매 건수·매수를 0 포함으로 반환한다.

`OtrRedirectReport`는 `environment`(`DEV`·`PROD`·`LOCAL`), 한국 날짜 `startDate`·`endDate`,
`totalClicks`, `links: [{otrId, clicks, lastClickedAt}]`, `available`, `truncated`, `readAt`을 반환한다.
현재 서버의 로그만 집계하며 다른 환경의 세션·서버·DB를 조회하지 않는다. 응답은 `Cache-Control: no-store`다.
현재 JSON 로그 파일과 선택 기간의 날짜별 `.gz`(오늘 rolling 파일 포함)를 스트림으로 읽고,
검증된 `otrId`가 있는 `HTTP_REQUEST`·GET·`endpoint=/api/v1/otr`·302만 센다. HEAD·실패·기존 텍스트는 제외한다.
공고별 이동 수 내림차순, 동률이면 번호 문자열 순이다. 총합은 반환한 모든 공고의 합이며 최근 500줄 제한과 무관하다.
파일 경로는 서버 설정으로 고정한다. 한 요청에 최신 파일부터 최대 200개·해제된 64 × 1024 × 1024문자까지 읽고,
상한 또는 파일 읽기 오류가 있으면 `truncated=true`로 부분 집계를 표시한다. 읽을 파일이 없으면
`available=false`다. 정상적으로 읽었으나 이동 로그가 없으면 `available=true`, `totalClicks=0`이다.
기간은 오늘 포함 1~14일이다. 범위 밖·잘못된 숫자는 `400 INVALID_REQUEST`다. 삭제된 보관 로그와 배포 전
기록은 복원하지 않으며 영구 누적 통계나 고유 방문자 수가 아니다.

미사용 파일 목록은 7일 미만도 포함한다. `files`의 각 항목은 `fileId`, `ownerId`, `status`, `storageScope`,
`createdAt`, `unusedSince`, `deletableAt`, `deletable`을 담는다. 응답에 `page`, `size`, `hasNext`가 포함된다.
파일 DELETE는 `PENDING`이면 업로드 요청 시각, `READY`이면 업로드 완료·마지막 연결 해제 시각부터 7일 이상
지난 경우만 허용한다. 요청 시 참조를 다시 검사하고 지원서 삭제와 같은 확인 비밀번호를 요구한다.
사용 중이면 `409 FILE_STILL_IN_USE`, 7일 미만이면 `409 FILE_TOO_RECENT`, 없는 ID는 `404 FILE_NOT_FOUND`다.
파일 삭제 확인은 지원서 삭제와 같은 `YESULIN_ADMIN_DELETION_PASSWORD_HASH` 설정과 관리자 계정별 입력 제한을 사용한다.
해시 미설정 시 파일 삭제는 `403 ADMIN_DELETION_CONFIRMATION_FAILED`로 거부된다.
일괄 삭제는 중복 없는 양의 파일 ID 1~100개와 확인 비밀번호를 한 번만 받는다. 결과는 요청 순서대로
`results: [{fileId, status, code}]`이며 `status`는 `DELETED`·`ALREADY_DELETED`·`FAILED`다.
실패 항목의 `code`는 `FILE_TOO_RECENT`, `FILE_STILL_IN_USE`, `FILE_NOT_FOUND`, `FILE_DELETION_FAILED` 중 하나다.
비밀번호가 틀리면 전체 요청을 거부하고 어떤 파일도 삭제하지 않는다. 파일별 실패는 다른 파일의 처리를 막지 않는다.
S3 삭제 실패 시 `DELETING` 상태가 남으며 같은 파일 ID로 재시도할 수 있다. 완료된 단건 삭제 재요청은 `204`다.

기획사 목록은 이메일 미인증(`PENDING`) 계정을 앞에 두고 최근 가입 순으로 정렬한다. 공고 목록은 최근 생성 순으로 전체를 반환한다.
무료 공연 목록은 최근 생성 순으로 전체를 반환한다. 각 공연은 `showId`, `title`, `status`, `companyName`(계정 기획사명),
`hostName`(공연에 따로 적은 주최 이름, 없으면 빈 문자열이며 관객에게는 `companyName`이 보임),
`externalReservationUrl`(운영자 공연의 외부 예매 주소, 기획사 공연은 빈 문자열이며 운영자 공연은 `companyName`이 `null`),
`externalReservationVisits`(예매하기로 외부 예매 페이지에 간 횟수, 기획사 공연은 0), `createdAt`,
전체 회차 정원 합 `totalCapacity`, 확정 매수 `reservedTickets`, 확정 건수 `reservationCount`, 취소 건수
`canceledReservationCount`와 시작 시각 순의 `sessions`를 담는다. 회차는 `sessionId`, `startsAt`, `capacity`와 같은 이름의
회차별 집계를 담으며 예매가 없으면 0이다. 예매자 이름·휴대폰과 예매번호는 반환하지 않는다.
`host-name`은 기획사가 계정 이름을 개인 이름으로 적은 경우처럼 운영자가 공연의 주최 이름을 대신 고칠 때 쓴다.
50자 이하이고 기획사 공연은 빈 문자열이면 계정 기획사명으로 되돌린다. 외부 링크 공연은 주최 이름이 필수이며
빈 문자열·공백만 보내면 `400 SHOW_INVALID_INPUT`으로 거절한다. 응답은 `showId`, `hostName`, `companyName`이다.
없는 공연은 `404 SHOW_NOT_FOUND`다. `admin_audit_logs`에 `SHOW_HOST_NAME_CHANGED`로 남기되 이름 원문은 담지 않는다.
`POST /api/v1/admin/shows`와 그 아래 경로는 기획사 계정이 없는 공연을 운영자가 직접 등록·관리할 때 쓴다. 이 공연은 등록한
운영자가 소유하고, 네이버 폼 같은 외부 링크로만 예매받는다. `AdminSaveShowRequest`는 `SaveShowRequest`에서
`remainingSeatsVisible`을 빼고 `hostName`(50자 이하)과 `externalReservationUrl`(500자 이하 http/https, 도메인에 점 필수)을
필수로 받는다. 빠지거나 비어 있으면 `400 INVALID_REQUEST`, 주소 형식이 틀리면 `400 SHOW_INVALID_INPUT`이다.
조회·수정·삭제·공개·마감·회차 API는 외부 링크 공연만 찾고 기획사 공연은 `404 SHOW_NOT_FOUND`로 다룬다. 회차는 정원 없이
시작 시각만 받고 응답의 `capacity`는 0이다. 이미지는 요청한 운영자 계정의 파일로 올리며 공연 소유자의 파일만 연결된다.
그 밖의 응답·회차 규칙은 기획사 API와 같다.
`admin_audit_logs`에 등록(`SHOW_CREATED`), 공개·마감(`SHOW_STATUS_CHANGED`), 삭제(`SHOW_DELETED`)를 남긴다.
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
`date`가 서버 시간대 기준 지난 날짜면 그날 압축 보관된 `{로그 파일}.{date}.{번호}.gz`를 최신 번호부터 풀어 읽고,
조건에 맞는 마지막 `limit`줄을 오래된 순으로 반환한다. 하루에 풀어 읽는 양에 상한이 있어 넘치면 더 오래된 보관 파일은
건너뛰고 `truncated=true`다. 보관 파일이 없으면(보관 기간 14일이 지난 날짜 포함) `available=true`와 빈 목록이다.
`date`가 없거나 오늘 이후면 현재 파일을 읽는다. 날짜 형식이 틀리면 `400 INVALID_REQUEST`다.
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

일정표 문자 대기열은 기획사에게 자동 발송으로 안내한 문자를 운영자가 직접 보내기 위한 목록이다. `PENDING`은 오래된 순
최대 200건, `SENT`는 최근 보낸 순 최대 100건을 주며 `pendingCount`는 상한과 관계없는 전체 대기 건수다. 각 문자는 `type`
(`ORGANIZER_LINK`·`ORGANIZER_TIME_REQUEST`·`ACTOR_INVITATION`·`ACTOR_SCHEDULE_CHANGED`), 일정표 이름·단체명, 받는 사람 이름·번호,
본문, 대기·발송 시각을 담고 응답은 `Cache-Control: no-store`다. 완료 표시는 서로 다른 ID 1~100개를 받아 대기 문자만 `SENT`로
바꾸고 `TIMETABLE_MESSAGE_SENT` 감사 기록을 번호·본문 없이 남긴다. 이미 보낸 문자는 처음 기록을 유지하고, 없는 ID가 섞이면
`404 TIMETABLE_MESSAGE_NOT_FOUND`로 전체를 거절한다.

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
| 예매 | `RESERVATION_NOT_FOUND`, `RESERVATION_INVALID_INPUT`, `RESERVATION_DUPLICATE`, `RESERVATION_NOT_CHANGEABLE` |
| 가져온 공고 | `AUDITION_POST_NOT_FOUND`, `AUDITION_POST_INVALID_INPUT`, `AUDITION_POST_CATEGORY_NOT_SUPPORTED`, `AUDITION_POST_SOURCE_UNAVAILABLE`, `AUDITION_POST_FILE_REJECTED`, `AUDITION_POST_IMPORT_CONFLICT` |
| 오디션 일정표 | `TIMETABLE_NOT_FOUND`, `TIMETABLE_INVALID_INPUT`, `TIMETABLE_ACTOR_NOT_FOUND`, `TIMETABLE_DUPLICATE_ACTOR`, `TIMETABLE_TOO_MANY_ACTORS`, `TIMETABLE_SLOT_UNAVAILABLE`, `TIMETABLE_SETTING_NOT_EXTENDABLE`, `TIMETABLE_ASSIGNMENT_CONFLICT`, `TIMETABLE_NOT_PUBLISHABLE`, `TIMETABLE_SELF_CHANGE_CLOSED`, `TIMETABLE_REQUEST_NOT_FOUND`, `TIMETABLE_MESSAGE_NOT_FOUND` |
| 운영 | `MEMBER_NOT_FOUND`, `MEMBER_STATUS_CHANGE_NOT_ALLOWED`, `ADMIN_DELETION_CONFIRMATION_FAILED` |

인가 공통 오류는 `401 AUTH_UNAUTHENTICATED`, `403 AUTH_FORBIDDEN`, `403 AUTH_INACTIVE_MEMBER`다.
