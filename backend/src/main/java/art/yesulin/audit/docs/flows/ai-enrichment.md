# 심사 AI 결과 반영

AuditExtractionService가 공용 PdfAiQueueService에 jobId·심사·배역 스냅샷으로 작업을 등록한다.
PENDING/RUNNING은 지원서 ENRICHING, 성공/레거시 완료는 READY, 실패·그 외 생략은 NEEDS_REVIEW다.
추출 실패는 FAILED이며 판정·메모와 독립이다. 업로드 확인은 EXTRACTING으로 전환하지만 이미 후처리한 상태를 되돌리지 않는다.

공용 AI 완료/실패 동기 이벤트에서 이름·배역·처리 상태를 갱신한다. 담당자의 수동 배역·메모·판정은 보존한다.
작업 획득·모델·lease·재시도는 [공용 AI 흐름](../../../pdfextraction/docs/flows/ai-enrichment.md)과
[AI 정책](../../../pdfextraction/docs/policies/ai-processing.md)을 따른다.
