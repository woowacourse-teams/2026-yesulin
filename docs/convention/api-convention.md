# API 경로 명세

지원자·공연사 flowchart를 기준으로 한 백엔드 경로 계약이다. REST 원칙을 따르되 클라이언트가 경로만 읽고 용도를 이해할 수 있는 이름을 우선한다.

> **도메인 설계 반영 대기:** 최신 [도메인 설계](../domain-design.md)에 따라 지원서 작성 시작에는 로그인이 필요하지 않지만 최종 제출은 인증된 계정만 할 수 있다. 아래 공고 조회 계약은 유효하며, 제출·파일·지원서 조회 계약은 인증과 소유권 경계를 결정한 뒤 추가한다.

## 공통 규칙

- 기본 경로: `/api/v1`
- 리소스는 소문자 복수형 명사를 사용한다.
- 두 단어 이상일 때는 `screening-rounds`처럼 kebab-case를 허용한다. 억지로 줄이거나 붙여 쓰지 않는다.
- `public`은 비로그인 화면에서 호출할 수 있는 API를 묶는 클라이언트용 경로다.
- 상태 변경은 HTTP Method로 표현한다. `me`, `current`는 인증 컨텍스트의 단일 리소스에만 사용한다.
- `prefill`처럼 화면 목적이 명확한 조회는 모호한 명사로 바꾸지 않는다.
- ID는 서버 `Long`, JSON `number`를 사용한다.
- 인증은 HttpOnly 세션 쿠키, 쓰기 요청은 `X-CSRF-Token`을 사용한다.
- 소유자 ID는 요청으로 받지 않고 세션에서 결정한다.
- 성공 응답은 wrapper 없이, 실패는 `{ code, message, detail? }`로 반환한다.
- 호환 필드 추가는 `v1`을 유지하고 breaking change에서만 major 버전을 올린다.

## 인증

```http
POST   /api/v1/sessions                         # 로그인
GET    /api/v1/sessions/current                 # 현재 세션
DELETE /api/v1/sessions/current                 # 로그아웃
GET    /api/v1/oauth/{provider}/authorization   # 소셜 로그인 시작
GET    /api/v1/oauth/{provider}/callback        # 소셜 인증 응답
POST   /api/v1/applicants                       # 지원자 가입
POST   /api/v1/producers                        # 공연사 가입
```

`provider`는 우선 `kakao`, `naver`를 허용하며 OAuth 요청의 `state`를 검증한다.

## 지원자

```http
GET    /api/v1/applicants/me                    # 내 계정
PATCH  /api/v1/applicants/me                    # 내 계정 수정
DELETE /api/v1/applicants/me                    # 회원 탈퇴

GET    /api/v1/applicants/me/profile            # 재사용 프로필·완성도
PATCH  /api/v1/applicants/me/profile            # 프로필 답변 저장·삭제
GET    /api/v1/applicants/me/profile/prefill
       ?postingId={postingId}                    # 공고 양식 기준 자동 채움

GET    /api/v1/applicants/me/applications       # 내 지원서 목록
GET    /api/v1/applicants/me/applications/{applicationId}
                                                    # 내 제출 스냅샷
```

- 제출 완료 후 일반 수정은 공개 정책에서 허용하지 않으며 현재 프런트 구현과 다르다.
- 지원자 응답에는 공연사의 심사 결과와 내부 메모를 포함하지 않는다.

사진·자료 API는 프로필과 지원서의 소유 관계를 결정한 뒤 추가한다.

## 공개 공고

```http
GET  /api/v1/public/postings/{postingId}         # 공개 공고·배역·지원서 양식
GET  /api/v1/public/recommended-postings
     ?excludePostingId={postingId}&limit={limit} # 추천 공고
```

지원서 제출·파일 업로드·지원서 조회는 인증 및 소유권 경계를 먼저 결정해야 한다. 최종 제출 요청은 인증된 계정의 소유권을 기준으로 처리한다.

## 공연사

```http
GET    /api/v1/producers/me                     # 내 공연사 정보
PATCH  /api/v1/producers/me                     # 공개 정보·담당자 수정
DELETE /api/v1/producers/me                     # 회원 탈퇴
GET    /api/v1/producers/me/navigation-tree     # 공연·공고 탐색 트리
```

## 공연과 공고

```http
POST   /api/v1/performance-posters                      # 임시 포스터 업로드
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
```

## 심사

```http
GET   /api/v1/roles/{roleId}/screening-rounds/{round}/applications
      ?cursor={cursor}&size={size}                       # 심사 목록
GET   /api/v1/applications/{applicationId}?round={round} # 공연사용 민감 상세
PATCH /api/v1/roles/{roleId}/screening-rounds/{round}/reviews
                                                           # 결과 일괄 수정
PATCH /api/v1/roles/{roleId}/screening-rounds/{round}       # status=CLOSED로 마감
```

- `screening-rounds`는 단순 `rounds`보다 차수의 용도를 명확히 알려 주므로 유지한다.
- 심사 목록은 cursor 방식이며 버전, 차수 상태, 집계와 페이지를 포함한다.
- 결과 수정과 차수 마감은 `expectedVersion`을 받고 충돌 시 `409 VERSION_CONFLICT`를 반환한다.
- 공연사용 상세는 권한을 확인하고 지원자의 민감 정보와 해당 차수 심사 기록을 반환한다.

## 현재 프런트 이관

```text
/api/auth/signup/applicant          → /api/v1/applicants
/api/me/profile                     → /api/v1/applicants/me/profile
/api/me/profile/prefill             → /api/v1/applicants/me/profile/prefill
/api/me/applications/**             → GET은 /api/v1/applicants/me/applications/**, PATCH는 목표 계약에서 제외
/api/public/recommended-postings    → /api/v1/public/recommended-postings
/api/public/postings/**             → /api/v1/public/postings/**
/api/me/producer                    → /api/v1/producers/me
/api/navigation/tree                → /api/v1/producers/me/navigation-tree
/api/performances/**                → /api/v1/performances/**
/api/screenings/**                  → /api/v1/roles/**/screening-rounds/**
```

프런트·MSW는 아직 왼쪽 `/api/**` 계약을 사용한다. 연동 기능을 구현할 때 이 문서, flowchart, 클라이언트와 MSW를 같은 작업에서 갱신한다.

날짜 경계, 인증 전 작성 상태, 파일 생명주기, 인증 후 제출·조회 계약, 모집 보관과 차수 마감 취소 정책은 별도 결정이 필요하다.
