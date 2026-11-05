# 심사 입력 간소화·배우 이름·원본 링크/QR

작업 ID `2026-11-05-audit-compact-name-qr`, Audit v1. 로컬 변경만, PR/push/배포 보류.

| ID | 흐름·기대 결과 | 필수 | 결과 |
| --- | --- | --- | --- |
| U01 | 초기 제목은 비어 있고 이름 안내, 입력/초기화 저장 및 재조회, 파일명·판정 보호 | Y | PASS |
| U02 | 메모 신규/수정500자, 저장된 긴 메모 보존·변경 없이 판정 가능 | Y | PASS |
| U03 | 중복 집계/정상 저장 표시/resize 제거, 합격 연락처 진입은 합격 탭 | Y | PASS |
| U04 | PDF 원래 링크와 QR 클릭 영역은 확대·스크롤·회전에서 유지, 위험 URL 차단·자동 외부 요청 없음 | Y | PASS |
| U05 | QR 작업은 화면 근처 순차 처리·취소·실패 격리, 원본 표시를 막지 않음 | Y | PASS |
| U06 | 관련 테스트·실제 HTTP·PC/모바일·lint/build·분석·미사용 정리·독립 평가 | Y | PASS |

## 검증 근거

- 프론트34파일·228테스트 PASS. 빈 이름 자동 저장/초기화, 메모500/501 경계, QR 안전 URI/회전 좌표/화면 이탈 취소/검사 실패 격리/느린 QR의 표시 queue 비차단, prototype ImageData 픽셀 전송/Worker15초 종료, 수동 이름 일정 가져오기 회귀를 포함한다. lint·build PASS, 최종 타입 검사 PASS.
- 백엔드 build·Checkstyle PASS(246 suite·1477 tests, 실패/오류/skip0). 새 이름 기본값/공백 초기화, 메모500자 경계, 기존2000자 메모를 바꾸지 않은 판정 변경·짧게 수정 보호 확인. DB 컬럼을 축소하거나 기존 원문을 잘라내는 migration은 만들지 않았다.
- 실제 로컬 HTTP: 별도 H2+LocalStack, 이름 초기값 빈 문자열·저장/초기화·공백 초기화, null/256자400, 메모500자200/501자400(메모전용·메모+판정 두 API) 확인. 원본2건은 로컬 S3에만 재업로드했고 실제 AWS/AI/문자/메일/Slack을 호출하지 않았다.
- 실제 IAB 브라우저(PC888px/모바일390×844): `71255d3e`1페이지에서 QR 링크1개 검출, 대상은 기존 실험과 일치. 새 탭 http(s) anchor/noopener/noreferrer/no-referrer이며 대상 사이트로 자동 이동하지 않았다. zoom1.2 이후 left약0.65874/top0.78888/width0.08062 비율 유지. 모바일도 QR링크1개, body=viewport390px 가로overflow0. 빈 이름 placeholder·메모maxlength500/resize none·정상저장문구/중복집계/대기탭 연락처버튼 제거 확인.
- Worker와 WASM은 같은 출처에서 제공하고 인식 결과 URI/이름/메모/원본을 분석 이벤트로 보내지 않는다. 기존 성공 응답 이벤트 의미는 보존했다. 모든 QR 인식률·300건 자원·Safari/실기기 터치·외부 링크 도착 페이지 자체는 측정/확인하지 않았다.

## 독립 평가 및 문제

독립 평가1회를 진행했다. 상대 도구 연결이 없어 같은 종류의 별도 읽기 전용 평가자로 대체했다. 도중 사용량 제한으로 중단됐다가 같은 평가를 재개했다. 재귀·추가 전체 평가를 수행한 것은 아니다. 관련6파일·35테스트를 독립 실행해 모두 PASS했고 F01/F03 수정·F02 표적검증을 확인했다. 추가 확정 결함·새 미사용 파일/의존성은 없었다. 실제 QR·모바일·확대 확인은 구현자의 실행 근거로 구분한다. 필수 PASS6/FAIL0/UNVERIFIED0/N/A0은 이 로컬 범위의 판정이다.

발견3 = 해결3 + 미해결0, P0 0/P1 0/P2 3/P3 0.
PRECHECK1 / INDEPENDENT_REVIEW2 / POST_FIX_CHECK0 / EXTERNAL0 / REJECTED0. 최초 PR 모두 PENDING(사용자 PR 보류).

| ID | 심각도/유형/유입/경로 | 문제·조치·검증 | 상태 |
| --- | --- | --- | --- |
| 2026-11-05-audit-compact-name-qr-F01 | P2/FLOW/INTRODUCED/INDEPENDENT_REVIEW | QR CPU응답을 표시queue가 기다려 다음 PDF 표시 지연. 별도 scanQueue와 AbortSignal로 분리. 느린 QR 중 표시queue 실행 회귀 PASS | FIXED |
| 2026-11-05-audit-compact-name-qr-F02 | P2/CODE/INTRODUCED/PRECHECK | ImageData spread는 prototype의 data/width/height를 전달하지 못함. 명시 필드/transfer 전송으로 수정. prototype 회귀와 실제 QR 검출 PASS | FIXED |
| 2026-11-05-audit-compact-name-qr-F03 | P2/FLOW/INTRODUCED/INDEPENDENT_REVIEW | 수동 이름이 연락처 이후 일정 등록/복사에서 누락. title우선·기존applicantName fallback으로 맞춤. 수동 이름 일정 가져오기 회귀 PASS | FIXED |

## 미사용·호환

상단집계 전용 CSS 제거. 새 링크/Worker/decoder/scanQueue/helper는 공용 뷰어의 실제 소비자이며 실험 HTML/개인 문서/모델 결과를 패키징하지 않는다. ZXing WASM/라이선스는 predev/prebuild에서 설치 버전으로 복사하고 기존 public/pdfjs Git 제외 정책을 유지한다. 메모 컬럼2000·메모+판정 DTO2000은 이미 저장된 긴 메모를 그대로 판정할 소비자가 있어 유지하며 신규/변경 내용은 도메인500자 검사다. 기존제목API/원본명은 호환하며 title빈값 허용만 확장했다.

## 추가 전용 상태 이력

기록 이전 시각을 추정하지 않고 아래 기록에서 최초 확정·수정 확인을 정리한 시각을 사용한다.

| 사건 | 문제 ID | 종류 | 시각(+09:00) | 근거 / 최초 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-05-audit-compact-name-qr-F01 | CONFIRMED | 2026-11-05T17:52:18+09:00 | 위 실행·수정 근거 / PENDING |
| E02 | 2026-11-05-audit-compact-name-qr-F01 | FIXED | 2026-11-05T17:52:18+09:00 | 위 실행·수정 근거 / PENDING |
| E03 | 2026-11-05-audit-compact-name-qr-F02 | CONFIRMED | 2026-11-05T17:52:18+09:00 | 위 실행·수정 근거 / PENDING |
| E04 | 2026-11-05-audit-compact-name-qr-F02 | FIXED | 2026-11-05T17:52:18+09:00 | 위 실행·수정 근거 / PENDING |
| E05 | 2026-11-05-audit-compact-name-qr-F03 | CONFIRMED | 2026-11-05T17:52:18+09:00 | 위 실행·수정 근거 / PENDING |
| E06 | 2026-11-05-audit-compact-name-qr-F03 | FIXED | 2026-11-05T17:52:18+09:00 | 위 실행·수정 근거 / PENDING |

## 최초 PR 연결 (2026-11-05T18:00:02+09:00)

이 작업의 모든 문제 ID와 위 추가 전용 상태 이력은 [PR #533](https://github.com/woowacourse-teams/2026-yesulin/pull/533)에 최초 게시했다. 이전 PENDING 기록은 당시 이력을 보존하며 최초 기록 PR을 #533으로 연결한다. 발견·해결 시각은 위 사건 시각을 유지한다.
