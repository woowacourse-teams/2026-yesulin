# PDF 추출 사진 전달 기준선

> 상태: **측정 기록·개선 전**. 정본이 아니다. 기준 코드는 `dev` `3721eac5`(2026-10-30)다.
> 개선은 스프린트 4에서 한다. 이 문서는 개선 전 구조와 수치를 고정해 개선 후와 비교하기 위해 둔다.
> 아래 "개선 후보"는 결정이 아니다.

## 가정

- 심사 하나에 지원서 PDF 300개가 한 번에 올라온다.
- 지원서 하나에 사진 1~3장(평균 2장)이 들어 있다. 사진은 워드프로세서가 JPEG로 넣은 형태다.

## 현재 흐름

```text
[브라우저] PDF 300개 업로드 ──► S3 source.pdf
                                   │
[Lambda]  PDF 안의 사진(JPEG) ──► 긴 변 1600px 이하로 다시 그려 **무압축 PNG** 저장
                                   │  S3 results/.../images/page-NNN-image-NNN.png  (Cache-Control: no-store)
[Spring]  결과 조회(includeResult=true)마다 사진마다 새 서명 URL(10분, response no-store) 발급
                                   │
[화면]    카드·표 보기: 현재 탭에 보이는 지원자(최대 300명) 결과 JSON을 4개씩 동시에 전부 받음
          └ 카드마다 첫 사진 = 1600px PNG 원본을 그대로 받음(next/image unoptimized, 썸네일 없음)
          보기·필터·판정 탭을 바꾸면 보드가 다시 마운트 → 캐시 없이 그 탭의 지원자 전부 재조회 → 새 URL → 사진 다시 받음
          보드가 다시 조회할 때(예: 한 명 보기에서 돌아올 때) 5분이 지난 항목도 재조회 → 새 URL → 사진 다시 받음
```

| 비효율 | 위치 |
| --- | --- |
| PDF 안의 JPEG를 무압축 PNG로 다시 저장한다. 원래보다 약 5.5배 커진다. | [extraction.py:64](../../../../../../../../../ops/pdf-extraction-lambda/src/application/extraction.py) |
| 카드에 작게 보여도 긴 변 1600px 원본 하나만 있다. 썸네일이 없다. | [extraction.py:25](../../../../../../../../../ops/pdf-extraction-lambda/src/application/extraction.py), [applicant-photo.tsx:41](../../../../../../../../../frontend/src/components/pdf-reviews/screening-ui/applicant-photo.tsx) |
| S3 객체와 서명 URL 응답이 모두 `no-store`라 브라우저가 저장하지 않는다. | [aws_storage.py:58](../../../../../../../../../ops/pdf-extraction-lambda/src/infrastructure/aws_storage.py), [S3PrivateObjects.java:136](../../../infrastructure/storage/S3PrivateObjects.java) |
| 조회할 때마다 서명 URL이 바뀌어 같은 사진도 새 주소가 된다. | [PdfExtractionService.java:113](../../application/PdfExtractionService.java) |
| 보드 키에 필터·판정·보기가 들어 있어, 바꿀 때마다 그 탭의 결과를 캐시 없이 다시 받는다. 남아 있는 보드의 캐시도 5분이다(타이머로 자동 재조회하지는 않는다). | [pdf-review-workbench.tsx:152](../../../../../../../../../frontend/src/components/pdf-reviews/pdf-review-workbench.tsx), [screening-board.tsx:61](../../../../../../../../../frontend/src/components/pdf-reviews/screening-board.tsx) |

CDN은 쓰지 않는다. 지원서 사진은 비공개 개인정보라서 공개 캐시(CloudFront 공개 경로)에 올리지 않는 것이 의도다.

## 측정 방법

```bash
cd ops/pdf-extraction-lambda
python scripts/measure_image_delivery.py --count 300 --label baseline-2026-10-30
```

- [`scripts/measure_image_delivery.py`](../../../../../../../../../ops/pdf-extraction-lambda/scripts/measure_image_delivery.py)는
  합성 PDF 300개를 만들고, 현재 Lambda의 `extract_pdf`를 로컬에서 그대로 돌린다.
  옵션은 운영 S3 트리거와 같다(기본 `Limits`, 사진 추출 켬, 텍스트 영역 끔).
  결과는 Git에서 제외된 `output/image-delivery/<label>/`의 `summary.json`과 `rows.json`에 남는다.
- 사진은 저장소의 데모 지원자 이미지(`frontend/public/images/applicants/kim-harin-*`)를 JPEG 90으로 넣는다. 실제 지원서는 쓰지 않는다.
- 측정한 값: PDF 크기, 추출 사진 수·크기·픽셀, 추출 시간, Lambda 결과 JSON 크기.
- 계산한 값(코드 동작 기준): 보드 한 번의 요청 수와 전송량.
  - 결과 JSON = 페이지 텍스트 + 사진별 항목. 다음 값을 가정했다.
    - 서명 URL 1,300B(세션 토큰 포함)
    - fileKey 120B
    - AI 결과 1,500B
    - 나머지 작업 필드 600B
  - 사진 = 지원자마다 첫 `CANDIDATE` 사진 1장.
- 텍스트는 Helvetica ASCII 문장이다. 한글 원문의 JSON 크기와는 다르며, 사진 전송량에는 영향이 없다.
- 로컬 환경: Windows AMD64, Python 3.12.8.
  - pypdfium2 5.13.0, Pillow 12.2.0. Lambda 고정 버전은 5.14.0, 12.3.0이다.
  - 추출 시간은 Lambda ARM64와 다르고 실행마다 수십 ms씩 흔들린다. 같은 PC에서 전후를 비교할 때만 쓴다.

## 기준선 결과 (2026-10-30, 개선 전)

| 항목 | 값 |
| --- | --- |
| 업로드 PDF 합계 | 122.3 MiB (300개) |
| PDF 안에 들어 있던 사진(JPEG) 합계 | 121.6 MiB |
| 추출 사진 수 | 600장 (모두 `CANDIDATE`) |
| 추출 사진 한 장 평균 | **1,147 KiB** (PNG, 긴 변 최대 1600px) |
| 추출 사진 저장 합계 | **672.0 MiB** (원래 JPEG의 약 5.5배) |
| 추출 시간 (PDF 1개, 로컬) | 중앙값 572ms, p95 790ms |
| 보드 한 번: 결과 JSON | 300회 요청, 약 3.1 MiB (추정) |
| 보드 한 번: 카드 첫 사진 | 300회 요청, **338.7 MiB** |
| 보드 한 번: 합계 | **약 341.8 MiB** |
| 지원자를 모두 한 번씩 열어 본 경우의 사진 | 672.0 MiB |

- 카드 사진은 lazy loading이라 화면 근처에 온 만큼만 받는다. 위 338.7 MiB는 300명이 한 탭에 있고 끝까지 스크롤했을 때의 양이다.
- 보기·필터·판정을 바꾸면 그 탭의 양을 다시 받는다. 브라우저 캐시가 없으므로 줄어들지 않는다.
- 참고 환산: 338.7 MiB는 100Mbps에서 약 28초, 30Mbps에서 약 95초다(전송만, 동시 연결 제한 미포함).

## 실제 환경에서 더 확인할 것 (미확인)

1. Dev·Prod의 실제 사진 크기. 아직 실행하지 않았다.
   - DB의 `pdf_extraction_payloads`는 Spring이 다시 만든 결과라 사진 크기(`sizeBytes`)가 없다.
   - S3 결과 폴더의 PNG 객체 크기를 읽기 전용으로 센다. 버킷과 키 접두사는 환경 설정 값이다.

   ```bash
   aws s3api list-objects-v2 --bucket <bucket> --prefix "<keyPrefix>private/pdf-extractions/results/" --query "Contents[?ends_with(Key, '.png')].Size" --output text
   ```

   - 분류(`CANDIDATE`)까지 보려면 같은 폴더의 Lambda `result.json`에서 `sizeBytes`와 `classification`을 읽는다.

2. Dev 브라우저 네트워크 탭에서 카드 보기를 처음 열 때와 보기를 한 번 바꿨을 때의 이미지 요청 수·전송량, 첫 화면 사진이 다 뜨는 시간.
3. 실제 결과 API 응답 크기와 서명 URL 길이. 위 JSON 추정값을 이 값으로 바꾼다.

## 개선 후 비교 방법 (스프린트 4)

- 같은 명령을 `--label after-<변경>`으로 다시 돌린다. 가정(`--count 300`, `--photos 1,2,3`)은 바꾸지 않는다.
- 썸네일을 추가하면 보드 사진 계산을 썸네일 크기 기준으로 바꾼다. 그때 바꾼 계산식도 같이 기록한다.
- 아래 표를 채워 PR과 스프린트 기록에 쓴다.

| 항목 | 개선 전 | 개선 후 | 변화 |
| --- | --- | --- | --- |
| 추출 사진 한 장 평균 | 1,147 KiB | | |
| 추출 사진 저장 합계 (300명) | 672.0 MiB | | |
| 보드 한 번 사진 전송량 | 338.7 MiB | | |
| 보기 전환 시 다시 받는 양 | 338.7 MiB | | |
| 추출 시간 중앙값 (로컬) | 572ms | | |
| Dev 첫 화면 사진 표시 시간 | 미측정 | | |

## 개선 후보 (결정 아님)

- Lambda에서 WebP 또는 JPEG로 압축해 저장한다. Spring의 `.png` 파일명 검사([PdfExtractionResultParser.java:100](../../application/PdfExtractionResultParser.java))와
  배우 프로필 사진 저장의 `image/png`([ProfileImportService.java:139](../../../actor/application/profileimport/ProfileImportService.java))를 같이 바꾼다.
  결과가 달라지므로 `PIPELINE_VERSION`을 올릴지 정해야 한다.
- 카드용 썸네일(예: 긴 변 400px)을 따로 만들고, 크게 볼 때만 원본을 받는다.
- 보드를 다시 마운트해도 받은 결과와 서명 URL을 유효 시간 안에서 재사용하거나, 짧은 `private` 캐시를 허용한다. 개인정보 보관과 관련된 결정이다.
- 사람이 직접 올리는 사진을 브라우저에서 WebP로 바꾸는 별도 작업(미병합)의 기준인 품질 0.85·긴 변 제한을 참고한다.
  그 작업은 PDF 추출 사진에 바로 적용되지 않는다.
