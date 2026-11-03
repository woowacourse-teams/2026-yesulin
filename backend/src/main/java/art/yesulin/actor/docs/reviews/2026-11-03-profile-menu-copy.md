# 프로필 메뉴 설명 정리

- 작업 ID: `2026-11-03-profile-menu-copy`, 평가표 v1, PR PENDING
- 메뉴와 본문에서 반복하는 작은 설명을 제거하고 메뉴 제목을 읽기 쉽게 조정한다.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| M01 | 항목 탐색 | 5개 메뉴·순서·활성 표시·기존 이동 유지 | 코드·브라우저 | Y | PASS |
| M02 | 메뉴 정보 | 반복 설명 제거, 선택 항목 구분 유지 | 코드·브라우저 | Y | PASS |
| M03 | 좁은 화면 | 제목 잘림·가로 넘침 없음, 44px 조작 | 320px 브라우저 | Y | PASS |
| M04 | 정리 | 미사용 description·CSS 제거, lint 통과 | 독립 평가·lint | Y | PASS |

순수 UI 문구·글자 크기 변경으로 API·저장·공개 정책과 데이터 권한은 N/A.
독립 평가 1회 완료(상대 CLI가 없어 같은 종류의 별도 읽기 전용 평가로 대체).

- 필수 PASS 4 / FAIL 0 / UNVERIFIED 0 / N/A 0. 검증률 4/4.
- 신규 확정 발견 0 / 해결 0 / 미해결 0 / P0~P3 각 0 / 오탐 0 / 미확인 0.
- 발견 경로 PRECHECK·INDEPENDENT_REVIEW·POST_FIX_CHECK·EXTERNAL 모두 0. 문제·상태 사건 이력은 해당 없음.
- 2026-11-03: `npx eslint src/components/applicants/profile-editor.tsx` 및 `git diff --check` PASS.
- 데스크톱: 메뉴 설명 제거·선택 항목 표시·사진 메뉴 Enter 전환·활성 표시 확인.
- 320 CSS px: 문서 scrollWidth 303px, 메뉴 잘림 없음, 높이 44px(측정 소수점 오차 제외).
- 근거 스크린샷 `output/profile-menu-2026-11-03/{desktop,mobile-320}.jpg`는 로컬 산출물로 커밋 제외.
- 독립 평가: 기존 5개 메뉴·순서·이동·활성·선택 구분 유지, 미사용 description 데이터/타입/렌더/CSS 제거 확인. 추가 결함 없음.
- 순수 문구·글자 크기 변경으로 새 테스트와 production build는 추가 실행하지 않았다. 실제 모바일 기기 판정은 이 작업 범위가 아니다.

## 최초 PR 게시 연결

- 2026-11-03T18:30:17+09:00: 이 작업 기록과 문제 ID·추가 전용 사건 이력을 최초 게시 PR [#501](https://github.com/woowacourse-teams/2026-yesulin/pull/501)에 연결했다. 이전 `PENDING`·PR 미생성 문구는 당시 이력이며 최초 확정/해결 시각을 바꾸지 않는다. 본 기록에 있는 문제의 최초 기록 PR은 #501이다.
