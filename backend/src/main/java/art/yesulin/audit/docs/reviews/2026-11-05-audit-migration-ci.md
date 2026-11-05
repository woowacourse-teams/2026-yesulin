# PR #533 Flyway 순서 검사 수정

작업 ID `2026-11-05-audit-migration-ci`, Audit v1, 최초 PR [#533](https://github.com/woowacourse-teams/2026-yesulin/pull/533).

| ID | 흐름·기대 결과 | 필수 | 결과 |
| --- | --- | --- | --- |
| C01 | 새 migration 버전이 최신 dev 최대값보다 크고 기존 dev/main 파일은 변경 안 함 | Y | PASS |
| C02 | 이름 변경 전후 SQL 바이트 동일·참조 잔여 없음·기존 schema/data 무변경 | Y | PASS |
| C03 | CI 순서·호환성 사전 검사 및 해당 shell 회귀 통과 | Y | PASS |
| C04 | 최신 dev 통합·독립 평가·PR 필수 CI 성공·병합 미실행 | Y | UNVERIFIED |

확정 문제 F01: P1/FLOW/INTRODUCED/EXTERNAL. GitHub Actions Backend가 새 V20261105130000 버전이 기준 dev V20261105143000보다 작아서 컴파일 전 실패했다. 로컬 gradlew build는 이 CI shell 사전검사를 포함하지 않았다. 아직 dev/main에 게시되지 않은 이 PR 신규 migration의 파일명만 기준 버전보다 크게 변경한다. 기존 적용 파일·SQL·Flyway 이력·DB는 수정하지 않는다.

## 수정·검증 (push 전 스냅샷)

- 최신 dev `ccf176b9` 위로 작업 브랜치만 rebase했다. 기준 최대 migration `V20261105190000`보다 큰 `V20261105190001__add_pdf_review_entry_display_title.sql`로 신규 파일명만 변경했다.
- 적용 전후 SQL bytes 동일(SHA-256 `3fd93d7cbddaae87011e19d1884dca12c241765cbacdc3a666dddf07853f3fa7`), 기존 dev migration 전수 변경0. 이전/새 파일 모두 dev/main에는 아직 없다. DB/서버/Flyway 이력은 변경하지 않았다.
- `check_flyway_migration_order.sh origin/dev`, `check_flyway_contract_changes.sh origin/dev`, 각 기존 `_test.sh` PASS. 파일명 중복 없음. 원인 설명 외 이전 실행 참조 없음.
- 독립 평가1회 완료(상대 도구 연결 불가로 별도 동일 종류 평가자 사용). 위 검사·bytes·기존 파일 보호를 독립 재확인했으며 신규 발견0/미사용 문제0. C04 원격 CI는 push 후 PR 본문/실행 링크에 결과를 연결한다.
- 추가 전체 로컬 빌드는 반복하지 않는다. SQL 내용/기능 코드는 바뀌지 않았으며 실제 GitHub CI가 Linux에서 전체 빌드·배포 스크립트를 검증한다. 보조 배포 cleanup 테스트는 로컬 macOS BSD find에 `-printf`가 없어 실행 환경 불일치로 종료됐다. 이 별도 Linux 검증을 로컬 통과로 기록하지 않는다.

## 문제 현황 및 이력

발견1=해결1+미해결0, P0 0/P1 1/P2 0/P3 0. PRECHECK0/INDEPENDENT_REVIEW0/POST_FIX_CHECK0/EXTERNAL1/REJECTED0.
필수 PASS3/FAIL0/UNVERIFIED1/N/A0은 이 push 전 기록이다. C04의 외부 CI 최종 상태는 PR #533 본문과 최신 workflow 실행으로 확인한다.

| 사건 | 문제 ID | 종류 | 시각(+09:00) | 근거 / 최초 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-05-audit-migration-ci-F01 | CONFIRMED | 2026-11-05T20:08:16+09:00 | 실패 job127197450039 / 파일명 정정·4개 shell 검사 통과 / #533 |
| E02 | 2026-11-05-audit-migration-ci-F01 | FIXED | 2026-11-05T20:08:16+09:00 | 실패 job127197450039 / 파일명 정정·4개 shell 검사 통과 / #533 |

## dev 추가 migration 후 재검증 (2026-11-05T23:13:38+09:00)

최신 dev에 V20261105200000이 추가돼 PR 사전검사에서 재발을 확인했다. 미적용인 이 PR 파일만 V20261105231338__add_pdf_review_entry_display_title.sql으로 다시 정정했으며 SQL bytes는 동일하다. 실제 PR 반영 시각 기준 버전으로 맞추고 기존 migration/DB는 변경하지 않았다. 기존 문제 ID F01로 연결해 중복 발견 수에 더하지 않는다.

| E03 | 2026-11-05-audit-migration-ci-F01 | REOPENED | 2026-11-05T23:13:38+09:00 | dev 최대 버전 증가·로컬 사전검사 / #533 |
| E04 | 2026-11-05-audit-migration-ci-F01 | FIXED | 2026-11-05T23:13:38+09:00 | 신규 파일명 재정렬·SQL 동일 / #533 |
