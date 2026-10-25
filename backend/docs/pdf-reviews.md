# PDF 심사

PDF 추출 결과를 바탕으로 기획사가 지원서 PDF를 한곳에서 확인하는 독립 심사 API다. 기존 공고·지원서 심사
(`ScreeningReview`)와 데이터를 공유하지 않는다. 업로드·추출 자체는 [api.md](./api.md)의 PDF 추출 확인을 따른다.

`YESULIN_PDF_EXTRACTION_ENABLED=true`일 때만 mapping과 이벤트 리스너를 등록한다. 모든 요청은 Active Producer와
기존 세션을 요구하고, 쓰기는 CSRF가 필요하다. 응답은 `Cache-Control: no-store`다. 본인 심사가 아니거나 없는 UUID는
같은 `404 PDF_REVIEW_NOT_FOUND`이며, 심사 안에 없는 항목은 `404 PDF_REVIEW_ENTRY_NOT_FOUND`다.

## 규칙

- 심사는 제목과 배역 목록을 독립적으로 가진다. 공연·공고와 연결하지 않으며 만든 뒤 제목·배역은 바꾸지 않는다.
- 제목은 1~120자, 배역은 1~50개이고 이름은 각 1~100자다. 입력은 NFC로 정규화하고 앞뒤 공백을 지우며 안의 연속 공백을
  한 칸으로 줄인다. 정규화한 뒤 같은 배역 이름이 둘 이상이면 `400 INVALID_PDF_REVIEW`다.
- PDF 한 개는 지원 항목 한 개다. 여러 쪽도 한 명의 지원자로 취급한다.
- 임의 `jobId`를 심사에 붙이는 API는 없다. 항목은 `POST /uploads`가 추출 작업을 만드는 같은 트랜잭션에서
  생성되므로 항목의 소유권은 처음부터 심사에 묶인다. `job_id`는 고유하다.
- 담당자는 `memo`·`decision`과 등록 배역 연결을 바꾼다. 지원자 이름과 프로필 전사 값은 읽기 전용이다.
- `decision`(`PENDING`·`PASS`·`FAIL`·`HOLD`)은 사람만 입력한다. 자동 처리는 이름·명시된 지원 배역·원문 프로필 사실을 채우며
  합불·메모를 만들거나 덮어쓰지 않는다. 지원자의 감성·능력·성별·나이·외모는 판단하지 않는다.

## API

| Method | URL | 요청 / 응답 |
| --- | --- | --- |
| POST | `/api/v1/pdf-reviews` | `{title,roles:["배역명"]}` → 201 ReviewDetail |
| GET | `/api/v1/pdf-reviews` | `{reviews:[{id,title,createdAt,roleCount,entryCount}]}` 최신순 |
| GET | `/api/v1/pdf-reviews/{id}` | ReviewDetail |
| POST | `/api/v1/pdf-reviews/{id}/uploads` | `{originalFilename,size}` → 201 PreparedUpload |
| PATCH | `/api/v1/pdf-reviews/{id}/entries/{entryId}` | `{memo,decision}` → 200 EntryView |
| PATCH | `/api/v1/pdf-reviews/{id}/role-assignments` | `{entryIds:[UUID],roleId:UUID 또는 null}` → 200 EntryView[] |

- ReviewDetail은 `id,title,createdAt,roles:[{id,name}],entries:[EntryView]`이다. 배역은 입력 순서, 항목은 파일 이름순이다.
- EntryView는 `id,jobId,originalFilename,applicantName,roleId,matchStatus,matchEvidence,memo,decision`이다.
  `applicantName`·`roleId`는 null일 수 있다.
- `POST /uploads`는 기존 `POST /api/v1/pdf-extractions/uploads`와 같은 PreparedUpload
  `{jobId,fileKey,upload:{url,method,expiresAt,headers}}`를 돌려준다. 검증도 같다(PDF, 25MiB 이하, 파일명 255자 이하,
  실패 시 `400 INVALID_PDF`이며 항목은 생기지 않는다). 응답을 받은 브라우저가 S3에 PUT하고, 이후
  `POST /api/v1/pdf-extractions/{jobId}/completion`과 상태 조회는 기존 API를 쓴다.
- PATCH는 `memo`(필수, 빈 문자열 가능, 2000자 이하)와 `decision`(필수)을 모두 받는다. 항목 행을 잠근 뒤 바꾸므로
  같은 항목에 대한 자동 반영과 겹쳐도 서로의 값을 덮어쓰지 않는다.
- 오류: 형식·길이·중복 배역 `400 INVALID_REQUEST` 또는 `400 INVALID_PDF_REVIEW`, 없는 심사·항목 `404`.

## 자동 반영

### AI로 지원 정보 정리

Lambda에 AI 제공자를 설정하면 PDFium으로 추출한 본문과 이 심사의 등록 배역 목록을 모델에 전달한다.
AI가 `applicantName`, `applicantNameEvidence`, `roleId`, `roleEvidence`를 JSON Schema에 맞춰 반환한다.
`roleId`는 등록된 배역 ID 또는 null이다. 배역의 별칭·접미사 정리는 모델이 수행하며 서버에 별도 보정 규칙을 추가하지 않는다.
합불·점수·메모·이미지 fileKey는 모델의 출력 항목이 아니다.

워커 전용 `GET /internal/v1/pdf-extractions/{jobId}/review-context`는 기존 완료 API의 Bearer 인증을 요구한다.
응답은 `{jobId,reviewId,sourceFileKey,resultStored,roles:[{id,name}]}`이며 `Cache-Control: no-store`다.
작업과 심사의 소유자가 다르거나 연결된 심사가 없으면 404다. 독립 추출 작업은 `reviewId:null,roles:[]`다.
S3 객체 조회나 presigned URL 발급 없이 DB와 원본 키 규칙만 사용한다. 브라우저 세션은 이 API의 인증을 대체하지 못한다.

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
- AI 실패·생략도 PDF 추출 결과는 저장하고 `NEEDS_CHECK`와 사유를 표시한다. AI 결과도 payload digest에 포함하므로
  같은 결과 재전송은 멱등이고 다른 결과로 기존 지원서를 덮어쓸 수 없다. 메모·결정은 유지한다.
- AI 호출 중에는 Spring 트랜잭션·DB 행 잠금을 잡지 않는다. Lambda가 AI 결과까지 만든 다음 한 번의 완료 API로 전달한다.

### 이전 워커의 레이블 기반 반영

추출 결과를 처음 받으면 `PdfExtractionCompletedEvent(jobId, ownerId, text)`가 콜백 트랜잭션 안에서 동기로 발행된다.
중복 콜백은 이벤트를 발행하지 않는다. `presentation/event`의 리스너가 같은 트랜잭션에서 해당 `jobId`의 항목을 잠그고
갱신하며, 예외는 삼키지 않아 콜백이 롤백되고 재시도된다. 항목이 없는 작업(기존 `/pdf-extractions`로 올린 파일)의
이벤트는 무시한다. 이벤트에는 배역 적합성 판단이 없고, 매칭은 이 모듈이 현재 심사의 배역과 비교해 정한다.

`matchStatus`는 `WAITING`(결과 대기) → `MATCHED` 또는 `NEEDS_CHECK`다. 추출이 비었거나 실패해도 항목은 유지되고
`NEEDS_CHECK`가 된다. `matchEvidence`(1000자 이하)에는 판단 근거 문장을 남긴다.

### 지원 배역

- 텍스트에서 `지원배역`·`희망배역`·`지원분야`(공백 허용) 레이블 뒤의 값을 읽는다. 값은 같은 줄이거나, 레이블만 있는 줄의
  바로 다음 줄이다. 표의 `|`·탭 구분과 `성명: … 지원배역: …`처럼 한 줄에 이어 쓴 형태도 읽는다.
- 위 레이블이 하나도 없을 때만 `배역` 레이블을 쓴다. `배역`은 줄이나 표 칸의 처음에 있을 때만 레이블로 본다.
- 읽은 값을 현재 심사의 배역 이름과 NFC·공백 정규화 후 **정확히 일치**하는 경우만 연결한다. 단어 포함·유사도·약칭은
  쓰지 않는다. 경력·소개 문장에 배역 이름이 나온 것은 레이블이 아니므로 연결하지 않는다.
- 정확히 한 배역과 일치하면 `MATCHED`와 `roleId`다. 레이블이 없거나, 값이 없거나, 값이 여러 개이거나, 일치하는 배역이
  없으면 `NEEDS_CHECK`이고 `roleId`는 null이다.

### 지원자 이름

`성명`·`이름` 레이블 뒤에 글자(공백·`·`·`.`·`'`·`-` 허용, 30자 이하)만 있는 값이 하나일 때만 채운다. 없거나 여러 값이면 null이다.
`성명 생년월일 지원배역 연락처`처럼 레이블이 이어진 표 머리글의 다음 레이블을 값으로 읽지 않는다.

심사 업로드의 원본 key는 `inputs/{reviewId}/{jobId}/source.pdf`, 이미지와 worker 캐시는 `results/{reviewId}/{jobId}/pdfium-v1/` 아래다. 경로는 서버가 발급하고 사용자 입력 제목·파일명을 경로로 쓰지 않는다.

## 프로필 화면과 v2 추출 계약

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
  근거는 NFC·공백 정규화 후 연속된 원문 구절이어야 한다. 경력 최대 50개이며 작품명은 필수다.
  null 사실의 근거도 null이다. 제공하지 않은 학교·전공·날짜를 추정하지 않는다.
- birthDate·age·height·education은 원문 문자열이다. 워커는 원문의 날짜/단위를 수정하지 않는다.
  화면에서 완전한 생년월일만 만나이로 계산하고, 직접 기재된 나이는 '지원서 기재'로 구분한다.
- 실패·생략 상태나 v1에는 profile 객체를 넣을 수 없다. 워커와 완료 API가 형식·근거를 검증한다.
  프롬프트가 예시·관람작·안내문 제외를 요구하지만, 근거 문자열 검증 자체가 의미 정확도를 보장하지는 않는다.
- 사진은 모델이 분류하지 않는다. 워커의 크기·종횡비·페이지 점유율 규칙으로
  `CANDIDATE/OTHER/UNCERTAIN`을 부여하고 이전 결과의 `UNCLASSIFIED`도 허용한다.
  자동 갤러리는 CANDIDATE만 쓴다. 후보가 없으면 '사진을 자동으로 확인하지 못했습니다'와 원문 버튼을 보인다.
  작은 프로필 사진이 제외되거나 큰 로고가 후보에 남을 수 있으며 얼굴 검출/OCR은 하지 않는다.
- 새 심사 화면은 합격·불합격만 새 결정으로 제공한다. 기존 HOLD/PENDING API 값과 저장 기록은 유지한다.
- 배역 변경 요청은 1~300개의 중복 없는 항목을 받으며 심사 소유권·항목 소속·등록 배역을 검증한다.
  UUID 순서로 행을 잠가 한 트랜잭션에서 변경한다. null은 배역 연결 해제다.
  수동 배역 선택은 `role_manually_assigned`로 보존하고 지연된 추출은 이름만 갱신한다. 메모·결정을 바꾸지 않는다.
- 배포 시 `V20261025120000__pdf_review_manual_role.sql`을 적용하고, v2 워커보다 v2를 수용하는 API를 먼저 배포한다.
