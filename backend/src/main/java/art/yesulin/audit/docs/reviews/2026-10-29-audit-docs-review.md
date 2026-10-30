# 작업 평가 — 도메인 문서와 공통 평가 규칙

- 작업 ID: `2026-10-29-audit-docs-review`
- 평가일: 2026-10-29 (Asia/Seoul)
- 범위: 공통/도메인 규칙, 문서 재배치, PR 평가 양식, 미사용 Python factory·Bedrock adapter 제거.
- 평가표: [Audit v1](criteria.md), 필수 A08/A09/A10. 업무 런타임 변경이 없는 A01~A07은 N/A(7개).
- 작업자: Codex. Claude CLI 시도는 `ENETUNREACH`로 종료되어 평가 결과가 없었다.
  공통 대체 규칙에 따라 별도 Codex `audit_docs_evaluator`가 읽기 전용 독립 평가 **1회**를 완료했다.
- 기존 브랜치 전체 리팩터링·AWS 배포·모델 정확도·300건 성능을 이번 결과로 검증했다고 주장하지 않는다.
- PR: 아직 생성/갱신하지 않았다. 최초 기록 PR은 PENDING이며 다음 PR에 이 기록과 같은 문제 ID를 옮긴다.

## 평가와 수정 후 확인

| ID | 필수 | 독립 평가 당시 | 수정 후 표적 확인 | 근거 |
| --- | --- | --- | --- | --- |
| A08 | 예 | PASS | PASS | 제거한 configured_processor/BedrockModel 참조 0개, GeminiModel 소비자 유지, Python 40개 테스트 성공 |
| A09 | 예 | FAIL (F01) | PASS | 레이블 정책 복원, 흐름·정책·규칙 라우팅 확인, 대상 문서의 로컬 링크 존재·관련 anchor 확인 |
| A10 | 예 | FAIL (F02/F03) | PASS | 공통 규칙·PR 표에 발견 경로/고정 시각/최초 PR/상태 이력, 아래 사건·집계 등식 확인 |
| A01~A07 | 아니오 | N/A | N/A | 이번 작업은 업무 Java·UI·배포 변경 없음. 기능 전체 실행 검증을 대체하지 않음 |

독립 평가를 다시 실행하지 않았다. 오른쪽 열은 구현자가 수정 부분을 확인한 결과다.
최종 필수 항목: PASS 3 / FAIL 0 / UNVERIFIED 0 / N/A 0. 별도 비적용 7개.
필수 검증 범위는 3/3이며 무장애 확률이나 PDF/모델 정확도 수치가 아니다.

## 문제 목록

| 문제 ID | 심각도 | 유형 | 유입 | 발견 경로 | 최초 확정(+09:00) / 최초 PR | 상태·해결 시각 | 근거·조치·수정 후 검증 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-29-audit-docs-review-F01 | P2 | DOC | INTRODUCED | INDEPENDENT_REVIEW | 2026-10-29T19:51:22+09:00 / PENDING | FIXED / 2026-10-29T19:51:22+09:00 | 기존 backend/docs/pdf-reviews.md의 레이블 정책이 이관 중 누락. [규칙 기반 정책](../policies/rule-based-analysis.md)에 복원하고 AuditAnalyzer의 strong/weak 레이블·정확 일치·이름 집합 처리와 대조 |
| 2026-10-29-audit-docs-review-F02 | P2 | POLICY | INTRODUCED | INDEPENDENT_REVIEW | 2026-10-29T19:51:22+09:00 / PENDING | FIXED / 2026-10-29T19:51:22+09:00 | PR 생성/최종 갱신일만으로 기간별 발견·해결 재구성 불가. 공통 규칙과 PR 표에 고정 시각·최초 PR·추가 전용 사건 이력을 추가하고 해당 필드·이력 보존·기간 집계 규칙 확인 |
| 2026-10-29-audit-docs-review-F03 | P2 | POLICY | INTRODUCED | INDEPENDENT_REVIEW | 2026-10-29T19:51:22+09:00 / PENDING | FIXED / 2026-10-29T19:51:22+09:00 | 유입 필드만으로 사전점검과 독립 평가를 구분 불가. 발견 경로 네 종류와 경로별 집계를 공통 규칙·PR 표에 추가하고 각 필드 존재와 합계 확인 |

최초 확정 시각은 평가자가 보고한 문제를 이번 기록에 확정한 시각이다. PR이 생겨도 바꾸지 않는다.
이관/정리 전에 구현자가 찾은 옛 문구와 불필요 함수는 위 독립 평가 발견 3건에 추가 집계하지 않는다.

## 추가 전용 상태 이력

| 사건 ID | 문제 ID | 사건 | 발생 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-10-29-audit-docs-review-F01 | CONFIRMED | 2026-10-29T19:51:22+09:00 | 독립 평가: 기존 정책과 AuditAnalyzer 비교 / PR PENDING |
| E02 | 2026-10-29-audit-docs-review-F02 | CONFIRMED | 2026-10-29T19:51:22+09:00 | 독립 평가: 기간 집계 시점 이력 부재 / PR PENDING |
| E03 | 2026-10-29-audit-docs-review-F03 | CONFIRMED | 2026-10-29T19:51:22+09:00 | 독립 평가: 발견 경로 부재 / PR PENDING |
| E04 | 2026-10-29-audit-docs-review-F01 | FIXED | 2026-10-29T19:51:22+09:00 | 정책 복원·참조·링크 표적 확인 / PR PENDING |
| E05 | 2026-10-29-audit-docs-review-F02 | FIXED | 2026-10-29T19:51:22+09:00 | 고정 시각·추가 전용 이력 규칙·PR 필드 확인 / PR PENDING |
| E06 | 2026-10-29-audit-docs-review-F03 | FIXED | 2026-10-29T19:51:22+09:00 | 경로별 집계 규칙·PR 필드 확인 / PR PENDING |

PR 게시 시 기존 사건은 보존하고 PR 번호 연결을 덧붙인다. 과거 사건 시각을 PR 갱신일로 바꾸지 않는다.

## PR로 옮길 집계

- 독립 평가: 1회 완료 (상대 도구 연결 실패 후 별도 평가자 대체).
- 필수 PASS 3 / FAIL 0 / UNVERIFIED 0 / N/A 0. 범위 밖 비적용 A01~A07은 7개.
- 신규 확정: 발견 3 / 해결 3 / 미해결 0.
- 심각도: P0 0 / P1 0 / P2 3 / P3 0. 오탐 0.
- 최초 발견 경로: PRECHECK 0 / INDEPENDENT_REVIEW 3 / POST_FIX_CHECK 0 / EXTERNAL 0.
- 발견 3 = 해결 3 + 미해결 0 = 심각도 합계 3 = 경로 합계 3.
- PR 없는 작업이므로 아직 기간별 PR 집계 대상에는 포함하지 않는다.

## 미사용 점검과 유지 대상

| 대상 | 소비자·이유 | 제거 조건 |
| --- | --- | --- |
| AuditPdfEventsController/Notifications·use-extraction-events.ts | 독립 pdf-extraction-workbench가 SSE 사용. 심사 화면은 폴링 | 진단 화면 전환과 API 소비자 확인 후 |
| AuditWorkerController/ContextService·레거시 applicantInfo | 기존 워커 계약과 저장 digest 호환 | 모든 배포 환경·저장 결과의 레거시 의존 제거 확인 후 |
| SERVER 워커·Python 공유 추출기 | processor=SERVER 확장 옵션과 Lambda ZIP 빌드에서 사용 | 옵션 종료·공유 추출기 대체 시 |
| applicant_info.py/profile_info.py/GeminiModel | probe_profile_prompt.py와 application 테스트에서 사용, ZIP에서는 제외 | 비교 도구 이관 후 |

하위 레이어 README 5개를 도메인 docs로 이관했다. 미사용 Python configured_processor·BedrockModel과 관련 import를 제거했다.
참조 검색만으로 위 유지 대상을 삭제하지 않았다.

## 검증 근거와 한계

- 이번 실행: `PYTHONPATH=src python -m unittest discover -s tests/application -v` → 40개 성공.
- 이번 실행: `git diff --check` 성공, 문서 대상 로컬 링크 검사, 제거 심볼 참조 없음·Python AST에서 GeminiModel만 잔존 확인.
- 수정 후 정책 기준 대조: AuditAnalyzer의 STRONG_ROLE_LABELS/roleCandidates/matchRole/applicantName/startsCell.
- 직전 작업의 backend build·1151개 테스트와 가상 PDF의 LocalStack Lambda→Spring 콜백 성공은 이전 증거이며 새 실행 건수로 세지 않는다.
- 이번에는 ZIP 재빌드·HTTP 요청·Dev Spring Converse·Prod 역할·300건 부하를 실행하지 않았다.
  해당 검증은 업무 런타임 변경 범위에 포함될 때 적용한다. 정적 문서 평가의 PASS를 배포 성공으로 확대하지 않는다.

## PR 최초 게시 연결

2026-10-30T02:09:50+09:00: [PR #453](https://github.com/woowacourse-teams/2026-yesulin/pull/453)에 최초 게시했다.
이 기록의 최초 PR은 #453이다. 앞선 사건의 PENDING과 당시 시각·상태는 보존하며 이 연결을 적용한다.
