# 프론트엔드 API 준비도와 Notion 명세 대조

2026-08-07 기준으로 현재 Notion `API 명세` 데이터베이스를 읽고, 프론트엔드의 지원자·공연사 흐름과 MSW 계약을 대조한 결과다. Notion 페이지 자체는 수정하지 않았다.

이 문서는 현재 구현과 기존 명세의 차이를 추적한다. 백엔드가 구현할 목표 `/api/v1` 경로는 [API 컨벤션](./convention/api-convention.md)을 기준으로 하며, 프런트·MSW는 이전 계약에서 순차적으로 이관한다.

## 구현된 사용자 흐름

### 지원자

```text
공개 공고 확인 → 배역 선택 → 프로필 미리 채우기 → 단계별 작성
→ 검토·동의 → 제출 완료/조회 코드 → 비로그인 조회
→ 회원가입 또는 로그인 → 지원자 홈 → 프로필·지원서 열람/수정
```

- `/applicants`: 프로필 완성도, 최근 지원서, 추천 공고를 함께 보여준다.
- `/applicants/profile`: 표준 프로필과 공고별 추가 답변을 부분 저장·삭제한다.
- `/applicants/applications`: 전형 결과를 노출하지 않고 제출 이력과 수정 가능 여부만 보여준다.
- `/applicants/applications/{applicationId}`: 제출 스냅샷을 열람하고 모집 마감 전 답변을 수정한다. 배역은 바꾸지 않는다.
- `/apply/{postingId}?prefill=1`: 해당 공고가 요구하는 프로필 답변만 받아 지원서 초깃값으로 쓴다.
- `/apply/lookup`: 조회 코드와 지원 당시 연락처가 모두 일치할 때 읽기 전용 지원서를 보여준다.
- 공개 제출 성공 시 숫자형 공통 `applicationId`, `receiptNumber`, `submittedAt`, `profileClaimToken`, `profileClaimExpiresAt`을 받는다. 동일한 제출 스냅샷이 지원자 이력과 공연사 1차 심사 풀에 함께 추가되며 이후 조회 API에서는 접수번호를 `lookupCode`로 표현한다.

### 공연사

```text
공연 등록/수정/삭제 → 공고 등록/수정/삭제·공개 링크 복사
→ 배역 선택 → 차수별 지원자 검토·일괄 처리 → 차수 마감
```

- `/producers/account`: 공개 표시 정보와 담당자를 수정하고 인증 근거 정보는 읽기 전용으로 보여준다.
- 공연 수정은 배역 템플릿 전체를 저장하되 이미 만든 공고의 복사된 배역은 바꾸지 않는다.
- 공고에 지원자가 생기면 시작일·배역·지원서 항목을 화면 진입 시점부터 잠근다. 마감일은 연장만 허용한다.
- 지원자가 있는 공고는 삭제할 수 없고, 공고가 있는 공연도 삭제할 수 없다.

## 현재 프론트엔드가 호출하는 주요 API

Notion 데이터베이스의 `Path`가 `/api/` 이후 경로를 기록하므로 모든 경로는 `/api` 아래다.

| 영역 | 메서드와 경로 | 화면에서 쓰는 결과 |
| --- | --- | --- |
| 지원자 프로필 | `GET/PATCH /me/profile` | 답변 목록, 표준 항목 완성도 |
| 자동 채움 | `GET /me/profile/prefill?postingId=` | 해당 공고 답변, 필수 입력 수, 누락 키 |
| 내 지원서 | `GET /me/applications`, `GET/PATCH /me/applications/{id}` | 목록, 제출 스냅샷, 수정 가능 시한 |
| 공개 추천 | `GET /public/recommended-postings` | 전체 탐색이 아닌 다음 공고 제안 |
| 공개 공고 | `GET /public/postings/{postingId}` | 로그인 없는 공고 상세과 동적 지원서 필드 |
| 공개 제출 | `POST /public/applications` | 본문의 `postingId`, 접수 ID·번호, claim token·만료 시각 |
| 비로그인 조회 | `POST /public/applications/lookup` | 연락처 확인 후 읽기 전용 제출 내용 |
| 지원자 가입 | `POST /auth/signup/applicant` | 가입 결과, claim 귀속 여부와 지원서 ID |
| 공연사 정보 | `GET/PATCH /me/producer` | 표시 정보, 담당자, 인증 읽기 전용 정보 |
| 공연 관리 | `GET/POST /performances`, `PATCH/DELETE /performances/{id}` | 공연 목록 전체 또는 204 |
| 공고 관리 | `GET/POST /performances/{id}/postings`, `PATCH/DELETE /postings/{id}` | 공고 목록 전체 또는 204 |
| 내비게이션 | `GET /navigation/tree` | 공연→공고 트리와 바로 진입할 단일 배역 ID |
| 심사 | `GET /screenings/roles/{roleId}`, `PATCH /screenings/reviews`, `POST /screenings/rounds/close` | 차수별 심사 보드 전체 |

## 백엔드 구현 전에 정리할 명세 차이

### 프론트엔드가 새로 제안하는 API

- `GET /postings/{postingId}`: 공고 수정 폼 초기값이 필요하다. 현재 Notion의 공고 목록 응답에는 `rounds`, `roles`, `applicationFields`, `applicationGuide`, `recruitmentStart`가 없어 수정 화면을 채울 수 없다. 응답 초안은 `PostingManagementDetail`에 있으며, `applicantCount`도 포함해 잠금 상태를 서버와 일치시킨다.

### Notion 안에서 서로 맞지 않는 부분

- 공개 지원서 제출 행의 Path는 `public/applications`인데 상세 문서는 `postingId`를 path variable이라고 표현한다. 정본의 Path를 유지하기 위해 프론트엔드는 `POST /public/applications`를 호출하고 `postingId`를 본문에 싣는다. 백엔드 명세에도 이 해석을 반영해야 한다.
- 공고 등록의 표제 Path는 `performances/{performanceId}/postings`지만 본문에는 “Path Variables 없음, `performanceId`를 body로 받음”이라고 적혀 있다. 프론트엔드는 현재 두 값을 함께 보내며, 백엔드 계약에서는 한 방식으로 통일해야 한다. 권장안은 path를 식별 기준으로 쓰고 body의 중복 필드를 제거하는 것이다.
- 공연 등록은 `posterUrl` base64를 받고 공연 수정은 `posterFileId`를 받는다. 공통 파일 업로드 API를 먼저 확정해 생성·수정을 `posterFileId`로 통일하는 것이 필요하다.
- 공연 수정 문서는 배역을 공고에 복사하므로 템플릿 삭제가 기술적으로 안전하다고 설명하면서도 `TEMPLATE_IN_USE` 차단 여부를 미결로 둔다. 현재 목은 복사본을 유지하고 템플릿 수정을 허용한다.

### 프론트엔드와 명세가 의도적으로 다른 부분

- Notion은 지원자에게 심사 합격/불합격 상태를 노출하지 않는다. 따라서 지원자 홈과 지원서 목록에는 `editable`과 모집 마감 정보만 표시한다. 공연사의 결과 연락은 외부 채널을 사용한다.
- Notion에는 전체 공고 탐색 API가 없다. 랜딩과 지원자 홈은 전체 공고 수를 약속하지 않고 `recommended-postings`를 “다음 기회 제안”으로만 사용한다.
- 공연·공고 DELETE는 204라 클라이언트가 목록을 다시 조회한다. 생성·수정은 갱신된 목록 전체를 받아 즉시 교체할 수 있는 계약이다.

## 아직 결정이 필요한 정책

- 인증 방식: 세션 쿠키와 Bearer JWT 중 하나로 통일.
- 날짜 경계: `YYYY-MM-DD` 마감의 기준 타임존과 마감 시각.
- 지원자 사진·공연 포스터 파일 업로드, 바이러스 검사, 삭제 및 참조 카운트.
- 개인정보 동의의 수집 목적·보관 기간·파기 기준과 비회원 조회 rate limit.
- `profileClaimToken`은 비로그인 제출에만 발급하고 7일 만료·1회 사용으로 처리한다. 목 가입 API는 토큰을 한 번만 소비하고 표준 항목과 지원서 소유권을 함께 귀속한다. 실제 서버의 연락처 재인증 방식은 아직 결정이 필요하다.
- 지원자가 있는 공고의 모집 중단/보관 상태와 API. 삭제 대체 수단이 필요하다.
- 차수 마감 취소, 다중 심사자 동시 수정, 대량 일괄 처리 상한.
- 지원자 수가 수백 명일 때 심사 보드 페이징/요약 응답 전략.

## 범위 밖으로 남긴 것

- 실제 인증·소셜 로그인·사업자/KOPIS 검증
- 실제 파일 업로드와 영속 DB
- 지원자 전체 공고 검색·필터
- 합격자 문자/메일 발송과 발송 이력
- 오디션 시간 슬롯 배정

MSW는 위 흐름과 오류를 브라우저 메모리에서 검증하는 계약 초안이다. 새로고침하면 생성·수정·심사·제출 상태가 초기화되며, 실제 백엔드는 인증에서 공연사/지원자 소유권을 판별해야 한다.
