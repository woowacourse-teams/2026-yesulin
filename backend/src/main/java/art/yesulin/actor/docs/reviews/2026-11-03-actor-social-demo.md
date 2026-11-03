# 배우 SNS 복수 링크 데모

- 작업 ID `2026-11-03-actor-social-demo` / 평가표 v1 / PR PENDING
- 범위: 고정 공개 목 `/actors/@min.zzun_`에 인스타그램·스레드·유튜브·네이버 블로그 서비스 홈 링크를 함께 표시한다. 실제 배우 계정 연결이나 운영 데이터 변경은 없다.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| D01 | 공개 목 조회에 링크 누락 | SNS 3종과 블로그 총 4개 | 브라우저 DOM | Y | PASS |
| D02 | 상단 링크 배열의 겹침·overflow | 기존 분류·링크 이름 유지, 4개 배치 | 브라우저·기존 관련 테스트 | Y | PASS |
| D03 | 불필요한 변경·미사용 항목 | 목 데이터 외 제품 동작 변경 없음 | diff·독립 평가·lint | Y | PASS |

저장·실패·중복 제출·중단 복구·권한·수동 수정 보호는 N/A: 고정 데모 데이터만 추가하며 쓰기 흐름은 변경하지 않는다. 외부 서비스 응답과 실제 계정 소유권은 검증 범위 밖이다.

## 검증·평가

- 2026-11-03 독립 평가 1회 완료. 상대 CLI 실행파일이 없어 같은 종류의 별도 읽기 전용 평가로 대체했다.
- 필수 PASS 3 / FAIL 0 / UNVERIFIED 0. N/A 경계는 위 사유 참조. 신규 확정 발견 0 / 해결 0 / 미해결 0 / P0~P3 각 0 / 오탐 0 / 미확인 0.
- 발견 경로 PRECHECK·INDEPENDENT_REVIEW·POST_FIX_CHECK·EXTERNAL 각 0. 문제 ID·확정/해결 시각·상태 사건 이력은 해당 없음. 최초 PR PENDING.
- `npm run lint -- src/mocks/actor-page-handlers.ts` PASS.
- 기존 관련 테스트 `src/mocks/actor-page-handlers.test.ts`, `src/features/actor-pages/external-links.test.ts`, `src/components/actor-pages/actor-page-detail.test.tsx`: 3파일 23항목 PASS (`--maxWorkers=2`). 고정 링크 추가이므로 신규 구현 반복 테스트·빌드 생략.
- 브라우저 새로고침 후 상단 SNS 영역에 네 링크와 새 창 안내 확인. 1234px viewport에서 문서 scrollWidth 1218px, overflow 없음. 브랜드 버튼 약 44px, 블로그 링크 약 152px.
- 화면 증거 `output/actor-social-demo-2026-11-03/desktop.jpg` (로컬 산출물). 이번 고정 데이터 추가의 별도 모바일 실기기 검증은 범위 밖이다. 기존 flex-wrap 동작은 변경하지 않았다.
- 독립 평가에서 목→공개 상세→ActorSocialLinks 소비 경로 확인. 미사용 코드·파일·설정·의존성·깨진 문서 링크 문제 없음. `git diff --check` PASS. PR 미생성.

## 최초 PR 게시 연결

- 2026-11-03T18:30:17+09:00: 이 작업 기록과 문제 ID·추가 전용 사건 이력을 최초 게시 PR [#501](https://github.com/woowacourse-teams/2026-yesulin/pull/501)에 연결했다. 이전 `PENDING`·PR 미생성 문구는 당시 이력이며 최초 확정/해결 시각을 바꾸지 않는다. 본 기록에 있는 문제의 최초 기록 PR은 #501이다.
