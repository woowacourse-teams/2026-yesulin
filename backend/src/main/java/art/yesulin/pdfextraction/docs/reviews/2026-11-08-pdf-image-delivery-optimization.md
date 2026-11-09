# 추출 사진·원본 전달 개선 평가표

- 작업 ID: `2026-11-08-pdfextraction-image-delivery-optimization`, 평가표 v1(Audit 평가표 v1의 A03·A06·A08·A09·A10 포함).
- 관련 기록: [기준선과 개선 결과](../plans/2026-10-30-pdf-image-delivery-baseline.md).
- 변경: 심사 PDF 사진 미추출, 추출 사진 WebP 저장과 Spring 수용, 원본 PDF 탭 메모리 재사용·다음 지원서 미리 받기.
- 실제 지원서·서명 URL·DB 값은 기록에 넣지 않는다. 측정은 합성 PDF와 저장소 데모 사진만 썼다.

| ID | 흐름 / 실패 조건 | 기대 결과와 검증 | 필수 |
| --- | --- | --- | --- |
| R01 | S3 트리거 / 심사 PDF 사진을 계속 뽑거나, 배우·진단 PDF 사진을 안 뽑음 | 키에 reviewId가 있으면 `extractImages:false`, 없으면 `true`. Lambda 단위 테스트, LocalStack 300건과 진단 1건 | 예 |
| R02 | 사진 저장 형식 / PNG로 남거나 Content-Type 불일치 | `.webp`·`image/webp`로 저장. Lambda 테스트, 진단 화면 응답 헤더 | 예 |
| R03 | Spring 수용(A03) / WebP 거부 또는 이전 PNG 결과 거부, 허용 밖 확장자 허용 | `.webp`·`.png`만 허용, `.jpg`·경로 이탈 거부. ReceiverTest | 예 |
| R04 | 배우 사진 보관함 복사 / 형식과 파일명·Content-Type 불일치 | 원본 확장자대로 `pdf-profile-photo.webp`·`image/webp`. ProfileImportServiceTest | 예 |
| R05 | 원본 재사용 / 다시 연 원본을 또 받음, 디스크 캐시 허용, 떠난 뒤 Blob 남음 | 최근 3개 메모리 재사용, S3 응답 no-store 유지, 밀려나거나 화면을 떠나면 Blob 해제. 캐시 테스트, 브라우저 측정 | 예 |
| R06 | 실패·권한(A06) / 401·준비 안 됨·다운로드 실패 뒤 복구 불가, 늦은 응답이 다른 지원서를 덮음 | 401은 권한 만료 처리, 실패 항목은 캐시에서 빠져 재시도 가능, 늦은 응답 무시. 컴포넌트 테스트 | 예 |
| R07 | 분석 / 미리 받기가 결과 관측·클릭 이벤트를 만듦 | 화면에 보인 작업만 `observePdfExtraction`, 원본 클릭 이벤트 없음. 컴포넌트 테스트 | 예 |
| R08 | 호환·배포 / 배포 전 작업 재처리 실패, 결과 경로 변경 | `PIPELINE_VERSION` 유지, 사진 없는 재시도가 사진까지 뽑은 이전 결과를 재사용. Lambda 테스트·정책 문구 | 예 |
| R09 | 측정·기록 / 수치가 출력과 다르거나 측정·추정 혼동 | 문서 표가 summary·S3 집계·브라우저 측정과 일치, 로컬 에뮬레이션 한계 표시 | 예 |
| R10 | 미사용 정리(A08)·문서(A09) / 죽은 코드·옛 문서·깨진 링크 | 새 미사용 코드 없음, 계약·흐름·정책·README 갱신, 링크 유효 | 예 |
| R11 | 실제 환경 / Dev·Prod Lambda와 네트워크에서 같은 효과 | Dev 배포 뒤 S3 크기·처리 시간·브라우저 전송량 확인 | 예 |

AI 획득·수동 판정 보호(A04·A05)는 이번 변경이 AI·판정 코드를 바꾸지 않아 N/A다.

## 검증 결과 (2026-11-08, Asia/Seoul)

- 실행한 확인
  - Lambda 단위 테스트 23개 통과.
  - 백엔드 pdfextraction·audit·프로필 가져오기 테스트 225개 통과, Checkstyle 통과.
  - 프론트 전체 테스트 1,105개(수정 전 기준) 통과. 수정 후 PDF 관련 256개 통과, eslint 통과.
  - `tsc`는 dev에 원래 있던 `original-screening.test.tsx:85` 오류 1건만 남는다(EXISTING, 이번 범위 밖).
- 로컬 전체 흐름
  - LocalStack Lambda(개선 전·후 ZIP)와 로컬 백엔드·개발 서버로 합성 PDF 300건씩 실제 업로드했다.
  - S3 집계, 브라우저 이동 측정, 진단 화면의 `image/webp` 응답(29·49·38 KiB), 합격자 연락처 원본 보기를 확인했다.
  - 수정 후 같은 이동을 다시 측정했다. 원본 9개, 클릭 뒤 대기 1회로 같았고 표시는 70~110 ms였다.
- 독립 평가: 1회 완료. 상대 평가 도구(Codex)를 쓸 수 없어 별도 읽기 전용 에이전트로 평가했다. 재귀 평가는 하지 않았다.
- 최초 판정: R01~R07 PASS(R02 응답 헤더 근거는 미기록), R08 FAIL, R09 FAIL, R10 FAIL, R11 UNVERIFIED.
- 수정 후 판정: R01~R10 PASS, R11 UNVERIFIED.
  - 필수 PASS 10 / FAIL 0 / UNVERIFIED 1 / N/A 0. 검증률 10/11.
  - R02 응답 헤더 근거는 이 기록의 로컬 전체 흐름에 남겼다. 수정 후 재평가는 작성자가 테스트와 화면으로 확인했다.
- R11(Dev·Prod 배포 뒤 실측)은 배포하지 않아 확인하지 않았다.
- 범위 밖 EXISTING
  - `screening-adapter.ts`의 사진·링크·프로필 분기는 보드가 `job` 없이 호출해 쓰이지 않는다(#533 이후).
  - 별도 정리 대상으로 남기고 이번 건수에 넣지 않는다.

## 문제 현황

신규 확정 발견 10 / 해결 10 / 미해결 0, P0 0 / P1 0 / P2 1 / P3 9.
PRECHECK 1 / INDEPENDENT_REVIEW 9 / POST_FIX_CHECK 0 / EXTERNAL 0, 오탐 1.

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정 / 최초 PR | 해결 시각 | 근거·조치·검증 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-08-pdfextraction-image-delivery-optimization-F01 | P3/CODE/INTRODUCED | PRECHECK | 2026-11-08T23:28:00+09:00 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) | 2026-11-08T23:30:00+09:00 | `ProfileImportService` 새 줄이 121자로 Checkstyle 위반. 줄을 나눴고 Checkstyle 통과 |
| 2026-11-08-pdfextraction-image-delivery-optimization-F02 | P2/DOC/INTRODUCED | INDEPENDENT_REVIEW | 2026-11-08T23:33:00+09:00 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) | 2026-11-08T23:41:00+09:00 | 기준선 문서가 #533에서 삭제된 `applicant-photo.tsx`에 링크. 10/30 당시 표기로 바꿈 |
| 2026-11-08-pdfextraction-image-delivery-optimization-F03 | P3/FLOW/INTRODUCED | INDEPENDENT_REVIEW | 2026-11-08T23:33:00+09:00 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) | 2026-11-08T23:35:00+09:00 | 배포 전 결과 저장 후 콜백만 실패한 심사 작업은 배포 뒤 재시도가 옵션 불일치로 실패. 사진 없는 요청은 사진까지 뽑은 이전 결과를 재사용하게 하고 테스트·정책 문구 추가 |
| 2026-11-08-pdfextraction-image-delivery-optimization-F04 | P3/DOC/INTRODUCED | INDEPENDENT_REVIEW | 2026-11-08T23:33:00+09:00 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) | 2026-11-08T23:41:00+09:00 | "이미 본 원본 재다운로드 1회"는 기다린 것만 센 값. 2회(기다린 것 1회)로 정정 |
| 2026-11-08-pdfextraction-image-delivery-optimization-F05 | P3/DOC/INTRODUCED | INDEPENDENT_REVIEW | 2026-11-08T23:33:00+09:00 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) | 2026-11-08T23:41:00+09:00 | 10/30 확인 목록이 PNG·카드 사진 기준으로 남음. 10/30 기록으로 표시하고 새 목록 링크, S3 조회를 `/images/` 기준으로 변경 |
| 2026-11-08-pdfextraction-image-delivery-optimization-F06 | P3/DOC/INTRODUCED | INDEPENDENT_REVIEW | 2026-11-08T23:33:00+09:00 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) | 2026-11-08T23:41:00+09:00 | `frontend/docs/pdf-reviews.md`가 메모리 보관·미리 받기를 설명하지 않음. 원본 열기 단계에 추가 |
| 2026-11-08-pdfextraction-image-delivery-optimization-F07 | P3/FLOW/INTRODUCED | INDEPENDENT_REVIEW | 2026-11-08T23:33:00+09:00 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) | 2026-11-08T23:39:00+09:00 | 원본 다운로드가 PDF.js 밖으로 나와 네트워크 실패가 보고되지 않고 브라우저 오류 문구가 노출. `load_document`로 보고하고 안내 문구로 바꿈, 테스트 추가 |
| 2026-11-08-pdfextraction-image-delivery-optimization-F08 | P3/FLOW/INTRODUCED | INDEPENDENT_REVIEW | 2026-11-08T23:33:00+09:00 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) | 2026-11-08T23:39:00+09:00 | 밀려나거나 화면을 떠난 다운로드가 끝까지 진행. 항목마다 AbortController를 두고 놓아 줄 때 취소, 테스트 추가 |
| 2026-11-08-pdfextraction-image-delivery-optimization-F09 | P3/POLICY/INTRODUCED | INDEPENDENT_REVIEW | 2026-11-08T23:33:00+09:00 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) | 2026-11-08T23:41:00+09:00 | 보관한 원본을 다시 열면 결과를 다시 조회하지 않아 늦은 AI 상태 관측이 늦어짐. 이벤트 의미는 유지하고 관측 범위 변화를 `analytics.md`에 시점과 함께 기록 |
| 2026-11-08-pdfextraction-image-delivery-optimization-F10 | P3/CODE/INTRODUCED | INDEPENDENT_REVIEW | 2026-11-08T23:33:00+09:00 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) | 2026-11-08T23:39:00+09:00 | 새 코드 규칙: 원본 보기 effect 14줄, 측정 스크립트 삼항·긴 `main`. effect 분리, 배치표로 삼항 제거, `main`을 인자·측정·요약으로 분리. 6건 재실행으로 결과 동일 확인 |
| 2026-11-08-pdfextraction-image-delivery-optimization-F11 | P1/CODE/INTRODUCED 주장 | INDEPENDENT_REVIEW | 2026-11-08T23:33:00+09:00 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) | - | REJECTED: `config` 서브모듈 포인터 변경은 이 작업 시작 전부터 작업 트리에 있던 사용자 상태(세션 시작 git status `M config`). 이번 커밋에서 제외 |

## 추가 전용 상태 이력

| 사건 ID | 문제 ID | 종류 | 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-08-pdfextraction-image-delivery-optimization-F01 | CONFIRMED | 2026-11-08T23:28:00+09:00 | Checkstyle 보고서 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E02 | 2026-11-08-pdfextraction-image-delivery-optimization-F01 | FIXED | 2026-11-08T23:30:00+09:00 | Checkstyle 통과 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E03 | 2026-11-08-pdfextraction-image-delivery-optimization-F02 | CONFIRMED | 2026-11-08T23:33:00+09:00 | 독립 평가 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E04 | 2026-11-08-pdfextraction-image-delivery-optimization-F03 | CONFIRMED | 2026-11-08T23:33:00+09:00 | 독립 평가, `jobs.py` / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E05 | 2026-11-08-pdfextraction-image-delivery-optimization-F04 | CONFIRMED | 2026-11-08T23:33:00+09:00 | 독립 평가, `nav-after.json` / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E06 | 2026-11-08-pdfextraction-image-delivery-optimization-F05 | CONFIRMED | 2026-11-08T23:33:00+09:00 | 독립 평가 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E07 | 2026-11-08-pdfextraction-image-delivery-optimization-F06 | CONFIRMED | 2026-11-08T23:33:00+09:00 | 독립 평가 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E08 | 2026-11-08-pdfextraction-image-delivery-optimization-F07 | CONFIRMED | 2026-11-08T23:33:00+09:00 | 독립 평가 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E09 | 2026-11-08-pdfextraction-image-delivery-optimization-F08 | CONFIRMED | 2026-11-08T23:33:00+09:00 | 독립 평가 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E10 | 2026-11-08-pdfextraction-image-delivery-optimization-F09 | CONFIRMED | 2026-11-08T23:33:00+09:00 | 독립 평가 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E11 | 2026-11-08-pdfextraction-image-delivery-optimization-F10 | CONFIRMED | 2026-11-08T23:33:00+09:00 | 독립 평가 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E12 | 2026-11-08-pdfextraction-image-delivery-optimization-F11 | REJECTED | 2026-11-08T23:34:00+09:00 | 세션 시작 시 작업 트리 상태 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E13 | 2026-11-08-pdfextraction-image-delivery-optimization-F03 | FIXED | 2026-11-08T23:35:00+09:00 | Lambda 테스트 23개 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E14 | 2026-11-08-pdfextraction-image-delivery-optimization-F07 | FIXED | 2026-11-08T23:39:00+09:00 | 캐시 테스트 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E15 | 2026-11-08-pdfextraction-image-delivery-optimization-F08 | FIXED | 2026-11-08T23:39:00+09:00 | 캐시 테스트 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E16 | 2026-11-08-pdfextraction-image-delivery-optimization-F10 | FIXED | 2026-11-08T23:39:00+09:00 | 테스트·스크립트 재실행 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E17 | 2026-11-08-pdfextraction-image-delivery-optimization-F02 | FIXED | 2026-11-08T23:41:00+09:00 | 문서 수정 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E18 | 2026-11-08-pdfextraction-image-delivery-optimization-F04 | FIXED | 2026-11-08T23:41:00+09:00 | 문서 수정 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E19 | 2026-11-08-pdfextraction-image-delivery-optimization-F05 | FIXED | 2026-11-08T23:41:00+09:00 | 문서 수정 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E20 | 2026-11-08-pdfextraction-image-delivery-optimization-F06 | FIXED | 2026-11-08T23:41:00+09:00 | 문서 수정 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
| E21 | 2026-11-08-pdfextraction-image-delivery-optimization-F09 | FIXED | 2026-11-08T23:41:00+09:00 | 문서 수정 / [#573](https://github.com/woowacourse-teams/2026-yesulin/pull/573) |
