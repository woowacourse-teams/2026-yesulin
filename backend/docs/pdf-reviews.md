# PDF 심사 HTTP 계약

기존 공고 심사와 독립된 제목·배역 기반 심사 API다. `YESULIN_PDF_EXTRACTION_ENABLED=true`일 때 등록된다.
Active Producer 세션을 요구하고 쓰기는 CSRF, 응답은 `Cache-Control: no-store`다.
타인·없는 심사는 동일한 404다. API 주소와 테이블명은 호환을 위해 유지한다.

도메인 세부 규칙과 기능 흐름은 [Audit 문서](../src/main/java/art/yesulin/audit/docs/README.md)에서 관리한다.
심사는 제목 1~120자, 배역 0~50개·이름 1~100자다. `roles: []`는 자유 배역이며 roleId는 null이다.
판정은 `PENDING/PASS/HOLD/FAIL`, 처리 상태와 독립이다. 상세 불변식은
[도메인 정책](../src/main/java/art/yesulin/audit/docs/policies/domain.md)을 따른다.

## API


| Method | URL | 요청 / 응답 |
| --- | --- | --- |
| POST | `/api/v1/pdf-reviews` | `{title,roles:["배역명"]}` → 201 ReviewDetail |
| GET | `/api/v1/pdf-reviews` | `{reviews:[{id,title,createdAt,roleCount,entryCount}]}` 최신순 |
| GET | `/api/v1/pdf-reviews/{id}` | ReviewDetail |
| GET | `/api/v1/pdf-reviews/{id}/progress` | `{total,uploading,waiting,completed,partial,failed,complete,pdf,ai}` |
| POST | `/api/v1/pdf-reviews/{id}/uploads` | `{originalFilename,size}` → 201 PreparedUpload |
| PATCH | `/api/v1/pdf-reviews/{id}/entries/{entryId}` | `{memo,decision}` → 200 EntryView |
| PATCH | `/api/v1/pdf-reviews/{id}/role-assignments` | `{entryIds:[UUID],roleId:UUID 또는 null}` → 200 EntryView[] |

- ReviewDetail은 `id,title,createdAt,roles:[{id,name}],entries:[EntryView]`이다. 배역은 입력 순서, 항목은 파일 이름순이다.
- EntryView는 `id,jobId,originalFilename,applicantName,roleId,matchStatus,matchEvidence,memo,decision,processingStatus`이다.
  `applicantName`·`roleId`는 null일 수 있다.
- `POST /uploads`는 기존 `POST /api/v1/pdf-extractions/uploads`와 같은 PreparedUpload
  `{jobId,fileKey,upload:{url,method,expiresAt,headers}}`를 돌려준다. 검증도 같다(PDF, 25MiB 이하, 파일명 255자 이하,
  실패 시 `400 INVALID_PDF`이며 항목은 생기지 않는다). 응답을 받은 브라우저가 S3에 PUT하고, 이후
  `POST /api/v1/pdf-extractions/{jobId}/completion`과 상태 조회는 기존 API를 쓴다.
- PATCH는 `memo`(필수, 빈 문자열 가능, 2000자 이하)와 `decision`(필수)을 모두 받는다. 항목 행을 잠근 뒤 바꾸므로
  같은 항목에 대한 자동 반영과 겹쳐도 서로의 값을 덮어쓰지 않는다.
- 오류: 형식·길이·중복 배역 `400 INVALID_REQUEST` 또는 `400 INVALID_PDF_REVIEW`, 없는 심사·항목 `404`.

### 처리 진행률

본인의 Active Producer 세션으로만 조회한다. 다른 공연사·없는 심사는 모두 `404 PDF_REVIEW_NOT_FOUND`다.
응답은 `Cache-Control: no-store`이며 DB에서 해당 심사의 작업 메타데이터만 집계한다.
파일 URL·지원자 정보·본문·결과 JSON을 반환하지 않고, S3·Lambda·모델을 호출하지 않는다.

```json
{"total":300,"uploading":10,"waiting":100,"completed":180,"partial":5,"failed":5,"complete":false}
```

- `total`: 업로드 URL을 발급하며 서버에 접수한 PDF 작업 수. 아직 브라우저에서 대기하는 미접수 파일은 포함하지 않는다.
- `uploading`: 업로드 확인 전 작업. URL 만료 후 60초 유예가 지나면 실패로 집계한다.
- `waiting`: 업로드 확인 후 콜백을 기다리거나, Spring AI 작업이 `PENDING/RUNNING`인 작업.
  AI 재시도 대기 중에도 폴링을 계속한다. 오래 걸린 PDF 추출 자체를 임의로 실패 처리하지 않는다.
- `completed`, `partial`, `failed`: AI 대기·실행이 끝난 작업의 PDF 추출 완료·일부 완료·실패 상태다.
  `failed`는 업로드 만료도 포함한다. AI 실패를 PDF 실패로 바꾸지 않으며, AI 실패는 기존 `applicantInfo`에 표시한다.
- `total = uploading + waiting + completed + partial + failed`이고, `complete`는 `uploading == 0 && waiting == 0`이다.
  빈 심사는 `total:0, complete:true`다. 실패가 남아도 처리가 끝났으면 `complete:true`이며 합불 심사 완료와 무관하다.

콜백의 작업 상태·지원자 자동 반영은 같은 트랜잭션에서 커밋되므로, 종료 집계를 읽은 뒤 심사 목록을 읽으면 반영된 정보를 조회할 수 있다.
클라이언트는 브라우저 업로드 대기열까지 끝나야 전체 처리 완료로 표시하고 폴링을 멈춘다.


## 추출·AI 상세 결과

원본 업로드·completion·추출 조회·인증된 콜백 DTO는 [api.md](api.md#pdf-추출-확인)를 따른다.
추출 payload와 AI 결과는 별도로 저장하며 조회에서만 applicantInfo를 조립한다.
legacy v1/v2 수신 형식·근거·프로필 상한은 [프로필 계약](../src/main/java/art/yesulin/pdfextraction/docs/policies/profile-contract.md),
모델·재시도·DB 상한은 [AI 정책](../src/main/java/art/yesulin/pdfextraction/docs/policies/ai-processing.md).
