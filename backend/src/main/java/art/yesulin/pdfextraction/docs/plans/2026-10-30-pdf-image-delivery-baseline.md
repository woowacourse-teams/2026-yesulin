# PDF 추출 사진 전달 기준선

> 상태: **측정 기록·1차 개선 적용(로컬 측정)**. 정본이 아니다. 정책은 [저장·멱등·실패](../policies/pdf-processing.md)를 따른다.
> 기준선은 `dev` `3721eac5`(2026-10-30), 개선 전 재측정과 개선은 `dev` `27d0bec1`(2026-11-08) 위에서 했다.
> 아래 "현재 흐름"과 "기준선 결과"는 10/30 기록이다. 11/8에 바뀐 구조는 [다시 확인한 구조](#다시-확인한-구조-2026-11-08)에 있다.

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
| 카드에 작게 보여도 긴 변 1600px 원본 하나만 있다. 썸네일이 없다. | [extraction.py:25](../../../../../../../../../ops/pdf-extraction-lambda/src/application/extraction.py), `screening-ui/applicant-photo.tsx:41`(10/30 당시, #533에서 삭제) |
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

## 실제 환경에서 더 확인할 것 (10/30 기록)

11/8 기준 남은 확인은 [아직 확인하지 않은 것](#아직-확인하지-않은-것)에 있다. 카드 사진 요청은 #533 이후 없다.

1. Dev·Prod의 실제 사진 크기. 아직 실행하지 않았다.
   - DB의 `pdf_extraction_payloads`는 Spring이 다시 만든 결과라 사진 크기(`sizeBytes`)가 없다.
   - S3 결과 폴더의 PNG 객체 크기를 읽기 전용으로 센다. 버킷과 키 접두사는 환경 설정 값이다.

   ```bash
   aws s3api list-objects-v2 --bucket <bucket> --prefix "<keyPrefix>private/pdf-extractions/results/" --query "Contents[?contains(Key, '/images/')].Size" --output text
   ```

   - 분류(`CANDIDATE`)까지 보려면 같은 폴더의 Lambda `result.json`에서 `sizeBytes`와 `classification`을 읽는다.

2. Dev 브라우저 네트워크 탭에서 카드 보기를 처음 열 때와 보기를 한 번 바꿨을 때의 이미지 요청 수·전송량, 첫 화면 사진이 다 뜨는 시간.
3. 실제 결과 API 응답 크기와 서명 URL 길이. 위 JSON 추정값을 이 값으로 바꾼다.

## 다시 확인한 구조 (2026-11-08)

#533(원본 PDF 중심 심사) 이후 카드·표 보기는 지원자 결과와 사진을 받지 않는다. 기준선의 "보드 한 번 338.7 MiB"는
최적화 없이 0이 됐다. 남은 비효율은 다음 두 가지였다.

| 비효율 | 위치(11/8 dev) |
| --- | --- |
| 심사 화면이 쓰지 않는 심사 PDF의 사진을 Lambda가 무압축 PNG로 계속 저장한다. 300건이면 약 672 MiB다. | `s3_handler.py`의 `extractImages: True`, `extraction.py`의 PNG 저장 |
| 한 명씩 심사할 때 지원서를 열 때마다 결과를 다시 조회하고 원본 PDF를 `no-store`로 다시 받는다. 다음 지원서를 미리 받지 않는다. | `review-original-document.tsx` |

추출 사진을 쓰는 곳은 배우 프로필 가져오기(사진 보관함 복사)와 개발용 진단 화면뿐이다. 심사 화면과 AI는 사진을 쓰지 않는다.

## 적용한 개선 (2026-11-08)

1. **심사 PDF는 사진을 추출하지 않는다.** S3 트리거가 키에 reviewId가 있으면 `extractImages: false`로 실행한다.
   원본 PDF 안의 사진은 심사 화면에서 그대로 보인다.
2. **추출 사진은 WebP(품질 85)로 저장한다.** 배우 프로필·진단 경로만 해당한다. Spring은 `.webp`와 이전 결과의 `.png`를 함께 받고,
   배우 사진 보관함 복사본의 형식도 원본 확장자를 따른다.
3. **원본 PDF를 탭 메모리에서 다시 쓴다.** 한 명씩 보기와 합격자 연락처가 받은 원본을 Blob으로 최근 3개까지 두고,
   다음 지원서 원본을 미리 받는다. S3 응답의 `no-store`와 디스크 캐시 금지는 그대로다. 미리 받기는 분석 이벤트를 만들지 않는다.

## 개선 후 결과 (2026-11-08)

같은 합성 PDF 300개(사진 1~3장)로 측정했다. "로컬 Lambda"는 LocalStack에서 ARM64 Lambda를 에뮬레이션한 값이라
절대 시간보다 전후 비율을 본다.

| 항목 | 개선 전 | 개선 후 | 측정 방법 |
| --- | --- | --- | --- |
| 심사 PDF 300건의 추출 사진 (S3) | 600장 · 677.0 MiB | 0장 · 0 MiB | LocalStack 실제 업로드 후 S3 목록 |
| 심사 PDF 300건 S3 쓰기 수 | 900회 | 300회 | 사진 + result.json |
| 심사 PDF 추출 시간 중앙값 (로컬 Lambda) | 3,262 ms | 40 ms | result.json `durationMs` |
| 심사 PDF 추출 시간 합계 (로컬 Lambda) | 853 s | 12.5 s | 같은 값의 합 |
| 배우·진단 추출 사진 한 장 평균 | 1,147 KiB | 51 KiB | `measure_image_delivery.py --purpose profile` |
| 배우·진단 추출 사진 300명 합계 | 672.0 MiB | 30.2 MiB | 같은 명령 |
| 배우·진단 추출 시간 중앙값 (로컬 Python) | 412 ms | 439 ms | 같은 명령, 실행마다 수십 ms 흔들림 |
| 한 명씩 10번 이동 중 클릭 뒤 원본을 기다린 횟수 | 10회 | 1회 | 개발 서버 브라우저, 다음 5·이전 2·다음 3 |
| 같은 10번 이동 중 이미 본 원본을 다시 받은 횟수 | 4회 | 2회(그중 기다린 것 1회) | 미리 받기 1칸을 빼면 지나온 지원서는 1명만 보관된다 |
| 원본 표시까지 걸린 시간 중앙값 (로컬) | 156 ms | 63 ms | 클릭부터 첫 canvas까지, 네트워크 지연 없음 |

- 개선 전 재측정(`before-2026-11-08`)은 10/30 기준선과 사진 수치가 같다(672.0 MiB, 평균 1,147 KiB).
  LocalStack의 677.0 MiB는 Lambda 고정 버전(pypdfium2 5.14.0, Pillow 12.3.0)으로 만든 값이다.
- 한 명씩 보기는 개선 후에도 이동 1회당 원본 1개를 받는다. 다만 다음 지원서를 미리 받으므로 클릭 뒤에 기다리지 않는다.
  개발 서버의 StrictMode 때문에 개선 전 결과 조회가 이동마다 2번(1번은 취소) 찍혔다. 운영 빌드에서는 1번이다.
- 로컬은 같은 PC의 LocalStack이라 원본 다운로드 지연이 거의 없다. 실제 네트워크에서는 원본 크기만큼 차이가 커진다.

### 아직 확인하지 않은 것

- Dev·Prod Lambda 배포 뒤 실제 S3 크기와 처리 시간
- Dev 브라우저 네트워크 탭의 실제 원본 다운로드 시간
- 실제 지원서(스캔·고해상도 사진)의 WebP 품질과 크기. 측정은 저장소 데모 사진만 썼다.

## 다시 측정하는 방법

```bash
cd ops/pdf-extraction-lambda
python scripts/measure_image_delivery.py --count 300 --purpose review --label after-review-<날짜>
python scripts/measure_image_delivery.py --count 300 --purpose profile --label after-profile-<날짜>
```

- 가정(`--count 300`, `--photos 1,2,3`)은 바꾸지 않는다. `--purpose`는 S3 트리거와 같은 옵션을 고른다. 기본은 `review`다.
- 결과 JSON의 `detailJsonMiB`는 지원자 300명을 한 번씩 열 때의 결과 조회 합계 추정이다.
  10/30 기준선의 `boardJsonMiB`와 같은 계산이며, 카드 사진 계산(`boardPhoto*`)은 화면에서 사라져 뺐다.

## 정하지 않은 것

- `PIPELINE_VERSION`은 올리지 않았다. 결과 경로와 Spring 검증이 `pdfium-v1`에 묶여 있고, 이전 PNG 결과를 그대로 읽는다.
- 썸네일은 만들지 않았다. 지금 화면에 작은 사진을 보여 주는 곳이 없다.
- 원본 PDF의 브라우저 디스크 캐시(`private` 캐시)는 개인정보 보관 정책 결정이 필요해 적용하지 않았다.
