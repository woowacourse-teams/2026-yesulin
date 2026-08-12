# 백엔드 API Postman 테스트 가이드

> 기준: 현재 `backend/src/main/java/**/presentation`에 실제로 구현된 HTTP API  
> Base URL: `http://localhost:8080`  
> Postman 컬렉션: [`postman/yesulin-backend.postman_collection.json`](./postman/yesulin-backend.postman_collection.json)

이 문서는 목표 명세가 아니라 **현재 실행 가능한 백엔드 API**만 설명한다. 목표 계약과 아직 구현하지 않은 API는 [API 컨벤션](./convention/api-convention.md)을 참고한다.

## 1. 테스트 전 준비

1. 루트에서 `docker compose up -d`로 MySQL을 실행한다.
2. `backend`에서 `gradlew.bat bootRun --args="--spring.profiles.active=local"`을 실행한다.
3. Postman에서 컬렉션 JSON을 Import한다.
4. 컬렉션 변수 `producerPassword`에 seed 이관 때 사용한 `YESULIN_SEED_PRODUCER_PASSWORD` 값을 넣는다.
5. `01. 세션 준비 및 인증` 폴더를 번호 순서대로 실행한다.

seed 비밀번호를 잊었다면 DB의 BCrypt hash에서 원래 값을 복구할 수 없다. 새 공연사 가입 요청으로 테스트 계정을 만들거나 seed를 별도 로컬 DB에 다시 이관해야 한다.

## 2. 세션과 CSRF

백엔드는 `JSESSIONID` 세션 쿠키와 CSRF 토큰을 함께 사용한다. Postman은 같은 도메인의 쿠키를 자동 보관한다.

1. `GET /api/v1/sessions/current`를 먼저 호출한다.
2. 응답의 `csrfToken`이 컬렉션 변수에 자동 저장된다.
3. POST·PUT·PATCH·DELETE 요청은 `X-CSRF-Token: {{csrfToken}}` 헤더를 사용한다.
4. 로그인 후 응답의 새 토큰과 세션 쿠키를 계속 사용한다.

CSRF 토큰 없이 상태 변경 요청을 보내면 공개 회원가입과 로그인도 `403 Forbidden`이 된다. 로그인하지 않고 보호 API를 호출해도 `403 Forbidden`이다.

## 3. 현재 구현 API

### 세션

| Method | Path | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/api/v1/sessions/current` | 불필요 | 현재 세션과 CSRF 토큰 조회 |
| POST | `/api/v1/sessions` | 불필요, CSRF 필요 | 이메일·비밀번호 로그인 |
| PUT | `/api/v1/sessions/current/active-company` | 필요 | 활성 공연사 변경 |
| DELETE | `/api/v1/sessions/current` | 필요 | 로그아웃 |

로그인 요청:

```json
{
  "email": "producer@yesulin.example",
  "password": "컬렉션 변수 producerPassword"
}
```

세션 응답:

```json
{
  "authenticated": true,
  "accountId": 1,
  "email": "producer@yesulin.example",
  "activeCompanyId": 1,
  "csrfToken": "..."
}
```

### 계정 가입

| Method | Path | 인증 | 성공 |
| --- | --- | --- | --- |
| POST | `/api/v1/applicants` | 불필요, CSRF 필요 | `201 Created` |
| POST | `/api/v1/producers` | 불필요, CSRF 필요 | `201 Created` |

지원자 가입 요청:

```json
{
  "email": "postman-applicant@example.com",
  "password": "postman1234"
}
```

공연사 가입 요청:

```json
{
  "email": "postman-producer@example.com",
  "password": "postman1234",
  "companyName": "Postman 공연사",
  "businessNumber": "111-22-33333",
  "representativeName": "테스트 대표",
  "contactName": "테스트 담당자"
}
```

같은 이메일로 다시 가입하면 `409 ACCOUNT_ALREADY_EXISTS`가 반환된다. 가입만으로 인증되지는 않으므로 이후 로그인 요청이 필요하다.

### 지원자 프로필과 제출 지원서 조회

| Method | Path | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/api/v1/applicants/me/profile` | 지원자 로그인 | 프로필 조회 |
| PATCH | `/api/v1/applicants/me/profile` | 지원자 로그인 | 프로필 전체 입력값 갱신 |
| GET | `/api/v1/applicants/me/applications` | 지원자 로그인 | 본인의 제출 지원서 목록 |
| GET | `/api/v1/applicants/me/applications/{applicationId}` | 지원자 로그인 | 본인의 제출 스냅샷 상세 |

프로필 수정 예시:

```json
{
  "activityName": "테스트 배우",
  "name": "지원자",
  "height": 170,
  "weight": 60,
  "birthDate": "2000-01-01",
  "gender": "FEMALE",
  "phone": "010-1234-5678",
  "email": "postman-applicant@example.com",
  "residence": "서울",
  "additionalInformation": { "specialty": "연기" },
  "photoUrls": ["https://example.com/profile.jpg"],
  "profileSaveConsent": true
}
```

현재 seed에서는 지원서 73건을 이관하지 않았기 때문에 seed 계정만으로 지원서 조회 결과를 기대할 수 없다. 최종 제출 HTTP API도 아직 없어서 Postman만으로 지원서를 새로 생성할 수 없다.

### 공연·공고·배역

모든 요청은 로그인과 활성 공연사 문맥이 필요하다. 다른 공연사의 리소스에 접근하면 `403 COMPANY_ACCESS_DENIED`가 반환된다.

| Method | Path | 성공 | 설명 |
| --- | --- | --- | --- |
| GET | `/api/v1/performances` | `200` | 활성 공연사의 공연 목록 |
| POST | `/api/v1/performances` | `201` | 공연 생성 |
| GET | `/api/v1/performances/{performanceId}` | `200` | 공연 상세 |
| PATCH | `/api/v1/performances/{performanceId}` | `200` | 공연 수정 |
| DELETE | `/api/v1/performances/{performanceId}` | `204` | 공연 삭제 |
| GET | `/api/v1/performances/{performanceId}/postings` | `200` | 공연의 공고 목록 |
| POST | `/api/v1/performances/{performanceId}/postings` | `201` | 공고 생성 |
| GET | `/api/v1/postings/{postingId}` | `200` | 공고 상세 |
| PATCH | `/api/v1/postings/{postingId}` | `200` | 공고 수정 |
| DELETE | `/api/v1/postings/{postingId}` | `204` | 공고 삭제 |
| GET | `/api/v1/postings/{postingId}/roles` | `200` | 공고의 배역 목록 |
| POST | `/api/v1/postings/{postingId}/roles` | `201` | 배역 생성 |

공연 생성 예시:

```json
{
  "title": "Postman 테스트 공연",
  "venue": "테스트 극장",
  "posterUrl": "https://example.com/poster.jpg"
}
```

공고 생성 예시:

```json
{
  "title": "Postman 테스트 공고",
  "status": "UPCOMING",
  "allowsMultipleRoles": false,
  "recruitmentStartsAt": "2026-09-01T00:00:00+09:00",
  "recruitmentEndsAt": "2026-09-30T23:59:59+09:00",
  "applicationGuide": "Postman 테스트용 공고입니다."
}
```

배역 생성 예시:

```json
{
  "name": "테스트 배역",
  "description": "Postman 테스트용 배역",
  "quota": 2,
  "genderCondition": "ANY",
  "ageMin": 20,
  "ageMax": 40
}
```

공고 상태는 `UPCOMING`, `OPEN`, `CLOSED`, 성별 조건은 `ANY`, `MALE`, `FEMALE`, `OTHER` 중 하나다. 수정 API는 부분 수정이 아니라 생성 요청과 동일한 전체 본문을 요구한다.

## 4. 공통 오류 형식

```json
{
  "code": "INVALID_REQUEST",
  "message": "요청 값이 올바르지 않습니다.",
  "detail": { "field": "오류 설명" }
}
```

- `400`: 입력 검증 또는 도메인 규칙 위반
- `401`: 로그인 이메일 또는 비밀번호 불일치
- `403`: 미인증, CSRF 누락, 공연사 접근 권한 없음
- `404`: 소유 범위에서 리소스를 찾을 수 없음
- `409`: 이메일 중복, 공고·공연 삭제 제약 등 상태 충돌

## 5. 아직 HTTP API가 없는 기능

- 공개 공고와 추천 공고 조회
- 로그인 전·후 Draft 생성·동기화·계정 연결
- 사진과 파일 업로드
- 최종 지원서 제출
- 공연사 프로필 조회·수정·탈퇴
- 공연사 탐색 트리
- 지원자 심사 목록·상세·결과 저장·차수 마감
- 지원자 지원서 수정

프론트 MSW에는 이 중 일부가 구현되어 있지만 백엔드 API 구현을 의미하지 않는다.
