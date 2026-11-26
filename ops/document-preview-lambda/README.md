# 공연사 지원서 PDF 미리보기

Spring이 심사 소유권과 원본 정보를 확인해 서명한 파일만 비공개 S3에 올린다.
PDF는 기존 추출기가 직접 받는다. 비PDF는 원본 전용 경로의 S3 이벤트를 SQS에 넣고 파일당 한 호출로 변환한다.
변환기는 LibreOffice(DOCX·PPTX) 또는 ahwp(HWP·HWPX)로 PDF를 만든다. Spring에 파생본 정보를 먼저 확정한 뒤 동일한 바이트를 기존 추출기의 입력에 게시한다.
공연사 원본과 미리보기는 각각 권한 확인 후 열람한다.

## 패키지와 검증

이 디렉터리에서 Linux AMD64 Lambda 이미지를 만든다. 코드, 변환기 버전, 글꼴 묶음까지 포함한 이미지를 검증 후 ECR digest로 고정한다.

```sh
docker build --platform linux/amd64 --provenance=false -t yesulin-review-preview .
docker run --rm --platform linux/amd64 --network none --entrypoint python -v "$PWD/tests:/tests:ro" yesulin-review-preview -m unittest discover -s /tests
cfn-lint stack.yaml
```

## 기존 버킷 연결

1. 기존 추출기가 사용하는 리전·계정의 비공개 버킷, 환경별 실제 prefix, Spring 콜백 URL과 같은 인증 값을 담은 Secrets Manager 문자열을 준비한다. DB 마이그레이션과 서버·프론트 버전을 배포한다. 새 형식의 발급은 환경별 설정으로 연다.
2. `stack.yaml`을 64자 이내 이름으로 배포한다. 파라미터는 `Bucket`, `StorageRoot`(예: `yesulin/dev/private/pdf-extractions/`), ECR `ImageUri`, `CallbackUrl`, `CallbackSecret`이다. 같은 환경의 작업만 처리하도록 스택당 역할 한 개와 SQS/DLQ를 만든다. 콜백 비밀을 변경하면 함수 환경도 새 버전으로 갱신한다.
3. 기존 공유 버킷의 명시적 거부 정책이 적용된 경우, 이 역할과 환경 경로에 한해 읽기·파생본 쓰기를 허용한다. Spring 서명 역할에는 원본 PUT·GET 및 파생 PDF GET이 필요하다. SSE-KMS 버킷에서는 해당 키 권한도 맞춘다. 브라우저 PUT은 기존 심사 업로드 CORS(서명된 Content-Type·체크섬·If-None-Match 헤더)를 사용한다.
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
