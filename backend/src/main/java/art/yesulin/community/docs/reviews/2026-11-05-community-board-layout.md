# 수다방 3단 구성과 익명 별 아바타

작업 ID `2026-11-05-community-board-layout`, 평가일 2026-11-05, 커뮤니티 v1. 프론트 화면만 바꾼다.
design-lab 시안 A(3단 보드)의 1단계다. 주제 분류·인기 글·공고 연결은 백엔드가 필요한 다음 단계로 미룬다.

- 목록을 왼쪽 소개·이용 안내, 가운데 글쓰기 유도 카드와 글 목록, 오른쪽 마감 임박 공고(공개 공고 API `sort=deadline` 5개)로 바꾼다.
- 사진이 없는 작성자는 별 캐릭터를 색만 바꿔 보인다. 색은 `글 번호:표시 이름`으로 정해 같은 글 안의 같은 작성자는 같은 색이고,
  계정 정보를 쓰지 않아 다른 글의 같은 사람과 이어지지 않는다. 공개 프로필 사진은 그대로다.
- 글 카드 제목·본문을 키우고 미리보기를 3줄로 줄인다. 이미 있던 댓글 "글쓴이" 표시와 좋아요 10개 이상 "인기" 표시는 유지한다.
- API·도메인 정책·분석 이벤트는 바꾸지 않는다.

| ID | 흐름 단계 / 실패 경계 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| C1 | 익명성 | 아바타 색으로 다른 글의 같은 사람을 이을 수 없고, 같은 글 안에서는 일관 | 코드·백엔드 표시 이름 대조, 단위 테스트 | Y | PASS |
| C2 | 기존 피드 동작 | 로딩·빈·오류·더보기·스크롤 기억·목록 조회 이벤트 1회·좋아요·메뉴 유지 | 코드 대조, 기존 테스트 | Y | PASS |
| C3 | 마감 공고 패널 | 올바른 조회·링크, 실패·빈 결과면 영역 자체를 숨김 | 컴포넌트 테스트 | Y | PASS(수정 후) |
| C4 | CSS·반응형 | 삭제 선택자 미사용, 1440/800/375px 가로 넘침 없음 | 저장소 검색, 로컬 MSW 브라우저 | Y | PASS |
| C5 | 코드 작성 규칙 | 새 코드 else·삼항 없음 | 코드 검토, eslint | Y | PASS |
| C6 | 미사용 코드·문서 | 화면 문서 최신화 | 문서 대조 | Y | PASS(수정 후) |
| C7 | 테스트 | 관련 테스트 통과 | `src/components/community`, `src/features/community` 16파일 64테스트 | Y | PASS |

## 실행 근거

- 커뮤니티 16파일 64테스트 통과, eslint 통과, 변경 파일 tsc 오류 없음.
- 로컬 MSW `/community`에서 1440px 3단(200/624/280px), 800px 2단, 375px 1단과 가로 넘침 없음을 확인했다. 목 환경에는 글이 없어
  익명 별 아바타는 같은 컴포넌트를 그린 임시 페이지에서 7명이 서로 다른 색으로 보이는 것을 확인하고 지웠다.
- 전체 `npm test`의 `actor-pages/actor-screen-view.test.tsx` 6개 실패는 dev에서도 같은 기존 문제로 이번 집계에서 제외한다.

## 독립 평가 1회

2026-11-05 읽기 전용 별도 평가 1회. 상대 도구를 쓸 수 없어 같은 종류의 별도 평가자로 대체했다.

| 문제 ID | 심각도 / 유형 / 유입 | 발견 경로 | 상태 | 근거·조치 |
| --- | --- | --- | --- | --- |
| 2026-11-05-community-board-layout-F01 | P2 / DOC / INTRODUCED | INDEPENDENT_REVIEW | FIXED | `frontend/docs/design-system.md`가 옛 786px 목록·별 버튼을 설명. 3단 구성·반응형·별 아바타 규칙으로 갱신 |
| 2026-11-05-community-board-layout-F02 | P3 / DOC / INTRODUCED | INDEPENDENT_REVIEW | FIXED | `frontend/docs/api-integration.md`가 5줄 미리보기로 설명하고 공고 API 호출이 빠짐. 3줄·마감 공고 조회 추가 |
| 2026-11-05-community-board-layout-F03 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 마감 공고가 없을 때 빈 `aside`와 280px 칸이 남음. 패널이 있을 때만 aside를 그리고 칸도 접음. 테스트 추가 |
| 2026-11-05-community-board-layout-F04 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 목록과 상세의 별 색 기준이 달라 같은 글에서 색이 다를 수 있음. 목록도 `글 번호:표시 이름` 사용 |
| 2026-11-05-community-board-layout-F05 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 색이 7개라 한 글의 다른 익명끼리 자주 겹침. 10색으로 늘림(이름이 함께 보여 오해 위험은 낮음) |
| 2026-11-05-community-board-layout-F06 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | REJECTED | 글쓰기 유도 링크의 접근 가능한 이름이 길다는 지적. 보이는 문구 전체를 이름으로 두는 편이 음성 제어와 맞아 유지 |

| 사건 ID | 문제 ID | 사건 종류 | 발생 시각 | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E01 | F01~F06 | CONFIRMED | 2026-11-05T18:40:00+09:00 | 평가 보고 | PENDING |
| E02 | F01~F05 | FIXED | 2026-11-05T18:46:37+09:00 | 수정 후 64테스트·eslint 통과, 1440px 열 폭 확인 | PENDING |
| E03 | F06 | REJECTED | 2026-11-05T18:46:37+09:00 | 보이는 문구와 이름 일치 유지 | PENDING |

## 판정

필수 PASS7 / FAIL0 / UNVERIFIED0 / N/A0, 검증률 7/7.
신규 확정 5 / 해결 5 / 미해결 0, P0=0 P1=0 P2=1 P3=4. PRECHECK0 / INDEPENDENT_REVIEW5 / POST_FIX_CHECK0 / EXTERNAL0, 오탐1.
미확인: 실제 글이 있는 dev 데이터에서의 목록·상세 화면, 실제 기기, `npm run build`.
