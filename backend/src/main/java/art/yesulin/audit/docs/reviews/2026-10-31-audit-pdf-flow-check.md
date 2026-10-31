# PDF 오디션 심사 흐름 점검

- 작업 ID: `2026-10-31-audit-pdf-flow-check`
- 평가일: 2026-10-31, 기준 HEAD: `31e5df55`
- 범위: PDF 심사 생성 → 원본 접수 → Lambda 추출/콜백 → Spring AI → 사진/원문 열람 → 배역·메모·판정 저장 → 진행률·복구.
- 요청은 완료 여부 점검이다. 제품 코드·설정은 수정하지 않았으며 이 평가 기록만 추가했다. 기존 미추적 사용자 가이드와 output/tmp는 보존했다.
- 기준: 공통 평가 규칙, Audit 평가표 v1, Audit/PDF 흐름 및 정책. 아래는 이번 점검용 평가표 v1이다.
- 판정: 기본 정상 흐름은 구현되어 있고 관련 테스트는 통과했다. 기존 P1 복구 공백과 필수 미확인 범위가 있어 전체 완료로 판정하지 않는다.

## 평가표

각 항목은 필수다. 정적 검토/테스트 PASS는 브라우저와 배포 환경의 실제 종단 검증을 의미하지 않는다.

| ID | 단계·실패 조건 | 기대 결과 | 방법·근거 | 결과 |
| --- | --- | --- | --- | --- |
| C01 | 심사 생성·타인 접근·빈 배역 | 빈 배역 허용, 중복 배역 거부, 타인 심사 접근 차단 | AuditTest/AuditServiceTest, AuditController·ReviewCreateForm 정적 검토 | PASS |
| C02 | 업로드·크기·동일 원본 재등록 | PDF 25MiB 제한, 같은 심사 SHA 중복 재사용, 신규 접수 800건 상한 | PdfExtractionJobTest/PdfExtractionServiceTest/PdfSourceDeduplicationDatabaseTest, use-review-uploads/API 테스트 | PASS |
| C03 | 콜백 중복·반영 실패 | 동일 payload 멱등, 다른 payload 거부, 실패 시 트랜잭션 롤백 | PdfExtractionResultReceiverDatabaseTest 및 관련 단위 테스트, Python 콜백 조립·전송 테스트 | PASS |
| C04 | AI 재시도·늦은 자동 결과 | 제한된 재시도/lease, 수동 배역·메모·판정 유지 | PdfAiJobTest/PdfAiQueueServiceDatabaseTest/PdfAiRetryServiceTest/AuditServiceTest 등 | PASS |
| C05 | 사진·원문·메모·판정 | 최신 원문 URL 조회, PATCH 성공 후 판정 반영, 실패 표시 | ScreeningBoard/ReviewOriginalDocument 정적 검토, 원문·단축키·API 테스트. 실제 브라우저 검증은 C10 | PASS |
| C06 | 처리 진행률·화면 복귀·401 | 직렬 폴링·종료 정지, 실패와 성공 구분, 세션 만료 처리 | AuditProgressServiceDatabaseTest/use-review-progress.test.tsx/use-review-uploads.test.tsx | PASS |
| C07 | 301명 이상 전체 선택 배역 설정 | 지원하는 심사함 규모에서 저장 또는 사전 제한 안내 | 화면 전량 전송과 서버 300명 상한 불일치, F01 | FAIL |
| C08 | PDF 추출/콜백 최종 실패 | 기존 접수 작업을 회수·재처리 가능 | 기존 2026-10-30-pdf-reliability-review-F01 재확인, 같은 PDF 재접수도 기존 job 재사용 | FAIL |
| C09 | 실제 PDFium 추출 실행 | 추출·이미지 테스트 모듈 전체 실행 | 시스템 Python 3.9에 pypdfium2가 없어 2개 모듈 import 실패. Lambda 대상 Python 3.12와도 다름 | UNVERIFIED |
| C10 | 배포 환경·인증·전체 사용자 동선 | 실제 로그인/CSRF/타인 접근 및 S3→Lambda→Spring→모델→브라우저 확인 | 이번 작업은 AWS/배포 서버 및 실제 브라우저를 실행·조회하지 않음. 설정 파일이나 과거 기록만으로 배포 완료 추정하지 않음 | UNVERIFIED |
| C11 | 300건 처리·모델 품질 | 실제 처리시간·메모리·복구와 정보 정확도 확인 | 대표 표본·정답·측정 환경을 정한 부하/정확도 실험 미실시 | UNVERIFIED |
| C12 | 문서·미사용 코드 | 현재 소비자 및 현재 안내 정합성 | F02, 아래 정리 점검. 이 작업에 새 제품 코드/설정/의존성은 없음 | FAIL |
| C13 | 독립 평가·기록 | 읽기 전용 독립 평가 1회, 문제 중복 집계 방지 | 별도 평가 결과와 아래 문제/사건 기록 | PASS |

필수 PASS 7 / FAIL 3 / UNVERIFIED 3 / N/A 0. 검증률 7/13 ≈ 53.8%는 이 평가표 범위의 확인 비율이며 운영 품질이나 성공 확률이 아니다.

## 실행 검증

- frontend: `npm test -- src/features/pdf-reviews src/components/pdf-reviews src/components/pdf-extractions src/features/analytics/pdf-analytics.test.ts` → 9개 파일, 47개 테스트 통과.
- backend: `./gradlew test --tests 'art.yesulin.audit.*' --tests 'art.yesulin.pdfextraction.*'` → BUILD SUCCESSFUL. 해당 XML 결과 23개 suite, 192개 테스트, 실패/오류/skip 0.
- ops/pdf-extraction-lambda: `PYTHONPATH=src python3 -m unittest discover -s tests/application -v` → 실행된 콜백 관련 7개 통과, test_image_classification/test_jobs 2개 모듈은 pypdfium2 미설치로 import ERROR. 전체 추출 테스트 통과로 처리하지 않는다.
- 위 결과는 이번 점검에서 새로 실행했다. 코드 수정이 없으므로 수정 후 검증은 N/A다. 운영 배포·모델 호출·300건 부하 테스트는 수행하지 않았다.

## 확정 문제

신규 문제의 최초 기록 PR은 PENDING, 해결 시각은 없음이다. 모두 이번 점검 이전에 존재한 문제다.

| 문제 ID | 심각도/유형/유입 | 발견 경로 | 상태 | 근거·영향·조치 |
| --- | --- | --- | --- | --- | --- |
| 2026-10-31-audit-pdf-flow-check-F01 | P2/FLOW/EXISTING | PRECHECK | OPEN | frontend/src/components/pdf-reviews/screening-board.tsx:136은 전체 선택을 제한하지 않고 :111에서 targets 전량을 보낸다. backend/src/main/java/art/yesulin/audit/application/AuditService.java:90은 300명 초과를 거부한다. 한 심사에 301명 이상 등록 후 카드/표 전체 선택→배역 저장 시 실패한다. 선택 상한 안내 또는 요청 분할 필요. 구현 변경은 하지 않음 |
| 2026-10-31-audit-pdf-flow-check-F02 | P3/DOC/EXISTING | INDEPENDENT_REVIEW | OPEN | frontend/docs/pdf-reviews.md:32의 최소 1개 배역, :101의 Lambda AI 설정 설명, ops/pdf-extraction-lambda/README.md:41의 원본 중복 방지 미구현 설명은 현재 코드와 다르다. 현재는 빈 배역 허용·Spring AI·SHA 중복 방지를 구현했다. 현행 안내 정렬 필요. 이번 작업에서 정본 수정은 하지 않음 |

신규 발견 2 / 해결 0 / 미해결 2 / P0 0 / P1 0 / P2 1 / P3 1.
발견 경로 PRECHECK 1 / INDEPENDENT_REVIEW 1 / POST_FIX_CHECK 0 / EXTERNAL 0. 미확인 3.

### 기존 문제 재확인

- `2026-10-30-pdf-reliability-review-F01` — P1/FLOW/EXISTING, OPEN. [기존 기록](../../../pdfextraction/docs/reviews/2026-10-30-pdf-reliability-review.md)의 최초 시각·사건 이력을 유지하며 신규 발견에 더하지 않는다.
- PdfExtractionService.java:70은 uploadedAt이 있거나 종료한 작업에 upload=null을 반환한다. 같은 PDF를 다시 선택해도 새 추출을 시작하지 않는다. 콜백 유실 작업은 DELAYED 표시와 waiting 집계에 남는다. PdfAiRetryService.java:56의 재시도는 추출이 완료되고 FAILED가 아닌 원본의 AI 작업 대상이므로 이를 복구하지 않는다.
- 이번 점검에서 다룬 누적 문제는 3건(P1 1/P2 1/P3 1), 모두 OPEN이다. 기존 기록의 다른 문제들까지 재평가하거나 상태를 바꾼 것은 아니다.

### 추가 전용 상태 사건

| 사건 | 문제 ID | 종류 | 최초 확정 시각(+09:00) | 근거·최초 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-10-31-audit-pdf-flow-check-F01 | CONFIRMED | 2026-10-31T13:09:59+09:00 | 전체 선택→전량 PATCH→300명 초과 거부 정적 경로 확정, 독립 평가 재확인 / PENDING |
| E02 | 2026-10-31-audit-pdf-flow-check-F02 | CONFIRMED | 2026-10-31T13:09:59+09:00 | 독립 평가 발견 후 문서와 현재 생성폼/AI/중복 구현 대조 / PENDING |

## 독립 평가와 정리 점검

Claude 연결 도구와 실행 CLI를 찾지 못해 공통 규칙의 대체 절차로 같은 종류의 별도 에이전트가 읽기 전용 독립 평가 1회를 수행했다. 재귀 평가를 만들지 않았다. 평가자는 F01과 기존 복구 공백을 재확인하고 F02를 발견했다.

- review-entry-list.tsx / review-entry-detail.tsx / review-entry-form.tsx는 전체 frontend 참조 검색에서 현재 소비자를 찾지 못했다. 실제 심사 경로는 PdfReviewWorkbench→ScreeningBoard다. 삭제 후보로 기록하되 이번 점검에서 삭제하지 않았으며 별도 신규 결함 수에 포함하지 않았다.
- use-extraction-events.ts는 독립 PdfExtractionWorkbench가 소비하며 producers/dev의 pdf-extractions 경로가 남아 있다. SSE를 미사용이라고 판단하지 않는다. 해당 독립 화면을 제거하거나 갱신 방식까지 대체할 때 제거 여부를 재검토한다.
- API 주소·DB migration은 현재 소비자/호환 책임이 있어 미사용으로 판단하지 않는다. 제품 코드·설정·의존성을 추가하지 않아 이번 작업이 도입한 미사용 항목은 없다.
- HOLD를 review_progress/review_saved의 판정 저장 수에 포함하는 것은 analytics.md:81 및 dashboards.mjs:120의 명시 계약과 일치한다. UI의 PASS/FAIL 완료 수와 다르다는 의심 1건은 확정 전 제외했다. 확정 문제의 REJECTED 사건은 없다.
- 제목·배역 수정/추가·심사/지원자 삭제, QR/PDF 링크 주석 해석·OCR은 현재 제공되지 않는 범위다. 버그와 구분하며 신규 결함 수로 만들지 않는다. 사용자에게 필요한 완료 범위를 설명할 때 명시한다.

PR은 생성·갱신하지 않았다. 다음 PR에 이 작업 ID와 집계를 포함한다.

## 최초 PR 연결

최초 게시 PR: [#479](https://github.com/woowacourse-teams/2026-yesulin/pull/479), 대상 dev, 관련 이슈 #478.
위 PENDING/PR 미생성 표기는 당시 작업 이력이며 이 절로 최초 게시 번호를 연결한다. 기존 문제 ID·확정/해결 시각은 변경하지 않는다.
