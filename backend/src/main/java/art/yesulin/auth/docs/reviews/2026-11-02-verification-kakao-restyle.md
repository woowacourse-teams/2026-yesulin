# 카카오 문의 버튼 크기와 정렬 조정

- 작업 ID: `2026-11-02-auth-verification-kakao-restyle`, 평가일 2026-11-02, 평가표 v1.
- 범위: 작은 공식 이미지 대신 화면과 같은 규격의 노란색 문의 버튼을 사용한다. 기존 로그인 화면의 카카오 말풍선 SVG를 공유 컴포넌트로 옮겨 동일하게 사용한다. 인증 훅·API는 유지한다.
- 기준: `../flows/producer-auth.md`, `frontend/docs/design-system.md`, `docs/agent-review.md`.
- 공식 SDK 문서는 자체 제작한 채팅 버튼 사용을 안내한다: https://developers.kakao.com/docs/ko/kakaotalk-channel/js#chat
- 로그인 버튼 전용 문구 규정을 문의 버튼 규정으로 확대 해석하지 않는다. 이번 버튼은 기존 채널 채팅 URL을 여는 사이트 자체 문의 버튼이며, 공식 제공 이미지라고 표현하지 않는다.

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| R01 | 배치 / 작은 이미지가 고립 | 입력 폼 폭에 맞춘 44px 높이 노란 문의 버튼과 명확한 문구 | PC·모바일 브라우저 | Y | PASS |
| R02 | 접근성·이동 / 레이블·포커스·링크 회귀 | 기존 목적지·새창·안전 rel·키보드 포커스 유지 | 코드·브라우저 | Y | PASS |
| R03 | 공용 심볼 / 로그인 모양·인증 동작 회귀 | 동일 SVG path와 기본 크기 유지, 인증 로직 보존 | 기존8테스트·lint·빌드 | Y | PASS |
| R04 | 정리 / 옛 이미지·중복 SVG 잔존 | PNG와 미사용 import 제거, 공유 컴포넌트 소비 확인 | 독립 평가·참조 검색 | Y | PASS |

인증 권한·중복·중단/복구·수동 수정 보호의 상태 로직은 변경하지 않아 추가 실행 검증 N/A. 실제 채팅 전송은 범위 밖이다.

- 독립 평가 1회 완료. 다른 도구 실행 파일이 없어 동일 종류의 별도 읽기 전용 에이전트로 평가했다.
- 필수 PASS4 / FAIL0 / UNVERIFIED0 / N/A0, 검증률4/4. 제외 경계는 위 사유 참조.
- 신규 확정: 발견1 / 해결1 / 미해결0. P0 0 / P1 0 / P2 0 / P3 1.
- 경로: PRECHECK0 / INDEPENDENT_REVIEW1 / POST_FIX_CHECK0 / EXTERNAL0. 오탐0 / 미확인0.
- PR 미생성, 최초 기록 PR PENDING. 다음 PR에 이 작업 ID와 평가·문제 현황을 기록한다.

## 검증 근거

- 2026-11-02, Node24.16.0, Next16.2.12 Webpack, localhost 명시적 MSW.
- `npm run lint`, 기존 `producer-entry.test.tsx` 8개, `npm run build -- --webpack` 종료0. 마지막 aria-label 문구 수정 후 대상3파일 eslint·diff 점검 수행.
- PC 기본 창1450×1124, 모바일 실제 CSS viewport390px에서 배치 확인. 모바일 clientWidth/scrollWidth373px로 넘침 없음. 버튼 실측 약288×44px, 상태 확인 버튼에서 Tab 이동 시 문의 링크 포커스 확인.
- 화면 문구와 aria-label을 동일하게 맞춘 뒤 브라우저 AX와 DOM에서 새 창 안내 포함 이름 확인. 목적지와 target/rel 유지, 채팅 전송 없음.
- 로그인 심볼의 SVG path/viewBox/기본24px/aria-hidden을 변경 없이 추출했고 문의 버튼에서20px로 사용. 중복 SVG·next/image import·미사용 PNG 제거. 독립 평가가 양쪽 소비와 미사용 코드·파일·설정·의존성·문서를 확인했다.
- 이전 PNG 평가 기록은 당시 검증의 이력이므로 보존한다. 해당 PNG는 이 후속 작업에서 사용이 끝나 삭제했다.
- 로컬 시각 증거: `/private/tmp/yesulin-verification-kakao-restyle-desktop.png`, `/private/tmp/yesulin-verification-kakao-restyle-mobile.png` (영구 저장소 아님).

## 문제 목록

| 문제 ID | 심각도/유형/유입 | 경로 | 근거·조치·수정 후 확인 | 상태 | 최초 확정 | 해결 | 최초 PR |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-02-auth-verification-kakao-restyle-F01 | P3/CODE/INTRODUCED | INDEPENDENT_REVIEW | 표시 문구 ‘카카오톡 문의하기’와 aria-label ‘카카오톡으로 문의하기’ 불일치. aria-label에서 ‘으로’ 제거, 모바일 AX·DOM 확인 | FIXED | 2026-11-02T19:06:53+09:00 | 2026-11-02T19:06:53+09:00 | PENDING |

## 추가 전용 상태 사건

| 사건 ID | 문제 ID | 사건 | 시각(+09:00) | 근거/PR |
| --- | --- | --- | --- | --- |
| 2026-11-02-auth-verification-kakao-restyle-F01-E01 | 2026-11-02-auth-verification-kakao-restyle-F01 | CONFIRMED | 2026-11-02T19:06:53+09:00 | 독립 평가의 Label in Name 불일치 확인 / PENDING |
| 2026-11-02-auth-verification-kakao-restyle-F01-E02 | 2026-11-02-auth-verification-kakao-restyle-F01 | FIXED | 2026-11-02T19:06:53+09:00 | aria-label 수정, 이후 브라우저 표시 문구와 접근 가능한 이름 확인 / PENDING |
