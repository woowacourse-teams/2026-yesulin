# 심사 PDF 연결 흐름

AuditService.prepareUpload가 본인 심사를 확인하고 공용 PdfExtractionService로 원본 작업을 만든다.
같은 트랜잭션에서 AuditApplicant를 연결한다. 이후 [공용 PDF 흐름](../../../pdfextraction/docs/flows/pdf-extraction.md)을 따른다.
콜백의 PdfExtractionCompletedEvent를 AuditExtractionEventHandler가 동기로 받아 규칙·AI 작업을 연결한다.
자세한 저장·중복·오류 정책은 [공용 PDF 정책](../../../pdfextraction/docs/policies/pdf-processing.md)을 따른다.
