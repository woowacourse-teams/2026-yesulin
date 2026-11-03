# 여섯 칸 인증번호 입력 평가

- 작업 ID: `2026-11-02-auth-verification-slots`, 평가일 2026-11-02, 평가표 v1.
- 범위: 숫자 예시를 빈 여섯 칸으로 교체하고 도움말을 항상 노출한다. 기존 인증 훅/API/상태 전이는 유지한다.
- 기준: `../flows/producer-auth.md`, `frontend/docs/design-system.md`, `docs/agent-review.md`.
- 참고: [Supabase OTP](https://supabase.com/design-system/docs/components/input-otp), [shadcn OTP](https://ui.shadcn.com/docs/components/input-otp), [input-otp](https://input-otp.rodz.dev/docs).
- 입력·선택·붙여넣기·자동완성을 직접 재구현하지 않도록 두 참고 구현이 사용하는 `input-otp`를 추가한다. 실제 입력은 하나이며 시각 슬롯만 여섯 개다.

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| S01 | 초기 / 가짜 기본값·입력 혼동 | 숫자 예시 없는 빈 여섯 칸, 현재 입력 위치 표시 | 브라우저 | Y | PASS |
| S02 | 입력·선택·수정 / 분리 입력 불편 | 단일 입력, 선행0·붙여넣기·Backspace·방향키·전체선택 유지 | 기존/표적 테스트·브라우저 | Y | PASS |
| S03 | 인증 / 정상·실패·중복 회귀 | 기존 인증 동작과 오류·로딩 상태 보존 | 기존 producer-entry 테스트 | Y | PASS |
| S04 | 복구 / 도움말 은폐 | 스팸·60초·5회·문의 상시 노출, 재전송·상태 확인 유지 | 브라우저·코드 | Y | PASS |
| S05 | 반응형·접근성 / 넘침·중복 레이블 | 모바일·데스크톱 배치, 단일 레이블·Tab·숫자 입력모드·자동완성 속성 | 브라우저·코드 | Y | PASS |
| S06 | 정리 / 불필요한 구현·의존성 | 신규 라이브러리 실제 사용, 제거된 details/placeholder 참조와 문서 정리 | 독립 평가·lint/build | Y | PASS |

권한·중단/복구·수동 수정 보호의 상태 로직은 변경하지 않으므로 추가 검증 N/A. 운영 SMTP 수신·실기기 자동완성은 목 브라우저 검증에 포함하지 않는다.

- 독립 평가 1회 완료. 이전 작업과 별개인 후속 요청 범위를 읽기 전용 별도 에이전트로 평가했다. 대체 도구 실행 파일 부재로 같은 종류의 에이전트를 사용했다.
- 필수 PASS 6 / FAIL 0 / UNVERIFIED 0 / N/A 0. 검증률 6/6. 상태 로직 경계 제외 사유는 위 참조.
- 신규 확정 문제: 발견 0 / 해결 0 / 미해결 0. P0 0 / P1 0 / P2 0 / P3 0.
- PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0. 오탐 0 / 미확인 0.
- 문제 ID·상태 사건: 신규 확정 문제가 없어 없음. 이전 UI 작업 F01은 기존 작업 ID에 유지하고 중복 집계하지 않는다.
- PR 미생성. 다음 PR 본문에 이 작업 ID·평가 요약과 이전 UI 작업 기록을 함께 포함한다.

## 검증 근거

- 환경: 2026-11-02, Node 24.16.0, Next.js 16.2.12 Webpack, localhost MSW. input-otp 1.5.0 사용, 새 전이 의존성 없음.
- `npm test -- src/components/auth/producer-entry.test.tsx`: 8개 통과. 기존 7개에 공백이 포함된 `000 123` 붙여넣기→`000123` 인증 요청→ACTIVE 세션 적용 회귀 테스트 추가.
- `npm run lint`, `git diff --check` 종료 0.
- `npm run build -- --webpack` 종료 0: 프로덕션 번들·TypeScript·정적 페이지 생성 통과. 기본 Turbopack 빌드는 컴파일 단계에서 진행 출력이 없어 중단했고, 미리보기와 동일한 Webpack으로 검증했다. 기본 Turbopack 빌드 통과로 주장하지 않는다.
- S01/S02/S05: 브라우저에서 빈 슬롯 6개, 실제 입력 1개, placeholder 없음, 포커스된 슬롯 1개 확인. 숫자 입력 후 ArrowLeft/Backspace로 중간 숫자 삭제와 활성 칸 이동을 시각 확인. 클립보드 `000 123` 붙여넣기 후 여섯 칸에 `000123` 표시 확인. Meta+A/Backspace로 전체 삭제 확인.
- S04: 모바일/데스크톱에서 스팸함 안내·60초·5회 및 카카오 문의가 접기 없이 노출. 실제 문의 링크를 방문하거나 메일을 전송하지 않았다.
- S05: 실제 CSS viewport 390px에서 document clientWidth/scrollWidth 모두 373px로 가로 넘침 없음. 데스크톱 기본 창 1450×1124에서도 확인. 입력 모드·autocomplete 속성/접근 가능한 단일 레이블 유지. 실기기 메일 자동완성은 실행하지 않았으며 속성 확인과 구분한다.
- S06: 독립 평가에서 라이브러리 import/render·package/lock 일치·React19 peer 호환, 이전 details/placeholder 제거와 미사용 코드·파일·설정·의존성·문서 링크 점검. 확정 문제 없음.
- 스크린샷: `/private/tmp/yesulin-verification-slots-desktop.png`, `/private/tmp/yesulin-verification-slots-mobile.png` (로컬 증거이며 영구 저장소 파일 아님).
- 운영 SMTP·API와 실기기 자동완성은 이 화면 변경의 검증 범위 밖이다. 브라우저 입력 값은 도구에서 마스킹되므로 값 비교 결과를 근거로 사용하지 않고 시각 표시와 단위 테스트를 근거로 사용했다.

## 최초 게시 연결

- 기록 시각: 2026-11-02T19:12:02+09:00
- 최초 기록 PR: [#491](https://github.com/woowacourse-teams/2026-yesulin/pull/491), 연결 이슈 #490.
- 위 PR 미생성/PENDING 문구와 상태 사건은 작성 당시 이력으로 보존한다. 이번 연결은 발견·해결 시각을 변경하지 않는다.
- 최종 구현은 여섯 칸 입력·상시 안내·폼 폭에 맞춘 자체 카카오 문의 버튼이다. 이전 접힌 도움말·공식 PNG 시안의 평가는 과거 이력이며 현재 사용 요소가 아니다.
