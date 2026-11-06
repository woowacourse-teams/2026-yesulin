# 홈 포스터 이동 개선 운영 승격

- 작업 ID: `2026-11-06-home-login-main-release`
- 평가일: 2026-11-06, Asia/Seoul. 공통 릴리스 / v1.
- 사용자 승인: dev 머지·배포 확인 후 같은 변경을 main PR로 병합한다.
- dev PR: [#559](https://github.com/woowacourse-teams/2026-yesulin/pull/559), 이후 사용자 요청으로 커뮤니티·로그인은 [#562](https://github.com/woowacourse-teams/2026-yesulin/pull/562)에서 원복했다. 최종 dev 기준은 `3d3ed0aecd509bfc27bbee37500ca81d1af1a1a8`이다.
- main 기준: `977f596e7099ff5c498a100e396310ead8fff19c`. main에서 운영 후보 브랜치를 만들어 origin/dev를 병합했다. 기존 main 전용 평가 기록8개를 보존한다.
- main PR: [#560](https://github.com/woowacourse-teams/2026-yesulin/pull/560). 현재는 병합 전 후보 평가이며 운영 배포 완료를 뜻하지 않는다.
- 근거: 공통 Git·평가 규칙, frontend/docs/deployment.md와 홈 구현·커뮤니티 원복 평가표. 취소된 커뮤니티·인증 코드는 기존 main과 정확히 같다.

## 평가표 release-v1

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 방법·근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| M01 | 범위 / 취소 기능·다른 변경 혼입 | 홈 관련5파일과 평가 기록6개만 변경 | main대비11파일, 커뮤니티·인증·회원참여문서diff0, 기존main8문서보존 | 예 | PASS |
| M02 | 소스·설정 / 운영 전용 코드 누락·충돌 | 운영 후보와 병합 dev의 제품 소스·설정 동일 | origin/dev와 차이는 main의 기존8문서 및 이번 릴리스 기록만, 충돌 없음 | 예 | PASS |
| M03 | dev 검증 / 원복 후 배포 실패 | CI·Vercel 성공 및 홈·기존 화면 정상 | #559/#562 PR CI·Vercel통과, 원복 dev병합3d3ed0ae 결과와 화면확인 대기 | 예 | UNVERIFIED |
| M04 | main 후보 / 빌드 회귀 | 원격 Frontend/Backend·CodeQL·Vercel 통과 | 최종 홈 전용 후보를push한 뒤 확인, 최신결과는PR본문에추가기록 | 예 | UNVERIFIED |
| M05 | 미사용·문서 / 불필요 파일 유입 | 선택 변경과 필요한 평가만 포함 | 최초승격독립평가+선택적원복독립평가로삭제심볼참조0확인,최종diff표적확인.과거커뮤니티2평가는취소이력을덧붙여보존 | 예 | PASS |
| M06 | 모바일 / 미확인을 통과로 확대 | 기존 미확인 범위 공개 | 모바일실기기·키보드·OS동작감소·홈resize/smooth연속입력은이전홈평가대로미확인. 실제OAuth는이번운영변경없음 | 예 | UNVERIFIED |

## 기존 문제 집계

#559에 최초 기록한 3건을 같은 ID로 참조한다. 이번 릴리스의 신규 발견으로 더하지 않는다.

- `2026-11-06-home-navigation-inspection-F01`: P2 CODE EXISTING, FIXED.
- `2026-11-06-home-navigation-inspection-F02`: P2 CODE EXISTING, FIXED.
- `2026-11-06-community-login-concepts-F01`: P2 CODE INTRODUCED, 시안에서 FIXED. 제품 커뮤니티 변경은 사용자 요청으로 원복되어 이 릴리스 기능이 아니다.

신규 확정 문제 발견0 / 해결0 / 미해결0 / P0 0 / P1 0 / P2 0 / P3 0. PRECHECK0 / INDEPENDENT_REVIEW0 / POST_FIX_CHECK0 / EXTERNAL0, 오탐0. 신규 상태 사건 없음.
과거 최초 확정·해결 시각과 사건 이력은 #559의 각 평가 기록을 따른다.

## 독립 평가

별도 Codex 에이전트가 읽기 전용 평가1회를 수행했다. 상대 CLI 인증이 준비되지 않아 같은 종류의 별도 평가자로 대체했다. 범위·제품 소스/설정 동일성·기존8문서 보존·미사용 항목·diff 공백 검사를 확인했고 신규 확정 문제는 없었다. 평가자 미실행 범위는 원격 검증과 혼합하지 않는다.

필수 PASS3 / FAIL0 / UNVERIFIED3 / N/A0, 검증률50%(3/6). 이 표는최종후보push전스냅샷이며,원격검증완료와배포확인은PR #560본문에추가기록한다. 미확인실기기항목은통과로바꾸지않는다.

## 범위 변경 이력

최초 후보는#559 전체였으나 사용자가dev에서확인한뒤커뮤니티·로그인을취소했다. #560을초안으로전환하고#562의선택적원복을dev에먼저병합한뒤운영후보에도반영했다. 원복은새결함발견으로집계하지않고기존평가이력을보존한다.
dev에서한때공고·공연API가ALB503을반환했고직접백엔드도동일했다. 이후API200회복을확인했으나AWSCLI세션만료로원인은확정하지않았다. 이관측을홈프론트수정의결함으로단정하지않는다.
