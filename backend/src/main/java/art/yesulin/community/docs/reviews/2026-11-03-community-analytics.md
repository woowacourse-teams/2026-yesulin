# 익명게시판 이용 지표 이벤트 평가

- 작업 ID: 2026-11-03-community-analytics
- 평가표 버전: 1
- 관련 이슈: [#502](https://github.com/woowacourse-teams/2026-yesulin/issues/502)
- 목적: 기존 PostHog 제품 지표 경로에 익명게시판 이용 이벤트를 추가하되 익명 글과 계정이 연결되지 않게 한다.
- 독립 평가: 1회 완료. 같은 환경의 별도 읽기 전용 평가자를 사용했다. 확정 발견 3건(P3) 모두 해결.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| A01 | 작성·댓글·좋아요·신고 성공/실패 | 성공한 요청 뒤에만 기록, 글·댓글 수정은 제외 | 코드 열람(호출 위치가 await 뒤, 실패 시 run이 중단) | 예 | PASS |
| A02 | 재조회·더 보기·StrictMode·재시도 | 목록·글 조회는 화면 진입마다 한 번 | `useTrackOnce` 훅 테스트·코드 열람 | 예 | PASS |
| A03 | 식별자·내용 유출 | 글·댓글 번호, 제목·본문, 익명 번호, 신고 사유 미전송 | 이벤트 테스트·허용 키 제거 테스트·전송 직전 주소 제거 확인 | 예 | PASS |
| A04 | 작성 포기 | 내용을 쓰고 저장하지 않고 떠날 때만 한 번, 저장 성공·수정·첫 마운트 제외 | `useAbandonTracking` 훅 테스트 | 예 | PASS |
| A05 | 분석 끄기·내부·테스트 | 기존 `trackProductEvent` 규칙 상속. 대상 식별자가 없어 테스트 글은 내부 표시로만 제외 | 코드 열람·문서 명시 | 예 | PASS |
| A06 | 대시보드·문서 | 운영 `05 익명게시판` 추가, 개발은 점검 화면만 유지, 문서·방문 분석 안내 일치 | setup dry-run(운영·개발) | 예 | PASS |
| A07 | 테스트·정리 | 훅·이벤트 테스트, tsc·lint, 미사용 코드 없음 | vitest·tsc·eslint | 예 | PASS |
| A08 | 실제 PostHog 수신·대시보드 생성 | 키가 설정된 환경에서 수신 확인 | 로컬에 PostHog 키 없음 | 아니오 | UNVERIFIED |

## 문제와 상태 이력

| 문제 ID | 심각도 | 유형 | 유입 | 발견 경로 | 내용 | 조치 | 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-03-community-analytics-F01 | P3 | TEST | INTRODUCED | INDEPENDENT_REVIEW | 조회 한 번·작성 포기 훅 테스트 없음 | 훅 테스트 4개 추가 | FIXED |
| 2026-11-03-community-analytics-F02 | P3 | FLOW | INTRODUCED | INDEPENDENT_REVIEW | 오래된 목록에서 이미 누른 좋아요를 다시 누르면 상태 변화 없이 좋아요가 집계됨 | 서버 상태가 바뀐 경우만 기록 | FIXED |
| 2026-11-03-community-analytics-F03 | P3 | DOC | INTRODUCED | INDEPENDENT_REVIEW | 테스트 글을 `test_object`로 제외할 수 없다는 점이 문서에 없음 | 내부 표시로만 제외함을 명시 | FIXED |

F01~F03은 2026-11-03T19:05:00+09:00에 확정, 19:15:00에 해결했다. 최초 기록 PR은 #502를 닫는 PR이다.

## 검증 근거

- 관련 15파일 83개 테스트 통과, tsc·eslint 통과.
- `POSTHOG_ENVIRONMENT=production node scripts/posthog/setup.mjs --dry-run`: 대시보드 5개, `05 익명게시판` 인사이트 4개. 개발 환경은 점검 화면 1개만 생성.
- 로컬 브라우저에서 목록·작성 화면 진입 시 오류 없음. PostHog 키가 없어 실제 수신은 확인하지 못했다(A08).

## 평가 결과

- 확정 신규 발견 3 / 해결 3 / 미해결 0; P0 0 / P1 0 / P2 0 / P3 3.
- 필수 PASS 7 / FAIL 0 / UNVERIFIED 0, 비필수 UNVERIFIED 1(A08). 범위 검증률 7/7.
- 운영 배포 후 개발 사이트에서 내부 브라우저 표시를 켜고 이벤트 수신을 확인한 뒤 `setup.mjs`로 대시보드를 적용한다.
