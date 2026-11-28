# 공연사 지원서 PDF 미리보기

Spring이 심사 소유권과 원본 정보를 확인해 서명한 파일만 비공개 S3에 올린다.
PDF는 기존 추출기가 직접 받는다. 기본 스택은 비PDF 원본 경로의 S3 이벤트를 SQS에 넣고 파일당 한 호출로 변환한다.
변환기는 LibreOffice(DOCX·PPTX) 또는 ahwp(HWP·HWPX)로 PDF를 만든다. Spring에 파생본 정보를 먼저 확정한 뒤 동일한 바이트를 기존 추출기의 입력에 게시한다.
공연사 원본과 미리보기는 각각 권한 확인 후 열람한다.

## 패키지와 검증

이 디렉터리에서 Linux AMD64 Lambda 이미지를 만든다. 코드, 변환기 버전, 글꼴 묶음까지 포함한 이미지를 검증 후 ECR digest로 고정한다.

```sh
docker build --platform linux/amd64 --provenance=false -t yesulin-review-preview .
docker run --rm --platform linux/amd64 --network none --entrypoint python -v "$PWD/tests:/tests:ro" -v "$PWD/queue_notification.py:/var/task/queue_notification.py:ro" yesulin-review-preview -m unittest discover -s /tests
cfn-lint stack.yaml
```

### 개발 계정의 기존 엔진 레이어로 ZIP 만들기

서울 개발 계정에 게시된 `yesulin-office-bench-20261126-part1`부터 `part4`까지 각각 버전 1을 함께 사용한다.
네 레이어는 LibreOffice 엔진 조각이다. 함수 ZIP에는 서비스 핸들러, ahwp 2.1.1, 글꼴, 입력 형식 검사기와 PDF 페이지 수 검사기가 들어간다.
AWS 런타임은 Python 3.12, x86_64다. `stack.yaml`은 ECR 이미지와 SQS 핸들러 `worker.handler`를 사용한다.

```sh
python -m pip download --no-deps --only-binary=:all: --platform manylinux_2_17_x86_64 \
  --dest wheels olefile==0.47 pypdfium2==5.14.0
python3 zip/build.py yesulin-office-ahwp-combined.zip wheels review-documents.zip
```

빌드에 Python 3.11 이상이 필요하다. 첫 인자는 개발 실험에서 검증한 통합 엔진 ZIP이다. 빌드 시 입력과 두 wheel의 SHA-256을 확인하고
실험용 지원서 및 벤치 핸들러를 제외한다. DOCX·PPTX 처리 시 같은 실행 환경을 이전 문서가 사용했을 수 있으므로
매 작업마다 읽기 전용 레이어에서 엔진을 복원하고 검증한다. 배포한 네 레이어와 함수 ZIP을 합쳐 250MiB 이하여야 한다.
개발용 직접 알림은 `worker.direct_handler`에 연결한다. S3의 호출 권한은 해당 버킷 ARN과 소유 계정으로 제한하고,
`s3:ObjectCreated:*`에는 `yesulin/dev/private/pdf-extractions/originals/` 접두사를 지정한다.
이 경로에는 하나의 알림 대상만 둔다. 다른 환경과 기존 PDF 알림은 보존한다.
핸들러는 S3 테스트 이벤트를 수락하고, 잘못된 경로·일시적 실패에는 예외를 반환해 Lambda의 비동기 재시도를 유도한다.
같은 원본을 다시 받으면 이미 저장한 미리보기와 체크섬을 재사용한다. dev 전용 스토리지 권한과 인증된 Spring 콜백이 필요하다.

### 운영 변환기의 작업별 S3 접근

`worker.direct_handler`는 S3 원본 생성 이벤트를 받는다. 운영 함수에 `DOCUMENT_PREVIEW_STORAGE_MODE=presigned`와
`DOCUMENT_PREVIEW_TRANSFER_TOKEN`을 설정한다. Spring의 전송 API에도 같은 토큰을 설정하고, 기존 완료 콜백 토큰은 별도로 유지한다.
`PDF_BUCKET`과 세 경로는 해당 버킷의 실제 키를 기준으로 설정한다. 서명 URL에는 Lambda와 같은 리전의 S3 엔드포인트를 사용한다.

1. 함수가 완료 콜백과 같은 서버의 `/internal/v1/pdf-extractions/preview-transfers`에 작업 ID, 원본 키, 생성 이벤트의 ETag를 보낸다.
2. Spring이 DB의 지원서와 원본 객체를 확인하고, 해당 파일 하나와 요청 동작에만 유효한 URL을 발급한다. 함수가 원본을 내려받아 크기와 SHA-256을 확인한다.
3. READY인 작업은 확정된 미리보기를 재사용한다. PENDING인 작업은 변환된 PDF를 조건부 PUT으로 `previews/`에 저장한다. 이미 저장한 파일이 있어 412를 받으면 `PREVIEW_RECOVER`로 그 파일을 읽어 사용한다.
4. READY 콜백에 성공하면 같은 PDF 바이트를 `inputs/`에 게시한다. 재시도에서 이미 게시된 입력은 해시와 크기가 일치하는지 확인한다.

이 모드에서는 Spring의 서명 역할이 파일별 접근을 발급하므로 변환 함수의 실행 역할에 S3 객체 권한을 추가할 필요가 없다.
인증 실패, 잘못된 파일 메타데이터, 전송 장애는 호출 실패로 반환된다. 삭제된 지원서는 서버의 전용 404 코드로 확인한 후 종료한다.

## 기존 버킷 연결

1. 기존 추출기가 사용하는 리전·계정의 비공개 버킷, 환경별 실제 prefix, Spring 콜백 URL과 같은 인증 값을 담은 Secrets Manager 문자열을 준비한다. DB 마이그레이션과 서버·프론트 버전을 배포한다. 새 형식의 발급은 환경별 설정으로 연다.
2. `stack.yaml`을 64자 이내 이름으로 배포한다. 파라미터는 `Bucket`, `StorageRoot`(예: `yesulin/dev/private/pdf-extractions/`), ECR `ImageUri`, `CallbackUrl`, `CallbackSecret`이다. 같은 환경의 작업만 처리하도록 스택당 역할 한 개와 SQS/DLQ를 만든다. 콜백 비밀을 변경하면 함수 환경도 새 버전으로 갱신한다.
3. 기존 공유 버킷의 명시적 거부 정책이 적용된 경우, 이 역할과 환경 경로에 한해 읽기·파생본 쓰기를 허용한다. Spring 서명 역할에는 원본 PUT·GET 및 파생 PDF GET이 필요하다. `presigned` 모드에서는 같은 역할에 해당 환경의 `previews/`와 `inputs/` 객체에 대한 `s3:PutObject` 권한도 필요하다. SSE-KMS 버킷에서는 해당 키 권한도 맞춘다. 브라우저 PUT은 기존 심사 업로드 CORS(서명된 Content-Type·체크섬·If-None-Match 헤더)를 사용한다.
4. 버킷 알림은 전체 교체 API다. 다른 운영자와 동시에 편집하지 않는 시점에 현재 설정을 읽어 원본 경로 하나만 병합한다. `queue_notification.py`는 표준입출력만 사용하며 버킷을 직접 수정하지 않는다.

```sh
aws s3api get-bucket-notification-configuration --bucket "$REVIEW_BUCKET" > current.json
python3 queue_notification.py "$REVIEW_QUEUE_ARN" "$REVIEW_ORIGINAL_PREFIX" < current.json > merged.json
diff -u current.json merged.json
aws s3api put-bucket-notification-configuration --bucket "$REVIEW_BUCKET" --notification-configuration file://merged.json
```

기존 `inputs/.../source.pdf` 리스너와 다른 버킷 알림을 유지한다. 새 큐에는 `originals/` 하위의 생성만 보낸다. `previews/`와 `inputs/`를 같은 큐에 연결하면 안 된다. 버킷 목록, 버킷 정책, 서명 URL, 콜백 비밀을 저장소에 넣지 않는다.

5. 개발 환경에서 실제 브라우저 PUT → 큐 수신 → 파생 PDF 및 원본 다운로드 → 기존 추출 순서를 확인한 형식부터 `YESULIN_REVIEW_DOCUMENT_EXTENSIONS`로 연다. 예: `docx,pptx`. 한글은 `hwp,hwpx`를 명시한 환경에서만 시범 제공한다. 암호화·손상 파일 등 변환 불가 서류도 공연사가 원본을 받을 수 있는지 확인한다.
6. 처리 실패가 반복된 메시지는 DLQ에 남는다. 큐의 가장 오래된 메시지, DLQ 적체, Lambda 오류와 첫 열람 전 준비율을 확인한다. 일시 장애를 해소한 뒤 DLQ 메시지를 원래 큐로 redrive하면 불변 파생본을 재사용한다. 형식 설정을 닫으면 신규 접수만 제한한다. 이미 접수한 파일이 끝날 때까지 큐·워커를 유지한다.
