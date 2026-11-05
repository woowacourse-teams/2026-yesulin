# 원본 PDF 중심 심사 화면 전환

작업 ID: `2026-11-05-audit-original-viewer`, Audit 평가표 v1. Dev용 프론트 변경이며 배포는 별개다.

## 변경 전 평가표

| ID | 흐름·실패 조건·기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| V01 | 추출 사진·프로필 조회 없이 현재 지원자의 원본 PDF를 연다. 추출 실패도 원본 열람을 막지 않는다 | UI 테스트·로컬 | Y | PASS |
| V02 | 판정과 메모는 기존 API로 저장, 저장 실패 시 입력·현재 지원자를 유지한다 | UI 테스트 | Y | PASS |
| V03 | 다음/필터 이동은 저장하지 않는다. 미저장 메모 이동 보호 유지 | UI 테스트 | Y | PASS |
| V04 | 배역을 화면 내 드롭다운에서 즉시 저장, 실패 시 기존 값 유지·재시도 가능 | UI 테스트·로컬 | Y | PASS |
| V05 | 서명 URL 조회 실패·401·빠른 전환 시 다른 지원자 PDF가 섞이지 않는다 | 관련 회귀 테스트 | Y | PASS |
| V06 | 카드·표에 자동 추출 프로필을 요구하지 않으며 원본 심사로 연결된다 | UI 테스트·로컬 | Y | PASS |
| V07 | 분석 동의·개인정보 미전송·기존 저장 성공 지점과 집계를 보존 | 분석 회귀 테스트·정적 확인 | Y | PASS |
| V08 | lint·build·모바일/PC 표시·미사용 코드·문서·독립 평가 | 명령·평가 | Y | PASS |

## 범위

백엔드의 S3/Lambda/AI 파이프라인을 끄거나 바꾸지는 않는다. 기존 배우 프로필 소비자와 저장된 연락처 추출을 보존한다.
합격자만 연락처를 추출하도록 실행 시점을 변경하는 일은 후속 API/워커 변경이다. 일정 명단에서 번호를 확인·수정하는 경로는 유지한다.
QR 디코더는 별도 로컬 실험에 있고 이번 화면 전환에 자동 포함하지 않는다.

## 독립 평가

독립 평가 1회 완료. 다른 도구의 이번 세션 실행 경로가 없어 별도 평가 에이전트를 사용했다.
독립 평가 4파일·9테스트 PASS. 전체 관련 26파일·194테스트 PASS, lint/build PASS.
로컬 브라우저에서 합성 PDF 2건 업로드, PDF.js 원본 표시, 배역 선택 저장, 미저장 메모 이동 취소,
합격과 메모 저장·다음 지원자 자동 이동, 표 재조회로 저장값 유지까지 확인했다.
PC 기본 1280×720 및 모바일 390×844에서 확인했고 모바일 documentWidth=viewportWidth=390이었다.
401·A→B 전환 뒤 늦은 A 응답 무시를 실제 UI 단위 테스트로 확인했다.

기존 로컬 MySQL은 Flyway 불일치로 시작 실패했다. 기존 DB 이력·스키마를 수정하지 않았다.
local 프로필과 별도 인메모리 H2·LocalStack으로 API를 실행했다. AI/문자/외부 알림을 껐고 추출 워커는 없는 환경이다.
이 로컬 실행은 Lambda/AI 성공, Dev·Prod 배포, 실제 문자 전달을 검증한 근거가 아니다.

원본 주소는 아직 `includeResult=true`에 묶여 결과 payload가 동반될 수 있다. 별도 프로필 선조회만 제거했으며 원본 전용 API는 후속이다.
QR 실험을 운영 코드에 포함하지 않았다. 기존 배우 프로필·독립 추출 확인 경로는 현재 소비자로 유지한다.

최초 기록 PR: PENDING. 아래 시각은 과거 발견/수정 시각을 추정한 값이 아닌 이번 평가 기록의 확정·수정 확인 시각이다.

| 문제 | 심각도·유형·유입 | 발견 경로 | 원인·수정·검증 | 상태 |
| --- | --- | --- | --- | --- |
| F01 | P1/FLOW/INTRODUCED | INDEPENDENT_REVIEW | 배역 변경으로 필터 밖으로 이동할 때 미저장 메모 유실. requestNavigation 확인 적용, 이동 보호 UI 테스트 및 브라우저 확인 | FIXED |
| F02 | P2/FLOW/INTRODUCED | INDEPENDENT_REVIEW | 대기로 되돌리는 UI 누락. PENDING 저장 버튼 복구, 기존 PATCH 보존 | FIXED |
| F03 | P2/CODE/INTRODUCED | INDEPENDENT_REVIEW | 긴 배역 목록 키보드 선택행이 보이지 않음. active 변경 시 scrollIntoView(nearest), 드롭다운 회귀 및 모바일 조작 확인 | FIXED |
| F04 | P3/UNUSED/INTRODUCED | INDEPENDENT_REVIEW | 사진 UI 고립6파일·미사용 Context 옵션. 실제 진입 참조 재검색 후 삭제, lint/build/테스트 통과 | FIXED |
| F05 | P2/CODE/INTRODUCED | POST_FIX_CHECK | 배역 저장 후 ref의 이전 렌더 값으로 미기재 표시. render props에서 현재 배역 조회로 수정, 실패 후 재시도 테스트·실제 저장 확인 | FIXED |

문제 ID는 작업 ID + `-F01`~`-F05`다. 필수 PASS 8 / FAIL 0 / UNVERIFIED 0 / N/A 0 (프론트 변경 범위).
신규 발견 5 = 해결 5 + 미해결 0. P0 0 / P1 1 / P2 3 / P3 1.
PRECHECK 0 / INDEPENDENT_REVIEW 4 / POST_FIX_CHECK 1 / EXTERNAL 0 / REJECTED 0.

## 추가 전용 상태 이력

| 사건 ID | 문제 ID | 사건 | 시각(+09:00) | 근거 / 최초 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-05-audit-original-viewer-F01 | CONFIRMED | 2026-11-05T11:00:54+09:00 | 위 문제별 원인·수정 및 검증 / PENDING |
| E02 | 2026-11-05-audit-original-viewer-F01 | FIXED | 2026-11-05T11:00:54+09:00 | 위 문제별 원인·수정 및 검증 / PENDING |
| E03 | 2026-11-05-audit-original-viewer-F02 | CONFIRMED | 2026-11-05T11:00:54+09:00 | 위 문제별 원인·수정 및 검증 / PENDING |
| E04 | 2026-11-05-audit-original-viewer-F02 | FIXED | 2026-11-05T11:00:54+09:00 | 위 문제별 원인·수정 및 검증 / PENDING |
| E05 | 2026-11-05-audit-original-viewer-F03 | CONFIRMED | 2026-11-05T11:00:54+09:00 | 위 문제별 원인·수정 및 검증 / PENDING |
| E06 | 2026-11-05-audit-original-viewer-F03 | FIXED | 2026-11-05T11:00:54+09:00 | 위 문제별 원인·수정 및 검증 / PENDING |
| E07 | 2026-11-05-audit-original-viewer-F04 | CONFIRMED | 2026-11-05T11:00:54+09:00 | 위 문제별 원인·수정 및 검증 / PENDING |
| E08 | 2026-11-05-audit-original-viewer-F04 | FIXED | 2026-11-05T11:00:54+09:00 | 위 문제별 원인·수정 및 검증 / PENDING |
| E09 | 2026-11-05-audit-original-viewer-F05 | CONFIRMED | 2026-11-05T11:00:54+09:00 | 위 문제별 원인·수정 및 검증 / PENDING |
| E10 | 2026-11-05-audit-original-viewer-F05 | FIXED | 2026-11-05T11:00:54+09:00 | 위 문제별 원인·수정 및 검증 / PENDING |

GitHub 이슈 생성은 자동 승인 검토가 명시적 외부 등록 승인 부족을 이유로 거절해 게시하지 않았다. 로컬 브랜치에서 변경을 보존한다.

## Final integration check (2026-11-05)

Rebased onto origin/dev ca830f0d. Preserved the existing original-PDF click v1 contract: automatic PDF display emits no click event. New original-first detail views and activity use metric_version=2; the historical click ratio dashboard remains restricted to v1. Direct PDF opens from passed contacts retain the existing v1 event. Basic actions and API save success points are unchanged.

Final validation: 26 test files / 194 tests PASS (including analytics consent/PII, pending restoration with memo preservation, and keyboard active-option scrolling across 50 roles). Lint and production build PASS. PC/mobile browser verification used the same original-first UI before this integration; subsequent runtime edits only distinguish metric versions. No Dev/Prod deployment or real SMS delivery was performed.

## 최초 PR 연결 (2026-11-05T18:00:02+09:00)

이 작업의 모든 문제 ID와 위 추가 전용 상태 이력은 [PR #533](https://github.com/woowacourse-teams/2026-yesulin/pull/533)에 최초 게시했다. 이전 PENDING 기록은 당시 이력을 보존하며 최초 기록 PR을 #533으로 연결한다. 발견·해결 시각은 위 사건 시각을 유지한다.
