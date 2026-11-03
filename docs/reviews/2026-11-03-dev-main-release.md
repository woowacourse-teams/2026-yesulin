# 2026-11-03 dev → main 릴리스 평가

- 작업 ID: `2026-11-03-release-dev-main`
- 평가일: 2026-11-03 (Asia/Seoul)
- 도메인 / 평가표 버전: 공통 릴리스 / v1
- 원본: dev `cc03b57a`
- 운영 기준: main `c3174f1f`
- 통합 후보: `c6f2b60d` (main에서 dev를 병합하고 문서 충돌 해결)

## 범위와 평가 절차

dev의 #483·#486(개발 PDF 지표), #488(공연사 가입 복구와 6자리 이메일 인증), #491(기획사 이메일 인증 화면과 메일 개선)을 운영에 반영한다.
원본 기능의 평가·문제 ID는 각 PR과 도메인 평가 기록을 따르며 이번 신규 발견으로 다시 세지 않는다.

이 릴리스가 PROD에 반영되면 곧바로 CodeDeploy로 직전 리비전(main `c3174f1f` 빌드)에 롤백하고 다시 새 버전으로 배포한다.
스프린트 3 백엔드 재제출에 필요한 "코드가 다른 직전 버전으로 되돌린 기록"을 남기기 위해서다.
그래서 평가표에 옛 버전과 새 버전이 함께 도는 동안의 호환성을 넣었다.

최상위 AGENTS → docs/README → docs/agent-review 순서로 평가표를 정했다. 독립 평가 1회를 읽기 전용으로 수행했다.
상대 평가 도구가 없어 같은 종류의 별도 평가자로 대체했고, 재귀 평가는 수행하지 않았다.

## 평가표 v1

| 항목 | 흐름·실패 조건 | 기대 결과 | 검증 방법 | 필수 | 판정·근거 |
| --- | --- | --- | --- | --- | --- |
| REL-01 | 통합 시 main 전용 수정 유실·충돌 | main 내용 보존, 충돌 흔적 없음 | 양방향 diff, 병합 기준점 이후 main 변경 25개 파일 대조 | 예 | PASS. `git diff origin/dev HEAD`는 main 전용 릴리스 문서 1개뿐. 충돌 1건(pdf-observability 평가 문서)은 dev 쪽이 main 내용에 절을 덧붙인 것이라 dev 쪽을 택함. config·대시보드·config-version은 main과 diff 0 |
| REL-02 | 새 스키마에서 옛 코드가 못 켜짐 | 신규 migration은 Expand | Flyway 계약·순서 검사, SQL·엔티티 대조 | 예 | PASS. `check_flyway_contract_changes.sh`, `check_flyway_migration_order.sh` 통과. 컬럼 추가만 있음(nullable 2, NOT NULL default 0 1). 옛 엔티티 validate는 매핑 컬럼만 봄. 옛 jar의 Flyway future 무시는 실기동 미확인 |
| REL-03 | 옛·새 버전 혼재와 롤백 중 인증 흐름 파손 | 데이터 손상 없이 실패 | 세션 저장 방식, 컨트롤러·서비스 대조 | 예 | PASS(안전한 실패). 세션은 spring-session-jdbc, 세션 객체는 변경 없음. 롤백 중 6자리 코드 제출은 옛 서버에서 405로 실패하고 데이터는 바뀌지 않음. 재전송하면 링크 메일이 감. 프론트는 CodeDeploy 번들이 아니라 롤백되지 않음 |
| REL-04 | 새 코드가 PROD에 없는 설정을 요구 | 새 필수 키 없음 | application.yml, env.example 비교 | 예 | PASS. 새 필수 키 없음. 옛 코드가 쓰는 `EMAIL_VERIFICATION_URL`·`EMAIL_VERIFICATION_REDIRECT_URI`는 config prod.env에 남아 있어 롤백해도 동작 |
| REL-05 | 배포 요청과 완료를 혼동 | 관측 대상·완료 신호 구분 | 외부 요청 측정, 응답 서버 헤더, CodeDeploy 상태 | 예 | PASS(계획). 측정 결과와 롤백 시각은 `design/zero-downtime-deployment-record.md`에 기록 |

## 실행 근거

- `backend/deploy/scripts/check_flyway_contract_changes.sh origin/main`: "New Flyway migrations keep the schema compatible with the previous release"
- `backend/deploy/scripts/check_flyway_migration_order.sh origin/main`: "Flyway migration versions are unique and newer than 20261031200000"
- 백엔드·프론트 테스트는 릴리스 PR CI로 확인한다. 로컬 전체 테스트는 실행하지 않았다.

## 독립 평가와 집계

- 독립 평가: 1회 완료.
- 필수: PASS 5 / FAIL 0 / UNVERIFIED 0 / N/A 0. REL-02의 Flyway future 무시와 REL-03의 405 화면 문구는 실기동 미확인으로 남긴다.
- 신규 확정 문제: 발견 2 / 해결 0 / 미해결 2.
- 신규 심각도: P0 0 / P1 0 / P2 0 / P3 2.
- 발견 경로: PRECHECK 0 / INDEPENDENT_REVIEW 2 / POST_FIX_CHECK 0 / EXTERNAL 0.
- 오탐(REJECTED): 0.

| 문제 ID | 신규/기존 | 심각도·유형·유입 | 발견 경로 | 최초 확정(+09:00) | 해결 시각 | 문제·근거 | 조치·상태 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `2026-11-03-release-dev-main-F01` | 신규 | P3/CONFIG/EXISTING | INDEPENDENT_REVIEW | 2026-11-03 | - | 루트 `.env.example:26-27`에 더 이상 쓰지 않는 이메일 인증 링크 변수 2개가 남음 | 미해결. 롤백 확인이 끝난 뒤 정리 |
| `2026-11-03-release-dev-main-F02` | 신규 | P3/CONFIG/EXISTING | INDEPENDENT_REVIEW | 2026-11-03 | - | config `server/{dev,prod}.env`에 같은 두 키가 남음. 롤백 중 옛 코드가 쓰므로 지금은 지우면 안 됨 | 미해결. 롤포워드가 안정된 뒤 정리 |
