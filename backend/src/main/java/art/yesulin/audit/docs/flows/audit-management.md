# 심사 관리 흐름

정책: [도메인](../policies/domain.md), [규칙 기반 반영](../policies/rule-based-analysis.md), [원본 처리](../../../pdfextraction/docs/policies/pdf-processing.md).

1. 활성 공연사가 `AuditService.create`로 제목과 `AuditRole` 0~50개를 가진 `Audit`을 만든다.
2. 배역이 없으면 API는 `roles: []`, UI는 자유 배역으로 표시한다. 단일 배역도 같은 목록을 사용한다.
3. 파일별 uploads API가 원본 `PdfExtractionJob`과 심사 항목 `AuditApplicant`를 같은 트랜잭션에 만든다.
   이 시점은 지원자 정보 추출 전이므로 이름·프로필이 비어 있어도 정상이다.
4. [PDF 추출](pdf-extraction.md) 결과는 규칙으로 즉시 반영되고 [AI 보정](ai-enrichment.md)이 별도로 이어진다.
5. 담당자는 사진·원본 PDF와 정보를 확인하고 메모, 배역 설정, 대기/합격/보류/불합격을 저장한다.
   AI는 합격 판단을 하지 않는다. 수동 배역과 메모·판정은 늦게 도착한 자동 결과가 덮어쓰지 않는다.
6. `AuditProgressService`는 본인 심사의 처리 상태를 집계한다. UI는 처리 중 폴링하고 종료 시 최신 목록을 읽는다.
   심사 전/후 판정 완료와 파일 처리 완료는 다른 개념이다.

실패: 소유권이 없거나 없는 심사는 동일한 404, 실패 PDF 항목은 유지한다. 일부 파일 실패가 다른 파일 심사를 막지 않는다.
같은 심사의 중복 원본은 내용 SHA로 기존 항목을 재사용한다. 기존 중복 항목은 임의 삭제하지 않는다.
후속: 제목·배역 수정/삭제, 지원자 삭제는 아직 제공하지 않는다.
