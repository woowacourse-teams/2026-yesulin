# 원본 저장·콜백·진행률 정책

## 저장 경계와 메타데이터

- 원본은 S3, 원본/심사 소유권과 상태는 DB다. 실제 PDF는 signed GET URL로 뷰어에 전달한다.
- 심사 원본: `inputs/{reviewId}/{jobId}/source.pdf`, 추출 캐시·이미지: `results/{reviewId}/{jobId}/pdfium-v1/`.
- 현재 PDF만 허용한다. 파일명 NFC·255자·제어문자 금지·`.pdf`, 1B~25MiB, `application/pdf`다.
  completion에서 크기·형식·PDF 서명을 확인한다. 폴더 선택도 프론트에서 PDF만 파일별로 전송한다.
  UI 선택 상한 300개는 이번 검증 범위이며 서버가 300건 부하 안전성을 입증했다는 뜻이 아니다.
- 소유권과 타입 검증을 우회하는 임의 fileKey 등록은 허용하지 않는다. PUT은 조건부 서명으로 원본을 덮어쓰지 않는다.

## 멱등과 실패

- 추출 payload는 `pdf_extraction_payloads`에 JSON·SHA-256으로 한 번 저장한다.
  같은 jobId·같은 payload의 재전송은 새 이벤트 없이 성공하고 다른 payload는 409다.
- 이 SHA는 **콜백 동일성**이다. 원본 바이트 SHA와 구분하며 서로 다른 jobId의 같은 PDF 재등록은 현재 막지 않는다.
- Lambda가 저장한 원본 SHA는 추출 시 계산한다. 이미지/result.json은 재시도에 재사용하지만 모델 결과는 새로 만들지 않는다.
- 레거시 결과의 캐시 applicantInfo는 fingerprint가 맞을 때만 그대로 전달해 예전 digest를 보존한다.
  AI 실행 없이 과거 캐시만 호환한다. Spring은 AI 결과를 별도 `pdf_ai_jobs`에 저장한다.
- 콜백 저장·규칙 반영·AI 작업 생성은 한 트랜잭션이다. 리스너 실패도 롤백하여 재전송 가능하다.
- Lambda 이벤트는 중복될 수 있다. 콜백과 모델 호출 각각의 정확히 한 번 실행/과금은 보장하지 않는다.
- PDF 실패, AI 실패, 서버 반영 실패는 구분한다. S3 이벤트 재시도·함수 실패 목적지/알림의 실제 설정은 운영 확인 대상이다.
  callback 최종 유실 복구·담당자 재처리 API는 미완료이며 무한 복구를 주장하지 않는다.
- ACTOR_PROFILE은 목적별 소유권과 하루 제한을 적용하며 AI 종료 뒤 완료 시각을 확정한다. 닫기·24시간 정리 시 S3 객체·payload·AI 결과를 지운다.

## 진행률과 표시

- PDF: UPLOADING → QUEUED → COMPLETED/PARTIAL/FAILED. URL 만료 60초 뒤 미확인은 UPLOAD_EXPIRED,
  확인 후 10분을 넘겨 결과가 없으면 DELAYED다. DELAYED는 실패 확정이 아니다.
- `AuditProgress`는 DB만 집계한다. total = uploading + waiting + completed + partial + failed.
  waiting은 추출 대기와 AI PENDING/RUNNING을 포함한다. complete는 uploading=0, waiting=0이다.
  실패가 있어도 종료되면 true이며 담당자의 합불 완료와 무관하다.
- 심사 UI는 폴링한다. 별도 `/dev/pdf-extractions` 진단 화면은 기존 SSE 소비자라 알림 코드를 유지한다.
- 처리 토스트는 진행 중에는 닫히지 않고, 모든 업로드/추출/AI가 종료된 뒤 닫을 수 있다.
- `needsOcr`는 텍스트 부족 표시다. OCR을 수행하지 않는다. 이미지 후보는 휴리스틱이라 로고가 포함될 수 있다.

## 후속 과제

원본 중복 제외의 동시성/기존 해시 채우기/집계 정책, callback 최종 유실 복구, 영구 실패 수동 재처리,
25MiB 이상 PDF의 대체 처리, 300건 처리량·자원 측정은 별도로 결정·구현한다. 파일을 받는 상한과 모든 PDF를
성공적으로 해석할 수 있다는 약속을 혼동하지 않는다.
