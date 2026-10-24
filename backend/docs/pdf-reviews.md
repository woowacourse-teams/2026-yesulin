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
- 항목에서 사람이 바꿀 수 있는 값은 `memo`와 `decision`뿐이다. 지원자 이름·배역 연결은 직접 입력하지 못한다.
- `decision`(`PENDING`·`PASS`·`FAIL`·`HOLD`)은 사람만 입력한다. 자동 처리는 지원자 이름과 지원 의향 배역 연결만 채우며
  합불·메모를 만들거나 덮어쓰지 않는다. 지원자의 감성·능력·성별·나이·외모는 판단하지 않는다.

## API

| Method | URL | 요청 / 응답 |
| --- | --- | --- |
| POST | `/api/v1/pdf-reviews` | `{title,roles:["배역명"]}` → 201 ReviewDetail |
| GET | `/api/v1/pdf-reviews` | `{reviews:[{id,title,createdAt,roleCount,entryCount}]}` 최신순 |
| GET | `/api/v1/pdf-reviews/{id}` | ReviewDetail |
| POST | `/api/v1/pdf-reviews/{id}/uploads` | `{originalFilename,size}` → 201 PreparedUpload |
| PATCH | `/api/v1/pdf-reviews/{id}/entries/{entryId}` | `{memo,decision}` → 200 EntryView |

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
