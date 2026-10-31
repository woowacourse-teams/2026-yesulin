# PDF Lambda: 텍스트·이미지 추출과 직접 콜백

현재 실행 경로는 **S3 업로드 → Lambda PDFium 추출 → Spring 완료 API → 공용 DB AI 작업 → 결과 반영**이다.
공연사 심사와 배우 프로필 가져오기가 같은 추출 계약을 사용한다. Lambda는 모델을 호출하지 않는다.
Spring에 PDF Python 프로세스·대기열·추출 스케줄러를 설치하지 않는다.

## 코드와 책임

- `src/s3_handler.py`: 허용 버킷·원본 키의 ObjectCreated만 처리한다.
- `src/application/jobs.py`: 원본 검사·다운로드·추출·이미지/캐시 저장·결과 통지.
- `src/application/extraction.py`: 유일한 PDFium 추출기 구현. backend 리소스에 의존하지 않는다.
- `src/application/completion.py`: 추출 결과를 완료 API body로 조립한다.
- `src/infrastructure/completion_api.py`: 인증 POST. 실패하면 예외를 올려 Lambda 재시도 대상으로 남긴다.
- `scripts/build.py`: Python 3.12 Linux ARM64 wheel과 위 소스를 ZIP으로 묶는다.
- Spring `pdfextraction`: 공용 업로드·수신·저장·AI 작업·목적별 결과. `audit`: 심사·배역·메모·판정.

[공용 PDF 흐름·정책](../../backend/src/main/java/art/yesulin/pdfextraction/docs/README.md),
[심사 흐름](../../backend/src/main/java/art/yesulin/audit/docs/README.md),
[HTTP 계약](../../backend/docs/api.md#pdf-추출-확인)을 따른다.

## S3 경계

물리 key는 환경 prefix + 아래 상대 경로다.

- 심사 원본: `inputs/{reviewId}/{jobId}/source.pdf`
- 독립/배우 원본: `inputs/{jobId}/source.pdf`
- 이미지·캐시: 같은 scope의 `results/.../pdfium-v1/`

ObjectCreated prefix는 `inputs/`, suffix는 `/source.pdf`다. `results/`가 다시 추출을 일으키지 않는다.
키는 Spring이 만들고 제목·파일명을 경로에 쓰지 않는다. 공개 CDN 대신 signed GET으로 원본/이미지를 본다.
`result.json`은 Lambda 재시도 캐시다. Spring 조회는 DB 저장본을 읽는다.

## 멱등·실패

동일 원본의 추출 캐시와 이미지 저장을 재사용하고, 동일 callback은 Spring이 한 번만 반영한다.
과거에 전송한 applicant-info v1/v2 캐시가 있으면 sourceFingerprint를 확인해 같은 payload를 재전송한다.
이 호환은 모델 재호출이나 이전 모델 문맥 조회를 요구하지 않는다.

콜백 실패를 성공으로 감추지 않는다. 비동기 재시도에는 횟수·수명 한계가 있으며 최종 유실 자동 복구는 미완료다.
S3 이벤트는 중복될 수 있다. 실행/과금까지 정확히 한 번을 보장하지 않는다.
새 jobId로 같은 PDF를 다시 접수하는 중복 방지도 아직 별도 과제다.

## 배포

Python 3.12 환경에서:

```bash
python scripts/build.py
```

출력: `build/yesulin-pdf-extractor-arm64.zip`, `build/package-manifest.json`.
ZIP·이미지·PDF·실험 결과·로그·키는 커밋하지 않는다.

Lambda 설정: Python 3.12 / ARM64 / `s3_handler.handler`.
운영 환경 변수는 다음 추출·콜백 설정만 사용한다.

- `PDF_BUCKET`
- `PDF_INPUT_PREFIX`
- `PDF_RESULT_PREFIX`
- `PDF_COMPLETION_API_URL`
- `PDF_COMPLETION_API_TOKEN` (32자 이상 전용 비밀)

새 서버의 공용 AI·목적별 배우 처리까지 배포한 뒤 추출 전용 ZIP과 새 작업으로 전체 흐름을 확인한다.
삭제한 모델 문맥 API를 호출하는 옛 배포 함수를 그대로 두고 서버를 교체하지 않는다.

| 환경 | 함수 | 원본 prefix | 콜백 |
| --- | --- | --- | --- |
| Dev | `yesulin-pdf-benchmark-dev` | `yesulin/dev/private/pdf-extractions/inputs/` | `https://dev-api.yesulin.art/internal/v1/pdf-extractions/completions` |
| Prod | `yesulin-pdf-extractor-prod` | `yesulin/prod/private/pdf-extractions/inputs/` | `https://api.yesulin.art/internal/v1/pdf-extractions/completions` |

두 함수 모두 버킷 `techcourse-project-2026`, 실행 역할 `lambda-basic`, 같은 ZIP을 쓴다.
결과 prefix는 원본 prefix의 `inputs/`를 `results/`로 바꾼 값이고, 콜백 토큰은 같은 환경의
`YESULIN_PDF_EXTRACTION_CALLBACK_SECRET`이다.

공용 버킷 정책은 `lambda-basic`을 함수 세션(`aws:userid` = `역할ID:함수이름`)으로 구분한다.
함수마다 `yesulin/*` 공개 읽기 거부 예외, 자기 환경 PDF 경로 밖 읽기 거부, 자기 환경 PDF를 서버 역할·함수 외 읽기 거부,
원본·결과 읽기, 결과 쓰기, 결과 목록 조회 문이 있다. 함수 이름을 바꾸거나 환경을 추가하면 이 문들도 함께 바꾼다.

Dev의 추출 전용 함수 전환과 EC2의 모델 단독 호출은 이전에 확인했다.
Prod 함수·트리거는 미리 만들어 두었고, 2026-10-31에 설정이 Dev와 같음을 확인하고 버킷 정책에 Prod 문을 추가했다.
Prod 실제 업로드 전체 경로,
Prod EC2 역할(`ec2-project`)의 Bedrock 호출, 300건 부하는 별도 확인이 필요하다.

## 로컬

기존 `local` 프로필과 `application-local.yml`을 쓴다. 상세 값은
[공통 실행 문서](../../docs/local-development.md#pdf-심사-로컬-실행)가 정본이다.

```bash
docker compose -f compose.local.yml up -d
python scripts/build.py
python scripts/setup_local.py
```

setup은 `localhost:4568` LocalStack만 사용하고 가짜 키를 명시한다. 실제 AWS 인증을 찾지 않는다.
원본 PUT이 LocalStack Lambda를 실행하며 `host.docker.internal:8093`의 Spring 완료 API로 전달한다.
Lambda에는 Gemini 키를 넘기지 않는다. 로컬 AI는 기본 꺼짐이고 Spring Gemini 어댑터를 명시적으로 켠 경우만 호출한다.
`--storage-only`는 로컬 S3만 준비하는 진단 옵션이며 서버 PDF 추출 모드가 아니다.

## 검증과 합성 자료

```bash
PYTHONPATH=src python -m unittest discover -s tests/application -v
```

현재 실행 경로의 추출·이미지 분류·캐시·콜백·레거시 fingerprint 호환을 검증한다.
삭제한 옛 Python AI 프롬프트/probe의 자기 테스트는 현재 Spring AI 품질 근거로 사용하지 않는다.

`tests/fixtures/applicant-quality.json`과 `scripts/make_quality_pdfs.py`는 합성 추출/품질 자료 생성용이다.
한국어 TrueType 글꼴을 지정해 `python scripts/make_quality_pdfs.py --font /path/to/korean.ttf`로 생성한다.
실제 지원서나 개인 키를 fixtures에 넣지 않는다. 모델 품질은 Spring 프롬프트·파서와 별도 평가 표본으로 검증한다.
