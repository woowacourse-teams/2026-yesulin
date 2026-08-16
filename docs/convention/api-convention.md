# API 경로 명세

지원자·공연사 flowchart를 기준으로 한 백엔드 경로 계약이다. REST 원칙을 따르되 클라이언트가 경로만 읽고 용도를 이해할 수 있는 이름을 우선한다.

> **도메인 설계 반영 대기:** 최신 [도메인 설계](../domain-design.md)에 따라 서버 Draft는 로그인 전·후 모두 사용하지만 최종 제출은 인증된 계정만 할 수 있다. 아래 공고 조회 계약은 유효하며, 인증 전 Draft 보호·계정 연결과 Draft·제출·파일·지원서 조회의 구체 계약은 별도 결정한다.

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

지원서 제출·파일 업로드·지원서 조회는 인증 및 소유권 경계를 먼저 결정해야 한다. 최종 제출 요청은 인증된 계정의 소유권을 기준으로 처리한다.

- 동일 계정은 같은 공고에 지원서를 하나만 제출할 수 있다.
- 공고가 허용하면 하나의 지원서에 여러 배역을 선택할 수 있다.
- 별도 자유 배역 타입은 두지 않고 공연사가 일반 배역 하나를 `자유`로 등록한다.
- 로그인 전·후 모두 작성 내용과 사진을 IndexedDB에 먼저 저장하고 서버 Draft와 동기화한다.
- 로그인 전 서버 Draft와 파일은 계정에 속하지 않은 임시 데이터이며 인증 후 계정에 연결한다.
- 계정에 같은 공고의 기존 Draft가 있으면 수정 시각이 더 최신인 Draft가 이전 Draft 전체를 덮어쓴다.
- 입력 변경은 IndexedDB에 먼저 반영한 뒤 서버에 지연·묶음 동기화하여 매 입력마다 요청하지 않는다.
- 최종 제출 전 Draft는 공연사 API와 심사 화면에 노출하지 않는다.
- 최종 제출은 서버 시각 기준 모집 중인지 다시 검증하고 마감됐으면 즉시 거부한다.
- 최종 제출은 서버 Draft의 내용을 불변 지원서 스냅샷으로 확정한다. 제출 성공 뒤 로컬·서버 Draft 처리 기준은 별도로 결정한다.
- 인증 전 Draft의 식별·접근 통제·만료, 최신 수정본 판정, 구체 경로, 버전 충돌과 제출 실패 복구 계약은 아직 정하지 않았다.

## 공연사

```http
GET    /api/v1/producers/me                     # 내 공연사 정보
PATCH  /api/v1/producers/me                     # 공개 정보·담당자 수정
DELETE /api/v1/producers/me                     # 회원 탈퇴
GET    /api/v1/producers/me/navigation-tree     # 공연·공고 탐색 트리
```

## 공연과 공고

```http
POST   /api/v1/performance-posters/upload-requests      # 포스터 업로드 URL 발급
PATCH  /api/v1/performance-posters/{fileId}/completion  # 직접 업로드 확인·완료
GET    /api/v1/performances                             # 공연 목록
POST   /api/v1/performances                             # 공연 등록
GET    /api/v1/performances/{performanceId}             # 공연 상세
PATCH  /api/v1/performances/{performanceId}/basic-information
                                                            # 제목·장소 수정
PATCH  /api/v1/performances/{performanceId}/poster          # 포스터 교체
DELETE /api/v1/performances/{performanceId}             # 공연 삭제
POST   /api/v1/performances/{performanceId}/roles       # 배역 추가
PATCH  /api/v1/performances/{performanceId}/roles/{roleId}
                                                            # 배역 수정
DELETE /api/v1/performances/{performanceId}/roles/{roleId}
                                                            # 배역 삭제
GET    /api/v1/performances/{performanceId}/postings    # 공연의 공고 목록
POST   /api/v1/performances/{performanceId}/postings    # 공연에 공고 등록
GET    /api/v1/postings/{postingId}                     # 공연사용 공고 상세
PATCH  /api/v1/postings/{postingId}                     # 공고 수정
DELETE /api/v1/postings/{postingId}                     # 공고 삭제
GET    /api/v1/postings/{postingId}/roles               # 공고의 배역 목록
```

포스터 업로드 요청은 `originalFilename`, `contentType`, `size`를 받는다. `purpose`와 소유자 ID는 받지 않으며 소유자는 세션에서 결정한다. JPEG·PNG·WebP 이미지 한 장, 최대 30MB를 허용한다. 발급 응답의 `method`와 `headers`를 그대로 사용해 저장소에 직접 업로드한 뒤 완료 API를 호출한다. 완료는 실제 객체의 Content-Type과 크기를 확인하는 멱등 요청이며 성공 시 `204 No Content`를 반환한다. 없거나 다른 사용자의 파일은 모두 `404 FILE_NOT_FOUND`다. 상세 생명주기는 [파일 업로드 설계](../backend/file-upload.md)를 따른다.

공연 추가는 완료된 `posterFileId`, `title`, 도로명주소 API에서 선택한 `roadAddress`, 선택적인 `roles`를 받는다. 각 배역은 `name`과 줄바꿈 없는 `description`으로 구성된다. 소유자는 세션에서 결정하며 포스터가 `READY`가 아니거나 다른 사용자 소유면 공연 생성도 롤백한다. 성공 시 `201 Created`, `Location`과 공연 하나를 wrapper 없이 반환하며 생성 감사 시각 `createdAt`과 모든 배역 ID가 포함된다.

기본 정보 수정은 `title`, `roadAddress`만 받고 포스터와 배역을 변경하지 않는다. 포스터 교체 API는 완료된 `posterFileId`만 받으며 실제로 파일이 변경되면 이전·신규 파일 ID를 가진 이벤트를 발행하고 신규 파일 참조를 검증한다. 실패하면 포스터 교체를 롤백한다. 이전 포스터 객체의 물리 삭제는 현재 요청에서 수행하지 않는다.

배역은 공연 하위 리소스로 개별 추가·수정·삭제한다. 단건 조회를 제공하지 않으므로 추가 성공은 `Location` 없이 `201 Created`와 생성된 배역을 반환한다. 수정은 `200 OK`, 삭제는 `204 No Content`를 반환한다. 다른 공연의 배역 ID와 같은 공연 안의 중복 이름은 거부한다. 배역이 없어도 공연은 유지할 수 있다.

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
- 복수 배역 지원서는 선택한 각 배역의 심사 목록에 표시하며 심사 결과는 `(지원서, 배역, 차수)`별로 구분한다.
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

인증 전 Draft의 보호·계정 연결, IndexedDB·서버 Draft 보관기간, 동기화 주기·충돌 해결, 파일 생명주기, Draft·제출·조회 API, 제출 재시도, 전형 종료 시각, 모집 보관과 차수 마감 취소 정책은 별도 결정이 필요하다.
