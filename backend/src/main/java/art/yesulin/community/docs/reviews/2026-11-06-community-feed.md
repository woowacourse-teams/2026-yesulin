# 수다방 주제 숨김과 이야기 무한스크롤

작업 ID 2026-11-06-community-feed · community/v1

| ID | 흐름 | 실패 경계 | 기대 결과 | 확인 방법 | 필수 |
| --- | --- | --- | --- | --- | --- |
| T1 | 새 글 작성 | 주제가 든 예전 초안 | 주제 칸 없음, 제목·본문만 전송(서버 기본 FREE) | 단위 테스트·브라우저 | 예 |
| T2 | 글 수정 | 기존 주제가 있는 글 | 주제 미전송으로 기존 주제 유지 | 단위 테스트·API 계약 | 예 |
| T3 | 목록 | 예전 `?topic=` 주소·로그인 복귀 `?more=1` | 하나의 피드, 복귀 시 다음 페이지 | 코드·브라우저 | 예 |
| T4 | 무한스크롤 | 감지·버튼 동시 호출, 마지막 페이지, 오류 | 커서별 1회 요청, 끝에서 멈춤, 오류 시 자동 재시도 없음 | 단위 테스트·브라우저 | 예 |
| T5 | 비회원 | 다음 페이지 401 | 자동 로드 없이 "로그인하고 더 보기" 유지 | 코드 | 예 |
| T6 | 분석 | 이벤트 의미 변화 | 목록·작성·이탈 이벤트 시점 유지, 새 이벤트 없음 | 코드 | 예 |
| T7 | 정리 | 주제 UI 잔재 | 주제 라벨·CSS·필터 호출 제거, 서버 계약용 타입·MSW만 유지 | 검색 | 예 |

## 검증 근거

- T1·T2: `post-editor-popular.test.tsx`에서 주제 칸이 없고, `topic`이 든 예전 초안을 복원해도 `createPost`에 제목·본문·작성 방식만 가는지, 수정 시 `editPost(11, {title, body})`만 가는지 확인했다. 생략 시 FREE·기존 유지는 `backend/docs/api.md` 계약과 기존 서버 테스트(CommunityTopicsTest)에 따른다.
- T3·T4: 3101번 MSW(목 로그인)에서 배우로 로그인해 글 14개를 넣고 스크롤만으로 5→10→14개, 중복 없음, 마지막에 버튼 사라짐, 다음 페이지 요청 `before=10`·`before=5` 각 1회, 375px 가로 넘침 없음을 확인했다. `load-when-visible.test.tsx`에서 보이면 1회 호출, 비활성화 시 감시 해제, 같은 커서 반복 호출 1회를 검증했다.
- T5·T6·T7: 비회원 분기는 `community-list.tsx`에서 링크만 렌더링한다. 분석 호출 위치는 그대로다. 주제 타입·`isCommunityTopic`은 서버 계약을 흉내 내는 MSW가 계속 쓰므로 남겼다(서버 `topic` 계약 유지가 이유, 서버에서 주제를 없앨 때 함께 제거).
- 커뮤니티 관련 vitest 22개 파일 96개, lint 통과. 전체 vitest에서 `actor-screen-view.test.tsx` 6개 실패와 tsc의 `original-screening.test.tsx` 오류는 변경 전 origin/dev에서도 같아 범위 밖이다.

## 독립 평가 1회

Codex(읽기 전용)가 staged diff와 평가표로 평가했다.

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 결과 및 표적 검증 |
| --- | --- | --- | --- |
| 2026-11-06-community-feed-F01 | P2 FLOW INTRODUCED | INDEPENDENT_REVIEW | FIXED. 자동 감지와 버튼이 겹치면 같은 커서를 여러 번 요청할 수 있었다. `useNextPageLoader`로 커서별 1회만 요청한다. 단위 테스트와 브라우저 요청 기록으로 확인. |

| 사건 ID | 문제 ID | 사건 | 발생 시각(KST, 분 단위) | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E01 | F01 | CONFIRMED | 2026-11-06T10:58:00+09:00 | 독립 평가 | PENDING |
| E02 | F01 | FIXED | 2026-11-06T11:05:00+09:00 | 단위 테스트·브라우저 요청 기록 | PENDING |

## 판정

필수 PASS 7 / FAIL 0 / UNVERIFIED 0 / N/A 0. 발견 1 / 해결 1 / 미해결 0.
P0 0 / P1 0 / P2 1 / P3 0. PRECHECK 0 / INDEPENDENT_REVIEW 1 / POST_FIX_CHECK 0 / EXTERNAL 0 / 오탐 0.
평가자가 T7을 UNVERIFIED로 남긴 부분은 구현자가 `topic`·`topicLabels`·`community-topic` 검색으로 잔재가 MSW·서버 계약 타입뿐임을 확인해 PASS로 판정했다.

## 최초 PR 연결

최초 게시 PR [#548](https://github.com/woowacourse-teams/2026-yesulin/pull/548), 대상 dev, 이슈 #546.
사건 표의 PENDING은 최초 기록 당시 상태이며 이 절이 최초 PR 연결이다.
