# 공개 배우 키·몸무게 표시

- 작업 ID: `2026-11-03-actor-measurement-labels`
- 범위: 공개 배우 상세와 공통 본인 미리보기의 ‘신체’ 묶음을 키·몸무게로 분리. 순수 표시 변경.
- 기준: actor docs/README → AGENTS → 작성·공개 흐름, frontend 디자인 규칙, 공통 평가 절차.
- 기존 데이터·공개 범위·목록 요약·HTTP 계약은 변경하지 않는다.

구현 전 평가표:

| ID | 실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| L01 | 키와 몸무게 구분이 모호함 | 키 Ncm·몸무게 Nkg로 따로 표시 | ActorPageView 각 항목 생성 코드, @min.zzun_ AX 키165cm | 예 | PASS |
| L02 | 없는 값이 빈 라벨로 남음 | 각 값이 null이면 해당 항목만 숨김 | 각 값 truthy 조건은 기존 helper와 동일, 목 화면에서 몸무게 항목 없음 확인 | 예 | PASS |
| L03 | 미리보기와 상세 표시 불일치 | 같은 ActorPageView 사용 | ActorPageRoute·ActorPagePreviewScreen 소비자 확인 | 예 | PASS |
| L04 | 미사용 import·레이아웃·린트 | 불필요한 import 제거·wrap 유지·lint 통과 | actorBodyLine import/임시값 제거, 기존 flex-wrap 유지, lint/diff check PASS | 예 | PASS |

독립 평가 1회, 읽기 전용: 추가 결함 없음. Claude CLI가 없어 별도 Codex 에이전트로 대체했다.
이전 작업의 변경은 이번 평가 범위에 포함하지 않았다.
배우 목록의 actorBodyLine은 소비자가 있으므로 유지하고 상세에서만 import를 제거했다.
개별 단위와 null/0 숨김 동작은 기존과 같다. 개인정보 공개 범위·서버 계약은 변경하지 않았다.

2026-11-03 로컬 MSW 공개 화면에서 ‘키 165cm’와 없는 몸무게 숨김을 확인했다.
근거 캡처: 저장소 루트 `output/actor-measurement-labels-2026-11-03/actor-labels.jpg`.
검증: `frontend/`에서 `npx eslint src/components/actor-pages/actor-page-detail.tsx`, `git diff --check` PASS.
순수 UI 표시 변경이어서 새 테스트나 전체 빌드를 추가하지 않았다.

집계: 필수 PASS 4 / FAIL 0 / UNVERIFIED 0 / N/A 0, 검증률 100%(이 좁은 표시 범위에 한함).
신규 확정 문제 발견 0 / 해결 0 / 미해결 0 / P0 0 / P1 0 / P2 0 / P3 0.
PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0, 오탐 0 / 미확인 0.
문제 ID·상태 사건 이력은 신규 확정 결함이 없어 해당 없음. PR 생성하지 않음. 다음 PR에 이 평가 기록을 포함한다.

## 최초 PR 게시 연결

- 2026-11-03T18:30:17+09:00: 이 작업 기록과 문제 ID·추가 전용 사건 이력을 최초 게시 PR [#501](https://github.com/woowacourse-teams/2026-yesulin/pull/501)에 연결했다. 이전 `PENDING`·PR 미생성 문구는 당시 이력이며 최초 확정/해결 시각을 바꾸지 않는다. 본 기록에 있는 문제의 최초 기록 PR은 #501이다.
