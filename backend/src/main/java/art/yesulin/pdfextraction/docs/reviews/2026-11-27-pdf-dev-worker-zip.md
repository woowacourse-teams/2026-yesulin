# 개발 심사 문서 변환 Lambda ZIP과 S3 직접 알림

2026-11-27 KST, 작업 ID `2026-11-27-pdf-dev-worker-zip`, 공용 PDF 추출 평가표 v1.
[첫 기록 PR #640](https://github.com/woowacourse-teams/2026-yesulin/pull/640).

| ID | 단계·실패 조건 | 기대 결과와 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| Z01 | Office·한글 엔진 또는 글꼴 누락 | 공식 Lambda Python 3.12 x86_64 로컬 컨테이너에서 합성 HWP·HWPX·DOCX·PPTX 각 1쪽을 생성한다. 원본 파일 크기 제한과 페이지 수 검사를 그대로 적용했다. | 예 | PASS |
| Z02 | 직접 알림 중단·중복 | 최초 콜백 실패는 호출 예외, 재전달은 기존 파생본을 사용한다. `test_direct_s3_notification_validates_the_route_and_retries_the_whole_event`. | 예 | PASS |
| Z03 | 엉뚱한 버킷/경로·빈 이벤트 | 직접 및 큐 경로가 같은 Routes 검증을 사용한다. S3 테스트 통지에는 콜백이 없다. 직접 알림 테스트와 기존 워커 경로 테스트를 실행했다. | 예 | PASS |
| Z04 | 레이어 오류나 중간 파일로 인해 정상 원본을 반려 | ZIP 엔진의 준비 오류와 문서 오류를 구분한다. 생성 중인 엔진 파일은 문서별 작업 디렉터리 수명에 묶인다. `test_unavailable_zip_engine_leaves_sqs_message_for_retry`와 경로 검토. | 예 | PASS |
| Z05 | 빌드 실패로 정상 ZIP 손실·미사용 실험 코드 배포 | 실패 입력을 전달한 후 이전 ZIP 지문이 같았다. 완성 ZIP의 소스 세 파일이 작업트리와 일치하고 제출 파일과 벤치 핸들러가 없음을 확인했다. | 예 | PASS |
| Z06 | 실제 권한 또는 알림 연결 누락 | 개발 서비스에서 신규 업로드, 콜백 완료, PDF 열람까지 확인한다. 로컬 검증과 별도의 배포 확인이 필요하다. | 예 | UNVERIFIED |

합성 원본 네 건의 출력 크기는 HWP 90,115·HWPX 90,202·DOCX 92,244·PPTX 80,337바이트였다. 각 1회 처리 시간은 동일 순서로 0.83·0.75·11.54·12.33초였다. 1 vCPU·1,769MiB, 일반 사용자, 읽기 전용 루트, 외부 통신 차단 환경이다. 전체 워커 및 버킷 알림 테스트 14건 통과. 이미지 배포의 SQS 핸들러와 시스템 도구 경로도 유지했다. 사용자 메모와 심사 판정 쓰기는 이 워커가 수행하지 않는다.

독립 검토 1회. 별도 평가자가 diff, 실물 ZIP, 실패/중복 경로와 미사용 파일을 검토했다. 직접 S3 진입점 추가 후 같은 평가자가 해당 진입점과 수정 세 건을 표적 재검토했다. 필수 PASS 5, FAIL 0, UNVERIFIED 1, N/A 0. 발견 4 / 해결 4 / 미해결 0. P0 0 / P1 1 / P2 2 / P3 1. PRECHECK 1 / INDEPENDENT_REVIEW 3 / POST_FIX_CHECK 0 / EXTERNAL 0. 오탐 0.

## 문제 상태 이력

문제 ID의 접두사는 작업 ID와 같다. 사건 시각은 KST 분 단위다. 각 발견의 최초 기록 PR은 #640이다.

| 사건 | 문제 | 상태 | 발생 시각 | 근거 |
| --- | --- | --- | --- | --- |
| E01 | F01 | CONFIRMED | 2026-11-27T01:33+09:00 | P1·FLOW·INTRODUCED·PRECHECK. ZIP Office 경로가 사용하지 않는 Java 한글 확장을 초기화하며 종료. |
| E02 | F01 | FIXED | 2026-11-27T01:35+09:00 | 비어 있는 bundled extensions 경로를 지정한 같은 DOCX·PPTX가 열렸다. |
| E03 | F02 | CONFIRMED | 2026-11-27T01:37+09:00 | P2·FLOW·INTRODUCED·INDEPENDENT_REVIEW. 누락 레이어의 오류 코드를 일반 문서 실패로 취급했다. |
| E04 | F03 | CONFIRMED | 2026-11-27T01:37+09:00 | P2·CODE·INTRODUCED·INDEPENDENT_REVIEW. 압축 해제 도중 강제 종료 시 공용 임시 디렉터리에 중간 파일이 남을 수 있었다. |
| E05 | F04 | CONFIRMED | 2026-11-27T01:37+09:00 | P3·CODE·INTRODUCED·INDEPENDENT_REVIEW. 빌드 입력 검증 전에 기존 출력 파일을 덮어썼다. |
| E06 | F02 | FIXED | 2026-11-27T01:40+09:00 | 준비 중 오류는 재시도 가능한 예외로 전파된다. 큐 재처리 응답과 실패 콜백 미발행을 검증했다. |
| E07 | F03 | FIXED | 2026-11-27T01:40+09:00 | 상위 워커가 정리하는 문서별 작업 디렉터리 안에서 압축 해제하고 네 형식 정상 처리도 재검증했다. |
| E08 | F04 | FIXED | 2026-11-27T01:41+09:00 | 출력과 같은 파일 시스템에 임시 ZIP을 만든 뒤 교체한다. 실패 빌드 후 정상 ZIP 지문을 대조했다. |
