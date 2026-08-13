# API 계약 통합 결과

> 기준일: 2026-08-12  
> 기준: `frontend/src/features`, `frontend/src/mocks`, `backend/**/presentation`을 직접 대조했다.

## 최종 통신 구조

```text
Frontend feature API
  → 공통 api-client (`/api/v1`, same-origin cookie, CSRF, 공통 오류)
    ├─ Mock mode: MSW가 같은 요청을 intercept
    └─ Real mode: Next rewrite → API_ORIGIN의 Spring Backend
```

Feature 코드는 실행 모드를 알지 않는다. Backend DTO는 feature API adapter에서 기존 화면 View Model로 변환한다. 내부 DB 식별자는 JSON number이며 화면의 branded string ID는 adapter 내부 표현이다.

## 공통 계약

| 항목 | 최종 계약 |
| --- | --- |
| 기본 경로 | `/api/v1/**` |
| 인증 | `JSESSIONID`; 브라우저 요청은 `credentials: same-origin` |
| CSRF | `GET /sessions/current`의 토큰을 모든 POST·PUT·PATCH·DELETE에 `X-CSRF-Token`으로 전달 |
| 오류 | `{ "code": string, "message": string, "detail"?: object }` |
| 시간 | offset이 명시된 ISO-8601 (`Z` 또는 `+09:00`) |
| 실제 서버 주소 | `API_ORIGIN`; feature 코드에 host를 하드코딩하지 않음 |
| Mock 전환 | `NEXT_PUBLIC_API_MOCKING=disabled`이면 Backend, 그 외 개발 환경은 MSW |

## 구현된 주요 Endpoint

| 기능 | Method·Path | 인증 | Frontend/MSW/Backend |
| --- | --- | --- | --- |
| 세션/CSRF | `GET /sessions/current` | 선택 | 일치 |
| 로그인/로그아웃 | `POST /sessions`, `DELETE /sessions/current` | 로그인은 선택 | 일치 |
| 활성 공연사 | `PUT /sessions/current/active-company` | 필수 | 일치 |
| 지원자/공연사 가입 | `POST /applicants`, `POST /producers` | 선택+CSRF | 일치 |
| 지원자 프로필 | `GET·PATCH /applicants/me/profile` | 지원자 | 일치 |
| 프로필 자동 채움 | `GET /applicants/me/profile/prefill?postingId=` | 지원자 | 일치 |
| 공개 공고/추천 | `GET /public/postings/{id}`, `GET /public/recommended-postings` | 불필요 | 일치 |
| 계정 Draft | `GET·POST /applicants/me/drafts` | 지원자 | 일치 |
| 지원서 제출/조회 | `POST·GET /applicants/me/applications`, `GET /.../{id}` | 지원자 | 일치 |
| 공연사 프로필 | `GET·PATCH /producers/me` | 공연사 | 일치 |
| 공연 | `/performances/**` | 공연사 | 일치 |
| 공고·배역·차수·필드 | `/performances/{id}/postings`, `/postings/**` | 공연사 | 일치 |
| 심사 보드 | `GET /roles/{roleId}/screening-rounds/current/applications` 또는 `/{round}/applications` | 공연사 | 일치 |
| 심사 저장/마감 | `PATCH /roles/{roleId}/screening-rounds/{round}/reviews`, `PATCH /.../{round}` | 공연사+CSRF | 일치 |

모든 표의 경로 앞에는 `/api/v1`이 붙는다. 공연사 탐색 트리는 전용 서버 응답을 만들지 않고 Frontend adapter가 공연·공고 조회를 합성한다.

## 처음 발견했고 해결한 차이

| 차이 | 해결 |
| --- | --- |
| `/api/**` 대 `/api/v1/**`, proxy 부재 | 공통 client와 Next rewrite로 통일 |
| 화면 이동뿐인 로그인 | 실제 가입·로그인·세션 유지·로그아웃 연결 |
| CSRF client 부재 | 토큰 lazy 조회·쓰기 헤더·403 시 갱신 처리 |
| Security 빈 401/403 | JSON EntryPoint/AccessDeniedHandler 적용 |
| API DTO와 화면 집계 혼재 | feature adapter에서 View Model 조립 |
| 공개 조회/프로필 prefill/공연사 프로필 Backend 부재 | Backend API 구현 |
| Draft·최종 제출 controller 부재 | 계정 소유 Draft와 인증 제출 API 구현 |
| 제출 지원서 수정·비로그인 조회 | 불변·계정 소유 정책에 따라 제거 |
| 심사 결과 키가 `(지원서, 차수)` | `(지원서, 배역, 차수)` 영속 구조로 변경 |
| 클라이언트 Snapshot 신뢰 | 서버 공고·배역·필드·동의로 Snapshot 생성 |
| 복수 배역 제한 누락 | Domain 제출 검증에 `allowsMultipleRoles` 적용 |
| API `LocalDateTime` 노출 | API Result를 `Instant`로 변경 |
| 사진 4장·기본 필드 토글 | 사진 10장, 8개 기본 정보의 UI/Backend 필수 검증 |

## 의도적으로 공개하지 않은 계약

아래는 정책이 확정되지 않아 Mock 전용 우회 API나 임시 Backend API를 만들지 않았다.

1. 익명 Draft 식별·접근 증명·개인정보 고지와 보관기간
2. Draft/사진 파일 업로드 소유권·정리·교차 기기 충돌
3. 제출 idempotency key와 응답 유실 후 재시도
4. 제출 원본 정정본의 버전 정책

현재 공개 지원 폼의 파일 선택 값은 브라우저 미리보기 범위이며 실제 파일 업로드를 의미하지 않는다. 최종 제출은 인증 계정만 가능하다.

운영 전에는 제출 화면의 선택적 `프로필에도 저장`, 개인정보 보관기간에 따른 자동 삭제,
관리자 감사 로그도 구현해야 한다. 현재 구현은 MVP의 요청·영속 계약을 연결한 상태이며 이 운영 정책을
구현 완료로 간주하지 않는다.

## 남은 구조적 부채

Application port와 Domain/JPA 모델 분리는 유지되지만 일부 `infrastructure/*ServiceAdapter`가 유스케이스 orchestration과 `@Transactional`까지 담당한다. 이는 승인 설계의 “application이 트랜잭션 경계를 소유” 원칙과 아직 완전히 일치하지 않는다. 기능을 깨뜨리는 단순 패키지 이동 대신, 후속 작업에서 output port와 application service를 도입해 단계적으로 옮겨야 한다.
