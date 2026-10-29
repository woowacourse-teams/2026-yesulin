# 작업 평가 — Lambda 단일 추출 경로와 최신 dev 통합

작업 ID: `2026-10-30-audit-lambda-only`. 사용자 지적 이후 PR/push를 보류하고 독립 judge에게 삭제·유지 판단을 위임했다.
이전 평가의 ‘소비자/테스트가 있으므로 SERVER/옛 AI probe 유지’는 승인 기능에 필요한가를 평가하지 못한 오판이었다.
과거 2026-10-29 평가 기록은 덮어쓰지 않고 이 기록으로 현재 판단을 정정한다.

## 평가표와 최종 로컬 결과

| ID | 필수 | 판단·검증 기준 | 결과·근거 |
| --- | --- | --- | --- |
| L01 | 예 | 승인 흐름 밖 SERVER/옛 AI/review-context 제거 | PASS — judge 정적 확인, 코드·설정·리소스 제거 |
| L02 | 예 | Lambda 독립 패키징·추출·캐시 콜백 재시도 | PASS — Python 21개, ARM64 ZIP 재빌드·포함 검사 |
| L03 | 예 | 공용 PDF 목적/권한/배우 일일·삭제·사진 계약 보존 | PASS — actor 흐름·동시성 테스트, judge 검토 |
| L04 | 예 | callback 원자성·동일 digest·AI 복구·수동 심사 보호 | PASS — 관련 154개 및 전체 Java 테스트 |
| L05 | 예 | 프론트 다중/폴더·보류·빈 배역·알림·분석 계약 | PASS — 테스트 600개·lint·webpack build |
| L06 | 예 | migration 중복/역순 없음, 기존 스키마 업그레이드 | PASS — 순서 검사·격리 H2 dev→current 업그레이드 |
| L07 | 예 | 산출물·bytecode 미포함, 미사용 제거·문서 링크 | PASS — 최종 staged 파일 검사·active 문서 23개 링크 |
| L08 | 예 | 독립 judge·문제/해결 집계·PR 기록 준비 | PASS — 정리 후 표적 확인 및 아래 고정 ID·사건·집계 |

실제 Dev Spring Converse·Dev MySQL 배포·Prod·300건 부하는 위 로컬 평가 범위에 포함하지 않으며 별도 미확인이다.

삭제 판단은 별도 Codex judge가 수행했다. Claude는 앞선 ENETUNREACH 실패로 대체 규칙을 적용했다.
최초 판단은 실행 검증 PASS가 아니다. 실제 제거 후 judge에게 판정표 대비 표적 확인을 요청한다.

## 최초 문제 목록 (아래 해결 사건으로 상태 갱신)

- F01: 승인 흐름 밖 SERVER 워커·설정·리소스·자기 테스트와 옛 Lambda AI/probe 유지. P2/UNUSED/INTRODUCED, EXTERNAL(사용자 지적).
- F02: 공용 PDF까지 Audit에 흡수하면 최신 dev 배우 목적·소유권·삭제·사진 계약 회귀. P1/CODE/INTRODUCED, INDEPENDENT_REVIEW.
- F03: actor에 AuditApplicant가 없어 Spring AI enqueue 누락. P1/FLOW/INTRODUCED, INDEPENDENT_REVIEW.
- F04: 최신 dev와 새 migration 세 버전 충돌 및 구 AI migration 역순. P2/CODE/INTRODUCED, INDEPENDENT_REVIEW.

최초 기록은 PR 생성 전이다. 최종 상태와 게시용 집계는 아래 추가 기록으로 갱신한다.

## 정리 후 독립 표적 확인 (2026-10-30)

같은 독립 judge가 최초 삭제 판정 대비 수정 부분을 읽기 전용으로 확인했다. 재귀·추가 전체 평가는 하지 않았다.
SERVER/옛 Python AI/review-context 제거, ops 독립 패키징, 공용 PDF 경계, 배우 AI 대기·최종화·quota·close/TTL,
기존 SSE·legacy digest 호환, CloudFront와 Bedrock 의존성 공존, migration 순서, docs 라우팅은 정적으로 PASS다.
판정 당시 남은 없는 테스트명 `PdfFileMetadataTest`는 실제 `PdfExtractionJobTest`로 수정하고 파일 존재를 확인했다.
전체 실행·배포·모델 호출은 이 정적 판정과 별도로 검증한다.

사용자 추가 요청으로 도메인 AGENTS도 docs로 모았다. 공통 AGENTS → 공통 문서 라우터 → 도메인 docs/README →
docs/AGENTS → 기능 flows/policies를 명시적으로 읽는다. docs의 AGENTS가 코드 범위에 자동 적용된다고 가정하지 않는다.
2026-10-29의 루트 AGENTS 유지 기록은 당시 판단이며 이번 요청으로 대체했다. 과거 사건은 수정하지 않는다.

## 추가 실행 점검 발견

- F05: 신규 sourceFileKey 호출을 actor 동시 요청 테스트의 저장소 mock이 제공하지 않아 첫 요청이 종료됨.
  P2/TEST/INTRODUCED, POST_FIX_CHECK. 기존 FakePdfExtractionStorage에 위임하는 stub을 추가했다.
  동시성 assertion·latch·timeout과 업무 코드는 변경하지 않았고 전체 테스트 재실행으로 확인한다.
- F06: 최신 dev의 심사 타이머가 board.role.id를 읽는데 기존 키보드 테스트의 context fixture에 board가 없음.
  P2/TEST/INTRODUCED, POST_FIX_CHECK. 실제 context 형식에 맞춰 fixture만 보강했고 해당 테스트 1개 재실행 PASS.
- F07: 평가표가 없는 PdfFileMetadataTest를 참조함.
  P3/DOC/INTRODUCED, INDEPENDENT_REVIEW. 실제 PdfExtractionJobTest로 수정하고 경로 존재 확인 PASS.

## 실행 근거 (구현자)

- 공용 PDF/Audit/배우 프로필 관련 Java 154개 + 컴파일·Checkstyle 통과 (구현 에이전트 실행).
- Lambda Python 추출·이미지·캐시·콜백·legacy fingerprint 21개 통과.
- ARM64 ZIP 재빌드 성공. `application/extraction.py`·native PDFium 포함, 옛 AI 모듈·bytecode 없음.
  SHA-256 base64 `wFAVEj1c1ZaYGM/rgWbqqU/jQsO2potXsg2cPV1JHh0=`: 이전 Dev 배포본과 동일.
- 별도 H2 MySQL 모드에서 최신 origin/dev의 기존 97개 migration 적용 후 기존 심사 지원서 4개를 넣고
  신규 3개 migration 적용 PASS. 메모·HOLD 보존, 처리 상태 backfill, 파일 메타데이터 기본값, nullable AI review_id 확인.
  기존 로컬 DB나 Dev DB는 수정하지 않았다. 실제 Dev MySQL 적용 검증은 배포 후 별개다.
- active 문서 23개 로컬 링크와 양 도메인 docs/AGENTS·CLAUDE 참조 확인 PASS.
- frontend webpack 빌드 PASS. F06 수정 후 전체 600/600·lint PASS.
- F05 수정 후 전체 backend build PASS. Java 1,346개 / 228 suites, 실패·오류·skip 0.
  새 Dev Spring Converse·Prod·300건 성능은 미확인.

## 최종 상태와 게시용 집계

기록 확정: 2026-10-30T02:07:14+09:00. 문제 ID 접두사는 `2026-10-30-audit-lambda-only`다.
F01~F04의 최초 발견·확정 시각은 앞선 작업에서 보존하지 못했다. 이를 현재 시각으로 꾸미지 않는다.
아래 CONFIRMED는 이번 평가 기록 확정 사건이며 과거 최초 발견 시각의 대체값이 아니다.
이 4건의 최초 시각 기반 기간 집계는 보류하고 PR별 고유 문제 건수에는 포함한다.

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 상태 | 수정 후 근거 |
| --- | --- | --- | --- | --- |
| F01 | P2/UNUSED/INTRODUCED | EXTERNAL | FIXED | SERVER·옛 AI/probe 제거, judge 확인 |
| F02 | P1/CODE/INTRODUCED | INDEPENDENT_REVIEW | FIXED | 공용 PDF 경계 복원·배우 계약 테스트 |
| F03 | P1/FLOW/INTRODUCED | INDEPENDENT_REVIEW | FIXED | actor AI enqueue·최종화·삭제·quota 테스트 |
| F04 | P2/CODE/INTRODUCED | INDEPENDENT_REVIEW | FIXED | migration 순서·기존 dev 스키마 업그레이드 |
| F05 | P2/TEST/INTRODUCED | POST_FIX_CHECK | FIXED | 동시성 테스트 포함 전체 1,346개 PASS |
| F06 | P2/TEST/INTRODUCED | POST_FIX_CHECK | FIXED | 키보드 테스트 포함 전체 600개 PASS |
| F07 | P3/DOC/INTRODUCED | INDEPENDENT_REVIEW | FIXED | 실제 테스트명과 문서 링크 확인 |

필수 PASS 8 / FAIL 0 / UNVERIFIED 0 / N/A 0 (로컬 범위).
신규 확정 발견 7 / 해결 7 / 미해결 0. P0 0 / P1 2 / P2 4 / P3 1. 오탐 0.
PRECHECK 0 / INDEPENDENT_REVIEW 4 / POST_FIX_CHECK 2 / EXTERNAL 1.
별도 배포 미확인: Dev Spring Converse·실제 MySQL 배포·Prod 역할/함수·300건 부하.

### 추가 전용 상태 이력

| 사건 ID | 문제 ID | 사건 | 기록 확정 시각(+09:00) | 근거·최초 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-10-30-audit-lambda-only-F01 | CONFIRMED | 2026-10-30T02:07:14+09:00 | EXTERNAL; F01~F04 최초 시각 미보존 / PR PENDING |
| E02 | 2026-10-30-audit-lambda-only-F01 | FIXED | 2026-10-30T02:07:14+09:00 | SERVER·옛 AI/probe 제거, judge 확인 / PR PENDING |
| E03 | 2026-10-30-audit-lambda-only-F02 | CONFIRMED | 2026-10-30T02:07:14+09:00 | INDEPENDENT_REVIEW; F01~F04 최초 시각 미보존 / PR PENDING |
| E04 | 2026-10-30-audit-lambda-only-F02 | FIXED | 2026-10-30T02:07:14+09:00 | 공용 PDF 경계 복원·배우 계약 테스트 / PR PENDING |
| E05 | 2026-10-30-audit-lambda-only-F03 | CONFIRMED | 2026-10-30T02:07:14+09:00 | INDEPENDENT_REVIEW; F01~F04 최초 시각 미보존 / PR PENDING |
| E06 | 2026-10-30-audit-lambda-only-F03 | FIXED | 2026-10-30T02:07:14+09:00 | actor AI enqueue·최종화·삭제·quota 테스트 / PR PENDING |
| E07 | 2026-10-30-audit-lambda-only-F04 | CONFIRMED | 2026-10-30T02:07:14+09:00 | INDEPENDENT_REVIEW; F01~F04 최초 시각 미보존 / PR PENDING |
| E08 | 2026-10-30-audit-lambda-only-F04 | FIXED | 2026-10-30T02:07:14+09:00 | migration 순서·기존 dev 스키마 업그레이드 / PR PENDING |
| E09 | 2026-10-30-audit-lambda-only-F05 | CONFIRMED | 2026-10-30T02:07:14+09:00 | POST_FIX_CHECK; F01~F04 최초 시각 미보존 / PR PENDING |
| E10 | 2026-10-30-audit-lambda-only-F05 | FIXED | 2026-10-30T02:07:14+09:00 | 동시성 테스트 포함 전체 1,346개 PASS / PR PENDING |
| E11 | 2026-10-30-audit-lambda-only-F06 | CONFIRMED | 2026-10-30T02:07:14+09:00 | POST_FIX_CHECK; F01~F04 최초 시각 미보존 / PR PENDING |
| E12 | 2026-10-30-audit-lambda-only-F06 | FIXED | 2026-10-30T02:07:14+09:00 | 키보드 테스트 포함 전체 600개 PASS / PR PENDING |
| E13 | 2026-10-30-audit-lambda-only-F07 | CONFIRMED | 2026-10-30T02:07:14+09:00 | INDEPENDENT_REVIEW; F01~F04 최초 시각 미보존 / PR PENDING |
| E14 | 2026-10-30-audit-lambda-only-F07 | FIXED | 2026-10-30T02:07:14+09:00 | 실제 테스트명과 문서 링크 확인 / PR PENDING |
