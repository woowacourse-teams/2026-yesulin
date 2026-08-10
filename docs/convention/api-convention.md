# API 경로 명세

flowchart의 공연사 흐름을 기준으로 한 백엔드 경로 계약이다. 요청·응답 필드는 기능별 명세에서 관리하고 여기서는 경로와 공통 규칙만 정의한다.

## 공통 규칙

- 기본 경로: `/api/v1`
- 경로: 소문자 복수형 명사와 kebab-case
- ID: 서버 `Long`, JSON `number`
- 인증: HttpOnly 세션 쿠키. 쓰기 요청은 `X-CSRF-Token` 필수
- 소유자 ID는 요청으로 받지 않고 세션에서 결정한다.
- 조회 `GET`, 생성 `POST`, 부분 수정·상태 전이 `PATCH`, 삭제 `DELETE`
- 목록·생성만 필요한 만큼 중첩하고, 상세·수정·삭제는 전역 ID로 접근한다.
- 호환 필드 추가는 `v1`을 유지하고 breaking change에서만 major 버전을 올린다.
- 성공 응답은 wrapper 없이 반환하고, 실패는 `{ code, message, detail? }`를 사용한다.

## 인증과 공연사

```http
POST   /api/v1/sessions                         # 로그인
GET    /api/v1/sessions/current                 # 현재 세션
DELETE /api/v1/sessions/current                 # 로그아웃
POST   /api/v1/producers                        # 공연사 가입
GET    /api/v1/producers/me                     # 내 공연사 정보
PATCH  /api/v1/producers/me                     # 내 공연사 정보 수정
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
GET    /api/v1/postings/{postingId}                     # 공고 상세
PATCH  /api/v1/postings/{postingId}                     # 공고 수정
DELETE /api/v1/postings/{postingId}                     # 공고 삭제
GET    /api/v1/postings/{postingId}/roles               # 공고의 배역 목록
```

## 심사

```http
GET   /api/v1/roles/{roleId}/screening-rounds/{round}/applications
      ?cursor={cursor}&size={size}                       # 심사 목록
GET   /api/v1/applications/{applicationId}?round={round} # 지원자 상세
PATCH /api/v1/roles/{roleId}/screening-rounds/{round}/reviews
                                                           # 결과 일괄 수정
PATCH /api/v1/roles/{roleId}/screening-rounds/{round}       # status=CLOSED로 차수 마감
```

- 심사 목록은 cursor 방식이며 응답에 `version`, 차수 상태, 전체 집계와 페이지를 포함한다.
- 결과 수정과 차수 마감은 `expectedVersion`을 받아 충돌 시 `409 VERSION_CONFLICT`를 반환한다.
- 차수 마감 요청은 `{ "status": "CLOSED", "expectedVersion": 13 }` 형태다.
- `applicationId`가 전역 유일하므로 상세 경로에는 role·round를 중첩하지 않는다.

## 변경 절차

경로를 변경하면 이 문서, `docs/flowchart/*.mmd`, 관련 기능 명세와 클라이언트 API를 같은 작업에서 갱신한다. breaking change라면 새 major 버전과 폐기 일정을 먼저 결정 기록으로 남긴다.

## 현재 이관 상태

프런트·MSW는 기존 Notion 계약의 `/api/**`를 사용 중이다. 위 `/api/v1/**`가 백엔드 목표 계약이며 기능을 연결할 때 함께 이관한다.

| 현재 | 목표 |
| --- | --- |
| `/api/me/producer` | `/api/v1/producers/me` |
| `/api/navigation/tree` | `/api/v1/producers/me/navigation-tree` |
| `/api/performances/**` | `/api/v1/performances/**` |
| `/api/screenings/**` | `/api/v1/roles/**/screening-rounds/**` |

지원자 프로필·지원서, 공개 공고·제출·조회 API의 `/api/v1` 경로는 아직 확정하지 않았다. 확정 전에는 `frontend/src/features/**/api.ts`와 `frontend/src/mocks/handlers.ts`를 현재 계약으로 본다.

남은 공통 결정은 날짜 경계와 타임존, 파일 생명주기, 개인정보·비회원 조회 제한, 모집 중단·보관, 차수 마감 취소와 동시 수정 정책이다. 새 결정은 이 문서와 번호 기반 결정 기록에 함께 반영한다.
