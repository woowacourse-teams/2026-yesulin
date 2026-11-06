# 홈 좌우 탐색 점검

- 작업 ID: `2026-11-06-home-navigation-inspection`
- 평가일: 2026-11-06, Asia/Seoul
- 범위: 사용자의 홈 좌우 탐색 문제 확인 요청. 제품 코드 수정·PR·배포 없음.
- 기준: 루트 AGENTS → frontend/AGENTS → frontend/docs/README → frontend/docs/AGENTS, design-system.md, architecture.md.
- 환경: 운영 https://yesulin.art/, 브라우저 폭 약 1030px 및 1440px. 정적 검토는 로컬 dev `02e4a8b2`.
- 독립 평가 1회: 별도 Codex 에이전트의 읽기 전용 검토. 상대 도구의 평가 실행 경로를 확보하지 못해 같은 종류의 별도 에이전트 사용.
- 판정: 점검 결과이며 수정 완료가 아님. 실제 모바일·키보드·동작 감소 환경과 상단 배너 전환의 시각 연속성은 미확인.

## 평가표 navigation-v1

소스 수정 전 점검 기준을 정했으며 제품 구현은 수행하지 않았다.

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 방법·근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| H01 | 첫 위치·항목 부족 / 이동 불가능한 버튼 활성 | 이동 가능한 방향만 제공 | 운영 1440px 시작점 이전 버튼과 무료 공연 4건의 양쪽 버튼 노출, poster-row.tsx:18–30에 경계 검사 없음 | 예 | FAIL |
| H02 | 다음 클릭 / 카드 정렬 깨짐 | 이동 후 카드 시작 정렬 | 운영 최신 줄 width=1200, 카드224+gap20, 다음 클릭 후 scrollLeft=976(4칸), 시각 정렬 확인 | 예 | PASS |
| H03 | 중간 폭 / 추가 카드 발견 어려움 | 다음 카드 또는 탐색 단서 | 약 1030px에서 4장 딱 맞춤·화살표 숨김 확인. 디자인 개선 제안이며 기능 고장 판정은 아님 | 아니오 | PASS |
| H04 | 동작 감소 / 강제 부드러운 이동 | 설정에 따라 즉시 이동 | poster-row.tsx:19에 smooth 고정 확인. 실제 설정을 바꾼 브라우저 실행은 하지 않음 | 예 | UNVERIFIED |
| H05 | 변경 정리 / 미사용 항목 유입 | 범위 내 불필요한 코드·자산 없음 | 제품 소스·자산·설정·의존성 변경 없음. 추가 파일은 이 평가 기록만이며 기존 미추적 파일은 보존 | 예 | PASS |
| H06 | 정상·빈 상태·오류/재시도·권한·중복·수동 수정 보호 | 해당 흐름 보존 | 읽기 전용 점검으로 기능 변경 없음. 회귀 통과로 간주하지 않음 | 아니오 | N/A |
| H07 | 실제 모바일·키보드·배너 전환 연속성 | 해당 환경에서 정상 탐색 | 이번 실행 범위에 없음 | 예 | UNVERIFIED |

필수 PASS 2 / FAIL 1 / UNVERIFIED 2, 전체 N/A 1. 검증률 40%(2/5).

## 문제와 사건 이력

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정 / 최초 PR | 해결 시각 | 근거·조치·상태 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-06-home-navigation-inspection-F01 | P2·CODE·EXISTING | PRECHECK | 2026-11-06T19:09:14+09:00 / #559 | — | 이동 경계·overflow 검사 없이 양쪽 버튼 활성. scrollLeft와 scrollWidth/clientWidth로 가능한 방향만 제공하도록 제안. OPEN |
| 2026-11-06-home-navigation-inspection-F02 | P2·CODE·EXISTING | PRECHECK | 2026-11-06T19:09:14+09:00 / #559 | — | 동작 감소 조건 없이 JS smooth 지정. 설정에 따라 instant/smooth 선택 제안. 정적 불일치는 확정, 실제 환경 재현은 H04 미확인. OPEN |

| 사건 ID | 문제 ID | 종류 | 발생 시각 | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-06-home-navigation-inspection-F01 | CONFIRMED | 2026-11-06T19:09:14+09:00 | 운영 화면 및 poster-row.tsx:18–30, PR #559 |
| E02 | 2026-11-06-home-navigation-inspection-F02 | CONFIRMED | 2026-11-06T19:09:14+09:00 | poster-row.tsx:19 및 독립 평가, PR #559 |

신규 확정 발견 2 / 해결 0 / 미해결 2 / P0 0 / P1 0 / P2 2 / P3 0.
발견 경로 PRECHECK 2 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0. 오탐 0. 미확인 2.
독립 평가는 두 문제의 정적 근거를 확인했고 별도 신규 문제는 없었다. 85% 이동 자체를 카드 잘림 버그로 단정하지 않았으며 운영에서 정렬을 확인했다.

## 후속 수정 이력

위 집계는 최초 점검 시점의 기록이다. 후속 작업 `2026-11-06-home-poster-pagination`에서 아래 두 문제를 수정했다. 구현·독립 평가·실행 경계는 [묶음 이동 평가](2026-11-06-home-poster-pagination.md)에 기록한다.

| 사건 ID | 문제 ID | 종류 | 발생 시각 | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E03 | 2026-11-06-home-navigation-inspection-F01 | FIXED | 2026-11-06T19:25:47+09:00 | use-poster-navigation에서 scroll 경계 확인 및 버튼 hidden 처리, 0/4/5건 테스트와 실제 PC 시작·끝 검증. PR #559 |
| E04 | 2026-11-06-home-navigation-inspection-F02 | FIXED | 2026-11-06T19:25:47+09:00 | matchMedia 동작 감소 설정에 따라 instant 선택, DOM 테스트 통과. 실제 OS 환경은 미확인. PR #559 |

현재 문제 상태: F01 FIXED / F02 FIXED. 누적 발견2 / 해결2 / 미해결0 / P0 0 / P1 0 / P2 2 / P3 0. 과거 CONFIRMED 시각 및 최초 점검 결과는 보존한다.

## PR 최초 게시

- 최초 기록 PR: [#559](https://github.com/woowacourse-teams/2026-yesulin/pull/559), 대상 dev.
- 위의 PR 미게시·커밋/배포 없음 문구는 최초 점검 시점의 기록이며, 게시 후에도 과거 검증 결과와 상태 사건은 보존한다.
- 게시 전 독립 일관성 검토에서 문제 ID 중복 제거 발견3/해결3/P2 3,4개 작업별 평가와20파일 범위 일치를 확인했다.
- 병합 직전 최신 dev 기준 rebase 확인 및 관련8파일50테스트 통과. 실제 인증/모바일 미확인 범위는 그대로 유지한다.
