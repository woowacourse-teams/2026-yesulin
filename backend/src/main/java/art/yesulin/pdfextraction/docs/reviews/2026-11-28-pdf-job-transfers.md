# 심사 문서 변환기의 작업별 파일 전송

작업 ID `2026-11-28-pdf-job-transfers`, PDF 추출·Audit 평가 기준 v1, 2026-11-28 KST. 대상은 서버의 전송 URL 발급, 변환 워커, 패키징과 운영 활성화 설정이다. 신규 API는 작업별 전송용 서버 인증을 사용한다. 원본과 파생 PDF를 다른 역할에 일괄 공개하는 버킷 권한 변경은 이 릴리스에 없다.

| ID | 흐름 및 실패 조건 | 판정·근거 |
| --- | --- | --- |
| T1 | 다른 서비스 비밀 또는 사용자 세션이 URL을 발급하면 실패 | PASS. 전송 경로는 별도 무상태 POST 보안 체인. 미설정·동일 비밀·타 용도 인증값을 거부한다. `DocumentPreviewTransferSecurityTest`. |
| T2 | 다른 작업·경로·삭제된 지원서 또는 일치하지 않는 객체에 URL이 발급되면 실패 | PASS. DB의 제작사 심사 작업·원본 키 및 S3 HEAD의 MIME·크기·SHA-256·ETag 대조, GET If-Match와 5분 만료 확인. `DocumentPreviewTransfersTest`. |
| T3 | 첫 저장이 버킷 목록 권한을 요구하거나 중복 변환이 다른 결과를 덮어쓰면 실패 | PASS. PENDING 첫 조회는 프리뷰 HEAD를 건너뛴다. PDF 쓰기는 크기·SHA-256·형식과 If-None-Match 조건을 서명한다. 412 뒤 이미 저장된 PDF를 확인하고 READY와 일치하는 추출 입력만 게시한다. 콜백 전 중단·중복·경합 테스트 통과. |
| T4 | 워커가 다른 전송 대상이나 만료 제한을 벗어난 URL을 쓰거나 직접 SDK 경로로 전환하면 실패 | PASS. 서명 방식은 지정된 HTTPS 리전·버킷·키·메서드·조건 헤더·최대 300초를 검증한다. 전송 인증 누락·재지정은 실패로 처리하고 기존 dev 직접 읽기 경로는 별도 설정으로 유지한다. `test_signed_storage.py`. |
| T5 | 필요한 워커 소스가 실제 ZIP·컨테이너 빌드에서 제외되면 실패 | PASS. ZIP `3b7281227ea6e08ff311738c5d5bad97dd6fa47f5a9501ce142133fd6f77e959`에서 워커·렌더러·서명 전송 어댑터·런타임 4개가 소스와 바이트 단위로 일치한다. Dockerfile과 ZIP 빌더에 새 어댑터가 포함됐다. 기존 SQS·S3 핸들러 모두 `process_record`를 사용한다. |
| T6 | 실제 운영 심사함에서 PDF 및 비PDF 접수·변환·콜백·뷰어가 동작해야 함 | UNVERIFIED. 로컬·dev의 성공을 운영 완료로 세지 않았다. 실제 제작사 세션의 합성 파일로 배포 후 확인한다. |

독립 평가 1회. Java 보안·전송 등 관련 54개와 Checkstyle 통과. Python 워커·알림 24개 독립 재실행 통과. 필수 PASS 5 / FAIL 0 / UNVERIFIED 1 / N/A 0. 공용 실행 역할에는 별도 S3 객체 접근 권한을 추가하지 않는다. 인증값과 URL은 PR·로그·배포 ZIP에 담지 않는다.

| 문제 ID | 발견 경로·심각도·원인 | 수정 및 확인 |
| --- | --- | --- |
| `2026-11-28-pdf-job-transfers-F01` | INDEPENDENT_REVIEW, P1, FLOW, INTRODUCED. 처음 변환할 프리뷰를 HEAD해 부재를 404로 판정하면 ListBucket 권한이 없는 환경에서는 403으로 끝날 수 있었다. | FIXED. PENDING 최초 PREVIEW_READ는 빈 결과를 보내며 PREVIEW_RECOVER는 412 후 존재하는 객체를 확인한다. 최초 등록·동시 PUT·콜백 전 중단의 재시도 검증을 통과했다. |

| `2026-11-28-pdf-job-transfers-F02` | POST_FIX_CHECK, P2, TEST, INTRODUCED. 전체 백엔드 회귀에서 배우 동시성 테스트의 Spring 컨텍스트가 초기화되지 않아 같은 원인으로 6건 실패했다. 기존 저장소 인터페이스만 모킹하여 새 전송 포트로 사용할 수 없었다. | FIXED. 테스트가 두 포트를 제공하는 실제 저장소 타입을 모킹하도록 필드와 import를 변경했다. 배우 테스트 6개와 미리보기 테스트 14개 재실행 통과. |

최초 검토 당일 수정·확인했다. 신규 발견 2 / 해결 2 / 미해결 0. P0 0 / P1 1 / P2 1 / P3 0. PRECHECK 0 / INDEPENDENT_REVIEW 1 / POST_FIX_CHECK 1 / EXTERNAL 0. 오탐 0. 운영 파일별 서식 충실도와 대량 처리량은 이번 코드 검증 범위에 포함하지 않았다.

## 상태 이력

- 2026-11-28T01:23:05+09:00, F01 수정 코드·회귀 테스트를 독립 대조해 FIXED로 확정했다. 최초 기록 PR PENDING. 운영 실파일 T6은 배포 전 미확인.
- 2026-11-28 KST, 최초 기록 [개발 #645](https://github.com/woowacourse-teams/2026-yesulin/pull/645), 운영 [#646](https://github.com/woowacourse-teams/2026-yesulin/pull/646). F01은 동일 이슈다. 두 브랜치의 기능 변경 19경로가 Git 객체 단위로 일치했다. 운영 후보에서 심사·PDF 전체 233개 테스트를 다시 실행해 실패·건너뜀 0건을 확인했다.
- 2026-11-28T01:34:56+09:00, 전체 회귀에서 발견한 F02의 테스트 대역 수정과 표적 20건 재검증을 확인했다. 최초 기록 개발 #645, 운영 #646. 두 브랜치에 같은 수정을 적용했다.
