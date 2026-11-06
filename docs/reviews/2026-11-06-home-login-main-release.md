# 홈과 로그인 개선 운영 승격

- 작업 ID: `2026-11-06-home-login-main-release`
- 평가일: 2026-11-06, Asia/Seoul. 공통 릴리스 / v1.
- 사용자 승인: dev 머지·배포 확인 후 같은 변경을 main PR로 병합한다.
- dev PR: [#559](https://github.com/woowacourse-teams/2026-yesulin/pull/559), 병합 커밋 `2cea9b68f4b2521f8ea5fcb9d86e8cc85d9bd694`.
- main 기준: `977f596e7099ff5c498a100e396310ead8fff19c`. main에서 운영 후보 브랜치를 만들어 origin/dev를 병합했다. 기존 main 전용 평가 기록8개를 보존한다.
- main PR: [#560](https://github.com/woowacourse-teams/2026-yesulin/pull/560). 현재는 병합 전 후보 평가이며 운영 배포 완료를 뜻하지 않는다.
- 근거: 공통 Git·평가 규칙, frontend/docs/deployment.md와 앞선4개 작업의 평가표.

## 평가표 release-v1

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 방법·근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| M01 | 범위 / 다른 기능·삭제 혼입 | main 대비 #559의20파일과 이 평가 기록만 추가 | git diff origin/main 및 dev 비교, main의8개 기존 기록 보존 | 예 | PASS |
| M02 | 소스·설정 / 운영 전용 코드 누락·충돌 | 운영 후보와 병합 dev의 제품 소스·설정 동일 | origin/dev와 차이는 main의 기존8문서 및 이번 릴리스 기록만, 충돌 없음 | 예 | PASS |
| M03 | dev 검증 / 병합 후 배포 실패 | CI·Vercel 성공 및 비로그인 화면 정상 | PR #559의 Frontend/Backend/CodeQL·Vercel 통과, 프리뷰 /community·/login 확인. dev 병합 커밋 결과 대기 | 예 | UNVERIFIED |
| M04 | main 후보 / 빌드 회귀 | 원격 Frontend/Backend·CodeQL·Vercel 통과 | main PR 생성 뒤 확인 | 예 | UNVERIFIED |
| M05 | 미사용·문서 / 불필요 파일 유입 | 선택 변경과 필요한 평가만 포함 | 독립 평가: main대비20파일은#559 그대로, dev 제품 소스 동일, 기존 main8문서 보존, 미사용 코드/파일/설정/옛문서 추가 유입 근거 없음 | 예 | PASS |
| M06 | 인증·모바일 / 미확인을 통과로 확대 | 기존 미확인 범위 공개 | 실제 OAuth 왕복·모바일 실기기·키보드·홈 resize/smooth 연속 입력은 이전 평가대로 미확인 | 예 | UNVERIFIED |

## 기존 문제 집계

#559에 최초 기록한 3건을 같은 ID로 참조한다. 이번 릴리스의 신규 발견으로 더하지 않는다.

- `2026-11-06-home-navigation-inspection-F01`: P2 CODE EXISTING, FIXED.
- `2026-11-06-home-navigation-inspection-F02`: P2 CODE EXISTING, FIXED.
- `2026-11-06-community-login-concepts-F01`: P2 CODE INTRODUCED, FIXED.

신규 확정 문제 발견0 / 해결0 / 미해결0 / P0 0 / P1 0 / P2 0 / P3 0. PRECHECK0 / INDEPENDENT_REVIEW0 / POST_FIX_CHECK0 / EXTERNAL0, 오탐0. 신규 상태 사건 없음.
과거 최초 확정·해결 시각과 사건 이력은 #559의 각 평가 기록을 따른다.

## 독립 평가

별도 Codex 에이전트가 읽기 전용 평가1회를 수행했다. 상대 CLI 인증이 준비되지 않아 같은 종류의 별도 평가자로 대체했다. 범위·제품 소스/설정 동일성·기존8문서 보존·미사용 항목·diff 공백 검사를 확인했고 신규 확정 문제는 없었다. 평가자 미실행 범위는 원격 검증과 혼합하지 않는다.

필수 PASS3 / FAIL0 / UNVERIFIED3 / N/A0, 검증률50%(3/6). 원격 검증 완료 시 해당 항목만 근거와 함께 갱신한다.
