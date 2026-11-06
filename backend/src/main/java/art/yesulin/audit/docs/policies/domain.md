# 심사(Audit) 도메인

## 책임

| 타입 | 책임 |
| --- | --- |
| `Audit` | 공연사 소유 심사함. 제목과 `AuditRole` 목록을 생성 시 확정한다. 이후 제목·배역은 바꾸지 않는다. |
| `AuditRole` | 심사함의 모집 배역(이름·순서). 심사함 안에서 이름이 겹치지 않는다. |
| `AuditApplicant` | 심사함 안의 지원서 한 건. PDF 작업과 1:1로 연결되고 지원자 이름·배역·일치 상태·메모·판정을 가진다. |

원본·추출·AI 작업은 [공용 PDF 도메인](../../../pdfextraction/docs/README.md)이 소유한다.

`AuditProgress`(집계 모델)는 `application`에 있고 도메인 상태를 DB에서 세기만 한다.

이름·배역 자동 반영의 레이블·정확 일치 규칙은 [규칙 기반 정책](rule-based-analysis.md)을 따른다.

## 상태 흐름

- 배역: `Audit` 생성 시 0~50개. 빈 배열이면 배역이 없는 자유 배역 심사다.
  배역이 없으면 `AuditAnalyzer`가 일치하는 배역을 찾지 못해 항상 `NEEDS_CHECK`가 되고 `roleId`는 null이다.
- 지원서 처리(`AuditApplicantStatus`): `UPLOADING` → `EXTRACTING` → `ENRICHING` → `READY`/`NEEDS_REVIEW`,
  추출 실패는 `FAILED`. 판정·배역 일치와 독립이다. 전이 근거는 [AI 흐름](../flows/ai-enrichment.md)를 따른다.
- 배역 일치(`AuditMatchStatus`): `WAITING` → `MATCHED`/`NEEDS_CHECK`. 담당자가 배역을 지정하면
  `roleManuallyAssigned`가 되어 이후 규칙·AI 분석이 배역과 근거를 덮어쓰지 않는다. 배역 해제(null)도 수동 지정으로 취급한다.
- 판정(`AuditDecision`): `PENDING`/`PASS`/`FAIL`/`HOLD`. 메모는 2000자 이하다.

## 남은 일

- 심사 제목·배역 수정, 심사 삭제와 업로드 후 배역 추가 경로는 없다.
- `CreateAuditRequest`는 배역 이름을 500자까지 받지만 도메인 한도는 100자라 101~500자는 도메인에서 거부된다. 한도 정렬이 필요하다.

## 중복 등록

브라우저가 원본 바이트의 SHA-256을 계산한다. 같은 심사·같은 SHA는 기존 항목과 PDF 작업을 재사용한다.
서버는 PDF 본문을 내려받거나 해석하지 않으며, S3가 서명된 체크섬과 실제 업로드 바이트를 검증한다.
파일명 변경은 새 원본이 아니고, 동명이어도 바이트가 달라지면 새 원본이다. 다른 심사는 별개다.
소유 심사 행을 READ_COMMITTED 트랜잭션에서 잠근 뒤 조회·등록하며 (review_id,source_sha256) 유일 인덱스가 있다.
완료/업로드 확인된 중복은 upload=null로 전송을 생략한다. 미확인/만료 작업은 기존 jobId와 원본 key로 이어 올린다.
신규 800건 상한은 중복 제외 뒤 서버에서 검사한다. 진행률에는 신규 항목만 추가하고, UI는 중복 제외 건수를 따로 표시한다.
업로드 성공 분석도 이미 업로드된 중복에는 새로 만들지 않는다.
기존 완료 결과의 sourceSha256은 migration으로 채우며 JSON을 한 행씩 읽는다. 기존 PDF를 다시 내려받지 않는다.
배포 전부터 원본 SHA가 없는 미완료 작업은 결과 도착 후 해시를 연결한다. 그 이전에는 내용 동일성을 알 수 없다.
이미 등록된 항목은 판정·메모가 있으므로 자동 삭제하지 않는다. 지원자 삭제·실행 취소는 별도 기능이다.
