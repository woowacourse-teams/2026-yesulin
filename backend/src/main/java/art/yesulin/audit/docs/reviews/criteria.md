# Audit 평가표 v1

공통 평가 절차는 [작업 평가 규칙](../../../../../../../../../docs/agent-review.md), 필수 의무는 [도메인 규칙](../AGENTS.md)을 따른다.
작업별로 아래 기준 중 적용할 항목과 이번 변경 전용 항목을 선택하고 필수 여부를 고정한다.
미적용은 N/A와 사유, 실행하지 않은 것은 UNVERIFIED다. 증거 수준은 정적 검토 / 테스트 / 로컬 실행 / Dev / Prod로 구분한다.

| ID | 기능 흐름·정책 | 실패 시나리오와 기대 결과 | 검증 방법 |
| --- | --- | --- | --- |
| A01 | 심사 생성·소유권 | 빈 배역 허용, 중복 배역 거부, 타인 접근 404 | AuditTest·AuditServiceTest, 권한 실제 요청 |
| A02 | 원본 접수 | 잘못된 타입/크기는 거부, 심사·지원서·원본 연결 소유권 보존 | PdfExtractionJobTest·PdfExtractionServiceTest |
| A03 | 추출·콜백 | 동일 콜백 한 번 반영, 다른 payload 409, 저장 실패 롤백 | PdfExtractionResultReceiverDatabaseTest·추출 전용 Python 테스트 |
| A04 | AI 획득·복구 | 중복 작업 없음, 전역 상한·간격, 임대 복구·늦은 응답 차단 | PdfAiQueueServiceDatabaseTest·PdfAiJobTest |
| A05 | 수동 작업 보호 | 자동 결과 도착 후 메모·판정·수동 배역 유지 | AuditServiceTest·AuditAiAnalyzerTest |
| A06 | 진행률·실패 | PDF/AI 상태 분리, 종료 합계 보존, AI 실패해도 원본 조회 | AuditProgressServiceDatabaseTest·실제 요청 |
| A07 | 환경·배포 | local Gemini/Dev·Prod Bedrock 분리, 실제 검증과 계획 구분 | YAML·빈 조건 정적 검토, 대상 환경 실제 실행 |
| A08 | 미사용 정리 | 사용 중인 진단/호환/옵션을 오삭제하지 않음, 죽은 참조/파일 제거 | 참조·DI·스크립트·ZIP 포함/제외 검사 |
| A09 | 문서 계층 | 공통→도메인 규칙, 기능 flows→기술 policies, 중복 정본·깨진 링크 없음 | 파일/Markdown 링크·내용 비교 |
| A10 | 평가·PR 집계 | 독립 1회, 문제 ID 중복 제외, 발견=해결+미해결, 미확인 별도 | 평가 기록과 PR 양식/공통 규칙 비교 |

## 추가 검증 조건

기본 독립 평가는 1회다. 런타임을 바꿀 때는 영향 받은 A01~A07의 실행 검증이 필요하다.
300건 처리량·메모리·모델 정확도를 주장할 때는 실제 표본·측정 환경·성공 기준을 먼저 추가한다.
현재 문서에 그 성능 수치나 무장애 확률은 없다. 대상 환경을 못 실행하면 해당 기준을 미확인으로 남긴다.
