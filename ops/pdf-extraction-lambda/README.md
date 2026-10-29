# 여러 PDF 업로드와 추출 확인

이번 범위는 파일별 presigned 업로드, 실제 PDFium 텍스트·이미지 추출, 본인 결과 확인이다.
후속 기능은 제목·배역으로 심사를 생성하고 지원 정보를 연결한 뒤 담당자가 메모·심사 결정을 저장한다.
선택적으로 Bedrock 또는 Gemini가 추출 문자를 구조화한다. OCR·얼굴/로고 분류·SQS·DLQ·공유 IAM 변경은 포함하지 않는다.
실제 지원서·결과·ZIP 빌드 산출물은 `.gitignore`된 `output/`, `build/`에만 둔다.

## 구성과 패키지 경계

- Spring `pdfextraction/application`이 작업 준비·완료·조회와 전용 `PdfExtractionStorage` port를 소유한다.
- `pdfextraction/infrastructure/PdfExtractionStorageService`가 이 application 전용 어댑터다.
  PDF 경로·manifest 검증·이미지 키 제한을 처리하고 공통 컴포넌트를 조합한다.
- feature 밖의 `infrastructure/storage/S3PrivateObjects`는 SDK 기반 객체 접근·서명·읽기 상한만 제공한다.
  PDF·심사 규칙과 feature의 타입을 참조하지 않는다. application은 S3 SDK를 직접 호출하지 않는다.
- worker는 `application/extraction.py`, `application/jobs.py`와 S3 어댑터로 분리한다.
  `s3_handler.handler`가 S3 ObjectCreated 입력을 검증해 application에 전달한다.

Spring이 원본을 받아 중계하지 않는다. 브라우저가 파일별 URL로 PUT하면 S3가 Lambda를 비동기로 호출하고,
Lambda가 원본을 읽어 PNG를 저장한 뒤 재전송 캐시인 result.json을 쓴다. 이어 전용 Bearer 인증 완료 API에 텍스트·이미지 key를 본문으로 보낸다. Spring은 작업·키를 검증해 DB에 저장하며 S3 JSON을 읽지 않는다. 완료 DB 커밋 후 본인 화면에 SSE 변경 신호를 보낸다.
프론트가 추출 텍스트·이미지 key를 서버에 제출하는 방식은 사용하지 않는다.

## 로컬 실행

Docker, Java 25, Node 24+, Python 3.12+가 필요하다. 개인 config submodule·실제 AWS 로그인·access key는 필요하지 않다.
LocalStack은 프로젝트가 이미 쓰는 `localstack/localstack:3.8.1`로 고정했다. 가짜 `test/test` 자격 증명과 loopback
endpoint만 사용한다. 기존 프로젝트 컨테이너·DB·8091/8092 서버는 바꾸지 않는다.

저장소 루트에서:

```bash
docker compose -f ops/pdf-extraction-lambda/compose.local.yml up -d
python3.12 ops/pdf-extraction-lambda/scripts/build.py
python3.12 ops/pdf-extraction-lambda/scripts/setup_local.py
```

setup은 LocalStack에만 버킷·CORS·S3 원본 필터·Lambda·동시 실행 2·비동기 재시도 설정을 만든다.
Lambda 역할 ARN은 로컬 에뮬레이터용 문자열이며 실제 AWS IAM 역할을 만들지 않는다.
Lambda 컨테이너를 실행하므로 LocalStack에 Docker socket을 연결한다. 실제 AWS의 IAM·쿼터·성능 검증을 대신하지 않는다.

백엔드 디렉터리에서:

```bash
./gradlew bootJar
mkdir -p build/pdf-extraction-local
cp build/libs/application.jar build/pdf-extraction-local/running.jar
java -Xmx512m -jar build/pdf-extraction-local/running.jar --spring.profiles.active=pdf-extraction-local
```

전용 프로필은 `127.0.0.1:8093`, 별도 H2 파일 DB, `localhost:4568` LocalStack만 사용한다.
개인 환경 파일을 불러오지 않고 외부 메일·Slack·공고 가져오기 스케줄을 끈다.
실행 JAR을 복사하는 이유는 후속 빌드가 떠 있는 서버의 파일을 교체하지 않게 하기 위해서다.

프론트 디렉터리에서:

```bash
API_ORIGIN=http://127.0.0.1:8093 PDF_EXTRACTION_LOCAL=true npm run dev -- --hostname 127.0.0.1 --port 3201
```

`http://127.0.0.1:3201/dev/pdf-extractions`에서 `로컬 테스트 계정으로 시작`을 누른 뒤 PDF 여러 개를 선택하고 업로드한다.
실제 PDFium 엔진이 들어간 ARM64 Lambda 컨테이너로 추출한다. 기존 로컬 Python subprocess 실험 화면과 다르다.
H2에만 `pdf-local@example.test` / `PdfLocal123!` 가상 공연사 계정을 만든다.
이 프로필과 로컬 UI는 운영에서 활성화하지 않는다. 프론트 로컬 경로는 Vercel에서는 항상 404다.

LocalStack 컨테이너를 삭제하면 로컬 S3·Lambda 데이터는 사라진다. 원본 PC 파일은 변경하지 않는다.
재개할 때는 컨테이너를 삭제하는 `down` 대신 `stop`/`start`를 사용한다. H2 DB는 `backend/build/pdf-extraction-local/`에 남는다.

## 원본 PDF 보기

결과 화면은 Spring이 소유권 확인 후 내려주는 원본 GET 주소(`sourceUrl`)를 PDF.js(`pdfjs-dist`)로 열어 canvas에 한 번에
한 쪽씩 그린다. 브라우저 PDF 플러그인에 의존하지 않으며 이전/다음 쪽과 확대·축소만 제공한다. 쿠키 없이(`withCredentials: false`)
브라우저가 S3에 직접 GET하므로 버킷 CORS가 프론트 origin의 GET을 허용해야 한다. 텍스트 선택·검색·주석 레이어는 없다.
주소가 바뀌거나 화면을 떠나면 진행 중인 로딩과 렌더링을 취소한다. 표시하지 못하면 오류와 함께 "새 창에서 보기" 링크를 쓴다.

## 로컬 검증의 한계

- LocalStack에서는 서명 없는 익명 원본 GET도 200으로 응답했다. 따라서 실제 AWS의 IAM·버킷 정책·비공개 차단은 검증하지 못했다.
- 로컬에서는 Lambda 컨테이너와 실제 Gemini 호출 후 완료 API의 심사 반영까지 가상 자료로 검증했다.
  기존 AI 없는 추출·심사 흐름은 Dev에서도 확인됐지만, 이 AI 추가 계약과 Bedrock 역할 호출은 별도 배포·검증이 필요하다.
- LocalStack 컨테이너의 Docker health가 unhealthy로 표시돼도 API와 Lambda는 동작했다. health 표시만으로 재시작하거나 삭제하지 않는다.
- 비공개 버킷의 서명 없는 GET 차단과 서명 주소의 만료·CORS는 로컬이 아니라 실제 AWS에서 확인한다.

## 실제 AWS 배포 조건

코드 변경이 AWS 리소스를 자동 생성하거나 수정하지 않는다. 기능은 기본 비활성이며 병합만으로 추출이 켜지지 않는다.
아래 1~7은 일반 설정 절차이고, 실제로 적용한 Dev 상태는 이어지는 절에 따로 적는다.

1. `YESULIN_PDF_EXTRACTION_ENABLED=true`로 Spring mapping을 활성화한다.
2. S3 key prefix와 worker 환경 변수를 같은 환경으로 맞춘다. 예: Spring prefix가 `yesulin/dev`이면
   `PDF_INPUT_PREFIX=yesulin/dev/private/pdf-extractions/inputs/`, `PDF_RESULT_PREFIX=yesulin/dev/private/pdf-extractions/results/`다.
   `PDF_BUCKET`은 같은 비공개 버킷이다. 실제 AWS에서는 `PDF_S3_ENDPOINT`를 설정하지 않는다.
3. ZIP을 테스트용 추출 함수에 배포하고 handler를 `s3_handler.handler`로 지정한다.
   Python 3.12 / ARM64 / 메모리 1024MB / timeout 120초 / 임시 디스크 512MB가 초기값이다.
4. **inputs prefix + `/source.pdf` suffix만** ObjectCreated 트리거 대상으로 삼는다. 결과 저장이 재호출을 만들면 안 된다.
5. 실행 역할의 원본 GetObject, 결과 GetObject/PutObject, 해당 prefix ListBucket, 로그 권한을 검증한다.
   Spring은 원본 업로드 확인을 위한 HEAD·Range GET과 원본·이미지 presigned URL 발급 권한이 필요하다.
   배우 PDF로 프로필 채우기를 켜면 `private/pdf-extractions/` 아래 원본·결과를 지우는 ListBucket·DeleteObject와
   사진 후보 이미지를 읽는 GetObject도 필요하다. 일괄 삭제가 일부 객체를 지우지 못하면 Spring은 지운 것으로 기록하지 않고
   다음 정리 때 다시 지운다. 결과 JSON을 읽는 권한은 완료 처리에 필요하지 않다. 버킷 정책의 explicit deny는 Allow 추가만으로 해결되지 않으므로 deny의 예외 조건을 확인한다.
6. 버킷 CORS에 프론트 origin의 PUT/GET/HEAD와 `Content-Type`, `If-None-Match`를 허용한다.
7. Lambda에 완료 API URL과 전용 토큰을 설정한다(아래 "직접 완료 API와 화면 알림").

로컬 성공을 실제 AWS 전체 흐름 성공으로 보고하지 않는다.
일반 presigned URL은 객체 한 개용이다. 여러 파일에는 각각 URL을 발급하고 업로드를 제한된 동시성으로 실행한다.
S3 멀티파트 업로드는 큰 파일 하나를 여러 조각으로 보내는 방식이며 여러 PDF 업로드와 구분한다.

## 적용된 Dev 인프라와 AI 배포 구분

기존 PDF 추출·완료 API·심사 화면은 Dev에 배포됐다. AI 추가 계약은 별도 Spring·Lambda 배포와 제공자 활성화가 필요하다.

**로컬 검증**: LocalStack과 로컬 Spring/브라우저에서 확인한 흐름이다. AWS 접근 제어는 검증하지 않았다.

**적용된 Dev 인프라** (`yesulin-pdf-benchmark-dev`):

- Lambda: Python 3.12, ARM64, handler `s3_handler.handler`. ZIP SHA256(base64) `Bn9PePkdPbx8uOpceeQ9V5+GoMErb3RNYeNJTzvj9JA=`.
- 버킷 `techcourse-project-2026`의 `yesulin/dev/private/pdf-extractions/inputs/` prefix + `/source.pdf` suffix에 S3 ObjectCreated 트리거를 연결했다.
  이미지와 재전송 캐시는 `results/` 아래에 쓴다.
- 완료 callback 주소는 `https://dev-api.yesulin.art/internal/v1/pdf-extractions/completions`이다.
  Lambda와 SOPS DEV 설정에 같은 전용 Bearer 토큰을 넣었다. 토큰 평문은 문서·Git에 두지 않는다.
- DEV 암호화 설정은 config 저장소 커밋 `abaac89`로 반영했고 앱의 config 서브모듈 포인터가 이를 가리킨다(앱 커밋은 별도). PROD 설정은 바꾸지 않았다.
- 새 IAM 역할이나 identity policy는 만들거나 수정하지 않았다. 버킷 정책만 바꿨다.
  - 비공개 PDF 폴더의 읽기를 `ec2-project`와 정확한 Lambda 세션(`aws:userid` = `AROA4IVPY73FZIASIPJVG:yesulin-pdf-benchmark-dev`) 외 모두에게 거부한다. 익명 요청과 CloudFront 경유 읽기도 차단한다.
  - 이 Lambda 세션은 추출 폴더 밖 읽기를 거부한다. 기존 나머지 정책 문장 9개는 바꾸지 않았다.
- 기존 버킷 CORS가 Dev의 PUT/GET/HEAD를 이미 허용한다.

**함수 이름 결속과 이름 변경 정책**: 버킷 정책의 예외가 세션 이름이 들어간 `aws:userid`에 고정돼 있다.
함수를 이름 변경하거나 다른 함수·역할로 교체하면 추출 폴더 읽기가 거부되고 callback이 오지 않는다.
이름을 바꿀 때는 새 `aws:userid`로 버킷 정책의 예외를 먼저 함께 바꾼다. 같은 이름으로 함수를 삭제 후 재생성해도 역할 ID가 바뀌면 같은 조치가 필요하다.

**초기 연결 시험 기록**: 당시 완료 API를 담은 백엔드는 PR 병합·배포 전이었다.
2026-10-25에 개인정보 없는 36KB·1페이지 PDF를 실제 S3에 업로드하여 자동 실행과 `result.json` 및 PNG 1개 생성을 확인했다. 익명 원본 HEAD는 403이었다.
해당 시험 당시 Dev 완료 API는 올바른 worker 토큰을 보내도 403을 반환하여 Lambda 전체 호출은 실패·재시도 상태였다. 추출·저장 성공과 서버 반영 성공을 구분한다.
콘솔 합성 시험 job은 Spring이 발급한 job이 아니므로, 배포 후에는 공연사 화면에서 새 job을 만들어 업로드한 뒤 DB 반영까지 확인한다.
기본 설정에서는 AI를 호출하지 않는다. AI 제공자는 아래 환경 변수로 선택하며 OCR·SQS는 사용하지 않는다.

## 실패와 재실행

심사에서 올린 원본은 `inputs/{reviewId}/{jobId}/source.pdf`, 이미지와 재전송 캐시는 `results/{reviewId}/{jobId}/pdfium-v1/` 아래다. 독립 추출 실험은 기존 `{jobId}` 경로를 유지한다.
원본은 conditional PUT으로 덮어쓰지 않는다. 업로드 완료 확인은 HEAD와 PDF 서명을 검사하며 Lambda를 호출하지 않는다.
presigned URL이 만료돼도 본인 job의 기존 원본이 검증을 통과하면 completion으로 업로드 확인을 복구할 수 있다. 결과 DB 반영은 Lambda의 완료 API로만 수행한다.
같은 job·원본 identity·옵션·추출기 버전의 재호출은 완료 manifest를 재사용한다. 동시 중복 실행까지 한 번으로 보장하지는 않는다.
별도 job에 올린 바이트가 같은 PDF의 SHA 기반 전역 중복 제거도 이번 범위가 아니다.

손상 PDF·페이지 상한·결과 2MiB 상한 등은 FAILED manifest로 저장한다. 이미지 일부 실패는 PARTIAL과 경고를 남긴다.
AI 정보가 추가될 공간을 위해 추출 manifest에는 384KiB의 여유를 남긴다.

## AI 지원 정보 정리

| Lambda 환경 변수 | 값 |
| --- | --- |
| `PDF_AI_PROVIDER` | `none`(기본), `gemini`, `bedrock` 중 하나 |
| `GEMINI_API_KEY` | Gemini를 선택한 경우 서버 전용 API 키 |
| `GEMINI_MODEL` | 기본 `gemini-3.5-flash-lite`. 실제 계정에서 사용할 수 있는 모델인지 확인한다 |
| `BEDROCK_MODEL_ID` | Bedrock 선택 시 필수. JSON Schema 구조화 출력을 지원하는 모델/추론 프로파일 |
| `BEDROCK_REGION` | 선택. 없으면 Lambda의 AWS SDK 기본 리전 |

AI 제공자는 설정 시 하나를 선택한다. 호출 실패 때 다른 업체로 지원서 내용을 자동 전송하지 않는다.
Bedrock 어댑터는 기존 boto3와 실행 역할의 임시 인증을 사용하고, Gemini는 별도 SDK 없이 HTTPS REST를 사용한다.
키는 프론트 환경 변수·저장소·로그에 넣지 않는다. 실제 Lambda의 IAM 권한이나 API 키를 코드가 자동 생성하지 않는다.

흐름은 `추출 캐시 → Bearer GET /internal/v1/pdf-extractions/{jobId}/review-context → AI JSON → 완료 POST`다.
모델에는 추출 문자와 해당 심사의 배역 ID·이름만 보낸다. 원본·이미지 URL·fileKey는 모델에 전달하지 않는다.
AI가 이름·명시적 지원 의향 배역·원문 인용을 반환하면 워커와 Spring이 각각 원문 근거·등록 배역을 검증한다.
원문의 지시는 데이터로 취급한다. 합불·점수·메모를 생성하지 않는다.

배우 프로필 가져오기(review-context의 `purpose: ACTOR_PROFILE`)는 심사·배역이 없으므로 빈 배역 목록으로 이름과
v2 프로필만 정리한다. 이 작업에 심사나 배역이 붙어 오면 문맥 오류로 멈춘다.

빈 텍스트·미연결 심사·32,000자 초과 본문은 모델을 호출하지 않고 생략 상태를 보낸다. 제공자 오류나 잘못된 응답은
AI 실패로 기록하되 PDF 텍스트·이미지는 그대로 완료 API로 전달한다. AI 실패 후 자동 모델 재호출은 하지 않는다.
AI를 다시 분석하는 사용자 기능은 별도 후속 작업이며, 기존 지원서에 임의로 새 결과를 덮어쓰지 않는다.
외부 모델 호출은 25초 상한이며 남은 Lambda 실행 시간이 45초 미만이면 먼저 예외를 발생시켜 다음 실행이 추출 캐시를 재사용하게 한다.

기존 v1 AI 결과는 동일 결과 폴더의 `applicant-info-v1.json`에 조건부 생성으로 저장한다. 새 v2 캐시는 아래 확장 계약을 따른다. 완료 API 전송이 실패해 재시도돼도
저장된 AI 결과를 다시 사용한다. 동시에 중복 이벤트가 시작되면 모델을 각각 호출할 가능성은 있지만,
최초로 게시된 결과 하나만 완료 API에 전달한다. 정확히 한 번의 모델 호출을 보장하는 분산 잠금은 아직 없다.
원본 추출 `result.json`은 수정하지 않는다. 이전 버전으로 이미 Spring에 저장한 작업은 `resultStored:true`로 확인해
옛 콜백 본문을 그대로 재전송한다. AI 결과와 추출 원문은 Spring payload DB에 함께 저장된다.

배포 순서는 **Spring의 context API·AI 콜백 계약 배포 → Lambda 코드 갱신 → 제공자 환경 변수 활성화**다.
LocalStack에서 같은 경로를 검증할 수 있으나 실제 외부 모델 호출에는 해당 제공자의 키/권한이 필요하다.
로컬 설정은 아래처럼 키를 파일 경로로 전달한다. 키 파일은 저장소 밖에 본인만 읽을 수 있게 보관한다.

```bash
PDF_AI_PROVIDER=gemini GEMINI_API_KEY_FILE=/path/to/private-key-file \
  python ops/pdf-extraction-lambda/scripts/setup_local.py
```

무료 Gemini의 데이터 사용 조건이 있으므로 초기 연결 시험은 가상 자료로 진행한다.

공식 문서: [Bedrock 인증](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html),
[Bedrock 구조화 출력](https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html),
[Gemini 구조화 출력](https://ai.google.dev/gemini-api/docs/structured-output),
[Gemini 요금·데이터 사용](https://ai.google.dev/gemini-api/docs/pricing).
네트워크·저장소 오류·시간 부족은 함수 오류로 알려 비동기 재시도 대상으로 삼는다. PDF 25MiB·50쪽, 이미지 100개·총 PNG 40MiB,
이미지 원본 20M 픽셀·출력 긴 변 1600px 제한을 사용한다. `needsOcr`는 빈 텍스트 힌트이며 스캔 확정이나 OCR 결과가 아니다.

S3 알림과 Lambda 비동기 호출은 중복·재시도·만료가 가능하다. 10분 넘게 결과가 없으면 화면은 DELAYED로 표시하며 실패로 확정하지 않는다.
최종 실패 보관·DLQ·장기 미완료 작업 복구는 별도 운영 단계다. 자동 트리거와 권한이 없으면 QUEUED/DELAYED로 남을 수 있다.

## 검증

```bash
cd backend
./gradlew test build
```

프론트는 `npm run lint`, `npm run build`를 실행한다. Python application은 PDFium/Pillow가 설치된 로컬 Python으로
`python -m unittest discover -s tests/application -v`를 실행한다. 빌드 패키지는 Linux ARM64 native wheel이므로 macOS Python의
PYTHONPATH에 앞세워 추출 테스트를 실행하지 않는다. setup 클라이언트는 필요한 pure-Python SDK만 사용한다.

실제 지원서 3개와 의도적으로 손상한 PDF 1개를 브라우저에서 함께 선택·PUT했다. LocalStack의 S3 이벤트로
Lambda가 실행되고 정상 3개 완료·손상 1개 FAILED로 분리되는 것을 확인했다. 결과·증거는 ignored output에만 둔다.

공식 동작 근거:

- https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html
- https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html
- https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html
- https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html

## 직접 완료 API와 화면 알림

Lambda에 `PDF_COMPLETION_API_URL=https://<backend>/internal/v1/pdf-extractions/completions`, `PDF_COMPLETION_API_TOKEN`을 설정한다. Spring에는 같은 32자 이상 토큰을 `YESULIN_PDF_EXTRACTION_CALLBACK_SECRET`으로 설정한다. 실제 토큰은 저장소·로그에 넣지 않는다. 로컬은 전용 가짜 토큰과 host.docker.internal:8093을 사용하고, `PDF_LOCAL_CALLBACK=true`일 때만 정해진 로컬 호스트의 HTTP를 허용한다. 실제 AWS는 HTTPS를 사용한다. 리다이렉트에 인증 토큰을 전달하지 않는다.

완료 본문은 `{jobId,sourceFileKey,pipelineVersion,result}`이고 result에 추출 문자와 이미지 fileKey 목록이 들어간다. Spring은 정규화된 결과를 DB에 저장하며 임시 URL은 저장하지 않는다. `result.json`은 Lambda의 재전송 캐시이므로 API 실패 후 재실행은 PDF를 다시 추출하지 않고 저장된 결과를 다시 보낸다. 동일 결과는 멱등 처리하고, 다른 결과로 덮어쓰려 하면 409다. Lambda 재시도를 모두 소진한 경우의 최종 재전송은 운영 후속 범위다.

화면은 SSE `/api/v1/pdf-extractions/events`를 구독한다. 최초 연결·재연결과 `completed` 신호에 DB 목록을 동기화하고 S3 결과 폴링은 하지 않는다. SSE 알림은 현재 Spring 인스턴스 연결에 한정되므로 다중 인스턴스 간 중계는 별도 범위다. 심사 API는 `backend/docs/pdf-reviews.md`, 로컬 화면은 `/dev/pdf-reviews`다. 배역 매칭은 문서의 명시된 지원 배역만 비교하며 모델에 의한 적합성·합격 판단은 하지 않는다.

### 프로필 전사 v2

`application/applicant_info.py`의 SYSTEM과 JSON schema가 이름·지원 배역에 `profile`을 더한다.
`profile_info.py`는 생년월일·명시된 나이·키·학력·경력 최대 5개와 연속된 원문 근거를 검증한다.
경력은 원문 순서로 가져온다. 이전에 저장된 결과를 자동으로 잘라 내거나 다시 분석하지 않는다.
profile JSON은 최대 256KiB이고 manifest는 AI 결과용 384KiB 여유를 남긴다. 모델 출력 한도는 16,384 tokens다.
확실하지 않은 값은 null이며 실패 시 원본 텍스트/사진은 전달하고 프로필은 미확인으로 남긴다.
키/링크/사진 분류/합불/점수/메모는 모델 schema에 포함하지 않는다.

새 작업은 `applicant-info-v2.json`을 별도로 캐시한다. 기존 v1 캐시가 있으면 그대로 재사용해
재전송 payload의 멱등성을 유지한다. 기존 DB 결과를 새 프로필로 덮어쓰거나 자동 재처리하지 않는다.
운영 반영은 v2 지원 API → 워커 순서로 진행한다.

이미지는 PDFium 추출을 유지하고 `geometry-v1` 규칙으로 후보를 나눈다. 작은 점유율·페이지 전체 이미지는
UNCERTAIN, 작은 장식/가로 배너는 OTHER, 일반 사진 비율은 CANDIDATE다. 의미 기반 로고/얼굴 인식이 아니므로
누락/오분류 가능성이 있다. 원본은 유지하며 UI는 미확인 안내와 원문 확인을 제공한다.

Gemini 실연결에서 확장 경력 스키마의 `maxItems` 포함 요청이 HTTP 400으로 거절된 이력이 있어 Gemini 전송본에서만
해당 제약을 제거한다. 새 워커는 원본 스키마·검증에서 5개 제한을 유지한다. 백엔드는 과거 v2 결과와의 호환을 위해
기존 50개까지 수신할 수 있지만 새 모델 요청은 최대 5개다. Gemini 응답은 최대 1MiB, 프로필은 256KiB로 제한한다.

### 소량 로컬 프롬프트 검증

Lambda의 `src/`·테스트·의존성 잠금 파일은 같은 Git 저장소에서 관리하는 서비스 코드다. 콘솔 코드만 따로 고치지 않는다.
현재 ZIP 배포는 수동이며 이 로컬 실험은 AWS Lambda·EC2·IAM·Bedrock 설정을 바꾸지 않는다.
가상 정답셋은 `tests/fixtures/applicant-quality.json`이며 실제 지원서나 키를 커밋하지 않는다.

```bash
# ReportLab/Pillow와 한글 TrueType 폰트가 있는 Python으로 생성
python scripts/make_quality_pdfs.py --font /path/to/korean-font.ttf
# 키가 없으면 로컬 PDF 문자 추출만 한다.
python scripts/probe_profile_prompt.py
# PDFium/Pillow가 있는 Python에서 기존 키 파일을 명시해야 실제 Gemini를 호출한다.
python scripts/probe_profile_prompt.py --key-file /path/to/private-gemini-key
```

기본 3개(전체 항목·경력 7개·복수 배역)를 10초 간격으로 요청하며 최대 3개만 허용한다.
문서 해시가 생성 당시 가상 정답셋과 같은지 확인한 뒤 호출하고, 제공자·응답 오류가 나면 추가 요청을 멈춘다.
결과와 프롬프트 SHA는 ignored `output/profile-ui-prompt-smoke/result.json`에 남긴다. 시간은 로컬 추출+모델 API 값이며 Lambda 성능 측정이 아니다.
현재 중첩 profile 계약은 이메일·연락처와 전체 프로필 수동 수정 API를 포함하지 않는다.
소량 프롬프트 검증은 이 항목들을 검증 범위에 포함하지 않는다.

### 배우 PDF로 프로필 채우기(P8) 배포

P8 API·워커 코드와 실제 AWS 배포·검증을 구분한다. 이 절은 배포 절차이며 IAM 적용이나 dev 검증 완료 기록이 아니다.

1. Spring 실행 역할(`ec2-project`)의 기존 원본 업로드 권한에 더해 다음 권한을 확인한다.
   `ListBucket`은 버킷 ARN에 적용하고 `s3:prefix` 조건으로 `yesulin/dev/private/pdf-extractions/*`만 허용한다.
   `GetObject`·`DeleteObject`는 `arn:aws:s3:::techcourse-project-2026/yesulin/dev/private/pdf-extractions/*`에 적용한다.
   사진 후보는 `results/`에서 읽고 정리는 `inputs/{jobId}/`와 `results/{jobId}/`를 모두 지운다.
   사용자 로컬 자격 증명의 성공만으로 Spring 역할의 권한이 있다고 판단하지 않는다. 버킷 정책의 거부 조건도 함께 확인한다.
2. `ACTOR_PROFILE` 작업 목적 migration과 context·완료 API를 담은 Spring을 먼저 배포한다.
   기존 `YESULIN_PDF_EXTRACTION_ENABLED`·callback 토큰을 유지하며, 배우 API는 `APPLICANT` 세션으로만 접근한다.
3. 같은 소스 버전의 워커 application 테스트를 통과시킨 뒤 `python scripts/build.py`로 ZIP을 만든다.
   기존 `yesulin-pdf-benchmark-dev` 함수의 코드를 갱신한다. 함수 이름·역할·S3 트리거·완료 URL·토큰을 유지한다.
   워커가 `purpose=ACTOR_PROFILE` context를 받고 `roles=[]`에서도 이름·프로필을 정리하는지 확인한다.
4. 프론트를 배포하고 개인정보 없는 가상 PDF로 배우 편집 화면에서 새 작업을 만든다. 조회·사진 추가·삭제 요청의
   `jobId`를 기준으로 아래 결과를 확인한다. 공연사 PDF 심사 작업을 시험 자료로 대신 쓰지 않는다.

| dev 확인 항목 | 완료 기준 |
| --- | --- |
| 추출·반영 | `COMPLETED/PARTIAL`, 원문 근거와 제안 값이 보임. 고른 값은 입력란에만 들어가고 프로필 저장 전에는 저장되지 않음 |
| 권한 분리 | 다른 배우와 공연사 PDF API로 이 작업을 읽지 못함 |
| 사진 복사 | 후보를 보관함에 넣으면 새 비공개 배우 사진 파일이 만들어짐 |
| 결과 지우기 | 배우 API로 결과를 지운 뒤 이 작업의 `inputs/{jobId}/`·`results/{jobId}/` 객체가 모두 없고 DB payload도 없음. 복사한 보관함 사진은 남음 |
| 자동 정리 | 결과 생성 후 24시간 경과한 가상 작업이 다음 30분 주기 정리에서 삭제됨. 실패하면 다음 정리 때 재시도됨 |
| 기존 심사 | 새 공연사 PDF 심사 작업의 배역 context·완료 callback이 계속 동작함 |

API가 성공한 것과 S3 객체가 실제로 사라진 것을 각각 확인한다. 권한 부족·일괄 삭제 일부 실패는 삭제 완료로 처리하지 않는다.
CloudFront 공개 사진 사본 무효화는 별도 [#393](https://github.com/woowacourse-teams/2026-yesulin/issues/393)이며,
이 비공개 PDF 정리 검증으로 완료 처리하지 않는다.

### 심사 진행률·화면 변경 배포

- 프론트의 진행률 폴링은 Spring의 `/api/v1/pdf-reviews/{id}/progress`를 사용하므로 Spring을 먼저 배포한다.
  새 환경 변수·DB migration·SQS·S3 알림·IAM 권한 추가는 필요하지 않다. 기존 Lambda의 완료 콜백을 그대로 사용한다.
- PDF.js 디코더·글꼴 파일은 프론트의 `prebuild`에서 생성하므로 프론트도 새 빌드를 배포한다.
- 프롬프트·출력 검증의 경력 최대 5개 제한은 기존 PDF Lambda의 ZIP도 갱신해야 적용된다.
  같은 함수 이름·기존 실행 역할·업로드 트리거·콜백 설정을 유지한다. Bedrock 전환은 별도 작업이다.
- 병합만으로 수동 Lambda ZIP 배포까지 완료되지는 않는다. Dev에서 새 PDF를 올린 후 콜백 DB 반영,
  진행률 종료와 원본 PDF 표시까지 확인한다. 기존 저장 결과는 프롬프트 변경으로 재분석되지 않는다.
