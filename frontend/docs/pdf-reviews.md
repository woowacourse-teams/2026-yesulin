# PDF 지원서 심사 화면

공연사가 심사 제목과 배역을 만들고, 지원서 PDF를 여러 개 올려, 배역별로 정리된 지원 항목에 메모와 결정을 남기는 화면이다.
실제 HTTP 계약은 [백엔드 API](../../backend/docs/api.md)가 정본이며, 이 문서는 프론트가 그 계약을 쓰는 방식만 적는다.

| 경로 | 설명 |
| --- | --- |
| `/producers/pdf-reviews` | 공연사 세션으로 쓰는 화면 |
| `/dev/pdf-reviews` | `PDF_EXTRACTION_LOCAL=true`이고 `VERCEL`이 없을 때만 열리는 로컬 확인 화면. 그 외에는 404 |

로컬 화면의 "로컬 테스트 계정으로 시작"은 가상 공연사 계정(`pdf-local@example.test`)으로 기존 세션 로그인을 호출한다. 인증을 생략하지 않는다.
실행 방법은 [PDF 추출 확인](./api-integration.md#pdf-추출-확인)의 로컬 확인과 같다.

## 구조

| 위치 | 책임 |
| --- | --- |
| `features/pdf-reviews/types.ts` | 심사·지원 항목 타입, 라벨, 배역 필터, 배역 입력 파싱 |
| `features/pdf-reviews/api.ts` | `/api/v1/pdf-reviews` 호출 |
| `features/pdf-reviews/use-pdf-reviews.ts` | 심사 목록과 선택한 심사를 DB 기준으로 조회. 늦게 온 오래된 응답은 버린다 |
| `features/pdf-reviews/use-review-uploads.ts` | 다중 파일 선택·업로드·재시도 |
| `features/pdf-reviews/use-extraction-events.ts` | 추출 완료 SSE 구독과 동기화 |
| `components/pdf-reviews/` | 화면 조립(`pdf-review-workbench`)과 생성 폼·목록·업로드·지원 항목·상세 |

## 흐름

1. 제목과 배역(줄바꿈 입력, 최소 1개, 같은 이름 불가)으로 `POST /pdf-reviews`. 응답 심사를 바로 선택한다.
2. PDF 여러 개 선택 → 파일마다 `POST /pdf-reviews/{id}/uploads`로 URL 발급 → 기존 `putPdf` → 기존 `completePdfUpload`.
   파일당 25MiB, 심사당 최대 800개, 동시에 2개, 한 파일이 실패해도 나머지는 계속한다. 선택 파일 전체를 한 번에 읽지 않는다.
   PDF 한 파일은 쪽 수와 관계없이 지원 항목 1개다.
3. 지원 항목은 배역별·`배역 확인 필요`·`내용 정리 중` 필터로 본다. 서버가 `MATCHED`로 판단한 항목만 배역에 속하고, 나머지는 `배역 확인 필요`로 남는다.
4. 항목을 열면 이름·배역·근거 문구는 읽기 전용으로 보이고, 원본 PDF·추출 텍스트·이미지는 기존 `fetchPdfExtraction`과 `PdfExtractionResultPanel`을 쓴다.
   담당자가 바꾸는 값은 메모와 결정(`PENDING`/`PASS`/`FAIL`/`HOLD`)뿐이며 `PATCH .../entries/{entryId}`로 저장한다.
   이름이 없으면 "이름 확인 필요"로 표시한다. 자동 적합성 점수는 없고 합격·불합격은 사람이 정한다.

## 실시간 갱신

`GET /api/v1/pdf-extractions/events`(SSE, 세션 인증)를 로그인한 화면에서만 `EventSource`로 연다. 같은 origin이며 화면을 벗어나면 `close()`한다.

- `onopen`(연결·재연결), `completed`마다 DB 목록과 선택한 심사를 다시 읽는다. 이벤트는 신호일 뿐이라 놓친 변경도 재연결 때 복구된다.
  동기화가 진행 중이면 요청을 하나로 합쳐 직렬 실행하므로 동시 요청은 목록·선택 심사 2건을 넘지 않는다.
- 선택한 항목의 `completed`가 오면 원본·추출 결과도 다시 읽는다.
- 연결이 닫히면 "자동 갱신이 멈췄습니다" 안내와 함께 수동 "목록 새로고침"이 연결을 다시 연다.
- 세션 `401`이면 화면과 고른 파일을 그대로 두고 재로그인 안내를 띄운다. 로컬 화면은 "로컬 계정 다시 로그인", 그 외에는 새 창 로그인 뒤 "다시 확인"을 쓴다. 새로고침이 필요 없다.

`/dev/pdf-extractions`의 기존 워크벤치도 3초 상태 조회 대신 같은 SSE와 `GET /pdf-extractions` 목록 병합을 쓴다.
병합은 `jobId`로 기존 행에 합치며 선택 파일, 업로드 중·실패 행, 재시도용 `pendingJobId`를 잃지 않는다.

## 저장과 개인정보

지원자 이름·메모·파일 내용은 localStorage·sessionStorage에 저장하지 않는다. 입력 중인 메모는 목록이 다시 읽혀도 유지된다.

## MSW

`/api/v1/pdf-reviews/**`와 `/api/v1/pdf-extractions/**`(SSE 포함)는 `mocks/handlers.ts`에서 명시적으로 `passthrough()`한다.
가짜 추출 성공이나 심사 기록을 만들지 않는다.

## 로컬 전용 안내

배역 자동 분류는 아직 지원서에 적힌 지원 배역 문구만 근거로 한다. Bedrock은 연결되지 않았다.
이 한계는 `/dev/pdf-reviews` 안내에만 적고, 공연사 화면에는 구현 용어를 노출하지 않는다.
