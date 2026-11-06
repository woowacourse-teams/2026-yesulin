# 홈 포스터 묶음 이동 수정 평가

- 작업 ID: `2026-11-06-home-poster-pagination`
- 기준: 루트 AGENTS → frontend/AGENTS → frontend/docs/README → frontend/docs/AGENTS, architecture.md, design-system.md.
- 범위: 홈 포스터 줄의 묶음 이동·경계 버튼·동작 감소. API·링크·분석 이벤트와 분모 유지.
- 평가표 v1. 사전 작성 후 아래에 실행 결과를 반영했다.
- 독립 평가 1회 완료. 상대 도구 CLI는 `Not logged in`으로 실행할 수 없어 별도 Codex 에이전트를 사용했다. 읽기 전용 검토와 관련 16개 테스트 독립 재실행에서 신규 확정 결함 없음.
- 판정: 조건부. 실제 터치·중간 폭 브라우저와 smooth 이동 중 연속 클릭은 미확인이다. 정상 PC 묶음 이동은 로컬 브라우저에서 확인했다.

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| H01 | 5장/4장 줄의 버튼 이동 | 1–5 → 6–10, 1–4 → 5–8 | poster-row.test 5장·4장 이동 테스트. 로컬 임시 API 12건, 실제 CSS의 1200px 줄에서 다음 클릭 후 6–10 표시·scrollLeft 약1220 확인. 4장 실제 브라우저는 미실행 | 예 | PASS |
| H02 | 마지막 묶음·역방향 | 남은 카드만 표시, 뒤로 돌아오면 원래 묶음 | DOM 테스트 및 실제 CSS에서 scrollLeft 약2440, 11–12만 표시·다음 버튼 숨김. 역방향 클릭 및 원래 묶음 복귀 테스트 | 예 | PASS |
| H03 | 시작·끝·overflow 없음 | 불가능한 방향 숨김, 항목 부족 시 양쪽 숨김 | 실제 로컬 PC 시작/끝 버튼 상태, 초기 목 데이터 4건의 양쪽 숨김. 0/4/5건 DOM 테스트 | 예 | PASS |
| H04 | 크기 변경·분야 변경 | 이동 범위·끝 여백 재계산, 목록 변경 시 처음으로 | DOM resize/동일 개수 다른 key 목록 교체 테스트 통과. 브라우저 viewport override가 실제 innerWidth에 반영되지 않아 끝에서 실제 resize는 미확인 | 예 | UNVERIFIED |
| H05 | 키보드·동작 감소·연속 클릭 | 경계에서 초점 보존, 동작 감소 시 즉시 이동 | DOM 테스트에서 focus/instant 확인. scrollTo mock은 즉시 이동하므로 실제 smooth 중 연속 클릭·실제 OS 설정은 미확인 | 예 | UNVERIFIED |
| H06 | 모바일 직접 탐색 | 기존 카드 스냅·터치 탐색 유지, 끝에 빈 페이지 없음 | DOM에서 모바일 tail=0 및 직접 scroll 상태 반영 확인. 실제 터치·모바일 크기는 미실행 | 예 | UNVERIFIED |
| H07 | 홈·빈 상태·오류·기존 링크·분석 | 기존 상태·이벤트 의미 보존 | audition-post-home/notebook-home-sections/poster-row 3파일16테스트 통과. fallback 경로·기존 링크·analytics.md/대시보드 분모 변경 없음 | 예 | PASS |
| H08 | 미사용 파일·코드·설정·의존성·문서 | 이번 diff에 불필요한 항목 없음 | 독립 평가: hook·CSS 변수 소비자 존재, 의존성·API·분석 변경 없음, design-system 동작 설명 갱신. 기존 미추적 파일 보존 | 예 | PASS |
| H09 | 권한·편집·데이터 변경 | 읽기 전용 공개 홈 탐색이며 해당 변경 없음 | diff 확인 | 아니오 | N/A |

이전 점검 문제 `2026-11-06-home-navigation-inspection-F01/F02`를 재사용한다. 신규 발견으로 중복 집계하지 않는다.

필수 PASS 5 / FAIL 0 / UNVERIFIED 3 / N/A 1. 검증률 62.5%(5/8). 신규 확정 발견 0 / 해결 0 / 미해결 0 / P0~P3 각0, 발견 경로별 각0, 오탐0. 기존 문제2건 해결은 원래 문제 ID의 후속 이력에 기록한다. 최초 PR #559, PR 게시 없음.

## 실행 검증

- 전체 `npm run lint`: 통과.
- 관련 테스트: 3파일16개 통과. 독립 평가자도 같은 범위를 재실행했다.
- 작업 폴더의 `npm run build`: 기존 미추적 `src/app/design-preview/page.tsx:23`가 더 이상 지원하지 않는 initialPage prop을 사용해 타입 오류. 해당 파일은 수정하지 않았다.
- 추적 frontend 파일과 이번 신규 소스를 `/private/tmp/yesulin-home-pagination-build`에 복사해 `npm run build -- --webpack`: 타입 검사 및 전체62페이지 빌드 통과. 미추적 실험 파일과 개인 env는 복사하지 않았다. 따라서 원래 작업 폴더 전체 빌드 통과를 주장하지 않는다.
- 브라우저 검증에는 저장소 밖 임시 API의 번호 붙인 가짜12개 공고를 사용했다. 운영 데이터·설정 변경 없음.

## PR 최초 게시

- 최초 기록 PR: [#559](https://github.com/woowacourse-teams/2026-yesulin/pull/559), 대상 dev.
- 위의 PR 미게시·커밋/배포 없음 문구는 최초 점검 시점의 기록이며, 게시 후에도 과거 검증 결과와 상태 사건은 보존한다.
- 게시 전 독립 일관성 검토에서 문제 ID 중복 제거 발견3/해결3/P2 3,4개 작업별 평가와20파일 범위 일치를 확인했다.
- 병합 직전 최신 dev 기준 rebase 확인 및 관련8파일50테스트 통과. 실제 인증/모바일 미확인 범위는 그대로 유지한다.
