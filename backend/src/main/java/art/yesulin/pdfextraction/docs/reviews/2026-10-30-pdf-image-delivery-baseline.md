# 추출 사진 전달 기준선 평가표

- 작업 ID: `2026-10-30-pdfextraction-image-delivery-baseline`, 평가표 v1. 관련 문서는 `plans/2026-10-30-pdf-image-delivery-baseline.md`다.
- 코드 동작은 바꾸지 않는다. 개선 전 흐름 기록, 측정 스크립트, 기준선 수치만 남긴다.
- 실제 지원서·서명 URL·DB 값은 기록에 넣지 않는다.

| ID | 흐름 / 실패 조건 | 기대 결과와 검증 | 필수 |
| --- | --- | --- | --- |
| R01 | 흐름 기록 / 코드와 다른 설명 | PNG 저장·no-store·서명 URL·보드 재마운트·5분 캐시 설명이 dev `3721eac5` 코드와 일치. 코드 열람 | 예 |
| R02 | 측정 스크립트 / 운영 추출과 다른 경로 | 현재 `extract_pdf`와 기본 `Limits`를 그대로 호출. 코드 열람과 실행 | 예 |
| R03 | 기준선 수치 / 기록과 출력 불일치 | 문서 표의 값이 `output/image-delivery/baseline-2026-10-30/summary.json`과 일치 | 예 |
| R04 | 측정·추정 혼동 | 측정값, 코드 기반 계산값, 가정(URL 1,300B, 사진 1~3장, ASCII 텍스트)을 구분해 기록 | 예 |
| R05 | 재측정 / 개선 후 비교 불가 | 같은 명령을 `--label`만 바꿔 다시 돌릴 수 있고 결과가 Git 제외 폴더에 남음 | 예 |
| R06 | 개인정보 / 실제 지원서 사용 | 저장소 데모 이미지와 합성 문장만 사용. 산출물은 `.gitignore`의 `output/` | 예 |
| R07 | 정리 점검 / 미사용 코드·깨진 링크 | 새 스크립트의 미사용 import·변수 없음, 문서 상대 링크 존재 | 예 |
| R08 | 실제 환경 수치 / Dev·Prod와 다름 | Dev S3 결과 PNG 크기, 브라우저 네트워크 전송량, 실제 API 응답·URL 길이 확인 | 예 |

중단·복구·권한·수동 수정 보호는 코드 동작을 바꾸지 않으므로 N/A다.

## 검증 결과 (2026-10-30, Asia/Seoul)

- 독립 평가 1회 완료. 상대 평가 도구(Codex)를 쓸 수 없어 별도 읽기 전용 에이전트로 평가했다.
- 최초 판정: R01 FAIL, R02 조건부 PASS, R03 PASS, R04 FAIL, R05 PASS, R06 PASS, R07 PASS(주의 1건), R08 UNVERIFIED.
- 수정 후 판정: R01~R07 PASS, R08 UNVERIFIED. 필수 PASS 7 / FAIL 0 / UNVERIFIED 1 / N/A 0 (검증률 7/8).
- 수정 후 같은 명령으로 300건 기준선을 다시 측정했다(텍스트 영역 끔).
  - 사진 관련 값은 바뀌지 않았다.
  - 로컬 추출 시간은 중앙값 572ms, p95 790ms다.
- R08(Dev S3 실측, 브라우저 네트워크, 실제 API 응답 크기)은 접근 없이 확인하지 않았다.
- 판단하지 못한 점: 도메인 AGENTS에 정의된 폴더는 flows/policies/reviews이고, `docs/plans/`는 정의되어 있지 않다.

## 재평가 (2026-11-05, dev `0a89c599` 기준 커밋 직전)

- 문서만 묶어 올리면서 독립 평가 1회를 다시 했다(별도 읽기 전용 에이전트). OCR 계획은 진행하지 않기로 해 문서와 README 링크를 뺐다.
- 코드 근거 줄 번호 1건이 바뀌어 고쳤다. 나머지 근거·상대 링크·스크립트 플래그는 현재 코드와 일치했다.
- 판정: R01~R07 PASS, R08 UNVERIFIED (검증률 7/8). `docs/plans/` 폴더 규칙은 여전히 정하지 않았다.

## 문제 현황

신규 확정 발견 8 / 해결 8 / 미해결 0, P0 0 / P1 0 / P2 2 / P3 6.
PRECHECK 0 / INDEPENDENT_REVIEW 8 / POST_FIX_CHECK 0 / EXTERNAL 0, 오탐 0.

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정 / 최초 PR | 해결 시각 | 근거·조치·검증 |
| --- | --- | --- | --- | --- | --- |
| 2026-10-30-pdfextraction-image-delivery-baseline-F01 | P2/DOC/INTRODUCED | INDEPENDENT_REVIEW | 2026-10-30T22:05:00+09:00 / PENDING | 2026-10-30T22:14:00+09:00 | 실측 SQL이 `pdf_extraction_payloads`의 `sizeBytes`를 읽었다. 이 테이블은 Spring 결과라 해당 값이 없다(PdfExtractionResultParser `Image(key, null, classification)`). S3 PNG 객체 크기와 Lambda `result.json`을 읽는 방법으로 교체했다. 수정한 문서를 확인했다. |
| 2026-10-30-pdfextraction-image-delivery-baseline-F02 | P2/FLOW/INTRODUCED | INDEPENDENT_REVIEW | 2026-10-30T22:05:00+09:00 / PENDING | 2026-10-30T22:14:00+09:00 | 보드는 `entries={visible}`만 받는다. 5분 캐시도 타이머가 아니라 effect가 다시 돌 때만 검사한다. 흐름과 표 문장을 "현재 탭", "다시 조회할 때"로 고쳤다. 수정한 문서를 확인했다. |
| 2026-10-30-pdfextraction-image-delivery-baseline-F03 | P3/TEST/INTRODUCED | INDEPENDENT_REVIEW | 2026-10-30T22:05:00+09:00 / PENDING | 2026-10-30T22:14:00+09:00 | 측정은 텍스트 영역을 켰고 운영 S3 트리거(s3_handler.py:38)는 끈다. 스크립트를 `include_regions=False`로 맞추고 300건을 다시 측정했다. |
| 2026-10-30-pdfextraction-image-delivery-baseline-F04 | P3/DOC/INTRODUCED | INDEPENDENT_REVIEW | 2026-10-30T22:05:00+09:00 / PENDING | 2026-10-30T22:14:00+09:00 | JSON 추정 가정(fileKey·AI 결과·고정 필드)과 Pillow 버전 차이가 문서에 없었다. 문서에 추가하고, summary에 `pillowVersion`을 기록하게 했다. |
| 2026-10-30-pdfextraction-image-delivery-baseline-F05 | P3/DOC/INTRODUCED | INDEPENDENT_REVIEW | 2026-10-30T22:05:00+09:00 / PENDING | 2026-11-05T10:47:00+09:00 | README가 커밋되지 않은 OCR 계획 문서 링크를 함께 가진다. OCR을 진행하지 않기로 해 계획 문서와 링크를 뺐다. |
| 2026-10-30-pdfextraction-image-delivery-baseline-F06 | P3/DOC/EXISTING | INDEPENDENT_REVIEW | 2026-11-05T10:47:00+09:00 / PENDING | 2026-11-05T10:47:00+09:00 | 보드 키 근거가 `pdf-review-workbench.tsx:141`이었으나 이후 코드 변경으로 152행이다. 줄 번호를 고쳤다. |
| 2026-10-30-pdfextraction-image-delivery-baseline-F07 | P3/DOC/INTRODUCED | INDEPENDENT_REVIEW | 2026-11-05T10:47:00+09:00 / PENDING | 2026-11-05T10:47:00+09:00 | 원격 없는 로컬 브랜치 이름을 근거로 들어 다른 사람이 확인할 수 없었다. 참고 기준만 남기고 브랜치 이름을 뺐다. |
| 2026-10-30-pdfextraction-image-delivery-baseline-F08 | P3/CODE/INTRODUCED | INDEPENDENT_REVIEW | 2026-11-05T10:47:00+09:00 / PENDING | 2026-11-05T10:47:00+09:00 | `--photos`에 4 이상을 주면 사진 칸 목록에서 IndexError가 났다. 1~3 범위를 검사하고 도움말에 적었다. |

## 추가 전용 상태 이력

| 사건 ID | 문제 ID | 종류 | 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-10-30-pdfextraction-image-delivery-baseline-F01 | CONFIRMED | 2026-10-30T22:05:00+09:00 | PdfExtractionResultReceiver·Parser 확인 / PENDING |
| E02 | 2026-10-30-pdfextraction-image-delivery-baseline-F02 | CONFIRMED | 2026-10-30T22:05:00+09:00 | pdf-review-workbench.tsx:58,141, screening-board.tsx:61,84 / PENDING |
| E03 | 2026-10-30-pdfextraction-image-delivery-baseline-F03 | CONFIRMED | 2026-10-30T22:05:00+09:00 | s3_handler.py:38 / PENDING |
| E04 | 2026-10-30-pdfextraction-image-delivery-baseline-F04 | CONFIRMED | 2026-10-30T22:05:00+09:00 | 스크립트 api_body_bytes / PENDING |
| E05 | 2026-10-30-pdfextraction-image-delivery-baseline-F05 | CONFIRMED | 2026-10-30T22:05:00+09:00 | README 링크 대상 미추적 / PENDING |
| E06 | 2026-10-30-pdfextraction-image-delivery-baseline-F01 | FIXED | 2026-10-30T22:14:00+09:00 | 문서 수정 / PENDING |
| E07 | 2026-10-30-pdfextraction-image-delivery-baseline-F02 | FIXED | 2026-10-30T22:14:00+09:00 | 문서 수정 / PENDING |
| E08 | 2026-10-30-pdfextraction-image-delivery-baseline-F03 | FIXED | 2026-10-30T22:14:00+09:00 | 300건 재측정 / PENDING |
| E09 | 2026-10-30-pdfextraction-image-delivery-baseline-F04 | FIXED | 2026-10-30T22:14:00+09:00 | 문서·스크립트 수정 / PENDING |
| E10 | 2026-10-30-pdfextraction-image-delivery-baseline-F05 | FIXED | 2026-11-05T10:47:00+09:00 | OCR 계획·README 링크 제거 / PENDING |
| E11 | 2026-10-30-pdfextraction-image-delivery-baseline-F06 | CONFIRMED | 2026-11-05T10:47:00+09:00 | pdf-review-workbench.tsx:152 / PENDING |
| E12 | 2026-10-30-pdfextraction-image-delivery-baseline-F07 | CONFIRMED | 2026-11-05T10:47:00+09:00 | plans 문서 개선 후보 / PENDING |
| E13 | 2026-10-30-pdfextraction-image-delivery-baseline-F08 | CONFIRMED | 2026-11-05T10:47:00+09:00 | measure_image_delivery.py BOXES / PENDING |
| E14 | 2026-10-30-pdfextraction-image-delivery-baseline-F06 | FIXED | 2026-11-05T10:47:00+09:00 | 문서 수정 / PENDING |
| E15 | 2026-10-30-pdfextraction-image-delivery-baseline-F07 | FIXED | 2026-11-05T10:47:00+09:00 | 문서 수정 / PENDING |
| E16 | 2026-10-30-pdfextraction-image-delivery-baseline-F08 | FIXED | 2026-11-05T10:47:00+09:00 | 스크립트 수정 / PENDING |
