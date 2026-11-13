# 2026-11-13 dev → main 릴리스

- 작업 ID `2026-11-13-dev-main-release` / 평가일 2026-11-13 KST / 공통 릴리스·프론트·인증·배우 / 평가표 v1
- 운영 기준 `7f582d33`, 개발 기준 `f820dee4`, 병합 커밋 `6c8fc836`. 두 브랜치 끝을 병합 커밋의 부모로 연결했다.
- 사건 E01·E02의 최초 게시 PR은 [#586](https://github.com/woowacourse-teams/2026-yesulin/pull/586)이다.
- #569·#572 PDF 심사 전체화면과 후속 수정, #575 홈 화면 아이콘, #578 테스트 기준 문서, #580 배우 검색, #581 배우 좋아요와 로그인 진입 분리, #582 응원 글, #585 기획사 화면의 예술in 홈 이동을 반영한다. 각 변경의 기존 평가 ID와 이력은 해당 PR에 남긴다.

| ID | 경계·실패 조건 | 기대 결과 | 검증 근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| REL-01 | 최신 main·dev 병합과 충돌 | 양쪽 이력과 OG 후속 기록 보존 | 병합 부모가 `7f582d33`·`f820dee4`다. 유일한 add/add 충돌에서 `main`의 `FIXED`와 사건 E02 기록을 보존했다. | Y | PASS |
| REL-02 | 운영 직행 perf·config 유실 | 홈 300초 ISR, 공개 공고 카드 prefetch 비활성화, 운영 config 보존 | #577·#584의 코드·테스트 파일이 `main`과 동일하고 아키텍처 문서의 ISR 설명도 유지된다. 빌드 출력에서 `/` 재검증 `5m`, 카드 소스에서 `prefetch={false}`를 확인했다. config 포인터·고정 버전 `bab5abe1` 일치. | Y | PASS |
| REL-03 | dev 누락·프론트 회귀 | #581·#585 포함 및 테스트·lint·빌드 통과 | 로그인과 홈 링크 파일이 `dev`와 동일하다. Vitest 212개 파일 1,156개, lint, 운영용 빌드 통과. | Y | PASS |
| REL-04 | 홈 이동 중 기획사 세션 유실 | PC·모바일에서 공개 홈 왕복 | Chrome 375px·1081px·1280px와 목 로그인으로 버튼 표시·키보드 이동, 홈에서 **내 오디션 공고** 재진입 확인. | Y | PASS |
| REL-05 | DB 마이그레이션 순서·호환성 | 운영 기준보다 새 버전으로 테이블·인덱스 추가 | `actor_page_likes`·`actor_page_cheers` 추가 SQL 확인. `check_flyway_migration_order.sh origin/main` 및 `check_flyway_contract_changes.sh origin/main` 통과. | Y | PASS |
| REL-06 | 백엔드 통합 회귀 | Java 25 빌드·테스트 통과 | `./gradlew build --no-daemon --offline`과 커밋 훅 Checkstyle 통과. 테스트 1,538건 중 2건 건너뜀, 실패·오류 0건. | Y | PASS |
| REL-07 | 배포 환경 세션·DB 적용 | 실제 인증과 운영 MySQL 검증 | 목 로그인과 정적 Flyway 검사로 확인했다. 운영 인증·MySQL 미실행. | N | UNVERIFIED |
| REL-08 | 배포 후 요청량·캐시 회귀 | 운영 캐시와 prefetch 검증 | 빌드와 소스에서 설정을 확인했다. 배포 후 요청과 캐시 응답은 미실행. | N | UNVERIFIED |
| REL-09 | Ubuntu 배포 스크립트 회귀 | 릴리스 커밋의 Ubuntu CI 성공 | macOS에서 Flyway·readiness·환경 파일·모니터링 검사 통과. 정리 테스트는 기본 `find`가 GNU `-printf`를 지원하지 않아 실패했다. 스크립트는 양쪽 브랜치와 동일하며 [원본 dev Ubuntu CI](https://github.com/woowacourse-teams/2026-yesulin/actions/runs/43337157694)에서 배포 스크립트 전체 통과. 릴리스 PR CI 결과는 대기 중. | N | UNVERIFIED |

## 독립 평가와 문제 집계

- 독립 평가 1회. 별도 읽기 전용 에이전트가 병합 부모와 충돌 해결, perf 파일·운영 config, dev의 진입점과 신규 SQL, 문서·미사용 항목을 확인했다. 독립 평가 신규 결함 0건.
- 필수 PASS 6 / FAIL 0 / UNVERIFIED 0 / N/A 0. 필수 검증률 6/6.
- `git -c core.whitespace=cr-at-eol diff --check origin/main...HEAD` 통과. #578의 `docs/test-criteria.md`가 원래 CRLF를 사용한다.
- 이번 PR에 처음 게시하는 확정 문제 발견 1 / 해결 1 / 미해결 0. P0 0 / P1 0 / P2 1 / P3 0. PRECHECK 1 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0. 오탐 0.
- 비필수 UNVERIFIED 3건(REL-07~09). 운영 배포와 실서버 검증은 PR 병합 이후 확인한다.

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정(+09:00) / 최초 기록 PR | 해결 시각(+09:00) | 근거·조치·상태 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-13-dev-main-release-readiness-F01 | P2·DOC·EXISTING | PRECHECK | 2026-11-13T00:04:35+09:00 / #586 | 2026-11-13T09:31:46+09:00 | `frontend/docs/reviews/2026-11-06-og-preview-image-host.md`의 add/add 충돌. 사전 점검에서 확정했고, 병합 커밋에서 `main`의 최신 평가 기록을 보존했다. REL-01 재검증 통과, FIXED. |

## 상태 사건 이력

| 사건 ID | 문제 ID | 종류 | 발생 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| 2026-11-13-dev-main-release-readiness-E01 | 2026-11-13-dev-main-release-readiness-F01 | CONFIRMED | 2026-11-13T00:04:35+09:00 | 사전 점검에서 `git merge-tree`로 OG 문서 충돌 재현 / PENDING |
| 2026-11-13-dev-main-release-readiness-E02 | 2026-11-13-dev-main-release-readiness-F01 | FIXED | 2026-11-13T09:31:46+09:00 | `6c8fc836`의 문서가 `main`과 동일하고 미해결 파일 없음 / PENDING |
