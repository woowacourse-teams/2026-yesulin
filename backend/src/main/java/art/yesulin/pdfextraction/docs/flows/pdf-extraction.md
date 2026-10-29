# PDF 업로드·추출

1. 소비 기능이 소유권과 목적을 확인하고 PdfExtractionJob을 만든다. Audit 업로드는 AuditApplicant도 같은 트랜잭션에서 만든다.
2. 파일별 presigned PUT을 발급한다. 브라우저가 S3에 직접 올린다. 원본 키는 inputs/, 이미지·캐시는 results/다.
3. S3 ObjectCreated가 Lambda를 비동기 실행한다. 브라우저 completion은 업로드 확인이며 Lambda를 호출하지 않는다.
   두 신호의 순서는 고정하지 않는다. completion 전 결과 도착도 수신한다.
4. Lambda의 PDFium이 텍스트·이미지를 추출하고 이미지/result.json을 S3에 저장한다. 모델을 호출하지 않는다.
5. 인증된 완료 API로 작업 ID·문자·이미지 키를 직접 POST한다. Spring은 payload를 저장하고 목적별 후처리와 AI 작업을 연결한다.
6. 일반 조회는 DB payload와 AI 결과를 조립한다. Spring이 S3 result.json을 다시 읽지 않는다.

PDF_REVIEW는 심사 규칙 반영과 AI enqueue, ACTOR_PROFILE은 심사 없이 공용 AI를 enqueue한다.
새 배우 작업은 AI 대기 동안 QUEUED이며 AI 종료 시 결과·완료 시각·일일 집계를 확정한다.
파일별 오류와 콜백 최종 유실은 구분한다. 무한 재시도·최종 유실 자동 복구를 보장하지 않는다.
정책: [저장·멱등](../policies/pdf-processing.md).
