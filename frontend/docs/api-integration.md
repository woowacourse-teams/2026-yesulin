# 프론트 API와 MSW

실제 HTTP 계약은 [백엔드 API](../../backend/docs/api.md)가 정본이다. 이 문서는 프론트가 그 계약을 어떻게 소비하고
MSW 전용 경로를 어떻게 구분하는지만 설명한다.

## 환경 변수

| 변수 | 역할 |
| --- | --- |
| `API_ORIGIN` | Next.js 서버 조회와 rewrite 대상 백엔드 origin |
| `NEXT_PUBLIC_API_MOCKING` | `enabled`일 때 MSW 시작 |
| `NEXT_PUBLIC_PRODUCER_LOGIN` | MSW 중에도 기획사 가입·세션을 실제 API로 전달 |
| `NEXT_PUBLIC_PRODUCER_API` | MSW 중에도 기획사 공연·공고·심사를 실제 API로 전달 |
| `NEXT_PUBLIC_APPLICANT_PROFILE_API` | MSW 중에도 배우 프로필·보관함을 실제 API로 전달 |
| `NEXT_PUBLIC_SOCIAL_LOGIN` | 배우 OAuth를 실제 백엔드로 전달 |
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` | 카카오 지도 브라우저 키 |

플래그가 없고 MSW도 비활성인 기본 모드는 모든 구현된 경계를 실제 API로 호출한다.

## 실제 API 사용 영역

OTR 공유 링크 `/otr?vid={번호}`는 `app/otr` 페이지가 받아 `/api/v1/otr?vid={번호}`로 이동시키고,
이 요청은 Next.js rewrite로 백엔드에 전달되어 302 응답으로 예술in 상세나 원문을 연다. 이동 자체는 DTO·MSW handler 없이
실제 백엔드를 사용한다. `src=kakao_openchat`이 있으면 이동 전에 오픈채팅방 링크 방문 POST를 보내며, 이 POST는 MSW handler가 있다.
DEV 공고 알림도 기본 공유 링크는 `https://yesulin.art`로 발급한다. 각 프론트의 rewrite는 여전히
자기 환경의 백엔드를 가리키므로 실제 이동 기록은 링크를 연 환경에 남는다.
관리자 개요의 `GET /api/v1/admin/otr-redirects?days={1~14}`는 현재 환경의 집계만 조회한다.
`totalClicks`·`links` 외에 `environment`, `available`, `truncated`, 한국 날짜 범위와 조회 시각을 표시한다.
조회 실패·로그 없음은 0건으로 대체하지 않는다. MSW에는 화면 확인용 DEV 집계 fixture를 제공한다.

- `/api/v1/sessions`, `/api/v1/auth/email-verifications`, `/api/v1/auth/password-resets`
- `/api/v1/producers`, `/api/v1/producers/me`
- `/api/v1/performances`, `/api/v1/performance-posters`
- `/api/v1/auditions`, `/api/v1/public/auditions`
- `/api/v1/otr-auditions` (공연사별 OTR 공고 생성·목록), `/api/v1/public/otr-auditions/{id}` (공개 조회)
- `/api/v1/otr-auditions/{id}/submissions` (OTR 지원서 제출)
- `/api/v1/otr-auditions/{id}/roles/{roleOrder}/screening-rounds/1/**` (OTR 배역별 심사)
- `/api/v1/applicants/me/profile`, 사진·영상 보관함
- `/api/v1/files/{fileId}/content` (소유권과 지원서–공연사 관계를 검증하는 비공개 사진 조회)
- `/api/v1/auditions/{auditionId}/submissions`, 내 지원서 목록·상세
- `/api/v1/audition-roles/{roleId}/screening-rounds/**`
- `/api/v1/upload-diagnostics` (업로드 실패·재시도 성공의 개인정보 없는 진단)
- `/api/v1/admin/**` (운영 대시보드 전용. 단, 로그 화면 시각 검증을 위한 `/logs` fixture는 MSW에 포함한다.)
- `/api/v1/timetables/**` (오디션 일정표. 관리·배우 열쇠를 `X-Timetable-Key` 헤더로 보낸다.)
- `/api/v1/public/audition-posts/**` (메인·분야별 공고 목록·상세). 분야별 목록은 `category=뮤지컬` 또는 `category=연극`을
  보내며 서버가 분야를 적용한 뒤 페이지를 나눈다. `openCount`·`allCount`도 선택한 분야의 수다.
  분류를 생략하면 기존 전체 분야 목록이며, 지원하지 않는 값은 `400 INVALID_REQUEST`다. MSW도 분야별 목록·개수를 응답한다.
- `/api/v1/public/companies/**` (공연사 화면과 그 공연사의 공개 공고). 공고 상세 응답의 `company`도 같은 요약이다. MSW가 공연사
  3곳과 고정 연결을 응답하고, 운영자 공연사 관리(`/api/v1/admin/companies/**`)도 같은 메모리로 응답한다.
- `/api/v1/public/events/**` (이벤트 목록·상세와 메인 이벤트 배너)와 `/api/v1/admin/events/**`, `/api/v1/admin/event-images/uploads`
  (운영자 이벤트 관리·이미지 업로드). MSW가 마감된 1기 서포터즈 모집 글 하나로 시작하는 메모리 목을 응답한다.
- `/api/v1/admin/audition-posts/**` (OTR 공고 가져오기·직접 쓰기·수정·사진과 첨부 업로드·공개 상태·기획사 연결·공연사 연결)와 `/api/v1/producers/me/audition-posts/**` (기획사 공고 올리기·수정·업로드). OTR·저장소에 실제로 접속해야 하므로 MSW가 켜져 있어도 서버로 넘긴다.

`/admin/files`의 미사용 파일 조회·최대 100개 일괄 삭제도 실제 API를 사용한다. MSW가 켜져 있어도 해당 경로는 서버로 전달하며,
삭제 확인 비밀번호나 S3 삭제 성공을 목 응답으로 대체하지 않는다.

심사 상태는 `PENDING`, `PASS`, `FAIL`, `ETC`만 사용한다. 현재 차수는 `PENDING`이 남아 있어도 마감할 수 있고,
`PASS`만 다음 차수로 승격된다. 마감된 차수의 결과는 수정할 수 없다.

## 오디션 안내 문자

`features/auditions/notice-api.ts`가 배역·합격 기준 차수의 `/sms-*` 계약을 호출한다.
보드의 ScreeningSource를 전달해 일반 배역은 `/audition-roles/{roleId}`, OTR은
`/otr-auditions/{공개 UUID}/roles/{roleOrder}`로 구분한다. OTR 원문 번호나 배역 순번을 일반 배역 ID로 보내지 않는다.
발송 중복 방지용 sessionStorage 키도 OTR 공고와 배역을 포함한다.
보드에서 명시적으로 선택한 현재 목록의 합격자만 준비 대상으로 전달한다. 이름·전화번호는 서버 스냅샷 조회 결과를 사용한다.
서버 미리보기의 개인별 문구·경고·발송 유형과 건수를 확인한다. 입력 수정은 기존 미리보기를 폐기한다.
비용 응답 필드와 내부 계산은 유지하지만 작성·확인·발송 내역 UI에 금액을 노출하지 않는다.
새 문자는 이름·일시를 포함하는 고정 문구와 추가 안내사항으로 구성한다. 초안 조회·저장 UI는 제공하지 않는다.
1명은 개인 일시만 입력하고 여러 명은 전체 적용 후 개인별 수정한다. 기존 달력과 시·분 선택을 사용한다.
서버가 제공하는 제작사·공고명 header의 `{이름}`을 치환하고 문의 footer를 포함한 본문을 즉시 렌더링한다.
완성된 입력은 300ms 후 서버에서 검증하며 서버의 최종 본문을 미리보기·저장·발송에 사용한다.
이전 입력의 늦은 응답은 폐기하고 현재 입력과 일치하는 서버 미리보기 토큰이 있을 때만 발송할 수 있다.
발송 내역은 이름·유형·상태별 인원을 즉시 표시하며 선택한 항목 바로 아래에 상세를 표시한다.
수동 새로고침 버튼 없이 자동 갱신한다. 미확정 결과가 있으면 3초, 그 외에는 10초마다 목록과 선택한 상세를
조회하고 마지막 확인 시각을 표시한다. 조회 실패도 다음 주기에 재시도한다. 숨긴 탭·닫힌 화면에서는 조회하지 않는다.
내역 조회에 성공한 경우에만 집계와 빈 상태를 표시한다. 빈 배열은 정상 0건이고, 401·403·404 및 통신/서버 오류는
각각 로그인·권한·공고/내역 없음·조회 실패로 구분한다.
전달 완료는 서버의 DELIVERED에만 표시하며 접수 성공으로 추정하지 않는다.
발송 시도는 본문 해시별 UUID를 sessionStorage에 저장해
같은 탭의 응답 유실 재시도에 재사용한다. 원문과 연락처는 이 저장소에 기록하지 않는다.
탭을 닫은 뒤에는 발송 내역을 먼저 확인한다. 마감 잠금은 심사 변경에만 적용하며 문자 기능을 막지 않는다.

## MSW 전용 계약

다음 경로는 `seed_*` 화면과 목 시나리오에서만 사용하며 백엔드 API로 간주하지 않는다.

- `/api/public/postings/**`, `/api/public/recommended-postings`
- `/api/public/submissions`, `/api/public/submissions/lookup`
- `/api/me/profile`, `/api/me/profile/prefill`, `/api/me/submissions/**`
- `/api/performances/**`, `/api/postings/**`, `/api/screenings/**`

실제 공고 전용 prefill API는 없다. 프론트가 현재 프로필과 공개 공고 양식의 교집합을 만든다.

## 어댑터 주의사항

- 오디션 일정표 API adapter(`features/timetables/api.ts`)는 서버의 `HH:mm:ss`를 화면의 `HH:mm`으로 줄이고, 요청에는
  `HH:mm`을 보낸다. 관리·배우 열쇠는 주소(`/timetable/manage/{열쇠}`, `/t/{열쇠}`)에서 읽어 헤더로만 보낸다.
  보드의 배정·시간대 변경은 `board-draft.ts` 편집본에서 고치고 저장할 때 옮긴 배우와 이전 시간만 보낸다. 배우 등록·삭제처럼
  편집 중 새 보드를 받으면 기획사가 손대지 않은 값만 새 서버 값으로 맞춘다. 자동 배정도 저장 전 편집 기능이다.

- OTR 생성·목록 응답의 `applicationPath`를 공연사 화면에서 지원 링크로 보여 준다. 지원 링크는
  `/apply/standard/{id}`로 바로 고정 폼을 열고, 서버의 `open` 및 제출 결과가 마감 여부의 정본이다.
- OTR 지원 사진은 기존 배우 사진 업로드 API를 사용하지만 보관함에는 자동 등록하지 않는다.
  제출 요청에는 `type=OTR`, 공개 조회의 `postingSnapshotVersion`, 선택 배역 1개, 기본 정보 전부,
  선택 추가 정보·READY 파일 ID 최대 3개·YouTube URL 최대 3개와 두 필수 동의를 보낸다.
  공연사명이 변경되어 버전이 달라지면 재확인한다.

- 지원서 생성 백엔드는 `submissionId`와 서버가 기록한 `submittedAt`을 반환한다. 완료 화면은 응답의 제출 시각을 그대로 사용한다.
- 실제 공개 공고의 `postingSnapshotVersion`을 지원서 제출 본문에 그대로 포함한다. 기획사·제작사명이 바뀌어
  `SUBMISSION_STALE_POSTING_SNAPSHOT`이 반환되면 서버 메시지로 최신 공고 확인과 재동의를 안내한다. MSW 전용
  공고와 제출 계약도 같은 버전 왕복과 오래된 버전 거절을 재현한다.
- 실제 지원서 제출은 최종 요청 본문과 UUID `Idempotency-Key`를 IndexedDB에 함께 저장한 뒤 전송한다. 응답이 유실되거나
  새로고침한 뒤 같은 내용을 재시도하면 사진을 다시 업로드하지 않고 저장된 키와 본문을 재사용한다. 입력 내용이 바뀌면
  새 키와 본문을 만든다. 제출 성공으로 Draft를 지울 때 저장된 제출 시도도 함께 지운다.
- 공고 수정은 기본 정보와 일정 저장을 나눠 호출한다. 두 저장이 서로를 검증하므로 기본 정보를 먼저 보내고, `AUDITION_INVALID_SCHEDULE`이면 일정을 먼저 저장한 뒤 다시 시도한다.
- 지원서 사진은 보관함에서 고르면 보관함 항목의 `fileId`를 그대로 제출하고, 새로 고른 파일만 업로드한다.
- 지원서 사진·프로필 사진·공연 포스터는 `File`을 네트워크 body로 직접 보내지 않는다. 먼저 메모리 `Blob`으로
  복사하고 크기를 검증한 뒤 PUT하며, WebKit 파일 접근 실패와 completion metadata mismatch만 같은 URL로 한 번
  재시도한다. 세부 계약과 실기기 기준은 [WebKit 업로드 신뢰성](../../docs/upload-reliability.md)을 따른다.
- 업로드 진단은 최종 실패와 재시도 성공만 보낸다. MSW 모드에서는 `204`로 소비하며 실제 운영 로그로 전달하지 않는다.
- 공개 공고는 백엔드에서 공연 포스터 URL을 반환한다. MSW의 공고 전용 이미지 필드는 실제 계약이 아니다.
- API 응답 URL은 그대로 사용하며 CloudFront 경로를 프론트에서 조합하지 않는다.
- `401`이면 프론트 인증 상태를 초기화하고 안전한 내부 `returnTo`를 보존한 채 로그인으로 이동한다.
- 관리자 로그는 `entries`를 우선 사용한다. 구조화 응답 배포 전 서버처럼 `entries`가 없으면 `lines`를 실행하거나
  HTML로 해석하지 않고 `LEGACY` 항목으로 변환한다. 키워드·조회 건수는 서버에 보내고, 선택한 로그 레벨·느린 요청·request ID는
  현재 조회 결과에서 추가로 거른다. 운영자 변경 기록은 서버가 최신순으로 10건씩 페이지를 나눠 반환한다.
- 기획사/제작사 이메일 인증 링크는 백엔드에서 검증한 뒤 설정된 Frontend 경로로 `302` redirect한다.
- 비밀번호 재설정 메일은 Frontend `/forgot-password?token=...` 링크를 열고, 프론트가 토큰 확인 후 새 비밀번호를
  PATCH한다. 메일 요청 응답만으로 계정 존재 여부를 판단하지 않는다.

공연 공개 목록은 숨기지 않은 `OPEN`·`CLOSED`를 모두 반환하고 항목에 `status`가 있다. 관리 목록·상세와 운영 대시보드에는
`hidden`이 있으며 기획사·관리자 `PATCH .../shows/{id}/visibility`에 `{ hidden: boolean }`을 보내 숨김·해제한다.
숨김 해제는 기존 예매 상태를 유지한다. 숨긴 공연의 공개 상세·예매·외부 이동 기록은 404다.

## 익명 커뮤니티

`/community`, `/community/new`, `/community/{postId}`는 공개 라우트다. 목록은 본문을 최대 5줄 미리 보는 피드이며,
글의 댓글 버튼은 상세의 댓글 영역으로 이동한다. `features/community`가
공통 `request`의 CSRF 처리를 그대로 사용해 공개 커뮤니티 API를 호출한다. 회원 전용 요청 함수를 사용하지 않는다.
읽기만 할 때는 브라우저 식별자를 생성하지 않는다. 첫 쓰기·좋아요에 만든 32바이트 난수는
`localStorage`의 `yesulin.community.owner`에 저장하고 `X-Community-Key` 헤더로만 전달한다.
Web Locks를 지원하는 브라우저에서는 여러 탭의 최초 생성을 직렬화한다. 비밀값을 URL·분석 이벤트에 넣지 않는다.
브라우저 저장 공간을 쓸 수 없으면 열람은 허용하고, 관리 수단을 저장할 수 없는 새 작성·좋아요는 오류로 안내한다.
이 값은 로그인 세션이나 사용자 집계 식별자가 아니며 별도의 만료·복구 기능은 없다.

생성 폼은 같은 내용의 재시도에 같은 UUID를 사용하고 성공 후 새 요청으로 바꾼다. 입력을 바꾸면 새 요청이 된다.
진행 중 입력·중복 제출을 막고 실패 시 입력을 유지한다. 화면을 새로 열면 미전송 폼·요청 번호는 복구하지 않는다.
작성 중 새로고침·일반 링크 이동·취소에 확인을 제공한다. 브라우저의 SPA 뒤로/앞으로 이동도 확인하고 취소 시 원래 주소와 초안을 보존한다.
목록은 같은 탭에서 1분 이내 돌아올 때 메모리에 남은 목록과 스크롤을 복원한다. 새로고침 버튼이나 쓰기 성공은 목록을 다시 읽게 한다.
작성 성공 후 상세로 이동하고, 댓글 성공 후 새 댓글이 있는 위치부터 조회한다. `댓글 처음부터 보기`로 처음부터 읽을 수 있다.
신고 댓글 링크의 `#comment-{id}`는 해당 댓글 위치부터 읽고 스크롤을 맞춘다.

목록·상세의 `LikeButton`은 좋아요를 PUT, 취소를 DELETE로 보내고 성공 응답의 수·선택 상태를 반영한다.
요청 중 중복 클릭을 막으며 실패 시 기존 상태를 유지하고 같은 동작의 재시도를 제공한다. 선택은 `aria-pressed`와 채운 하트로 표시한다.
작성자 표시는 서버의 `author`를 그대로 사용한다. 글마다 번호를 다시 부여하므로 번호를 브라우저 간·글 간 식별자로 사용하지 않는다.

`mocks/community-handlers.ts`는 공개 조회, 익명 소유 확인, 글별 익명 번호, 좋아요·취소, 생성 요청 재시도, 댓글 수, 삭제·신고 규칙을 모사한다.
빈 게시판에서 시작하며 새로고침 시 메모리 상태가 초기화된다. 목 신고는 실제 Slack으로 전송되지 않는다.
