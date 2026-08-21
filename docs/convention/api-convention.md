# API 경로 명세

배우·기획사/제작사 흐름을 기준으로 한 백엔드 경로 계약이다. REST 원칙을 따르되 클라이언트가 경로만 읽고 용도를 이해할 수 있는 이름을 우선한다.

> **도메인 설계 반영 대기:** 인증 전 Draft와 사진은 현재 브라우저 IndexedDB에만 두고 최종 제출 과정에서
> 처음 서버로 전송한다. 아래 공고 조회 계약은 유효하며 제출·파일·동의·지원서 조회의 구체 계약은 별도 결정한다.

## 공통 규칙

- 기본 경로: `/api/v1`
- 리소스는 소문자 복수형 명사를 사용한다.
- 두 단어 이상일 때는 `screening-rounds`처럼 kebab-case를 허용한다. 억지로 줄이거나 붙여 쓰지 않는다.
- `public`은 비로그인 화면에서 호출할 수 있는 API를 묶는 클라이언트용 경로다.
- 상태 변경은 HTTP Method로 표현한다. `me`, `current`는 인증 컨텍스트의 단일 리소스에만 사용한다.
- `prefill`처럼 화면 목적이 명확한 조회는 모호한 명사로 바꾸지 않는다.
- ID는 서버 `Long`, JSON `number`를 사용한다.
- 실제 인증 자격은 HttpOnly Cookie 기반 Session으로 전달한다. Cookie 속성, CSRF, 만료·갱신·폐기와 동시 세션 정책은 구현 전에 확정한다.
- 인증 리소스의 소유자 ID는 요청으로 받지 않고 Session에서 결정한다. 인증 전 Draft는 API 리소스가 아니다.
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

`provider`는 `kakao`, `naver`, `google`을 허용하며 OAuth 요청의 `state`를 검증한다. 배우는 별도 가입 API·화면을 두지 않고 첫 소셜 로그인 콜백에서 계정을 자동 생성한다. 같은 이메일의 기존 배우 계정은 자동 병합하지 않고 명시적 연결 요청과 재인증을 거친다. 배우와 기획사/제작사 계정은 같은 이메일이어도 서로 연결하지 않는다. 기획사/제작사는 이메일·비밀번호로 로그인한다.

기획사/제작사 가입 요청의 핵심 정보는 기획사/제작사명, 휴대폰 번호, 이메일, 비밀번호다. 비밀번호 확인과 필수 약관 동의를 함께 검증한다. 동의 문서 종류·버전·시각을 별도 이력으로 저장한다. 가입 성공 시 계정은 `PENDING`이며 기획사/제작사 정보 조회·수정만 허용한다. 운영진 확인 후 `ACTIVE`로 전환되어야 공연·공고·심사 API에 접근할 수 있다. MVP는 Company당 `ADMIN` 한 명만 허용한다.

## 배우

```http
GET    /api/v1/applicants/me                    # 내 계정
PATCH  /api/v1/applicants/me                    # 내 계정 수정
GET    /api/v1/applicants/me/profile            # 재사용 프로필·완성도
PATCH  /api/v1/applicants/me/profile            # 기본·추가정보 저장·삭제
GET    /api/v1/applicants/me/profile/prefill
       ?auditionId={auditionId}                  # 공고 양식 기준 자동 채움

POST   /api/v1/actor-photos/upload-requests      # 배우 사진 Presigned Upload 발급
PATCH  /api/v1/actor-photos/{fileId}/completion
                                                  # 배우 사진 업로드 완료 확인
GET    /api/v1/applicants/me/photo-library/photos # 사진보관함 목록
POST   /api/v1/applicants/me/photo-library/photos # 완료된 파일을 사진보관함에 추가
PATCH  /api/v1/applicants/me/photo-library/photos/{photoId}/representative
                                                  # 대표 사진으로 변경
DELETE /api/v1/applicants/me/photo-library/photos/{photoId}
                                                  # 사진보관함에서 Soft Delete

GET    /api/v1/applicants/me/submissions       # 내 지원서 목록
GET    /api/v1/applicants/me/submissions/{submissionId}
                                                    # 내 제출 스냅샷
```

- 제출 완료 후 일반 수정은 공개 정책에서 허용하지 않는다. 현재 프런트 화면은 읽기 전용이며 MSW의 수정 요청도 `409 IMMUTABLE_SUBMISSION`으로 거부한다.
- 내 지원서 목록·상세는 지원서 하나와 선택한 배역들을 함께 반환한다. `roleProgress[]`의 각 항목은 `roleId`, `roleName`, 공개 상태, 현재 또는 결과 차수와 차수명을 포함한다.
- 공개 상태는 `RECEIVED`, `IN_REVIEW`, `FINAL_PASS`, `NOT_SELECTED`를 사용한다. 검토 중인 결과와 내부 메모는 포함하지 않고, 해당 배역의 차수가 마감된 뒤에만 확정 결과를 반영한다.
- 작성 중 지원서는 현재 브라우저 IndexedDB를 직접 조회한다. 서버 Draft 목록과 다른 기기 동기화는 MVP 범위가 아니다.
- 회원 탈퇴 Backend API는 MVP 범위가 아니다. 안내 화면은 공개 정책의 문의 경로를 제공한다.

프로필과 제출 스냅샷 관계는 확정됐으며 지원서 사진·영상 연결 생명주기와 실패 파일 정리 계약은 별도로 결정한다.

배우 사진 업로드 요청은 `originalFilename`, `contentType`, `size`를 받고 소유자는 Session에서 결정한다.
JPEG·PNG·WebP 이미지 한 장, 최대 20MB를 허용한다. 현재 완료 API는 S3 HEAD의 Content-Type과 크기만
확인하며 이미지 내용 검사와 EXIF 제거 실행 위치는 별도 결정한다. 완료된 파일을 사진보관함에 추가하거나
지원서에 연결하는 동작은 업로드 완료 API와 분리한다.

- 프로필 PATCH는 기본 정보 8개와 nullable 추가 정보 8개를 부분 저장한다. 제출별 프로필 갱신도 이 범위만 다룬다.
- 개인 사진·영상 보관함은 프로필 값과 별도 리소스로 취급하며 제출 사진·영상 링크를 프로필 갱신 요청으로 추가하지 않는다.
- 사진 한 장을 대표 프로필 사진으로 지정한다. 지원서 사진은 기획사/제작사가 1~10장 범위에서 정한 수만 첨부한다.
- 사진·영상의 추가·삭제·순서 변경과 대표 사진 변경은 프로필 화면에서 즉시 저장한다.
- 공고 양식과 겹치는 프로필 항목만 자동으로 채우며 커스텀 답변은 포함하지 않는다.
- 제출 지원서는 프로필과 사진의 현재 상태를 참조하지 않는 텍스트·나이·배역명·파일 참조 불변 스냅샷이다.

## 공개 공고

```http
GET  /api/v1/public/auditions/{auditionId}       # 게시된 공개 공고·배역·일정·지원서 양식
GET  /api/v1/public/recommended-auditions
     ?excludeAuditionId={auditionId}&limit={limit} # 추천 공고
```

지원서 제출·파일 업로드·지원서 조회는 인증 및 소유권 경계를 먼저 결정해야 한다. 최종 제출 요청은 인증된 계정의 소유권을 기준으로 처리한다.

- 동일 계정은 같은 공고에 지원서를 하나만 제출할 수 있다.
- 공고가 허용하면 하나의 지원서에 여러 배역을 선택할 수 있다.
- 별도 자유 배역 타입은 두지 않고 기획사/제작사가 일반 배역 하나를 `자유`로 등록한다.
- 인증 전 작성 내용과 사진은 현재 브라우저 IndexedDB에만 저장한다. Draft 복원 시 동의와 프로필 갱신 선택은 초기화한다.
- 최종 제출 과정에서 인증된 계정만 사진 업로드와 제출 API를 호출한다.
- 제출 버튼 클릭 시 서버 UTC 기준 모집 중인지, 생년월일 기준 만 14세 이상인지 다시 검증한다.
- 사진은 파일당 20MB 이하 PNG·JPEG·WebP만 허용하고 실제 형식 검사와 EXIF 위치정보 제거를 통과한 정제본만 연결한다.
- 사진·영상은 각각 `(photoRequirementId, fileId)`, `(videoRequirementId, url)`로 연결한다.
- 수집·이용과 제3자 제공은 각각 필수 체크박스로 받고 서버에도 별도 동의 이력으로 저장한다. 상단 전체 동의는 두 하위 입력을 함께 변경하는 편의 기능이며 독립 동의 기록이 아니다.
- 최종 제출은 텍스트·마감일 기준 만 나이·배역명·파일 참조를 불변 지원서 스냅샷으로 확정한다. 성공 뒤 로컬 Draft를 삭제한다.
- 업로드·정제·동의 기록·스냅샷의 트랜잭션과 부분 실패 복구 계약은 아직 정하지 않았다.

## 기획사/제작사

```http
GET    /api/v1/producers/me                     # 내 기획사/제작사 정보
PATCH  /api/v1/producers/me                     # 공개 정보·내부 담당자 수정
GET    /api/v1/producers/me/navigation-tree     # 공연·공고 탐색 트리
```

- `companyName`, `description`은 공개 공고와 배우 화면에 표시한다. `contactName`, `contactRole`, 로그인 이메일, 연락처와 인증 상태는 기획사/제작사 내부 운영 정보로 두고 공개 응답에 포함하지 않는다.
- 기획사/제작사 회원 탈퇴 Backend API는 MVP 범위가 아니다.

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
GET    /api/v1/auditions?performanceId={performanceId} # 공연별 공고 목록
GET    /api/v1/auditions/{auditionId}                   # 공연사용 공고 DRAFT 상세
PUT    /api/v1/auditions/{auditionId}/basic-information
                                                          # 기본 정보 섹션 전체 저장
GET    /api/v1/auditions/{auditionId}/roles              # 배역 섹션 조회
PUT    /api/v1/auditions/{auditionId}/roles              # 배역 섹션 전체 저장
GET    /api/v1/auditions/{auditionId}/schedule            # 일정 섹션 조회
PUT    /api/v1/auditions/{auditionId}/schedule            # 일정 섹션 전체 저장
GET    /api/v1/auditions/{auditionId}/application-form    # 지원 폼 조회
PUT    /api/v1/auditions/{auditionId}/application-form    # 지원 폼 전체 저장
PUT    /api/v1/auditions/{auditionId}/publication         # 완성된 공고 게시
```

포스터 업로드 요청은 `originalFilename`, `contentType`, `size`를 받는다. `purpose`와 소유자 ID는 받지 않으며 소유자는 세션에서 결정한다. JPEG·PNG·WebP 이미지 한 장, 최대 30MB를 허용한다. 발급 응답의 `method`와 `headers`를 그대로 사용해 저장소에 직접 업로드한 뒤 완료 API를 호출한다. 완료는 실제 객체의 Content-Type과 크기를 확인하는 멱등 요청이며 성공 시 `204 No Content`를 반환한다. 없거나 다른 사용자의 파일은 모두 `404 FILE_NOT_FOUND`다. 상세 생명주기는 [파일 업로드 설계](../development/backend/file-upload.md)를 따른다.

공연 추가는 완료된 `posterFileId`, `title`, 도로명주소 API에서 선택한 `roadAddress`, 선택적인 `roles`를 받는다. 각 배역은 `name`과 줄바꿈 없는 `description`으로 구성된다. 소유자는 세션에서 결정하며 포스터가 `READY`가 아니거나 다른 사용자 소유면 공연 생성도 롤백한다. 성공 시 `201 Created`, `Location`과 공연 하나를 wrapper 없이 반환하며 생성 감사 시각 `createdAt`과 모든 배역 ID가 포함된다.

기본 정보 수정은 `title`, `roadAddress`만 받고 포스터와 배역을 변경하지 않는다. 포스터 교체 API는 완료된 `posterFileId`만 받으며 실제로 파일이 변경되면 이전·신규 파일 ID를 가진 이벤트를 발행하고 신규 파일 참조를 검증한다. 실패하면 포스터 교체를 롤백한다. 이전 포스터 객체의 물리 삭제는 현재 요청에서 수행하지 않는다.

배역은 공연 하위 리소스로 개별 추가·수정·삭제한다. 단건 조회를 제공하지 않으므로 추가 성공은 `Location` 없이 `201 Created`와 생성된 배역을 반환한다. 수정은 `200 OK`, 삭제는 `204 No Content`를 반환한다. 다른 공연의 배역 ID와 같은 공연 안의 중복 이름은 거부한다. 배역이 없어도 공연은 유지할 수 있다.

공고 생성은 UUID `id`, `performanceId`, `title`, `performanceStartDate`와 선택적인 `performanceEndDate`를
받아 세션 소유자의 공연에 DRAFT를 만들고 `201 Created`와 `Location`을 반환한다. UUID는 외부 식별자이자
생성 재시도 키다. 같은 소유자가 같은 UUID로 재요청하면 기존 DRAFT를 이어 쓰며 새 공고를 만들지 않는다.
종료일이 없으면 응답의 `openRun`은 `true`다. 기본 정보 수정은 DRAFT와 PUBLISHED 모두 허용하며 같은
기본 필드를 받는다.
생성·단건 조회·수정은 최상위 `/auditions`로 묶고, 특정 공연의 공고 목록 조회가 필요할 때만 공연 하위
경로를 사용한다. 배역 저장은 공연 배역 ID와 공고별 모집 조건을 받고 섹션 전체를 교체한다. 후속 API는
[공고 관리](../development/backend/audition-management.md)를 따른다.

일정 저장은 `recruitmentStartAt`, `recruitmentEndAt`, `stages` 전체를 받는다. 전형은 1~5개이며
`stageId`, `name`, `date`, 선택 `notice`로 구성된다. 신규 전형은 `stageId`를 생략하고, 수정할 전형은
조회 응답의 ID를 보내며, 전체 저장 목록에서 빠진 전형은 삭제된다. 응답의 `order`는 1부터 시작한다.

지원 폼은 `GET·PUT /api/v1/auditions/{auditionId}/application-form`으로 조회하고 전체 저장한다.
`basicFields`, `additionalFields`, `photoRequirements`, `videoRequirements`, `additionalQuestions`를 받으며
빈 배열은 해당 종류를 받지 않는다는 뜻이다. 기존 사진·영상 요구와 질문은 응답 ID를 다시 보내고,
신규 항목은 ID를 생략한다. 목록에서 빠진 항목은 삭제된다.

공고 게시는 `PUT /api/v1/auditions/{auditionId}/publication`으로 처리한다. 요청 본문은 없으며 배역·일정·
지원 폼이 모두 저장되고 모집이 마감되지 않은 경우 `PUBLISHED` 공고를 반환한다. 재요청은 최초
`publishedAt`을 유지하는 멱등 요청이다. 예정·모집 중·접수 마감은 별도 상태로 저장하지 않고 공개 조회에서
모집 기간과 현재 시각으로 계산한다.

### 프런트 목표 모델

아래 항목은 프런트·MSW가 전체 화면 검증에 사용하는 목표 모델이다. 실제 백엔드 구현 범위는
[공고 관리](../development/backend/audition-management.md)를 기준으로 한다.

- `GET /api/v1/performances`는 각 공연 요약에 `postings[]` 공고 요약을 포함한다. 클라이언트는 공연을 카드로 표시하고, 카드를 선택하면 해당 공연의 공고 관리 화면으로 이동한다.
- 공연 생성·수정은 `poster`, 공연명, 장소명과 `roadAddress`, `detailAddress`, `zonecode`, `latitude`, `longitude`, 그리고 이름·한 줄 설명만 가진 배역 템플릿을 다룬다.
- 신규 공고는 공연 포스터를 복사한 독립 `posterUrl` 대표 이미지 스냅샷과 선택 `detailImageUrl`, 필수 공연 시작일·선택 공연 종료일, 분 단위 `recruitmentStart`·`recruitmentEnd`, 선택 `rehearsalVenue`·구조화된 `rehearsalVenueAddress`, 1~5개의 전형을 가진다. 공연 종료일을 보내지 않거나 빈 값으로 두면 오픈런으로 해석한다. 연습 장소 주소는 공연 주소와 같이 `roadAddress`, `detailAddress`, `zonecode`, nullable `latitude`·`longitude`로 구성한다. 대표 이미지는 목록·공유 미리보기에, 상세 이미지는 공개 공고 본문에 사용한다. 공연 장소는 공연에서 읽고 공고에 중복 저장하지 않는다. 각 전형은 차수, 이름, 날짜와 안내 사항으로 구성한다. 상태는 `DRAFT`, `UPCOMING`, `OPEN`, `RECRUIT_CLOSED`, `FINISHED`를 사용한다.
- 공고의 모집 분야는 공연 배역을 참조하되 모집 인원·성별·최소/최대 나이를 공고 자체 값으로 복사한다. 게시 시 공연 배역 이름도 공고 배역 스냅샷으로 확정한다. 신규 공고는 배역별 모집만 만들고 과거 `isOpenCall`은 읽기 호환만 유지한다.
- 지원 안내는 최대 2,000자다. 지원 폼은 선택한 기본 정보(필수), 선택한 추가 정보(nullable), 사진 설명 최대 255자의 `{description, count}` 배열(기본 1장·합계 최대 10), 영상 설명 최대 255자의 `{description}` 배열(최대 5), 질문 최대 10개·문구 최대 255자·답변 최대 2,000자·필수 여부를 가진 텍스트 커스텀 질문으로 구성한다. 학력은 단일 문자열, 링크는 최대 5개, 경력은 최대 10개다.
- `UPCOMING`에서는 모든 공고 항목을 수정한다. `OPEN`에서는 공고명과 모집 종료 시각의 연장만 허용하고 모집 시작 변경과 종료 단축을 거부한다. `RECRUIT_CLOSED`에서는 모든 수정 요청을 거부한다.

## 심사

```http
GET   /api/v1/audition-roles/{roleId}/screening-rounds/{round}/submissions
      ?cursor={cursor}&size={size}                       # 심사 목록
GET   /api/v1/audition-roles/{roleId}/screening-rounds/{round}/submissions/{submissionId} # 민감 상세
PATCH /api/v1/audition-roles/{roleId}/screening-rounds/{round}/reviews
                                                           # 결과 일괄 수정
PATCH /api/v1/audition-roles/{roleId}/screening-rounds/{round} # status=CLOSED로 마감
```

- `screening-rounds`는 단순 `rounds`보다 차수의 용도를 명확히 알려 주므로 유지한다.
- `roles`는 회원 역할과 혼동되므로 공고에서 선택한 배역 리소스를 `audition-roles`로 명시한다.
- 심사 상세는 `submissionId`만으로 조회하지 않고 `(roleId, round, submissionId)`를 경로에 모두 둔다. 복수 배역 지원서에서도 현재 심사 기록의 소유 범위가 모호해지지 않는다.
- 외부 `submissionId`는 순차 PK가 아니라 UUID를 사용한다. 내부 PK와 외부 식별자는 지원서 계층에서 변환한다.
- 심사 목록은 cursor 방식이며 버전, 차수 상태, 집계와 페이지를 포함한다.
- `(roleId, round)`를 하나의 심사 작업 단위로 보고 목록·집계·차수 상태·버전을 같은 읽기 모델에서 반환한다. 결과 저장과 차수 마감도 갱신된 작업 단위를 반환해 프런트가 여러 응답을 조합하지 않게 한다.
- 복수 배역 지원서는 선택한 각 배역의 심사 목록에 표시하며 심사 결과는 `(지원서, 배역, 차수)`별로 구분한다.
- 결과 수정과 차수 마감은 `expectedVersion`을 받고 충돌 시 `409 VERSION_CONFLICT`를 반환한다.
- 기획사/제작사용 상세는 권한을 확인하고 배우의 민감 정보와 해당 차수 심사 기록을 반환한다. 제출 영상은 공고의 영상 요구 순서를 유지한 `videos: [{ label, url }]` 배열이며, 수집하지 않았거나 제출된 영상이 없으면 빈 배열이다.
- 현재 백엔드는 `(submissionId, roleId, round)`별 `PENDING`, `PASS`, `FAIL`, `ABSENT`, `ETC` 상태와
  기타 사유·내부 메모의 일괄 저장을 구현했다.
- 제출 지원서가 아직 없어 목록·민감 상세 읽기 모델, 차수 마감과 `expectedVersion` 계약은 구현 대기다.
  지원서 상세 조회는 미존재·접근 불가·해당 배역 미지원 대상을 모두 `404`로 처리하고, 유효하지만 심사 기록이
  없는 지원서만 `PENDING`으로 표현한다. 현재 결과 저장은 같은 공고 행의 쓰기 잠금으로 직렬화한다.

## 현재 프런트 이관

```text
/api/auth/signup/producer           → /api/v1/producers
/api/me/profile                     → /api/v1/applicants/me/profile
/api/me/profile/prefill             → /api/v1/applicants/me/profile/prefill
/api/me/submissions/**             → GET은 /api/v1/applicants/me/submissions/**, PATCH는 목표 계약에서 제외
/api/public/recommended-postings    → /api/v1/public/recommended-auditions
/api/public/postings/**             → /api/v1/public/auditions/**
/api/me/producer                    → /api/v1/producers/me
/api/navigation/tree                → /api/v1/producers/me/navigation-tree
/api/performances/**                → /api/v1/performances/**
/api/screenings/**                  → /api/v1/audition-roles/**/screening-rounds/**
```

프런트·MSW는 아직 왼쪽 `/api/**` 계약을 사용한다. 현재 목 심사 응답도 단일 `videoUrl`이 아니라 요구 설명을 포함한 `videos[]`를 반환한다. 현재 목 `PATCH /api/me/profile`은 정보 답변과 사진·영상 보관함 배열을 함께 받을 수 있지만 실제 바이너리 업로드 계약은 아니다. 배우 소셜 로그인은 실제 OAuth API를 호출하지 않고 React 상태에 불투명한 프론트 전용 자격값을 저장해 라우트 이동 동안 재사용한다. HttpOnly Session은 구현하지 않았다. 연동 기능을 구현할 때 이 문서, 관련 내부 흐름, 클라이언트와 MSW를 같은 작업에서 갱신한다.

현재 목 `GET /api/performances`도 공연 요약 안에 중첩 `postings[]`를 반환한다. 공고 요약 타입은 `DRAFT`를 포함하지만, 작성 중 공고의 불완전한 값과 게시 전환을 저장할 생성·수정 계약은 아직 정하지 않았다. 대표·상세 이미지는 브라우저 Data URL로, 공연 장소 좌표는 카카오 주소 검색·지도 SDK 결과로 보관하며 실제 업로드 식별자와 영속 좌표 계약은 아직 연결하지 않았다. 연습 장소는 현재 선택 문자열 두 개로만 보관해 주소 검색·지도 좌표를 제공하지 않는다.

Session 보안 세부값, 소셜 계정 연결 재인증, IndexedDB 삭제 기준, 파일 생명주기, 제출·조회 API, 제출 재시도, 전형 종료 시각, 모집 보관과 차수 마감 취소 정책은 별도 결정이 필요하다.
