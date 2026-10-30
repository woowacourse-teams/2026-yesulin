# Luna 전환과 Slack 재분석 평가표

- 작업 ID: `2026-10-30-pdfextraction-ai-slack-retry`, 평가표 v1, 관련 이슈 #467.
- 기존 모델 비교 기록은 `2026-10-30-luna-real-pdf-probe.md`다.
- 지원서 원문·응답·웹훅·Signing Secret은 평가 기록과 PR에 넣지 않는다.

| ID | 흐름 / 실패 조건 | 기대 결과와 검증 | 필수 |
| --- | --- | --- | --- |
| R01 | Luna 기본값 / 암묵적 추론 활성 | 실제 요청 옵션 none, temperature 생략, 기존 모델 설정 호환 확인 | 예 |
| R02 | 상태 표시 / 기술 용어 혼용 | 이미지 추출·지원자 분석 문구, lint와 화면 확인 | 예 |
| R03 | 실패 알림 / 롤백·일시 실패·중복 알림 | 최종 실패 커밋 후 메타데이터만 발송, Slack 장애는 작업에 영향 없음 | 예 |
| R04 | 링크 미리보기·무단 재분석 | GET 무변경, 세션·ACTIVE 역할·본인/운영자 권한·CSRF 검증 | 예 |
| R05 | 재분석 / 이중 클릭·완료·삭제·배우 작업 | 실패한 유효 심사 작업만 행 잠금 아래 재등록, 오래된 버튼 거부 | 예 |
| R06 | 재분석 상태 / 수동 판정 보호 | ENRICHING→READY/NEEDS_REVIEW, 수동 배역·메모·판정 보존 | 예 |
| R07 | 설정 / 비밀 유출·환경 혼선 | LOCAL·DEV 채널은 비밀 설정만 사용, prod 값 분리, SOPS·문서 일치 | 예 |
| R08 | 실제 Slack 버튼 / 배포 검증 | 지정 웹훅 발송·URL 버튼·인증 후 명시적 실행 확인 | 예 |

사용자 지시에 따라 Slack 앱의 직접 interaction 수신 대신 일반 URL 버튼으로 구현한다.
Signing Secret·Interactivity 설정·수신 엔드포인트는 추가하지 않는다.

## 검증 결과 (2026-10-30, Asia/Seoul)

- 독립 평가 1회 완료. 상대 평가 도구를 사용할 수 없어 별도 읽기 전용 에이전트로 평가했다.
- R01~R07 PASS, R08 UNVERIFIED. 필수 PASS 7 / FAIL 0 / UNVERIFIED 1 / N/A 0 (검증률 7/8).
- `./gradlew build --console=plain`: 성공. 재분석 도메인·애플리케이션·DB 동시 요청 및 롤백 검증 포함.
- 프론트 lint, PDF 심사 관련 테스트, 재분석 화면 테스트 성공. `npm run build -- --webpack` 성공.
  기본 Turbopack 빌드는 오류 출력 없이 멈춰 중단했으므로 통과로 기록하지 않는다. CI의 기본 빌드는 별도 확인한다.
- 임시 수동 servlet/SDK/Slack payload probe 12개 성공: anonymous 401, APPLICANT/대기 PRODUCER 403,
  CSRF 누락 403, 타인 404, 소유자/ADMIN 202, GET 405, 잘못된 본문 400,
  Luna none·Haiku disabled/temperature 생략, Slack URL payload 확인. 실제 모델·Slack 네트워크 요청과 구분한다.
- LOCAL·DEV 오류 채널 동일 설정, DEV Luna/none 암호화 설정과 config-version 일치 확인.
  PROD 설정 파일은 수정하지 않았고 PDF 추출 enabled=false임을 값 제한 조회로 확인했다.
- 미사용 파일·bean·이벤트·설정·의존성·문서 링크 점검 완료. 이전 Signing Secret/Interactivity 수신 구현은 제거했다.
  기존 모델 분기는 환경 변수로 되돌릴 수 있는 Bedrock 소비 경로라 유지한다.
- 실제 Slack 발송, dev 배포와 인증 후 재분석 실행은 R08의 미확인 범위다. main 병합 전에 해당 근거를 추가한다.
- 이슈 #467 생성·담당자 지정 완료. 프로젝트 #131 연결은 현재 GitHub 토큰의 read:project scope 부재로 미실행했다.

## 문제 현황

신규 확정 발견 2 / 해결 2 / 미해결 0, P0 0 / P1 0 / P2 1 / P3 1.
PRECHECK 0 / INDEPENDENT_REVIEW 2 / POST_FIX_CHECK 0 / EXTERNAL 0, 오탐 0.

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정 / 최초 PR | 해결 시각 | 근거·조치·검증 |
| --- | --- | --- | --- | --- | --- |
| 2026-10-30-pdfextraction-ai-slack-retry-F01 | P2/FLOW/INTRODUCED | INDEPENDENT_REVIEW | 2026-10-30T21:04:00+09:00 / #468 | 2026-10-30T21:04:57+09:00 | 공연사 로그인은 returnTo를 무시해 기존 링크를 잃었다. 로그인 새 탭과 기존 화면의 세션 재확인으로 수정. DOM 테스트에서 원래 링크 보존·조회만으로 POST 없음 확인. |
| 2026-10-30-pdfextraction-ai-slack-retry-F02 | P3/CODE/INTRODUCED | INDEPENDENT_REVIEW | 2026-10-30T21:04:57+09:00 / #468 | 2026-10-30T21:05:30+09:00 | `지원자 분석가` 조사 오탈자를 `지원자 분석이`로 수정. 소스 확인. |

## 추가 전용 상태 이력

| 사건 ID | 문제 ID | 종류 | 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-10-30-pdfextraction-ai-slack-retry-F01 | CONFIRMED | 2026-10-30T21:04:00+09:00 | 독립 검토의 LoginForm producer 목적지 확인 / #468 |
| E02 | 2026-10-30-pdfextraction-ai-slack-retry-F01 | FIXED | 2026-10-30T21:04:57+09:00 | 새 탭·세션 재확인 4개 화면 테스트 성공 / #468 |
| E03 | 2026-10-30-pdfextraction-ai-slack-retry-F02 | CONFIRMED | 2026-10-30T21:04:57+09:00 | 독립 검토의 표시 문구 확인 / #468 |
| E04 | 2026-10-30-pdfextraction-ai-slack-retry-F02 | FIXED | 2026-10-30T21:05:30+09:00 | 오탈자 수정 소스 확인 / #468 |


## 후속 검증 기록

- 2026-10-30T21:09:00+09:00: PR #468 게시. LOCAL 비밀 설정을 메모리에서 읽어 지정 채널로
  `[LOCAL][TEST]` URL 버튼 알림 1회 발송, HTTP 200/ok 확인. 실제 장애가 아님과 표시 확인용임을 본문에 명시했다.
  테스트 버튼은 존재하지 않는 합성 작업 ID이며 유효 실패 작업의 재분석 성공 근거로 사용하지 않는다.
- 수동 배역·메모·판정을 지정한 뒤 `restartAnalysis`와 AI 완료를 실행하는 application 테스트 추가 성공.
  프론트 로그인 새 탭/같은 링크 세션 재확인을 포함한 관련 3파일 9테스트와 lint 성공.
- 로컬 production 화면에서 로그인 새 탭·재확인 안내 렌더 확인. 로컬 API 서버를 연결하지 않았으므로
  세션 조회 오류가 표시되었고 실제 로그인 성공/재분석 완료로 기록하지 않는다.
