# 공용 PDF 추출·AI

공연사의 Audit과 배우의 프로필 가져오기가 공유하는 기능이다. [도메인 규칙](AGENTS.md)을 먼저 읽는다.

| 기능 | 흐름 | 정책 |
| --- | --- | --- |
| 업로드·Lambda·콜백 | [PDF 처리](flows/pdf-extraction.md) | [저장·멱등·실패](policies/pdf-processing.md) |
| Spring AI·재시도·배우 결과 확정 | [AI 처리](flows/ai-enrichment.md) | [모델·상한](policies/ai-processing.md), [프로필 계약](policies/profile-contract.md) |

심사 자체의 배역·메모·판정은 [Audit](../../audit/docs/README.md)이 책임진다.
실행 설정은 [공통 로컬 문서](../../../../../../../../docs/local-development.md#pdf-심사-로컬-실행),
Lambda 패키징은 [워커 문서](../../../../../../../../ops/pdf-extraction-lambda/README.md)를 따른다.
