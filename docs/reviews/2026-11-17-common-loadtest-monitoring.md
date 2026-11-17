# 부하 테스트용 1초 관측 준비

작업 ID 2026-11-17-common-loadtest-monitoring · 공통 운영(모니터링) / loadtest-monitoring-v1

DEV에서 부하 테스트를 할 때 Tomcat·Hikari·CPU 같은 순간값을 1초 간격으로 볼 수 있게 했다.
런타임 지표 발행 주기를 설정값으로 만들고(기본 60초 유지), 기존 DEV 로그를 1초 구간으로 읽는 전용 대시보드를
스크립트로 만들 수 있게 했다. 새 로그 그룹·custom metric·공개 endpoint·인스턴스는 추가하지 않았다.

평가표는 구현 뒤에 작성했다. 수정 전에 만들지 않았다.

| ID | 흐름 | 실패 경계 | 기대 결과 | 확인 방법 | 필수 |
| --- | --- | --- | --- | --- | --- |
| LM-01 | 기본 주기 | 설정이 없을 때 주기가 바뀜 | 설정이 없으면 60초, 첫 표본은 시작 30초 뒤 그대로다 | 코드 열람 | 예 |
| LM-02 | 주기 하한 | 0초·음수·1초 미만 값으로 스레드가 쉬지 않고 돎, 빈 값으로 기동 실패 | 1초보다 짧은 값은 1초로 올려 쓰고 빈 값은 기본값으로 본다 | 코드 열람 | 예 |
| LM-03 | 통합 대시보드 | 리팩터링으로 DEV·PROD 대시보드 내용이 달라짐 | `--plan` 출력이 변경 전과 같다 | 변경 전후 출력 비교 | 예 |
| LM-04 | 전용 대시보드 | 1분 구간이 남음·DB 쿼리까지 1초로 바뀜·수동 위젯 삭제·재실행 중복 | 앱 쿼리만 `bin(1s)`, DB는 `bin(1m)`, 예매 전용 쿼리 제외, 수동 위젯 보존, 재실행해도 같다 | 단위 테스트 | 예 |
| LM-05 | 저장 쿼리 | 1초 쿼리가 기존 `yesulin/dev/*` 1분 쿼리를 덮음 | 1초로 바꾼 쿼리만 `yesulin/loadtest/*` 이름으로 따로 저장한다 | 단위 테스트 | 예 |
| LM-06 | AWS 반영 | 대시보드 내용이 생성본과 다름·저장 안 됨 | `DASHBOARD-yesulin-loadtest`가 생성본과 같고 새로고침 뒤에도 남는다 | 콘솔 실행 | 예 |
| LM-07 | 1초 수집 | 실제 인스턴스에서 설정이 먹지 않음 | DEV 인스턴스에서 drop-in 적용 뒤 `RUNTIME_METRICS`가 1초 간격으로 남는다 | DEV 실행 | 예 |
| LM-08 | 스크립트 AWS 경로 | 대시보드가 없을 때 실패 | `--loadtest`가 없는 대시보드를 새로 만들고 저장 쿼리를 등록한다 | AWS 실행 | 아니오 |
| LM-09 | 문서 | 정본과 코드 불일치·깨진 링크 | `monitoring.md`가 설정값·절차·미검증 범위를 코드와 같게 적고 앵커가 열린다 | 문서 대조 | 예 |
| LM-10 | 정리 | 미사용 코드·옵션·문서 | 추가한 함수·옵션이 모두 쓰이고 분리용 잔여 코드가 없다 | 참조 검색 | 예 |
| LM-11 | 비밀 | 계정 식별자·비밀 기록 | 코드·문서·기록에 비밀과 계정 식별자가 없다 | diff 열람 | 예 |

제외: 권한·중복 요청·수동 수정 보호는 사용자 기능이 아니라 해당 없음. 잘못된 형식의 주기 값(예: `abc`)은
다른 `Duration` 설정과 같이 앱 기동 실패가 되며 이번에 바꾸지 않았다.

## 검증 근거 (2026-11-17, macOS 로컬, 기준 커밋 67c9e12d)

- LM-01·LM-02: `RuntimeMetricPublisher`의 `FIRST_SAMPLE_DELAY`(30초), `DEFAULT_PUBLISH_INTERVAL`(60초),
  `SHORTEST_PUBLISH_INTERVAL`(1초), `usableInterval`, `application.yml`의
  `publish-interval: ${YESULIN_MONITORING_PUBLISH_INTERVAL:PT60S}`. 실행 검증은 없다.
- LM-03: `origin/dev`의 스크립트와 이 브랜치의 스크립트로 각각 `--plan`을 실행해 `DASHBOARD-yesulin.json`을 `cmp`로 비교, 동일.
  평가 지적을 반영한 뒤 다시 비교해도 같았다.
- LM-04·LM-05: `python3 -m unittest discover -s ops/monitor/cloudwatch/tests` 11개 통과.
  `test_loadtest_dashboard_reads_existing_logs_per_second_and_keeps_manual_widgets`,
  `test_unified_dashboard_keeps_loadtest_widgets_and_loadtest_refuses_the_unified_name`,
  `test_only_per_second_queries_are_saved_apart_from_the_minute_queries`.
- LM-06: 콘솔의 소스 편집으로 `--loadtest --plan` 생성본을 넣었다. 생성본을 공백 없이 직렬화한 JSON의 SHA-256
  `31a32d345fb312e5399970021a49ef80a42ed615845eb365a2ae794f053f0d95`가 넣기 직전 브라우저에서 계산한 값과 같았고,
  저장 뒤 새로고침해 API·런타임·DB 구역이 DEV 로그로 그려지는 것을 봤다. 평가 지적을 반영한 뒤의 생성본도 같은 해시다.
  스크립트가 아니라 콘솔로 반영했다. 평가자는 콘솔 작업을 확인할 수 없어 UNVERIFIED로 판정했고, 아래 PASS는 작성자 실행 근거다.
- 백엔드: `./gradlew compileJava test --tests 'art.yesulin.global.monitoring.*' checkstyleMain` 통과(테스트 9개).
  평가 지적을 반영한 뒤 기준 커밋 67c9e12d에서 다시 실행했다. 전체 Gradle 테스트는 실행하지 않았다.
- LM-07·LM-08: 실행하지 않았다. 변경이 DEV에 배포된 뒤 확인한다.

## 독립 평가 1회

같은 종류의 별도 평가 에이전트(읽기 전용)가 diff와 위 평가표로 평가했다. 상대 도구는 설치돼 있었으나 설정된 모델이
계정에서 거부돼 실행되지 않아 대체했다. 평가자는 단위 테스트와 `--plan`을 직접 실행하고 AWS 경로를 가짜 클라이언트로 모사했다.

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 결과 및 표적 검증 |
| --- | --- | --- | --- |
| 2026-11-17-common-loadtest-monitoring-F01 | P2 CODE INTRODUCED | INDEPENDENT_REVIEW | FIXED. 두 대시보드가 소유 위젯 접두사를 한 집합으로 공유했고 `--loadtest --base DASHBOARD-yesulin`에 가드가 없어, 그 조합이 통합 대시보드의 DEV·PROD 로그 위젯과 스냅샷을 지웠다. 소유 접두사를 대시보드별로 나누고 그 조합을 거부하게 했다. 테스트 추가, 통합 `--plan` 출력이 변경 전과 같음을 재확인. |
| 2026-11-17-common-loadtest-monitoring-F02 | P3 UNUSED INTRODUCED | INDEPENDENT_REVIEW | FIXED. 문서·테스트에 소비자가 없는 `--environment` 옵션이 PROD 그룹으로 같은 대시보드를 덮을 수 있었다. 옵션을 지우고 DEV로 고정했다. |
| 2026-11-17-common-loadtest-monitoring-F03 | P3 UNUSED INTRODUCED | INDEPENDENT_REVIEW | FIXED. loadtest 저장 쿼리 30개 중 20개가 기존 `yesulin/dev/*`와 같은 내용이었다. 1초로 바꾼 10개만 저장하게 하고 문서를 맞췄다. |
| 2026-11-17-common-loadtest-monitoring-F04 | P3 TEST INTRODUCED | INDEPENDENT_REVIEW | FIXED. `read-reservation-mix` 제외, 기본 조회 15분, 저장 쿼리의 `bin(1s)`·기존 ID 갱신, F01 조합 단언을 추가했다. 대시보드가 없을 때의 경로는 로컬에 botocore가 없어 테스트를 추가하지 못했고 LM-08 미확인으로 남긴다. |
| 2026-11-17-common-loadtest-monitoring-F05 | P3 DOC INTRODUCED | INDEPENDENT_REVIEW | FIXED. 미검증 표시에 스크립트 AWS 경로 미실행과 저장 쿼리 부재가 빠졌고 "1분마다" 두 곳에 기본값 단서가 없었다. 문서를 고쳤다. |
| 2026-11-17-common-loadtest-monitoring-F06 | P3 DOC INTRODUCED | INDEPENDENT_REVIEW | FIXED. Gradle 검증을 fast-forward 전 기준에서 실행한 사실과 LM-06의 해시 값이 기록에 없었다. 현재 기준에서 다시 실행하고 기준 커밋과 해시를 적었다. |

| 사건 ID | 문제 ID | 사건 | 발생 시각(KST, 분 단위) | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E01 | F01~F06 | CONFIRMED | 2026-11-17T13:21:00+09:00 | 독립 평가 | PENDING |
| E02 | F01~F06 | FIXED | 2026-11-17T13:30:00+09:00 | 코드·테스트·문서 수정, 단위 테스트 11개, `--plan` 비교, Gradle 재실행 | PENDING |

평가자가 확정하지 못한 의심 세 가지는 문제 수에 넣지 않았다.

- 주기 값이 빈 문자열이면 변환 결과가 null이 되어 기동이 실패할 수 있다는 의심: 실행으로 확정하지 못했다.
  null이면 기본값을 쓰도록 방어만 추가했다.
- 1초 구간 × API 수만큼 행이 생겨 조회 결과가 행 상한에 잘릴 수 있다는 의심: AWS에서 확인하지 못해 문서에 미확인으로 적었다.
- 없는 대시보드의 오류 코드가 `ResourceNotFound`인지: 확인하지 못했다(LM-08).

## 판정

필수 PASS 9 / FAIL 0 / UNVERIFIED 1 / N/A 0 (수정 후). LM-07이 미확인이라 조건부 결과다. 비필수 LM-08도 미확인이다.
발견 6 / 해결 6 / 미해결 0. P0 0 / P1 0 / P2 1 / P3 5.
PRECHECK 0 / INDEPENDENT_REVIEW 6 / POST_FIX_CHECK 0 / EXTERNAL 0 / 오탐 0.
수정 전 평가자 판정은 필수 PASS 7 / FAIL 1(LM-10) / UNVERIFIED 2(LM-06·LM-07)였다.
