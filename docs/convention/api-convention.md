# API 경로 명세

배우·기획사/제작사 flowchart를 기준으로 한 백엔드 경로 계약이다. REST 원칙을 따르되 클라이언트가 경로만 읽고 용도를 이해할 수 있는 이름을 우선한다.

> **도메인 설계 반영 대기:** 최신 [도메인 설계](../domain-design.md)에 따라 서버 Draft는 로그인 전·후 모두 사용하지만 최종 제출은 인증된 계정만 할 수 있다. 아래 공고 조회 계약은 유효하며, 인증 전 Draft 보호·계정 연결과 Draft·제출·파일·지원서 조회의 구체 계약은 별도 결정한다.

## 공통 규칙

- 기본 경로: `/api/v1`
- 리소스는 소문자 복수형 명사를 사용한다.
- 두 단어 이상일 때는 `screening-rounds`처럼 kebab-case를 허용한다. 억지로 줄이거나 붙여 쓰지 않는다.
- `public`은 비로그인 화면에서 호출할 수 있는 API를 묶는 클라이언트용 경로다.
- 상태 변경은 HTTP Method로 표현한다. `me`, `current`는 인증 컨텍스트의 단일 리소스에만 사용한다.
- `prefill`처럼 화면 목적이 명확한 조회는 모호한 명사로 바꾸지 않는다.
- ID는 서버 `Long`, JSON `number`를 사용한다.
- 실제 인증 자격을 HttpOnly 세션 쿠키와 토큰 중 무엇으로 전달할지는 아직 결정하지 않았다. 방식이 확정되면 CSRF·보관·갱신·폐기 계약을 함께 정한다.
- 인증 리소스의 소유자 ID는 요청으로 받지 않고 세션에서 결정한다. 로그인 전 Draft는 별도의 검증된 익명 컨텍스트로 접근하며 계정 ID를 요청 본문으로 받지 않는다.
- 소유자 전용 리소스는 없거나 다른 사용자의 소유인 경우 모두 `404`로 응답해 존재 여부를 노출하지 않는다. 공개된 리소스에 대한 행위 권한만 부족한 경우에는 `403`을 사용한다.
- 성공 응답은 wrapper 없이, 실패는 `{ code, message, detail? }`로 반환한다.
- 호환 필드 추가는 `v1`을 유지하고 breaking change에서만 major 버전을 올린다.

## 인증

```http
POST   /api/v1/sessions                         # 로그인
GET    /api/v1/sessions/current                 # 현재 세션
DELETE /api/v1/sessions/current                 # 로그아웃
GET    /api/v1/oauth/{provider}/authorization   # 소셜 로그인 시작
GET    /api/v1/oauth/{provider}/callback        # 소셜 인증 응답
POST   /api/v1/producers                        # 기획사/제작사 가입
```

`provider`는 `kakao`, `naver`, `google`을 허용하며 OAuth 요청의 `state`를 검증한다. 배우는 별도 가입 API·화면을 두지 않고 첫 소셜 로그인 콜백에서 계정을 자동 생성한다. 기획사/제작사는 이메일·비밀번호로 로그인한다.

기획사/제작사 가입 요청의 핵심 정보는 기획사/제작사명, 휴대폰 번호, 이메일, 비밀번호다. 비밀번호 확인과 필수 약관 동의를 함께 검증한다. 가입 성공 시 계정은 `PENDING`이며 기획사/제작사 정보 조회·수정만 허용한다. 운영진 확인 후 `ACTIVE`로 전환되어야 공연·공고·심사 API에 접근할 수 있다. 가입 안내와 후속 연락은 등록한 휴대폰과 이메일을 사용한다.

## 배우

```http
GET    /api/v1/applicants/me                    # 내 계정
PATCH  /api/v1/applicants/me                    # 내 계정 수정
DELETE /api/v1/applicants/me                    # 회원 탈퇴

GET    /api/v1/applicants/me/profile            # 재사용 프로필·완성도
PATCH  /api/v1/applicants/me/profile            # 기본·추가정보 저장·삭제
GET    /api/v1/applicants/me/profile/prefill
       ?auditionId={auditionId}                  # 공고 양식 기준 자동 채움

GET    /api/v1/applicants/me/applications       # 내 지원서 목록
GET    /api/v1/applicants/me/applications/{applicationId}
                                                    # 내 제출 스냅샷
```

- 제출 완료 후 일반 수정은 공개 정책에서 허용하지 않는다. 현재 프런트 화면은 읽기 전용이며 MSW의 수정 요청도 `409 IMMUTABLE_APPLICATION`으로 거부한다.
- 내 지원서 목록·상세는 지원서 하나와 선택한 배역들을 함께 반환한다. `roleProgress[]`의 각 항목은 `roleId`, `roleName`, 공개 상태, 현재 또는 결과 차수와 차수명을 포함한다.
- 공개 상태는 `RECEIVED`, `IN_REVIEW`, `FINAL_PASS`, `NOT_SELECTED`를 사용한다. 검토 중인 결과와 내부 메모는 포함하지 않고, 해당 배역의 차수가 마감된 뒤에만 확정 결과를 반영한다.
- 작성 중 지원서는 현재 프런트에서 IndexedDB를 직접 조회한다. 서버 Draft 목록·다른 기기 동기화 계약은 아직 결정하지 않았다.

사진·영상의 프로필 보관과 제출 스냅샷 관계는 확정됐으며 파일 업로드, 사진·영상별 변경 API와 실패 시 정리 계약은 별도로 결정한다.

- 프로필은 기본 정보 8개, nullable 추가 정보 8개, 최대 20장의 개인 사진 보관함과 최대 10개의 YouTube 영상 링크 보관함을 재사용한다.
- 사진 한 장을 대표 프로필 사진으로 지정한다. 지원서 사진은 기획사/제작사가 1~10장 범위에서 정한 수만 첨부한다.
- 사진·영상의 추가·삭제·순서 변경과 대표 사진 변경은 프로필 화면에서 즉시 저장한다.
- 공고 양식과 겹치는 프로필 항목만 자동으로 채우며 커스텀 답변은 포함하지 않는다.
- 제출 지원서는 프로필과 사진의 현재 상태를 참조하지 않는 불변 스냅샷이다.

## 공개 공고

```http
GET  /api/v1/public/auditions/{auditionId}       # 공개 공고·배역·지원서 양식
GET  /api/v1/public/recommended-auditions
     ?excludeAuditionId={auditionId}&limit={limit} # 추천 공고
```

지원서 제출·파일 업로드·지원서 조회는 인증 및 소유권 경계를 먼저 결정해야 한다. 최종 제출 요청은 인증된 계정의 소유권을 기준으로 처리한다.

- 동일 계정은 같은 공고에 지원서를 하나만 제출할 수 있다.
- 공고가 허용하면 하나의 지원서에 여러 배역을 선택할 수 있다.
- 별도 자유 배역 타입은 두지 않고 기획사/제작사가 일반 배역 하나를 `자유`로 등록한다.
- 로그인 전·후 모두 작성 내용과 사진을 IndexedDB에 먼저 저장하고 서버 Draft와 동기화한다.
- 로그인 전 서버 Draft와 파일은 계정에 속하지 않은 임시 데이터이며 인증 후 계정에 연결한다.
- 계정에 같은 공고의 기존 Draft가 있으면 수정 시각이 더 최신인 Draft가 이전 Draft 전체를 덮어쓴다.
- 입력 변경은 IndexedDB에 먼저 반영한 뒤 서버에 지연·묶음 동기화하여 매 입력마다 요청하지 않는다.
- 최종 제출 전 Draft는 기획사/제작사 API와 심사 화면에 노출하지 않는다.
- 최종 제출은 서버 시각 기준 모집 중인지 다시 검증하고 마감됐으면 즉시 거부한다.
- 최종 제출은 서버 Draft의 내용을 불변 지원서 스냅샷으로 확정한다. 제출 성공 뒤 로컬·서버 Draft 처리 기준은 별도로 결정한다.
- 인증 전 Draft의 식별·접근 통제·만료, 최신 수정본 판정, 구체 경로, 버전 충돌과 제출 실패 복구 계약은 아직 정하지 않았다.

## 기획사/제작사

```http
GET    /api/v1/producers/me                     # 내 기획사/제작사 정보
PATCH  /api/v1/producers/me                     # 공개 정보·내부 담당자 수정
DELETE /api/v1/producers/me                     # 회원 탈퇴
GET    /api/v1/producers/me/navigation-tree     # 공연·공고 탐색 트리
```

- `companyName`, `description`은 공개 공고와 배우 화면에 표시한다. `contactName`, `contactRole`, 로그인 이메일, 연락처와 인증 상태는 기획사/제작사 내부 운영 정보로 두고 공개 응답에 포함하지 않는다.

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
POST   /api/v1/auditions                               # 공연 ID와 기본 정보로 공고 DRAFT 생성
GET    /api/v1/auditions/{auditionId}                   # 공연사용 공고 DRAFT 상세
PUT    /api/v1/auditions/{auditionId}/basic-information
                                                          # 기본 정보 섹션 전체 저장
```

포스터 업로드 요청은 `originalFilename`, `contentType`, `size`를 받는다. `purpose`와 소유자 ID는 받지 않으며 소유자는 세션에서 결정한다. JPEG·PNG·WebP 이미지 한 장, 최대 30MB를 허용한다. 발급 응답의 `method`와 `headers`를 그대로 사용해 저장소에 직접 업로드한 뒤 완료 API를 호출한다. 완료는 실제 객체의 Content-Type과 크기를 확인하는 멱등 요청이며 성공 시 `204 No Content`를 반환한다. 없거나 다른 사용자의 파일은 모두 `404 FILE_NOT_FOUND`다. 상세 생명주기는 [파일 업로드 설계](../backend/file-upload.md)를 따른다.

공연 추가는 완료된 `posterFileId`, `title`, 도로명주소 API에서 선택한 `roadAddress`, 선택적인 `roles`를 받는다. 각 배역은 `name`과 줄바꿈 없는 `description`으로 구성된다. 소유자는 세션에서 결정하며 포스터가 `READY`가 아니거나 다른 사용자 소유면 공연 생성도 롤백한다. 성공 시 `201 Created`, `Location`과 공연 하나를 wrapper 없이 반환하며 생성 감사 시각 `createdAt`과 모든 배역 ID가 포함된다.

기본 정보 수정은 `title`, `roadAddress`만 받고 포스터와 배역을 변경하지 않는다. 포스터 교체 API는 완료된 `posterFileId`만 받으며 실제로 파일이 변경되면 이전·신규 파일 ID를 가진 이벤트를 발행하고 신규 파일 참조를 검증한다. 실패하면 포스터 교체를 롤백한다. 이전 포스터 객체의 물리 삭제는 현재 요청에서 수행하지 않는다.

배역은 공연 하위 리소스로 개별 추가·수정·삭제한다. 단건 조회를 제공하지 않으므로 추가 성공은 `Location` 없이 `201 Created`와 생성된 배역을 반환한다. 수정은 `200 OK`, 삭제는 `204 No Content`를 반환한다. 다른 공연의 배역 ID와 같은 공연 안의 중복 이름은 거부한다. 배역이 없어도 공연은 유지할 수 있다.

공고 생성은 `performanceId`, `title`, `performanceStartDate`와 선택적인 `performanceEndDate`를 받아
세션 소유자의 공연에 DRAFT를 만들고 `201 Created`와 `Location`을 반환한다. 종료일이 없으면 응답의
`openRun`은 `true`다. 기본 정보 수정은 DRAFT와 PUBLISHED 모두 허용하며 같은 기본 필드를 받는다.
생성·단건 조회·수정은 최상위 `/auditions`로 묶고, 특정 공연의 공고 목록 조회가 필요할 때만 공연 하위 경로를 사용한다. 섹션별
저장과 후속 API는 [공고 관리](../backend/audition-management.md)를 따른다.

### 프런트 선행 모델

아래 항목은 백엔드 후속 섹션이 아직 구현되지 않은 상태에서 프런트·MSW가 화면 검증에 사용하는 목표 모델이다.

- `GET /api/v1/performances`는 각 공연 요약에 `postings[]` 공고 요약을 포함한다. 클라이언트는 공연을 카드로 표시하고, 카드를 선택하면 해당 공연의 공고 관리 화면으로 이동한다.
- 공연 생성·수정은 `poster`, 공연명, 장소명과 `roadAddress`, `detailAddress`, `zonecode`, `latitude`, `longitude`, 그리고 이름·한 줄 설명만 가진 배역 템플릿을 다룬다.
- 신규 공고는 공연 포스터를 복사한 독립 `posterUrl` 대표 이미지 스냅샷과 선택 `detailImageUrl`, 필수 공연 시작일·선택 공연 종료일, 분 단위 `recruitmentStart`·`recruitmentEnd`, 선택 `rehearsalVenue`·구조화된 `rehearsalVenueAddress`, 1~5개의 전형을 가진다. 공연 종료일을 보내지 않거나 빈 값으로 두면 오픈런으로 해석한다. 연습 장소 주소는 공연 주소와 같이 `roadAddress`, `detailAddress`, `zonecode`, nullable `latitude`·`longitude`로 구성한다. 대표 이미지는 목록·공유 미리보기에, 상세 이미지는 공개 공고 본문에 사용한다. 공연 장소는 공연에서 읽고 공고에 중복 저장하지 않는다. 각 전형은 차수, 이름, 날짜와 안내 사항으로 구성한다. 상태는 `DRAFT`, `UPCOMING`, `OPEN`, `RECRUIT_CLOSED`, `FINISHED`를 사용한다.
- 공고의 모집 분야는 공연 배역을 참조하되 모집 인원·성별·최소/최대 나이를 공고 자체 값으로 복사한다. 신규 공고는 배역별 모집만 만들고 과거 `isOpenCall`은 읽기 호환만 유지한다.
- 지원 안내는 최대 2,000자다. 지원 폼은 선택한 기본 정보(필수), 선택한 추가 정보(nullable), 사진 설명 최대 255자의 `{description, count}` 배열(기본 1장·합계 최대 10), 영상 설명 최대 255자의 `{description}` 배열(최대 5), 질문 문구 최대 255자·답변 최대 2,000자·필수 여부를 가진 텍스트 커스텀 질문으로 구성한다. 키와 몸무게는 각각 `HEIGHT`, `WEIGHT` 독립 필드·답변으로 전달하며 수집하지 않은 값은 심사 읽기 모델에서 `null`이다. 새 공고의 영상 요구 배열은 비어 있다.
- `PATCH /api/v1/postings/{postingId}`는 공연·모집·전형 일정만 받는다. 모집 시작 또는 첫 지원서 뒤에는 모집 시작을 바꿀 수 없고 모집 종료는 연장만 가능하며 완료한 전형은 수정할 수 없다.

## 심사

```http
GET   /api/v1/roles/{roleId}/screening-rounds/{round}/applications
      ?cursor={cursor}&size={size}                       # 심사 목록
GET   /api/v1/roles/{roleId}/screening-rounds/{round}/applications/{applicationId} # 기획사/제작사용 민감 상세
PATCH /api/v1/roles/{roleId}/screening-rounds/{round}/reviews
                                                           # 결과 일괄 수정
PATCH /api/v1/roles/{roleId}/screening-rounds/{round}       # status=CLOSED로 마감
```

- `screening-rounds`는 단순 `rounds`보다 차수의 용도를 명확히 알려 주므로 유지한다.
- 심사 상세는 `applicationId`만으로 조회하지 않고 `(roleId, round, applicationId)`를 경로에 모두 둔다. 복수 배역 지원서에서도 현재 심사 기록의 소유 범위가 모호해지지 않는다.
- 심사 목록은 cursor 방식이며 버전, 차수 상태, 집계와 페이지를 포함한다.
- `(roleId, round)`를 하나의 심사 작업 단위로 보고 목록·집계·차수 상태·버전을 같은 읽기 모델에서 반환한다. 결과 저장과 차수 마감도 갱신된 작업 단위를 반환해 프런트가 여러 응답을 조합하지 않게 한다.
- 복수 배역 지원서는 선택한 각 배역의 심사 목록에 표시하며 심사 결과는 `(지원서, 배역, 차수)`별로 구분한다.
- 결과 수정과 차수 마감은 `expectedVersion`을 받고 충돌 시 `409 VERSION_CONFLICT`를 반환한다.
- 기획사/제작사용 상세는 권한을 확인하고 배우의 민감 정보와 해당 차수 심사 기록을 반환한다. 제출 영상은 공고의 영상 요구 순서를 유지한 `videos: [{ label, url }]` 배열이며, 수집하지 않았거나 제출된 영상이 없으면 빈 배열이다.

## 현재 프런트 이관

```text
/api/auth/signup/producer           → /api/v1/producers
/api/me/profile                     → /api/v1/applicants/me/profile
/api/me/profile/prefill             → /api/v1/applicants/me/profile/prefill
/api/me/applications/**             → GET은 /api/v1/applicants/me/applications/**, PATCH는 목표 계약에서 제외
/api/public/recommended-postings    → /api/v1/public/recommended-auditions
/api/public/postings/**             → /api/v1/public/auditions/**
/api/me/producer                    → /api/v1/producers/me
/api/navigation/tree                → /api/v1/producers/me/navigation-tree
/api/performances/**                → /api/v1/performances/**
/api/screenings/**                  → /api/v1/roles/**/screening-rounds/**
```

프런트·MSW는 아직 왼쪽 `/api/**` 계약을 사용한다. 현재 목 심사 응답도 단일 `videoUrl`이 아니라 요구 설명을 포함한 `videos[]`를 반환한다. 현재 목 `PATCH /api/me/profile`은 정보 답변과 사진·영상 보관함 배열을 함께 받을 수 있지만 실제 바이너리 업로드 계약은 아니다. 배우 소셜 로그인은 실제 OAuth API를 호출하지 않고 React 상태에 불투명한 프론트 전용 자격값을 저장해 라우트 이동 동안 재사용한다. 새로고침 복원과 실제 세션·토큰 계약은 구현하지 않았다. 연동 기능을 구현할 때 이 문서, flowchart, 클라이언트와 MSW를 같은 작업에서 갱신한다.

현재 목 `GET /api/performances`도 공연 요약 안에 중첩 `postings[]`를 반환한다. 공고 요약 타입은 `DRAFT`를 포함하지만, 작성 중 공고의 불완전한 값과 게시 전환을 저장할 생성·수정 계약은 아직 정하지 않았다. 대표·상세 이미지는 브라우저 Data URL로, 공연 장소 좌표는 카카오 주소 검색·지도 SDK 결과로 보관하며 실제 업로드 식별자와 영속 좌표 계약은 아직 연결하지 않았다. 연습 장소는 현재 선택 문자열 두 개로만 보관해 주소 검색·지도 좌표를 제공하지 않는다.

인증 전 Draft의 보호·계정 연결, IndexedDB·서버 Draft 보관기간, 동기화 주기·충돌 해결, 파일 생명주기, Draft·제출·조회 API, 제출 재시도, 전형 종료 시각, 모집 보관과 차수 마감 취소 정책은 별도 결정이 필요하다.
