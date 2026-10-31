# 2026-10-30 dev → main 릴리스 평가

- 작업 ID: `2026-10-30-release-dev-main`
- 평가일: 2026-10-30 (Asia/Seoul)
- 도메인 / 평가표 버전: 공통 릴리스 / v1
- 이슈: [#462](https://github.com/woowacourse-teams/2026-yesulin/issues/462)
- 원본: dev `86569a4718126e88a1f584a8fb730772004573bd`
- 운영 기준: main `bf45893cc98be6ce958b4fe5edd4ef27a31c9961`
- 통합 후보: `1f448d4a` (dev에서 main을 병합하고 문서 충돌 해결)

## 범위와 평가 절차

dev의 #452(이미지 압축), #453(PDF 심사·공용 AI 후처리), #456(유입 계측),
#458(일부 추출·측정 보강), #461(이벤트 신청·명함 기록)을 운영 기준과 통합한다.
기존 작업의 평가·문제 ID와 해결 내역은 각 원본 PR과 도메인 평가 기록을 유지하며 이번 신규 발견으로 다시 세지 않는다.

최상위 AGENTS → docs/README → docs/agent-review와 양 배포 문서를 기준으로 아래 평가표를 먼저 정했다.
독립 평가 1회를 수행했다. 우선 평가 실행 도구가 설치되어 있지 않아 동일 종류의 별도 평가자로 대체했다.
평가자는 읽기 전용으로 확인했고 재귀 평가는 수행하지 않았다.

사용자는 AWS를 건드리지 않아도 된다고 명시했다. 이번 실행은 GitHub 릴리스 병합,
Vercel 상태와 공개 HTTP 확인으로 제한한다. AWS 역할·Lambda·환경 설정·수동 배포를 변경하지 않는다.

## 평가표 v1

| 항목 | 흐름·실패 조건 | 기대 결과 | 검증 방법 | 필수 | 판정·근거 |
| --- | --- | --- | --- | --- | --- |
| REL-01 | 통합 시 main 전용 수정 유실·충돌 | 운영 계측·config 보존 | 양방향 diff, merge-tree, 실제 병합 결과 대조 | 예 | PASS. PostHog 안내 충돌에서 main WAU 설명 보존. dashboards·안내·config·버전 고정은 main과 diff 0 |
| REL-02 | 배포 시 이전 서버·DB 계약 파괴 | 신규 migration은 Expand | 신규 SQL 내용·버전 순서 확인 | 예 | PASS(정적). 테이블·nullable/default 컬럼 추가와 상태 backfill. 기존 컬럼 삭제·이름 변경 없음. 실제 MySQL 적용은 REL-03 |
| REL-03 | 새 AI 흐름의 운영 선행조건 불일치 | Prod Lambda·역할·설정·MySQL 호환 확인 | 실제 운영 설정·전체 경로 확인 | 예 | UNVERIFIED. 사용자 범위에서 AWS 제외. 실제 운영 함수·Bedrock 역할·AI 활성화·MySQL 적용 미확인 |
| REL-04 | 검증되지 않은 통합 결과 병합 | CI 및 통합 정적 검사 통과 | 최신 dev CI, 통합 lint·테스트·build, 릴리스 PR CI | 예 | PASS(사전 범위). dev Backend/Frontend CI 성공, 통합 로컬 검사 성공. 릴리스 PR CI는 병합 직전 별도 확인 |
| REL-05 | 배포 요청과 완료를 혼동 | 관측 대상·완료 신호 구분 | merge SHA·Vercel Production 상태·공개 HTTP 조회 계획 | 예 | PASS(계획). 운영 기능 전체 정상이나 배포 완료를 뜻하지 않음 |

이번 작업은 기존 검증된 기능의 릴리스 통합이다. 신규 API·권한·수동 데이터 수정은 없다.
중복·재시도·복구·권한·수동 입력 보호는 원본 기능 평가를 참조하며, 실제 운영 통합 경로는 REL-03에서 미확인으로 유지한다.

## 실행 근거

- 최신 dev Backend·Frontend CI: [40985445472](https://github.com/woowacourse-teams/2026-yesulin/actions/runs/40985445472), 모두 SUCCESS.
- 통합 후보 `npm run lint`, `npm run build`: PASS.
- 프론트 전체 테스트: 626개 중 622개 PASS. 4개는 로컬 포트 바인딩 EPERM으로 실행 실패했다.
  `npm test -- src/mocks/event-handlers.test.ts`를 허용된 실행 환경에서 다시 실행해 4/4 PASS를 확인했다.
  테스트 코드를 바꾸거나 제한 실패를 제품 결함으로 집계하지 않았다.
- `node scripts/posthog/setup.mjs --dry-run`: PASS. 관리 API 쓰기는 수행하지 않았다.
- `git diff --exit-code origin/main -- frontend/scripts/posthog/dashboards.mjs frontend/docs/posthog-setup.md config config-version.txt`: PASS.
- 신규 migration 세 개의 추가적 변경과 순서 확인. macOS의 Contract 검사 sed 경고를 통과 근거로 사용하지 않았다.
- 미사용 정리 점검: 삭제한 review-context·이전 Python AI 구현의 현재 소스 참조 없음.
  과거 운영 Lambda 배포본의 참조 여부는 REL-03 미확인 범위다. 임시 산출물과 로컬 테스트 이벤트는 배포 소스에 포함하지 않는다.

## 독립 평가와 집계

- 독립 평가: 1회 완료, 운영 인프라 미확인 조건부 결과.
- 필수: PASS 4 / FAIL 0 / UNVERIFIED 1 / N/A 0. 사전 검증률 4/5(80%).
- 신규 확정 문제: 발견 0 / 해결 0 / 미해결 0.
- 신규 심각도: P0 0 / P1 0 / P2 0 / P3 0.
- 발견 경로: PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0.
- 오탐(REJECTED): 0.
- 신규 문제 ID·추가 전용 상태 사건: N/A(신규 확정 결함 없음).

## 미확인 범위와 사후 확인

REL-03의 실제 Prod 인프라·AI 전체 경로는 이번 릴리스 성공으로 바꾸어 기록하지 않는다.
원본 #453의 운영 함수·역할·300건 부하 미확인 사항도 유지한다.
릴리스 PR에 실제 병합 SHA, CI·Vercel 결과와 공개 HTTP 결과를 별도로 덧붙인다.
HTTP 200만으로 새 백엔드 revision이나 AI 전체 기능이 배포됐다고 판단하지 않는다.
