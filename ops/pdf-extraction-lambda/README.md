# 여러 PDF 업로드와 추출 확인

이번 범위는 파일별 presigned 업로드, 실제 PDFium 텍스트·이미지 추출, 본인 결과 확인이다.
심사 생성·배우 정보 정규화·OCR·얼굴/로고 분류·Bedrock·SQS·DLQ·공유 IAM 변경은 포함하지 않는다.
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
Lambda가 원본을 읽어 PNG를 저장한 뒤 result.json을 마지막에 쓴다. Spring은 소유권을 확인한 후 그 결과를 읽는다.
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
- 로컬 브라우저 업로드 → 실제 Lambda 컨테이너 → 결과 확인까지만 검증했다. AWS 운영 환경의 전체 흐름은 아직 검증하지 않았다.
- LocalStack 컨테이너의 Docker health가 unhealthy로 표시돼도 API와 Lambda는 동작했다. health 표시만으로 재시작하거나 삭제하지 않는다.
- 실제 AWS 배포 전에는 비공개 버킷에서 서명 없는 GET이 차단되는지와 서명 주소의 만료·CORS를 따로 확인한다.

## 실제 AWS 배포 조건

이 변경은 실제 AWS 리소스를 자동 생성하거나 수정하지 않는다. 운영 기능은 기본 비활성이다.

1. `YESULIN_PDF_EXTRACTION_ENABLED=true`로 Spring mapping을 활성화한다.
2. S3 key prefix와 worker 환경 변수를 같은 환경으로 맞춘다. 예: Spring prefix가 `yesulin/dev`이면
   `PDF_INPUT_PREFIX=yesulin/dev/private/pdf-extractions/inputs/`, `PDF_RESULT_PREFIX=yesulin/dev/private/pdf-extractions/results/`다.
   `PDF_BUCKET`은 같은 비공개 버킷이다. 실제 AWS에서는 `PDF_S3_ENDPOINT`를 설정하지 않는다.
3. ZIP을 테스트용 추출 함수에 배포하고 handler를 `s3_handler.handler`로 지정한다.
   Python 3.12 / ARM64 / 메모리 1024MB / timeout 120초 / 임시 디스크 512MB가 초기값이다.
4. **inputs prefix + `/source.pdf` suffix만** ObjectCreated 트리거 대상으로 삼는다. 결과 저장이 재호출을 만들면 안 된다.
5. 실행 역할의 원본 GetObject, 결과 GetObject/PutObject, 해당 prefix ListBucket, 로그 권한을 검증한다.
   Spring도 원본 확인과 결과 읽기에 필요한 읽기·목록 권한이 있어야 한다. 기존 explicit deny는 Allow 추가만으로 해결되지 않는다.
6. 버킷 CORS에 프론트 origin의 PUT/GET/HEAD와 `Content-Type`, `If-None-Match`를 허용한다.
   이번 변경에서 공유 정책·IAM 역할·기존 함수·버킷 CORS를 수정하지 않는다.

현재 실제 AWS의 원본 읽기 정책 차단은 별도 해결해야 한다. 로컬 성공을 실제 AWS 전체 흐름 성공으로 보고하지 않는다.
일반 presigned URL은 객체 한 개용이다. 여러 파일에는 각각 URL을 발급하고 업로드를 제한된 동시성으로 실행한다.
S3 멀티파트 업로드는 큰 파일 하나를 여러 조각으로 보내는 방식이며 여러 PDF 업로드와 구분한다.

## 실패와 재실행

원본은 `inputs/{jobId}/source.pdf`, 결과는 `results/{jobId}/pdfium-v1/result.json`이다.
원본은 conditional PUT으로 덮어쓰지 않는다. 업로드 완료 확인은 HEAD와 PDF 서명을 검사하며 Lambda를 호출하지 않는다.
presigned URL이 만료돼도 본인 job의 기존 원본이 검증을 통과하면 completion으로 복구할 수 있다.
같은 job·원본 identity·옵션·추출기 버전의 재호출은 완료 manifest를 재사용한다. 동시 중복 실행까지 한 번으로 보장하지는 않는다.
별도 job에 올린 바이트가 같은 PDF의 SHA 기반 전역 중복 제거도 이번 범위가 아니다.

손상 PDF·페이지 상한·결과 2MiB 상한 등은 FAILED manifest로 저장한다. 이미지 일부 실패는 PARTIAL과 경고를 남긴다.
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
