# 공연사 서비스 랜딩 개편 평가

- 작업 ID: `2026-11-05-producer-landing-redesign`
- 평가일: 2026-11-05, Asia/Seoul
- 대상: `/producer-service`, 기준 `origin/dev`, 최초 평가 커밋 45dfc46a
- 독립 평가: 1회 완료. 구현 Claude, 평가 Codex(읽기 전용). 수정 후 검증은 구현자가 수행했고 재귀 평가는 하지 않는다.
- 기준: 최상위 AGENTS → frontend/AGENTS → frontend/docs/README → frontend/docs/AGENTS,
  docs/domain.md의 공연사 인증·공고 게시·오픈채팅 공유·PDF 지원서 심사함, design-system.md, analytics.md.
- 판정: 조건부. 미해결 P0/P1 없음. 통계 원자료와 실제 기기 확인은 미확인으로 남긴다.

## 평가표 producer-landing-v1

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 방법·근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| P01 | 메일 지원서 가져오기 | 미출시라 '곧 열려요' 표시 | 히어로 카드·강점·FAQ, 랜딩 테스트 | 예 | PASS |
| P02 | PDF 지원서 안내 | 공고와 별개인 심사함으로 설명 | F01 수정 후 문구 대조(domain.md PDF 지원서 심사함) | 예 | PASS |
| P03 | 가입·게시 | 이메일 인증 후 바로 게시 | FAQ·마무리 문구와 domain.md 공연사 게시 규칙 대조 | 예 | PASS |
| P04 | 지원서 열람 권한 | 흐름별 소유자 기준 설명 | F02 수정 후 문구 | 예 | PASS |
| P05 | 오픈채팅 공유 | 운영팀 공유 단계로 설명, 발송 완료 약속 없음 | F03 수정 후 랜딩 테스트 | 예 | PASS |
| P06 | 단계 탭 키보드·접근성 | 방향키 순환, roving tabindex, 세로 방향, 패널 진입 | producer-flow-tabs.test 3건 | 예 | PASS |
| P07 | 포스터 자동 이동 | 버튼으로 정지, 동작 감소 시 정지·가로 스크롤 | 1440px 브라우저에서 버튼 클릭 후 animationPlayState=paused 확인, 동작 감소는 CSS만 확인 | 예 | PASS |
| P08 | 1440/375px 레이아웃 | 겹침·가로 넘침 없음 | MSW 개발 서버에서 두 폭 스크린샷, scrollWidth 차이 0 | 예 | PASS |
| P09 | 실제 휴대폰 | 터치·스크롤 체감 | 실기기 미실행 | 아니오 | UNVERIFIED |
| P10 | 분석 | 로그인 attribution 유지, 새 성공 이벤트 없음 | TrackedLoginLink 값 유지, analytics.md·dashboards.mjs 영향 없음 | 예 | PASS |
| P11 | 통계 수치 | 3,900+·240+·40+·160+ 원자료 | 2026-11-05 운영 확인 값을 사용자 제공·조회로 받음. 원자료 저장소 기록 없음 | 아니오 | UNVERIFIED |
| P12 | 코드 규칙 | else·삼항·설명 주석 없음, 작은 컴포넌트 | F06 수정 후 정적 확인 | 예 | PASS |
| P13 | 미사용 정리 | 옛 미리보기·CSS 제거, 새 자산 참조 | landing-preview.tsx·notebook-producer-* 옛 선택자 참조 0건, 새 얼굴 사진 2장 사용 | 예 | PASS |

필수 PASS 11 / FAIL 0 / UNVERIFIED 0, 선택 UNVERIFIED 2. 검증률은 품질 확률이 아니다.

## 확정 문제와 조치

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정 / 최초 PR | 해결 시각 | 근거·조치·상태 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-05-producer-landing-redesign-F01 | P2·POLICY·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-05T09:37:22+09:00 / 이번 PR | 2026-11-05T09:41+09:00 | PDF 정리를 공고 지원 흐름 안에 섞어 표시. 강점·FAQ를 '심사함에 올리면 정리, 공고 없이도 사용'으로 바꾸고 탭 화면에서 PDF 문구 제거. FIXED |
| 2026-11-05-producer-landing-redesign-F02 | P2·POLICY·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-05T09:37:22+09:00 / 이번 PR | 2026-11-05T09:41+09:00 | 열람 권한을 공고 작성자로만 설명. 사이트 지원서는 공연 등록 공연사, PDF는 심사함 소유 계정으로 구분. FIXED |
| 2026-11-05-producer-landing-redesign-F03 | P2·FLOW·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-05T09:37:22+09:00 / 이번 PR | 2026-11-05T09:41+09:00 | 게시가 오픈채팅 알림 발송을 보장하는 것처럼 표현. 운영팀 공유로 바꾸고 '알림 보내기·발송됨' 제거, 테스트 추가. FIXED |
| 2026-11-05-producer-landing-redesign-F04 | P2·CODE·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-05T09:37:22+09:00 / 이번 PR | 2026-11-05T09:41+09:00 | 탭 패널 Tab 진입 불가·세로 방향 누락. tabIndex=0, aria-orientation=vertical 추가, 테스트 추가. FIXED |
| 2026-11-05-producer-landing-redesign-F05 | P2·CODE·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-05T09:37:22+09:00 / 이번 PR | 2026-11-05T09:41+09:00 | 포스터 자동 이동을 hover로만 멈춤. aria-pressed 정지 버튼 추가, 브라우저에서 정지 확인. FIXED |
| 2026-11-05-producer-landing-redesign-F06 | P3·CODE·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-05T09:37:22+09:00 / 이번 PR | 2026-11-05T09:41+09:00 | 설명 주석과 긴 컴포넌트. 기준일을 화면 표기 상수로 바꾸고 히어로 카드·탭 목록·심사 정보를 분리. FIXED |

해결 시각은 수정 후 테스트를 통과한 분 단위 시각이다.

## 검증 근거

- `npx vitest run src/components/landing`: 5개 파일 17개 테스트 통과.
- `npx eslint src/components/landing` 통과. `tsc` 오류는 이번 변경과 무관한 미추적 `src/app/design-preview`에서만 발생.
- MSW 개발 서버 1440px·375px에서 가로 넘침 0, 얼굴 사진 3장 로드, 포스터 정지 확인.
- 콘솔의 세션 확인 500 오류는 MSW 환경의 기존 현상이며 이 화면과 무관하다.

## 집계

발견 6 / 해결 6 / 미해결 0, P0 0 / P1 0 / P2 5 / P3 1, 미확인 2.
