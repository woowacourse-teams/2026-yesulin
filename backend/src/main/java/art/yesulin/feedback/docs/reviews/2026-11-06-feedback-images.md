# 의견 사진 첨부와 받은 의견 화면

작업 ID 2026-11-06-feedback-images · feedback/v1

| ID | 흐름 | 실패 경계 | 기대 결과 | 확인 방법 | 필수 |
| --- | --- | --- | --- | --- | --- |
| F1 | 사진 첨부 전송 | 구버전 JSON 화면·CSRF | multipart(request JSON 파트+images), JSON 요청 유지 | 단위·MockMvc·브라우저(MSW) | 예 |
| F2 | 서버 검증 | 장수·형식·크기·위장 파일 | 하나라도 틀리면 아무것도 올리거나 저장하지 않고 400, 요청 16MB 초과는 413 | 서비스·MockMvc | 예 |
| F3 | 실패 복구 | 저장 실패·업로드 중간 실패 | 올린 사진 삭제, 업로드 동안 트랜잭션 밖 | 서비스 테스트·코드 | 예 |
| F4 | 개인정보 | 슬랙·캐시·권한 | 슬랙에 연락처 원문·사진 없음, 비공개 경로·`private, no-store`, ADMIN만 | 서비스·MockMvc | 예 |
| F5 | 받은 의견 화면 | 빈 목록·더 보기 실패·새 의견 유입 | 연락처·회원 구분·사진 링크, 마지막 번호 기준 이어 받기 | 컴포넌트·서비스 테스트 | 예 |
| F6 | 사진 고르기 화면 | 4장 이상·처리 중 전송·빼기 | 3장 제한, 줄인 JPEG 미리보기, 뺀 사진 미전송 | 컴포넌트 테스트·브라우저 | 예 |
| F7 | 계약·문서 | MSW·타입·마이그레이션 | api.md·흐름·MSW·타입 일치, FK 있는 새 테이블 | 테스트(Flyway+H2)·검토 | 예 |
| F8 | 정리 | 미사용 코드·설정 | 남는 호환 코드는 JSON 엔드포인트(구버전 화면용) 하나 | 검색 | 예 |

## 검증 근거

- F1·F2·F4: `FeedbackControllerTest`에서 비회원 multipart 전송(201)과 ADMIN 목록의 사진 주소, 배우 세션 403을 확인했다. SVG를 PNG로 위장한 파일은 `FEEDBACK_INVALID_IMAGE`, `request` 파트가 없으면 400이다. `FeedbackServiceTest`에서 위장 파일·4장·GIF·5MB+1바이트를 거절하고 의견·저장소 객체 수가 그대로임을 확인했다. 파일 상한을 요청 상한(16MB)과 같게 두어 한 장 크기는 서비스가 400으로 거절한다.
- F3: 내용이 빈 의견에 사진을 붙이면 사진을 먼저 올린 뒤 저장이 실패하고, 저장소 객체 수가 원래대로 돌아오는 것을 확인했다. 업로드는 `FeedbackService`(트랜잭션 없음), 저장은 `FeedbackRecorder`(@Transactional)로 나눴다.
- F4: 슬랙 메시지는 사진 장수와 `/admin/feedback` 링크만 더한다. 저장된 사진의 Cache-Control이 `private, no-store`임을 테스트로 확인했다. 관리자 응답은 `no-store`다.
- F5: `admin-feedback-list.test.tsx`에서 연락처·회원 번호·사진 새 창 링크, 더 보기 이어 붙이기, 실패 뒤 같은 기준 재요청, 빈 상태를 확인했다. 서비스 테스트에서 `before` 커서가 그보다 오래된 의견부터 주는지 확인했다.
- F6: 3101번 MSW 미리보기에서 2400×1200 PNG 두 장을 붙여 미리보기 두 개가 보이고 `POST /api/v1/public/feedback`이 201로 끝났다. 컴포넌트 테스트에서 4장 중 3장만 붙고, 추가 버튼이 사라지고, 뺀 사진은 보내지 않는 것을 확인했다.
- F7·F8: 백엔드 feedback 테스트 15개(Flyway+H2 MySQL 모드), checkstyleMain/Test, 프론트 lint와 관련 vitest를 통과했다. 전체 vitest의 `actor-screen-view.test.tsx` 6개 실패는 origin/dev에서도 같다.
- 미확인: `/admin/*`은 `proxy.ts`가 실제 백엔드 ADMIN 세션을 요구한다. 로컬 Docker가 꺼져 있어 실제 백엔드·S3(LocalStack)·MySQL로 관리자 화면과 실제 GET 응답 헤더를 브라우저에서 보지 못했다. 이 부분은 컴포넌트·MockMvc 테스트로 대신했고, DEV 배포 뒤 확인이 필요하다.

## 독립 평가 1회

Codex(읽기 전용)가 staged diff와 평가표로 평가했다. 첫 실행은 출력 수집 실수로 최종 판정을 받지 못해 같은 입력으로 다시 실행했고, 판정은 두 번째 결과 하나만 사용했다.

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 결과 및 표적 검증 |
| --- | --- | --- | --- |
| 2026-11-06-feedback-images-F01 | P1 POLICY INTRODUCED | INDEPENDENT_REVIEW | FIXED. 서버 업로드 기본 캐시가 `public, max-age=31536000, immutable`이라 비공개 사진이 캐시에 남을 수 있었다. 올린 직후 `private, no-store`로 바꾸고 테스트로 확인했다. |
| 2026-11-06-feedback-images-F02 | P1 FLOW INTRODUCED | INDEPENDENT_REVIEW | FIXED. 더 보기 실패 뒤에도 페이지 번호가 올라가 다시 누르면 의견을 건너뛰었다. 화면의 마지막 번호를 기준으로 받도록 바꾸고 실패 후 같은 기준 재요청 테스트를 더했다. |
| 2026-11-06-feedback-images-F03 | P2 FLOW INTRODUCED | INDEPENDENT_REVIEW | FIXED. offset 페이지라 보는 중 새 의견이 들어오면 기존 의견이 밀려 누락될 수 있었다. `before` 커서 조회로 바꾸고 서비스 테스트로 확인했다. |
| 2026-11-06-feedback-images-F04 | P2 DOC INTRODUCED | INDEPENDENT_REVIEW | FIXED. multipart 파일 상한(5MB)이 서비스 검증보다 먼저 걸려 문서의 400을 보장하지 못했다. 파일 상한을 16MB로 올려 한 장 크기는 서비스가 400, 요청 전체 초과만 413으로 맞추고 5MB+1바이트 거절 테스트를 더했다. |

| 사건 ID | 문제 ID | 사건 | 발생 시각(KST, 분 단위) | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E01 | F01 | CONFIRMED | 2026-11-06T12:05:00+09:00 | 독립 평가 | PENDING |
| E02 | F02 | CONFIRMED | 2026-11-06T12:05:00+09:00 | 독립 평가 | PENDING |
| E03 | F03 | CONFIRMED | 2026-11-06T12:05:00+09:00 | 독립 평가 | PENDING |
| E04 | F04 | CONFIRMED | 2026-11-06T12:05:00+09:00 | 독립 평가 | PENDING |
| E05 | F01 | FIXED | 2026-11-06T12:15:00+09:00 | 캐시 헤더 테스트 | PENDING |
| E06 | F03 | FIXED | 2026-11-06T12:15:00+09:00 | 커서 서비스 테스트 | PENDING |
| E07 | F04 | FIXED | 2026-11-06T12:15:00+09:00 | 5MB+1바이트 거절 테스트 | PENDING |
| E08 | F02 | FIXED | 2026-11-06T12:20:00+09:00 | 실패 후 재요청 컴포넌트 테스트 | PENDING |

## 판정

필수 PASS 7 / FAIL 0 / UNVERIFIED 1 / N/A 0 (F5의 실제 백엔드 연결 브라우저 확인이 미확인이라 조건부). 검증률 7/8.
발견 4 / 해결 4 / 미해결 0. P0 0 / P1 2 / P2 2 / P3 0.
PRECHECK 0 / INDEPENDENT_REVIEW 4 / POST_FIX_CHECK 0 / EXTERNAL 0 / 오탐 0.
평가자가 UNVERIFIED로 둔 F3·F6·F8은 위 테스트 근거로 구현자가 PASS 판정했다. 실제 S3 중간 실패와 DB 커넥션 점유는 코드 구조로만 확인했다.

## 최초 PR 연결

최초 게시 PR [#549](https://github.com/woowacourse-teams/2026-yesulin/pull/549), 대상 dev, 이슈 #547.
사건 표의 PENDING은 최초 기록 당시 상태이며 이 절이 최초 PR 연결이다.

## 추가 변경: 버그 알림 채널 함께 쓰기 (2026-11-06)

사용자 결정으로 의견 전용 슬랙 채널을 만들기 전까지 기존 버그 알림 채널(`YESULIN_ERROR_SLACK_WEBHOOK_URL`)로 보낸다.
`slack.yml`의 `feedback-webhook-url`에 PDF 분석 실패 알림과 같은 대체 방식을 적용했다. DEV·PROD 암호화 설정에는 오류 웹훅 변수가 있고
의견 전용 변수는 없음을 변수 이름으로 확인했다. 따라서 config 변경 없이 배포만으로 알림이 간다.

- 검증: `FeedbackWebhookFallbackTest`에서 전용 변수가 없을 때 오류 웹훅 값을 쓰는지 확인했다. 작성 중 전용 변수를 빈 값으로 두면
  Spring이 대체하지 않는 것을 확인해 `slack.yml`·`deployment.md`에 "전용 채널 전에는 변수를 넣지 않는다"고 적었다.
- 이 추가 변경은 설정 한 줄과 문서라 별도 독립 평가를 하지 않았고, 위 테스트와 feedback 테스트 16개·checkstyle로 확인했다.
  실제 슬랙 수신은 DEV 배포 후 확인한다.
