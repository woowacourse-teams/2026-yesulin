# 프로필·레거시 콜백 정책

## 레거시 applicantInfo

기존 완료 POST의 `result.applicantInfo` 형식은 아래와 같다. 이 필드가 없는 이전 워커의 콜백은 기존 규칙으로 처리한다.
명시적 null이나 잘못된 객체는 `400 INVALID_PDF_EXTRACTION_RESULT`다. 상태·타입·길이·UUID·알 수 없는 필드를 검증한다.

```json
{
  "version": "applicant-info-v1",
  "status": "COMPLETED",
  "provider": "gemini",
  "model": "gemini-3.5-flash-lite",
  "applicantName": "가상배우",
  "applicantNameEvidence": "성명: 가상배우",
  "roleId": "00000000-0000-4000-8000-000000000001",
  "roleEvidence": "강하루역에 지원합니다.",
  "reason": ""
}
```

- 상태는 `COMPLETED`, `FAILED`, `SKIPPED`다. 이름·근거·배역은 null일 수 있다. 이름은 100자, 근거는 각 500자,
  모델은 150자 이하다. 실패·생략 상태에는 제안 값이 없어야 한다.
- `COMPLETED`의 reason은 빈 문자열이다. `FAILED`는 `PROVIDER_ERROR` 또는 `INVALID_MODEL_OUTPUT`, `SKIPPED`는
  `NO_TEXT`, `NO_REVIEW`, `TEXT_LIMIT_EXCEEDED`다.
- 서버는 배역 ID가 해당 심사에 속하는지 확인한다. 이름·배역의 근거는 NFC·공백 정규화 후 원문에 실제로 포함돼야 하며,
  이름 자체도 이름 근거에 포함돼야 한다. 검증되지 않은 값은 채택하지 않고 이유를 남긴다. 배역을 확정하지 못하면
  `NEEDS_CHECK`다. 담당자가 원문을 함께 확인한다.
- 기존 Lambda의 AI 결과는 콜백 payload digest에 계속 포함한다. `COMPLETED`인 레거시 결과가 있으면
  새 AI 작업은 `SKIPPED/LEGACY_COMPLETED`여서 모델을 다시 호출하지 않는다. 기존 AI 캐시 수신 호환만 유지하며 모델 문맥 조회 엔드포인트는 제거했다.
- Spring AI 결과는 `pdf_ai_jobs.result_json`에 별도로 저장하고 조회 시 기존 `result.applicantInfo`에 조립한다.
  원래 `pdf_extraction_payloads`와 digest는 수정하지 않는다. 프로필의 경력은 원문 순서 최대 5건이며 나이를 계산하지 않는다.
- AI가 모르는 이름·배역은 기존 규칙 값을 지우지 않는다. 담당자가 지정한 배역과 메모·결정은 유지한다.
- AI 호출 중에는 Spring 트랜잭션·DB 행 잠금을 잡지 않는다. AI 결과 저장과 심사 반영은 같은 트랜잭션이다.

## 프로필 계약

새 워커는 `applicant-info-v2`를 사용한다. v1 payload와 기존 심사 기록은 계속 읽으며 자동 재추출하지 않는다.
v2는 기존 이름·배역·근거 필드에 `profile`을 추가한다. 프로필은 없으면 null이고, 있으면 다음 구조다.

```json
{
  "birthDate": {"value": "1998.07.04", "evidence": "생년월일: 1998.07.04"},
  "age": {"value": null, "evidence": null},
  "height": {"value": "165cm", "evidence": "키: 165cm"},
  "education": {"value": null, "evidence": null},
  "careers": [{
    "title": "가상극", "venue": null, "part": null, "genre": "연극",
    "period": "25.08 ~ 12", "company": null,
    "evidence": "연극 가상극 25.08 ~ 12"
  }]
}
```

- 사실 value와 경력 각 값은 300자, 근거는 1000자 이하이고 값은 근거의 부분 문자열이어야 한다.
  근거는 NFC·공백 정규화 후 연속된 원문 구절이어야 한다. 새 워커의 경력 전사는 원문 순서 최대 5개이며 작품명은 필수다.
  백엔드는 기존 v2 저장 결과와의 호환을 위해 과거 상한인 50개까지 수신할 수 있다.
  null 사실의 근거도 null이다. 제공하지 않은 학교·전공·날짜를 추정하지 않는다.
- birthDate·age·height·education은 원문 문자열이다. 워커는 원문의 날짜/단위를 수정하지 않는다.
  화면에서 완전한 생년월일만 만나이로 계산하고, 직접 기재된 나이는 '지원서 기재'로 구분한다.
- 실패·생략 상태나 v1에는 profile 객체를 넣을 수 없다. 워커와 완료 API가 형식·근거를 검증한다.
  프롬프트가 예시·관람작·안내문 제외를 요구하지만, 근거 문자열 검증 자체가 의미 정확도를 보장하지는 않는다.
- 사진은 모델이 분류하지 않는다. 워커의 크기·종횡비·페이지 점유율 규칙으로
  `CANDIDATE/OTHER/UNCERTAIN`을 부여하고 이전 결과의 `UNCLASSIFIED`도 허용한다.
  자동 갤러리는 CANDIDATE만 쓴다. 후보가 없으면 '사진을 자동으로 확인하지 못했습니다'와 원문 버튼을 보인다.
  작은 프로필 사진이 제외되거나 큰 로고가 후보에 남을 수 있으며 얼굴 검출/OCR은 하지 않는다.
- 심사 화면은 합격·보류·불합격을 제공하고, 아직 판단하지 않은 상태는 PENDING으로 유지한다.
  보류는 기존 HOLD 값으로 사유 입력 없이 저장한다. API와 메모 계약은 그대로다.
- 배역 변경 요청은 1~300개의 중복 없는 항목을 받으며 심사 소유권·항목 소속·등록 배역을 검증한다.
  UUID 순서로 행을 잠가 한 트랜잭션에서 변경한다. null은 배역 연결 해제다.
  수동 배역 선택은 `role_manually_assigned`로 보존하고 지연된 추출은 이름만 갱신한다. 메모·결정을 바꾸지 않는다.
- 배포 시 `V20261025120000__pdf_review_manual_role.sql`을 적용하고, v2 워커보다 v2를 수용하는 API를 먼저 배포한다.
