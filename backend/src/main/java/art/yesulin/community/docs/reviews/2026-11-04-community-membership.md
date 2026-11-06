# 커뮤니티 회원 참여 구현 평가

작업 ID: 2026-11-04-community-membership. 평가표 v1. 이슈 #506. 구현 전 작성, 아래에 최종 검증을 추가했다.

| ID | 흐름/실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| M01 | 정책·DB 이행 | 확정 정책과 기존 데이터 보존 | 문서·로컬 DB 사본 대조 | 예 | PASS |
| M02 | 비회원/역할/계정 소유 | 배우만 생성, 타인 수정 거절 | application 테스트·HTTP | 예 | PASS |
| M03 | 재시도·동시 첫 참여 | 모드 고정·번호/댓글 수 안정 | domain/application 테스트 | 예 | PASS |
| M04 | 공개 프로필 변경·잠금 | 현재 허용 공개 정보만 응답 | 실제 공개 페이지 application 테스트·공개 불가 HTTP | 예 | PASS |
| M05 | 로그인 복귀·초안·계정 변경 | 입력 보호·자동 게시 없음 | frontend 테스트·UI | 예 | PASS |
| M06 | 댓글 갱신·기존 기능 | 목록 보존·쿠키/좋아요/신고 유지 | 테스트·HTTP·UI | 예 | PASS |
| M07 | 계약·분석·정리 | 타입/MSW/문서 동기화, 불필요한 산출물 없음 | 검사·독립 평가 | 예 | PASS |
| M08 | 운영 배포/Slack | 운영 로그인·실제 알림 | 배포 승인·설정 별도 | 아니오 | UNVERIFIED |


## 중간 검증

- `/private/tmp/community-membership-red.log`: 새 회원 서비스·표시 모드 없음으로 컴파일 실패 확인.
- `/private/tmp/community-delete-red.log`: 8개 동시 댓글 삭제에서 댓글 수 불일치 재현.
- `/private/tmp/community-backend-final.log`: 수정 후 커뮤니티 테스트·Checkstyle·bootJar 통과.
- `/private/tmp/community-http-result.json`: 기존 DB 사본·별도 8088 서버의 실제 인증/권한/멱등성/댓글/좋아요/신고 확인.
- 비회원 생성용 기존 CommunityService 메서드는 과거 데이터 회귀 테스트 fixture가 사용한다. Controller에는 연결하지 않는다.
  테스트 fixture가 별도 저장 헬퍼로 이동할 때 제거할 수 있다. 기존 쿠키 관리용 메서드는 운영 호환 경로를 유지한다.
- 독립 평가 1회에서 F01~F04 발견. 최초 평가는 M03~M06 FAIL, M01/M02/M07/M08 UNVERIFIED였다.
  아래 최종 표는 작업자의 수정 후 표적 검증 결과이며 두 번째 독립 평가를 뜻하지 않는다.


## 최종 검증과 한계

- 2026-11-04 로컬: 백엔드 `./gradlew test` 1,478개 통과(실패/오류/skip 0), Checkstyle main/test와 bootJar 통과.
- 프론트 전체 164파일·912개 통과. 후속 수정 완료 회귀 1개 추가 후 커뮤니티 11파일·52개 통과.
  lint·`tsc --noEmit`·Next production build 통과. 후속 UI 조건 한 줄 변경 후 커뮤니티 테스트/lint 재통과.
- 환경: Node 26.5, Vitest에서는 Node 내장 Web Storage 간섭을 피하려 `NODE_OPTIONS=--no-experimental-webstorage` 사용.
  포트를 사용하는 전체 목 테스트는 로컬 포트 허용 환경에서 실행했다. 제한 환경의 EPERM 실패를 제품 결함으로 세지 않는다.
- 기존 H2 DB 사본을 기동하고 Flyway 적용 전후 기존 커뮤니티 13행·좋아요 4행의 모든 기존 컬럼이 동일함을 대조했다.
  기존 신고는 0행으로 보존 표본이 없으므로 신고/알림 기록·재시도는 기존 application 테스트와 새 실제 신고 요청으로 확인했다.
- 실제 HTTP: 비회원 생성 401, 제작사 생성 403, CSRF 누락 403, 계정 변경 409, 재전송 동일 ID,
  동일 배우 다른 브라우저의 수정, 타인 거절, 익명 번호·댓글 수·비회원 좋아요·신고, 공개 응답 비밀 미포함 확인.
- 기존 쿠키 fixture의 비로그인 수정, 로그인 후 수정, 쿠키 없는 동일 계정의 거절, 삭제를 사본에서 확인했다.
  기존 브라우저 데이터 원본은 테스트 쓰기에 사용하지 않았으며 백업 후 최신 코드로 서버를 교체했다.
  교체 직전 최신 원본은 14행으로 늘어 있어, 별도 직전 백업과 다시 대조해 14행·좋아요 4행 모두 보존됨을 확인했다.
- 공개 프로필은 실제 PublicActorPageService를 사용하는 application 테스트로 이름 변경/숨김/재공개/계정 없음 검증.
  공개되지 않은 사진을 새 공개 사진으로 취급하지 않음도 해당 서비스 계약을 재사용한다.
- 실제 UI: 비로그인 읽기/로그인 안내, 기본 익명·공개 페이지 없는 선택 제한, 새 글, 댓글 2개 누적,
  글·댓글 수정 복귀 화면, 키보드 댓글 저장, 기존 로고/헤더/밝은 색상, 390px/1280px 레이아웃 확인.
- 실제 소셜 제공자 OAuth 왕복, 운영 DB 배포/복구, Slack 수신은 **UNVERIFIED**다. 로컬 검증은
  사본 DB의 합성 배우 계정으로 기존 세션 API를 사용했다. 운영용 우회 로그인이나 인증 예외는 추가하지 않았다.
- 기본 평가 1회 완료. 교차 평가 도구를 실행할 수 없어 별도 독립 에이전트로 대체했다. 재귀 평가는 수행하지 않았다.
- 미사용 정리: 생성용 구 CommunityService 메서드는 기존 회귀 fixture가 사용하므로 유지 이유/제거 조건을 위에 기록했다.
  새 런타임 의존성·환경 변수 없음. 불필요해진 댓글 생성 helper와 피드 본문 메모리 캐시 제거.
  문서 라우터의 미구현 표기와 API 응답(memberOwned), 타입/호출/MSW를 동기화했다. evidence.md는 변경하지 않았다.

근거 로그: `/private/tmp/community-backend-final-full.log`, `/private/tmp/community-backend-final.log`,
`/private/tmp/community-frontend-final-full.log`, `/private/tmp/community-frontend-final-target.log`,
`/private/tmp/community-comment-edit-red.log`, `/private/tmp/community-comment-edit-green.log`,
`/private/tmp/community-frontend-final-lint.log`, `/private/tmp/community-frontend-final-build.log`,
`/private/tmp/community-migration-compare.log`, `/private/tmp/community-original-migration-compare.log`, `/private/tmp/community-legacy-http.log`.
UI 기록: `/private/tmp/community-membership-desktop.png`, `/private/tmp/community-membership-mobile.png`.
임시 파일은 검증 당시 로컬 근거이며 저장소의 재실행 가능한 테스트와 이 기록이 유지되는 근거다.

## 문제 목록

모든 ID의 접두사는 `2026-11-04-community-membership-`다. 유입은 모두 INTRODUCED,
최초 기록 PR은 PENDING이다. PR은 생성하지 않았으며 향후 PR에 이 ID를 그대로 인계한다.

| ID | 심각도 | 유형 | 발견 경로 | 근거·문제 | 수정 | 수정 후 검증 | 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F01 | P1 | CODE | INDEPENDENT_REVIEW | 회원 수정·삭제가 글 잠금 전에 엔티티를 읽어 동시 삭제 시 댓글 수가 어긋남 | 부모 글을 먼저 잠그고 READ_COMMITTED에서 소유권·대상을 읽음 | CommunityMembershipTest의 8개 동시 삭제 실패 재현 후 한 번만 감소 확인 | FIXED |
| F02 | P2 | FLOW | INDEPENDENT_REVIEW | 다른 탭에서 표시 모드가 고정된 뒤 작성 초안 모드가 이전 값으로 남음 | 참여자/고정 모드로 폼을 갱신하며 내용 보존·모드와 요청 번호 조정 | member-draft-ui: 내용 유지·고정 모드·요청 번호 갱신 확인 | FIXED |
| F03 | P2 | FLOW | INDEPENDENT_REVIEW | 회원 글 수정 중 만료되면 새 글 경로로 돌아가며 수정 초안이 복구되지 않음 | memberOwned로 기존 쿠키 편집 분리, 글별 수정 초안과 edit 복귀 경로 추가 | 계정/수정 글별 초안 테스트·실제 edit=1 원문 편집 화면 | FIXED |
| F04 | P2 | FLOW | INDEPENDENT_REVIEW | 프로필 공개 선택에서 공개 사진·프로필 링크 미리보기 누락 | 공개 사진·이름·배우 페이지 링크 표시 | 공개 미리보기 컴포넌트에서 img src·링크·표시 이름 확인 | FIXED |
| F05 | P2 | FLOW | POST_FIX_CHECK | 댓글 복귀 hash 경로가 기존 safeAuthReturnTo에서 거절됨 | reply query를 사용하고 댓글 위치 이동 처리 | navigation.test: 안전한 복귀 검증·authSuccessReturnTo 통과 | FIXED |
| F06 | P2 | FLOW | POST_FIX_CHECK | 댓글 수정 만료 시 초안/원래 수정 위치 복구가 없고 복귀 query가 저장 후 편집을 재개함 | 댓글별 계정 초안·수정 복귀 경로·완료 시 query 정리, 계정 변경 시 상세/폼 재조회 | 초안 분리·복귀·완료 회귀 테스트 및 키보드 저장 후 댓글 2개 표시·수정창 종료 UI | FIXED |
| F07 | P3 | DOC | POST_FIX_CHECK | 분석 문서가 존재하지 않는 로그인 실패 전용 이벤트를 수집한다고 설명함 | 실제 로그인 화면/시도/성공/복귀 계약으로 정정하고 차이를 실패 수로 해석하지 않도록 명시 | events.ts·login-form.tsx 발생 지점과 analytics.md/체크리스트 대조 | FIXED |

## 추가 전용 사건 이력

시각은 실행/검토 기록 기준이며, FIXED는 최종 근거 확인·해결 기록 시점이다.

| 사건 ID | 문제 ID | 사건 | 발생 시각 | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-04-community-membership-F01 | CONFIRMED | 2026-11-04T15:25:48+09:00 | INDEPENDENT_REVIEW: 회원 수정·삭제가 글 잠금 전에 엔티티를 읽어 동시 삭제 시 댓글 수가 어긋남. PR PENDING |
| E02 | 2026-11-04-community-membership-F01 | FIXED | 2026-11-04T15:51:03+09:00 | CommunityMembershipTest의 8개 동시 삭제 실패 재현 후 한 번만 감소 확인. PR PENDING |
| E03 | 2026-11-04-community-membership-F02 | CONFIRMED | 2026-11-04T15:25:48+09:00 | INDEPENDENT_REVIEW: 다른 탭에서 표시 모드가 고정된 뒤 작성 초안 모드가 이전 값으로 남음. PR PENDING |
| E04 | 2026-11-04-community-membership-F02 | FIXED | 2026-11-04T15:51:03+09:00 | member-draft-ui: 내용 유지·고정 모드·요청 번호 갱신 확인. PR PENDING |
| E05 | 2026-11-04-community-membership-F03 | CONFIRMED | 2026-11-04T15:25:48+09:00 | INDEPENDENT_REVIEW: 회원 글 수정 중 만료되면 새 글 경로로 돌아가며 수정 초안이 복구되지 않음. PR PENDING |
| E06 | 2026-11-04-community-membership-F03 | FIXED | 2026-11-04T15:51:03+09:00 | 계정/수정 글별 초안 테스트·실제 edit=1 원문 편집 화면. PR PENDING |
| E07 | 2026-11-04-community-membership-F04 | CONFIRMED | 2026-11-04T15:25:48+09:00 | INDEPENDENT_REVIEW: 프로필 공개 선택에서 공개 사진·프로필 링크 미리보기 누락. PR PENDING |
| E08 | 2026-11-04-community-membership-F04 | FIXED | 2026-11-04T15:51:03+09:00 | 공개 미리보기 컴포넌트에서 img src·링크·표시 이름 확인. PR PENDING |
| E09 | 2026-11-04-community-membership-F05 | CONFIRMED | 2026-11-04T15:32:59+09:00 | POST_FIX_CHECK: 댓글 복귀 hash 경로가 기존 safeAuthReturnTo에서 거절됨. PR PENDING |
| E10 | 2026-11-04-community-membership-F05 | FIXED | 2026-11-04T15:51:03+09:00 | navigation.test: 안전한 복귀 검증·authSuccessReturnTo 통과. PR PENDING |
| E11 | 2026-11-04-community-membership-F06 | CONFIRMED | 2026-11-04T15:43:21+09:00 | POST_FIX_CHECK: 댓글 수정 만료 시 초안/원래 수정 위치 복구가 없고 복귀 query가 저장 후 편집을 재개함. PR PENDING |
| E12 | 2026-11-04-community-membership-F06 | FIXED | 2026-11-04T15:51:03+09:00 | 초안 분리·복귀·완료 회귀 테스트 및 키보드 저장 후 댓글 2개 표시·수정창 종료 UI. PR PENDING |
| E13 | 2026-11-04-community-membership-F07 | CONFIRMED | 2026-11-04T15:41:06+09:00 | POST_FIX_CHECK: 분석 문서가 존재하지 않는 로그인 실패 전용 이벤트를 수집한다고 설명함. PR PENDING |
| E14 | 2026-11-04-community-membership-F07 | FIXED | 2026-11-04T15:51:03+09:00 | events.ts·login-form.tsx 발생 지점과 analytics.md/체크리스트 대조. PR PENDING |

## 집계

- 작업 ID: 2026-11-04-community-membership / 평가일: 2026-11-04 / 도메인: community / 평가표 v1 / 독립 평가 1회.
- 필수 PASS 7 / FAIL 0 / UNVERIFIED 0 / N/A 0, 필수 검증률 7/7. 로컬 범위의 검증률이며 운영 성공률이 아니다.
- 선택 UNVERIFIED 1(M08: 운영 배포·외부 소셜 로그인·Slack), 전체 미확인 항목 1.
- 신규 확정 발견 7 / 해결 7 / 미해결 0 / P0 0 / P1 1 / P2 5 / P3 1 / 오탐 0.
- 발견 경로 PRECHECK 0 / INDEPENDENT_REVIEW 4 / POST_FIX_CHECK 3 / EXTERNAL 0.
- PR 없음. 최초 PR PENDING. 운영 전환은 M08 확인 전까지 조건부이며 로컬 기능 구현·커밋과 구분한다.
