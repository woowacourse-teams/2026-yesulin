# 받은 댓글 알림 개편

작업 ID `2026-11-05-community-notifications`, 평가일 2026-11-05, 커뮤니티 v1.
마이페이지의 "받은 댓글" 탭을 없애고, 공통 헤더의 알림 종과 커뮤니티 알림 화면(`/community/notifications`)으로 옮긴다.

- 백엔드: 알림 목록에 작성자 표시 이름(글 안의 익명 번호·공개 이름·프로필 비공개), 댓글 미리보기(80자), 작성 시각을 더하고 모두 읽음 API를 추가한다.
- 프론트: 배우 계정 헤더에 읽지 않은 수가 보이는 종, 최근 5묶음 펼침 창, 종류·기간별 알림 화면. 같은 글·같은 종류·같은 읽음 상태 알림은 한 줄로 묶는다.
- 예전 `/applicants/received-comments`는 알림 화면으로 보낸다. 분석 이벤트는 바꾸지 않는다.

| ID | 흐름 단계 / 실패 경계 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| N1 | 익명성·개인정보 | 익명 댓글은 글 안 번호만, 공개 댓글은 현재 공개 상태 반영, 삭제 제외 | 백엔드 테스트, 코드 검토 | Y | PASS |
| N2 | API 계약 | Controller·api.md·타입·MSW 일치, 모두 읽음 경로 충돌 없음 | 코드 대조, 테스트 | Y | PASS |
| N3 | 묶기·이동 | 묶음 규칙·문장·기간, 묶음 읽음 뒤 최근 댓글로 이동, 실패 안내, 연속 클릭 방지 | 단위·컴포넌트 테스트 | Y | PASS(수정 후) |
| N4 | 헤더 통합 | 배우만, 화면 폭별 위치, 키보드 닫기와 포커스 복귀 | 컴포넌트 테스트, CSS 검토 | Y | PASS(수정 후) |
| N5 | 제거 완결성 | 옛 탭·점·경로·스타일 참조 없음, 옛 주소 이동 | 저장소 검색 | Y | PASS |
| N6 | 코드 규칙·테스트 | 새 코드 규칙, 의미 있는 테스트 | eslint, checkstyle, 테스트 | Y | PASS |

## 실행 근거

- 백엔드 `art.yesulin.community.*` 38테스트(새 알림 테스트 포함)와 checkstyle 통과.
- 프론트 커뮤니티·헤더 관련 23파일 94테스트 통과, 전체 `npm test`는 기존 `actor-screen-view.test.tsx` 6개 외 통과, eslint 통과.
- 목 환경에는 배우 로그인이 없어, 같은 알림 행·펼침 창 스타일을 합성 데이터 임시 페이지에서 PC로 확인하고 지웠다.

## 독립 평가 1회

2026-11-05 읽기 전용 별도 평가 1회. 상대 도구를 쓸 수 없어 같은 종류의 별도 평가자로 대체했다.

| 문제 ID | 심각도 / 유형 / 유입 | 발견 경로 | 상태 | 근거·조치 |
| --- | --- | --- | --- | --- |
| 2026-11-05-community-notifications-F01 | P2 / FLOW / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 761~1080px에서 종이 로고 옆에 붙고 펼침 창이 화면 왼쪽 밖으로 잘림. 오른쪽 정렬 규칙을 1080px 이하로 넓힘 |
| 2026-11-05-community-notifications-F02 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 펼침 창의 모두 읽음이 보이는 5묶음 기준으로만 활성화. 전체 읽지 않은 수 기준으로 변경 |
| 2026-11-05-community-notifications-F03 | P3 / FLOW / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 알림 화면에서 필터 기준 활성화와 전체 읽음 동작이 어긋남. 전체 읽지 않은 수 기준으로 맞춤 |
| 2026-11-05-community-notifications-F04 | P3 / FLOW / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 모두 읽음 실패를 알리지 않음. 실패 안내 추가, 테스트 추가 |
| 2026-11-05-community-notifications-F05 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 서로 다른 비공개 작성자를 한 명으로 세고 "프로필 비공개님이"처럼 어색함. 따로 세고 "비공개 배우가"로 표시, 테스트 추가 |
| 2026-11-05-community-notifications-F06 | P3 / DOC / INTRODUCED | INDEPENDENT_REVIEW | FIXED | "이번 주"가 실제로는 최근 7일. 이름을 "최근 7일"로 변경 |
| 2026-11-05-community-notifications-F07 | P3 / FLOW / INTRODUCED | INDEPENDENT_REVIEW | FIXED | Escape 뒤 포커스 미복귀, Tab으로 벗어나도 열림 유지. 포커스 복귀와 벗어나면 닫기 추가, 테스트 추가 |
| 2026-11-05-community-notifications-F08 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | REJECTED | 화면 함수 길이 권고. 기존 화면 컴포넌트와 같은 수준이라 유지 |

| 사건 ID | 문제 ID | 사건 종류 | 발생 시각 | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E01 | F01~F08 | CONFIRMED | 2026-11-05T19:33:00+09:00 | 평가 보고 | PENDING |
| E02 | F01~F07 | FIXED | 2026-11-05T19:37:33+09:00 | 백엔드 38·프론트 94테스트, eslint·checkstyle | PENDING |
| E03 | F08 | REJECTED | 2026-11-05T19:37:33+09:00 | 기존 관례 대조 | PENDING |

## 판정

필수 PASS6 / FAIL0 / UNVERIFIED0 / N/A0, 검증률 6/6.
신규 확정 7 / 해결 7 / 미해결 0, P0=0 P1=0 P2=1 P3=6. PRECHECK0 / INDEPENDENT_REVIEW7 / POST_FIX_CHECK0 / EXTERNAL0, 오탐1.
미확인: 로그인한 배우 계정으로 실제 헤더 종(특히 761~1080px)·실제 API 응답 확인(병합 후 dev), 비회원 401 통합 요청.

## 최초 PR 연결

최초 게시 PR: [#538](https://github.com/woowacourse-teams/2026-yesulin/pull/538), 대상 dev.
위 사건 표의 PENDING은 당시 이력이며 이 절로 최초 게시 번호를 연결한다. 문제 ID와 확정·해결 시각은 바꾸지 않는다.
