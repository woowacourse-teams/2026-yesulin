# 우형 전시회 시연을 위한 PDF 심사 화면 다듬기와 dev AI 정리 끄기

작업 ID `2026-11-18-audit-demo-polish`, Audit v1. dev에만 먼저 반영한다. API 계약과 DB는 그대로다.

| ID | 흐름·실패 조건·기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| S01 | 공연사 화면 문구가 가운뎃점으로 낱말을 잇지 않음(`지원서 접수 심사` 등) | 문자열 검색·테스트 | Y | PASS |
| S02 | 사이드바 지원서 접수 심사에 펼치기 버튼이 없고 접수 목록이 바로 보임 | 사이드바 테스트·로컬 화면 | Y | PASS |
| S03 | dev 프로필에서 AI 정리를 부르지 않고, 글자를 읽은 지원서는 정리 완료, 글자 없는 스캔본은 원본 확인 필요 | 단위 테스트·설정 검토 | Y | PASS |
| S04 | prod 설정과 동작은 바뀌지 않음 | 설정 검토 | Y | PASS |
| S05 | 한 명씩 보기의 배역 배정, 내부 메모, 판정 패널이 스크롤해도 화면 안에 고정 | 로컬 화면(1440x900, 375x812) 위치 측정 | Y | PASS |
| S06 | 카드와 표 위의 전체 선택, 선택 인원, 선택한 지원자 배역이 한 줄 | 로컬 화면 | Y | PASS |
| S07 | 카드가 파일 이름, 판정, 직접 적은 이름과 배역, 메모, 원본 심사 버튼을 한 카드 안에 정리 | 렌더 테스트·로컬 화면 | Y | PASS |
| S08 | 분석 이벤트 발생 지점과 의미 변화 없음 | 코드 검토(독립 평가) | Y | PASS |
| S09 | dev 배포 뒤 실제 업로드에서 AI 대기 없이 처리 완료, 실제 PDF가 보이는 화면에서 패널 고정 | dev 배포 후 확인 | Y | UNVERIFIED |

## 검증 근거 (2026-11-18)

- 프런트 관련 Vitest 34파일·205건 PASS, eslint PASS, `tsc --noEmit` PASS.
- 백엔드 `AuditExtractionServiceTest`·`AuditServiceTest`, checkstyle main/test PASS.
- 로컬 프런트를 dev API에 붙여 시연 계정으로 카드, 표, 한 명씩 보기를 확인했다. 로컬 주소에서는 S3가 원본 요청을 막아 PDF 본문은 dev 화면에서 따로 확인했다.
- 독립 평가 1회: 상대 도구를 연결할 수 없어 같은 종류의 별도 에이전트가 읽기 전용으로 검토하고 관련 테스트를 실행했다.

## 평가 결과

필수 PASS8 / FAIL0 / UNVERIFIED1 / N/A0.

발견11 = 해결10 + 미해결1. P0 0 / P1 0 / P2 4 / P3 7.
PRECHECK0 / INDEPENDENT_REVIEW11 / POST_FIX_CHECK0 / EXTERNAL0 / REJECTED0. 최초 PR은 모두 PENDING.

| 문제 ID | 심각도/유형/유입/경로 | 근거·조치·검증 | 상태 |
| --- | --- | --- | --- |
| 2026-11-18-audit-demo-polish-F01 | P2/CODE/INTRODUCED/INDEPENDENT_REVIEW | AI 꺼짐(DISABLED)이 글자 없는 스캔본보다 먼저 판정돼 스캔본도 정리 완료가 됨. 글자가 없으면 `NEEDS_REVIEW` 유지, 단위 테스트 추가 PASS | FIXED |
| 2026-11-18-audit-demo-polish-F02 | P2/DOC/INTRODUCED/INDEPENDENT_REVIEW | DISABLED→READY 매핑이 dev 전용처럼 적힘. AI가 꺼진 모든 환경에 적용되고 전시회 뒤에도 유지된다고 문서 수정 | FIXED |
| 2026-11-18-audit-demo-polish-F03 | P2/DOC/INTRODUCED/INDEPENDENT_REVIEW | 배우 PDF 프로필 가져오기도 같은 AI 대기열이라 dev에서 자동 채우기가 빠짐. 문서에 영향과 시연 제외 명시 | FIXED |
| 2026-11-18-audit-demo-polish-F04 | P2/DOC/INTRODUCED/INDEPENDENT_REVIEW | 좁은 화면 판정 버튼이 항상 고정되는 것처럼 적힘. 패널이 보이는 동안만 붙는다고 문서 수정 | FIXED |
| 2026-11-18-audit-demo-polish-F05 | P3/CODE/INTRODUCED/INDEPENDENT_REVIEW | 판정 패널에 세로 스크롤을 줘 배역 목록 드롭다운이 낮은 화면에서 패널 안에 잘릴 수 있음. 배역 2개 시연에서는 메모 영역 안에 들어가 그대로 둠 | OPEN |
| 2026-11-18-audit-demo-polish-F06 | P3/FLOW/EXISTING/INDEPENDENT_REVIEW | 대시보드 최근 작업, 무료 공연 목록, SNS 링크에 가운뎃점 문구가 남음. 쉼표나 '와'로 바꾸고 테스트 기대값 수정 PASS | FIXED |
| 2026-11-18-audit-demo-polish-F07 | P3/CODE/INTRODUCED/INDEPENDENT_REVIEW | 펼치기 버튼 제거 뒤 사이드바 항목의 children prop이 미사용. prop과 import 제거 | FIXED |
| 2026-11-18-audit-demo-polish-F08 | P3/CODE/INTRODUCED/INDEPENDENT_REVIEW | 카드의 쓰지 않는 relative 클래스, PDF 표시가 오류 색처럼 보임. 클래스 제거, 중립 색으로 변경 | FIXED |
| 2026-11-18-audit-demo-polish-F09 | P3/FLOW/INTRODUCED/INDEPENDENT_REVIEW | 전체화면 캡션의 구분자를 지워 '1 / 3 가람 합격'처럼 붙어 읽힘. 쉼표로 구분 | FIXED |
| 2026-11-18-audit-demo-polish-F10 | P3/TEST/INTRODUCED/INDEPENDENT_REVIEW | 펼치기 버튼 없는 접수 목록과 AI 꺼짐 빈 글자 테스트 없음. 사이드바 테스트와 백엔드 테스트 추가 PASS | FIXED |
| 2026-11-18-audit-demo-polish-F11 | P3/DOC/INTRODUCED/INDEPENDENT_REVIEW | 설정 주석이 '이 줄'만 지우라고 함. 주석과 enabled 줄을 함께 지운다고 수정. config 서브모듈 변경은 커밋에서 제외 | FIXED |

## 추가 전용 상태 이력

| 사건 | 문제 ID | 종류 | 시각(+09:00) | 근거 / 최초 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-18-audit-demo-polish-F01 | CONFIRMED | 2026-11-18T17:48:00+09:00 | 독립 평가 / PENDING |
| E02 | 2026-11-18-audit-demo-polish-F01 | FIXED | 2026-11-18T17:48:00+09:00 | 수정·검증 / PENDING |
| E03 | 2026-11-18-audit-demo-polish-F02 | CONFIRMED | 2026-11-18T17:48:00+09:00 | 독립 평가 / PENDING |
| E04 | 2026-11-18-audit-demo-polish-F02 | FIXED | 2026-11-18T17:48:00+09:00 | 수정·검증 / PENDING |
| E05 | 2026-11-18-audit-demo-polish-F03 | CONFIRMED | 2026-11-18T17:48:00+09:00 | 독립 평가 / PENDING |
| E06 | 2026-11-18-audit-demo-polish-F03 | FIXED | 2026-11-18T17:48:00+09:00 | 수정·검증 / PENDING |
| E07 | 2026-11-18-audit-demo-polish-F04 | CONFIRMED | 2026-11-18T17:48:00+09:00 | 독립 평가 / PENDING |
| E08 | 2026-11-18-audit-demo-polish-F04 | FIXED | 2026-11-18T17:48:00+09:00 | 수정·검증 / PENDING |
| E09 | 2026-11-18-audit-demo-polish-F05 | CONFIRMED | 2026-11-18T17:48:00+09:00 | 독립 평가 / PENDING |
| E10 | 2026-11-18-audit-demo-polish-F06 | CONFIRMED | 2026-11-18T17:48:00+09:00 | 독립 평가 / PENDING |
| E11 | 2026-11-18-audit-demo-polish-F06 | FIXED | 2026-11-18T17:48:00+09:00 | 수정·검증 / PENDING |
| E12 | 2026-11-18-audit-demo-polish-F07 | CONFIRMED | 2026-11-18T17:48:00+09:00 | 독립 평가 / PENDING |
| E13 | 2026-11-18-audit-demo-polish-F07 | FIXED | 2026-11-18T17:48:00+09:00 | 수정·검증 / PENDING |
| E14 | 2026-11-18-audit-demo-polish-F08 | CONFIRMED | 2026-11-18T17:48:00+09:00 | 독립 평가 / PENDING |
| E15 | 2026-11-18-audit-demo-polish-F08 | FIXED | 2026-11-18T17:48:00+09:00 | 수정·검증 / PENDING |
| E16 | 2026-11-18-audit-demo-polish-F09 | CONFIRMED | 2026-11-18T17:48:00+09:00 | 독립 평가 / PENDING |
| E17 | 2026-11-18-audit-demo-polish-F09 | FIXED | 2026-11-18T17:48:00+09:00 | 수정·검증 / PENDING |
| E18 | 2026-11-18-audit-demo-polish-F10 | CONFIRMED | 2026-11-18T17:48:00+09:00 | 독립 평가 / PENDING |
| E19 | 2026-11-18-audit-demo-polish-F10 | FIXED | 2026-11-18T17:48:00+09:00 | 수정·검증 / PENDING |
| E20 | 2026-11-18-audit-demo-polish-F11 | CONFIRMED | 2026-11-18T17:48:00+09:00 | 독립 평가 / PENDING |
| E21 | 2026-11-18-audit-demo-polish-F11 | FIXED | 2026-11-18T17:48:00+09:00 | 수정·검증 / PENDING |
