# API 경로 명세

지원자·공연사 flowchart를 기준으로 한 백엔드 경로 계약이다. REST 원칙을 따르되 클라이언트가 경로만 읽고 용도를 이해할 수 있는 이름을 우선한다.

> 계정 소유 Draft와 인증된 최종 제출 계약은 구현됐다. 인증 전 Draft의 보호·계정 연결과 파일 업로드 계약은 별도 결정 전까지 공개하지 않는다.

## 공통 규칙

- 기본 경로: `/api/v1`
- 리소스는 소문자 복수형 명사를 사용한다.
- 두 단어 이상일 때는 `screening-rounds`처럼 kebab-case를 허용한다. 억지로 줄이거나 붙여 쓰지 않는다.
- `public`은 비로그인 화면에서 호출할 수 있는 API를 묶는 클라이언트용 경로다.
- 상태 변경은 HTTP Method로 표현한다. `me`, `current`는 인증 컨텍스트의 단일 리소스에만 사용한다.
- `prefill`처럼 화면 목적이 명확한 조회는 모호한 명사로 바꾸지 않는다.
- ID는 서버 `Long`, JSON `number`를 사용한다.
- 인증은 HttpOnly 세션 쿠키, 쓰기 요청은 `X-CSRF-Token`을 사용한다.
- 인증 리소스의 소유자 ID는 요청으로 받지 않고 세션에서 결정한다. 로그인 전 Draft는 별도의 검증된 익명 컨텍스트로 접근하며 계정 ID를 요청 본문으로 받지 않는다.
- 성공 응답은 wrapper 없이, 실패는 `{ code, message, detail? }`로 반환한다.
- 호환 필드 추가는 `v1`을 유지하고 breaking change에서만 major 버전을 올린다.

## 인증

```http
POST   /api/v1/sessions                         # 로그인
GET    /api/v1/sessions/current                 # 현재 세션
PUT    /api/v1/sessions/current/active-company  # 소속 검증 후 활성 공연사 전환
DELETE /api/v1/sessions/current                 # 로그아웃
POST   /api/v1/applicants                       # 지원자 가입
POST   /api/v1/producers                        # 공연사 가입
```

소셜 로그인은 아직 제공하지 않는다. 도입 시 `provider`는 우선 `kakao`, `naver`를 허용하며 OAuth 요청의 `state`를 검증한다.

## 지원자

아래에서 `내 계정 수정·탈퇴`는 목표 계약이며 아직 구현되지 않았다. 프로필, 자동 채움,
Draft, 제출·조회 계약은 현재 구현되어 있다.

```http
GET    /api/v1/applicants/me                    # 내 계정
PATCH  /api/v1/applicants/me                    # 내 계정 수정
DELETE /api/v1/applicants/me                    # 회원 탈퇴

GET    /api/v1/applicants/me/profile            # 재사용 프로필·완성도
PATCH  /api/v1/applicants/me/profile            # 프로필 답변 저장·삭제
GET    /api/v1/applicants/me/profile/prefill
       ?postingId={postingId}                    # 공고 양식 기준 자동 채움

GET    /api/v1/applicants/me/applications       # 내 지원서 목록
POST   /api/v1/applicants/me/applications       # 계정 소유 Draft 최종 제출
GET    /api/v1/applicants/me/applications/{applicationId}
                                                    # 내 제출 스냅샷
GET    /api/v1/applicants/me/drafts?postingId={postingId}
                                                    # 공고별 계정 소유 Draft 조회
POST   /api/v1/applicants/me/drafts              # 계정 소유 Draft 생성·전체 교체
```

- 제출 완료 후 일반 수정은 공개 정책과 현재 구현 모두 허용하지 않는다.
- 지원자 응답에는 공연사의 심사 결과와 내부 메모를 포함하지 않는다.

사진·자료의 프로필 보관과 제출 스냅샷 관계는 확정됐으며 구체적인 API 경로와 실패 시 정리 계약은 별도로 결정한다.

- 프로필은 기본 정보 8개, 추가 정보와 개인 사진 보관함을 재사용한다.
- 공고 양식과 겹치는 프로필 항목만 자동으로 채우며 커스텀 답변은 포함하지 않는다.
- 제출 지원서는 프로필과 사진의 현재 상태를 참조하지 않는 불변 스냅샷이다.

## 공개 공고

```http
GET  /api/v1/public/postings/{postingId}         # 공개 공고·배역·지원서 양식
GET  /api/v1/public/recommended-postings
     ?excludePostingId={postingId}&limit={limit} # 추천 공고
```

최종 제출과 지원서 조회는 인증 계정 소유권을 기준으로 처리한다. 파일 업로드는 소유권·정리 계약이 확정될 때까지 별도 API를 제공하지 않는다.

- 동일 계정은 같은 공고에 지원서를 하나만 제출할 수 있다.
- 공고가 허용하면 하나의 지원서에 여러 배역을 선택할 수 있다.
- 별도 자유 배역 타입은 두지 않고 공연사가 일반 배역 하나를 `자유`로 등록한다.
- 로그인 전·후 모두 작성 내용과 사진을 IndexedDB에 먼저 저장하고 서버 Draft와 동기화한다.
- 로그인 전 서버 Draft와 파일은 계정에 속하지 않은 임시 데이터이며 인증 후 계정에 연결한다.
- 계정에 같은 공고의 기존 Draft가 있으면 수정 시각이 더 최신인 Draft가 이전 Draft 전체를 덮어쓴다.
- 입력 변경은 IndexedDB에 먼저 반영한 뒤 서버에 지연·묶음 동기화하여 매 입력마다 요청하지 않는다.
- 최종 제출 전 Draft는 공연사 API와 심사 화면에 노출하지 않는다.
- 최종 제출은 서버 시각 기준 모집 중인지 다시 검증하고 마감됐으면 즉시 거부한다.
- 최종 제출은 서버 Draft의 내용을 불변 지원서 스냅샷으로 확정하고 서버 Draft를 `SUBMITTED`로 표시한다. 로컬 Draft 삭제 시점은 별도로 결정한다.
- 계정 소유 Draft 갱신은 `expectedRevision`과 UTC `clientModifiedAt`이 모두 최신일 때 전체 내용을 교체하고 아니면 `DRAFT_VERSION_CONFLICT`를 반환한다.
- 인증 전 Draft의 식별·접근 통제·만료와 파일 계약은 아직 정하지 않았다.

## 공연사

```http
GET    /api/v1/producers/me                     # 내 공연사 정보
PATCH  /api/v1/producers/me                     # 공개 정보·담당자 수정
```

회원 탈퇴는 파기 정책, 탐색 트리 endpoint는 요약·pagination 계약 확정 뒤 구현한다. 현재 Frontend 탐색 트리는 공연·공고 조회를 조합한다.

## 공연과 공고

```http
GET    /api/v1/performances                             # 공연 목록
POST   /api/v1/performances                             # 공연 등록
GET    /api/v1/performances/{performanceId}             # 공연 상세
PATCH  /api/v1/performances/{performanceId}             # 공연 수정
DELETE /api/v1/performances/{performanceId}             # 공연 삭제
GET    /api/v1/performances/{performanceId}/postings    # 공연의 공고 목록
POST   /api/v1/performances/{performanceId}/postings    # 공연에 공고 등록
GET    /api/v1/postings/{postingId}                     # 공연사용 공고 상세
PATCH  /api/v1/postings/{postingId}                     # 공고 수정
DELETE /api/v1/postings/{postingId}                     # 공고 삭제
GET    /api/v1/postings/{postingId}/roles               # 공고의 배역 목록
POST   /api/v1/postings/{postingId}/roles               # 공고에 배역 등록
```

## 심사

```http
GET   /api/v1/roles/{roleId}/screening-rounds/{round}/applications
                                                           # 심사 목록
GET   /api/v1/roles/{roleId}/screening-rounds/current/applications
                                                           # 현재 열린 차수 목록
PATCH /api/v1/roles/{roleId}/screening-rounds/{round}/reviews
                                                           # 결과 일괄 수정
PATCH /api/v1/roles/{roleId}/screening-rounds/{round}       # status=CLOSED로 마감
```

- `screening-rounds`는 단순 `rounds`보다 차수의 용도를 명확히 알려 주므로 유지한다.
- MVP 심사 목록은 대상 전체와 차수 상태·집계를 반환한다. cursor pagination과 낙관적 version은 데이터 규모 확장 시 추가한다.
- 복수 배역 지원서는 선택한 각 배역의 심사 목록에 표시하며 심사 결과는 `(지원서, 배역, 차수)`별로 구분한다.
- 결과 수정과 차수 마감은 이미 마감된 차수, 검토 대기, 대상 없음 정책을 `409` 오류 코드로 반환한다.
- MVP 심사 보드가 권한 확인 후 지원자의 민감 정보와 해당 배역·차수 심사 기록을 함께 반환한다. 독립 상세 endpoint는 아직 두지 않는다.

## 현재 프런트 계약

```text
Frontend API client → `/api/v1/**`
                   ├─ MSW 활성: 같은 경로의 handler가 intercept
                   └─ MSW 비활성: Next rewrite가 `API_ORIGIN` Backend로 전달
```

탐색 트리는 현재 프런트 adapter가 공연·공고 조회를 조합한다. 별도 Backend tree endpoint를 사용할 때에도 화면 View Model 계약은 유지한다.

인증 전 Draft의 보호·계정 연결, IndexedDB·서버 Draft 보관기간, 동기화 주기, 파일·포스터 업로드 생명주기, 제출 재시도, 전형 종료 시각, 모집 보관과 차수 마감 취소 정책은 별도 결정이 필요하다.
