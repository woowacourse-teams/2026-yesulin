# 심사 PDF 연결 흐름

브라우저 업로드 워커가 원본 SHA-256을 계산하고 AuditService.prepareUpload가 본인 심사를 잠근다.
공용 PdfExtractionService.prepareReview가 같은 심사의 같은 SHA를 찾고 기존 작업을 재사용하거나 새 작업을 만든다.
새 작업에만 같은 트랜잭션에서 AuditApplicant를 연결한다. 이미 업로드된 중복은 전송을 생략하며
미확인/만료 작업은 같은 jobId로 이어 올린다. 이후 [공용 PDF 흐름](../../../pdfextraction/docs/flows/pdf-extraction.md)을 따른다.
콜백의 PdfExtractionCompletedEvent를 AuditExtractionEventHandler가 동기로 받아 규칙·AI 작업을 연결한다.
자세한 저장·중복·오류 정책은 [공용 PDF 정책](../../../pdfextraction/docs/policies/pdf-processing.md)을 따른다.

비PDF는 접수와 판정 상태를 유지한 채 별도 워커가 변환한다. 서버가 불변 미리보기의 SHA를 확정하면 워커가 같은 바이트를 공용 PDF 추출 경로에 게시한다.
원본 파일과 변환본 열람 URL은 소유 공연사의 상세 조회에서 발급한다. 변환 실패는 지원자의 처리 상태만 종료한다.
