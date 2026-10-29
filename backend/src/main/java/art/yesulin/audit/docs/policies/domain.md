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

## 중복 등록 (후속 설계, 아직 미구현)

원본 접수와 지원자 등록 확정을 구분한다. 워커가 원본을 내려받으며 SHA-256을 계산하고, 같은 심사함의 확정된
해시와 비교해 중복이면 추출·AI 작업을 생략하는 방향이다. 파일명·크기는 동일성 근거로 쓰지 않는다.
동시 처리의 유일성, 과거 원본 해시 채우기, 중복 제외 건수·상태와 재시도 경계를 함께 구현해야 한다.
이미 등록된 항목은 판정·메모가 있으므로 자동 삭제하지 않는다. 지원자 삭제·실행 취소는 별도 기능이다.
