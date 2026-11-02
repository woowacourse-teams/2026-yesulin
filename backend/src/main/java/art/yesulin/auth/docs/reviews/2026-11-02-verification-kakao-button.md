# 인증 화면 카카오톡 문의 버튼 평가

- 작업 ID: `2026-11-02-auth-verification-kakao-button`, 평가일 2026-11-02, 평가표 v1.
- 범위: 문의 텍스트 링크를 카카오 공식 채널 톡문의 이미지 버튼으로 변경한다.
- 기준: `../flows/producer-auth.md`, `frontend/docs/design-system.md`, `docs/agent-review.md`.
- 출처: [공식 채널 채팅 버튼 생성기](https://developers.kakao.com/tool/social-plugin/channel/chat)에서 톡문의·작은·노란색·PC 선택. 이미지 원본을 색상·문구·비율 변형 없이 사용한다.

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| K01 | 문의 인지 / 비공식 모양·왜곡 | 공식 톡문의 원본과 비율 유지 | 출처·브라우저 | Y | PASS |
| K02 | 접근성·반응형 / 작은 터치·새 창 미안내·넘침 | 44px 이상 클릭 높이, 접근 가능한 이름·포커스, 모바일·PC 정상 | 브라우저·코드 | Y | PASS |
| K03 | 이동 / 링크·인증 동작 회귀 | 기존 채널 /chat 목적지·새 창 유지, 인증 로직 보존 | 코드·기존 테스트·lint | Y | PASS |
| K04 | 정리 / 미사용 자산·의존성·옛 설명 | 자산 소비 확인·출처 기록, 불필요한 SDK·의존성 없음 | 독립 평가·참조 검색 | Y | PASS |

인증 정상·실패·중복·권한·상태 복구·수동 수정 보호의 로직은 변경하지 않아 추가 실행 검증 N/A. 채팅 전송·계정 로그인은 수행하지 않는다.

- 독립 평가 1회 완료. 다른 도구 실행 파일 부재로 같은 종류의 별도 읽기 전용 에이전트를 사용했다.
- 필수 PASS 4 / FAIL 0 / UNVERIFIED 0 / N/A 0. 검증률 4/4. 범위 밖 상태 로직은 위 제외 사유 참조.
- 신규 확정: 발견 0 / 해결 0 / 미해결 0. P0 0 / P1 0 / P2 0 / P3 0.
- PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0. 오탐 0 / 미확인 0.
- 신규 문제 ID·상태 사건 없음. 이전 두 UI 작업의 기록은 보존하며 중복 집계하지 않는다.
- PR 미생성. 다음 PR 본문에 작업 ID와 평가 결과를 포함한다.

## 검증 근거

- 2026-11-02, Node24.16.0, Next.js16.2.12 Webpack / 명시적 MSW localhost.
- 원본 URL: https://developers.kakao.com/tool/resource/static/img/button/channel/question/question_small_yellow_pc.png
- 로컬 파일: `frontend/public/images/kakao/channel-question-small-yellow.png`. 다운로드 후 이미지 편집 없음.
- SHA-256: `6dd5c448d52ef06e8792bb742a2a5c7c4a5cf45935a213231c3d6f26d7dea8ff`, PNG 104×48, 3736bytes.
- K01: 공식 생성기에서 옵션 선택 후 다운로드 링크 확인, 원본 다운로드, 로컬 view_image와 브라우저에서 톡문의 이미지 표시 확인. `next/image`의 width104/height48/unoptimized 사용.
- K02: 데스크톱 기본 창 1450×1124와 실제 CSS viewport390px 확인. 모바일 clientWidth/scrollWidth 모두373px로 가로 넘침 없음. 링크 DOM 실측 약104×48px, 이미지 naturalWidth104/complete=true. 상태 확인 버튼에서 Tab 이동 시 문의 링크 포커스·새 창 포함 접근 가능한 이름 확인.
- K03: 기존 href `http://pf.kakao.com/_pbTBX/chat`·target=_blank 유지, rel=noopener noreferrer. 채팅을 열거나 메시지를 보내지 않았다. 기존 인증 테스트8개와 `npm run lint` 종료0. 인증 훅·API·상태 전이 미변경.
- K04: 별도 평가가 추가 hunk·이미지·평가 기록을 기준으로 소비·자산 크기·구성·참조를 점검. 신규 SDK·의존성 없음, 이전 링크 중복 없음. `git diff --check` 종료0.
- 스크린샷: `/private/tmp/yesulin-verification-kakao-desktop.png`, `/private/tmp/yesulin-verification-kakao-mobile.png` (로컬 시각 증거, 영구 저장소 아님).

## 최초 게시 연결

- 기록 시각: 2026-11-02T19:12:02+09:00
- 최초 기록 PR: [#491](https://github.com/woowacourse-teams/2026-yesulin/pull/491), 연결 이슈 #490.
- 위 PR 미생성/PENDING 문구와 상태 사건은 작성 당시 이력으로 보존한다. 이번 연결은 발견·해결 시각을 변경하지 않는다.
- 최종 구현은 여섯 칸 입력·상시 안내·폼 폭에 맞춘 자체 카카오 문의 버튼이다. 이전 접힌 도움말·공식 PNG 시안의 평가는 과거 이력이며 현재 사용 요소가 아니다.
