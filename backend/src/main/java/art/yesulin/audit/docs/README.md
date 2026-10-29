# Audit 문서

공연사가 PDF 지원서를 일괄 업로드하고 사진·정보로 심사하는 도메인이다.
도메인의 설명·문서 입구는 이 파일이며, 에이전트 안내는 [CLAUDE.md](CLAUDE.md)를 따른다.

공통 규칙 → [도메인 규칙](AGENTS.md) → 필요한 기능 흐름과 정책 순으로 읽는다.
HTTP 계약은 [백엔드 API](../../../../../../../docs/pdf-reviews.md)가 정본이다.

| 기능 | 흐름 | 기술·도메인 정책 |
| --- | --- | --- |
| 심사함·배역·지원자·판정 | [심사 관리](flows/audit-management.md) | [도메인 불변식](policies/domain.md), [규칙 기반 반영](policies/rule-based-analysis.md) |
| 원본 업로드·PDF 추출·콜백 | [PDF 처리](flows/pdf-extraction.md) | [공용 PDF 정책](../../pdfextraction/docs/policies/pdf-processing.md) |
| AI 보정·재시도·상태 조회 | [AI 처리](flows/ai-enrichment.md) | [공용 AI 정책](../../pdfextraction/docs/policies/ai-processing.md), [프로필 계약](../../pdfextraction/docs/policies/profile-contract.md) |
| 작업 평가 | [평가표 v1](reviews/criteria.md) | [공통 평가 규칙](../../../../../../../../docs/agent-review.md) |

- 로컬은 기존 `application-local.yml`의 `local` 프로필을 쓴다.
  실행 명령·개인 값은 [공통 로컬 문서](../../../../../../../../docs/local-development.md#pdf-심사-로컬-실행)를 따른다.
- QR URL 추출, 원본 중복 등록 방지, 지원자 삭제, 300건 자원 측정은 미완료다. 해당 정책의 후속 과제를 따른다.
