# 모니터링

`ops/monitor/app.sh`와 `ops/monitor/database.sh`는 상태를 읽기만 하고, 모두 통과하면 0, 실패하면 1을 반환한다.

- App: Spring readiness, CodeDeploy, SSM, root disk
- DB: data EBS mount, disk, Docker, MySQL health와 애플리케이션 계정 query

스크립트는 password와 secret 원문을 출력하지 않는다. 현재 자동 재시작과 주기 실행은 설정하지 않는다.


## CloudWatch 수집 경로

DEV·PROD 공통 배포에서 `install_monitoring.sh`가 Ubuntu ARM64 CloudWatch Agent를 설치/활성화하고
`/var/log/yesulin/yesulin.log`를 `/yesulin/{dev|prod}/backend`로 보낸다. 배포 번들의
`deployment-environment.txt`는 CodeBuild의 `DEPLOY_ENV`로 만들며 복호화된 설정 파일을 출력하거나 source하지 않는다.
기존 Agent JSON의 다른 로그 경로와 지표 설정을 보존하고 같은 파일 경로의 기존 HTTP 전용 필터만 갱신한다.
서로 다른 환경의 로그 그룹을 가리키는 기존 경로는 자동 덮어쓰지 않고 실패한다.
기존 설정은 `.before-yesulin`로 백업한다. 다중 append-config fragment를 별도로 운영하는 서버는 먼저 구성 병합을 확인한다.
Agent 바이너리는 미설치일 때만 AWS 공식 Ubuntu ARM64 패키지로 설치한다.

수집 이벤트는 `HTTP_REQUEST`, `UNEXPECTED_ERROR`, `UNEXPECTED_SERVICE_ERROR`, `SLOW_SERVICE`,
`RUNTIME_METRICS`, `RUNTIME_METRICS_FAILURE`다. 요청 본문·Cookie·사용자 식별자를 추가로 기록하지 않는다.
파일의 ISO 시각대 `+09:00`을 해석하기 위해 Agent 서비스에만 `TZ=Asia/Seoul`을 설정하고 Local timestamp를 쓴다.
기존 backend 로그 그룹 보관 설정은 바꾸지 않는다. 현재 DEV 30일, PROD 14일이며 새 그룹은 별도로 보관 기간을 지정한다.

### 런타임 메트릭

기존 Actuator/Micrometer registry에서 값을 읽어 **CloudWatch EMF JSON** 한 줄을 1분마다 남긴다.
외부 HTTP endpoint는 기존대로 `health`만 노출한다. `/actuator/metrics` 공개나 새 포트 개방은 필요 없다.
`dev` 또는 `prod` profile에서만 활성화하며 `YESULIN_MONITORING_ENABLED=false`로 끌 수 있다.
별도 암호화 설정 변경 없이 기본 활성화되어 dev 배포 검증 후 main의 prod 배포에도 같은 코드가 적용된다.
Tomcat MBean registry는 `server.tomcat.mbeanregistry.enabled=true`로 켠다.

- 앱 시작 완료 후 30초부터 전용 daemon 스레드 1개로 실행하며, 완료 후 60초를 기다린다.
  Servlet 요청 스레드나 기존 Spring 예약 작업의 실행 스레드를 공유하지 않는다. 종료할 때 스레드를 정리한다.
- 앱은 로컬 파일만 기록하며 네트워크 전송은 Agent가 담당한다. JVM 수집은 DB 쿼리를 실행하지 않는다.
- Namespace `Yesulin/Application`, dimension **Environment=dev|prod**만 사용한다.
  요청 ID, 사용자, URI, JVM pool 이름을 metric dimension으로 만들지 않는다.
- 누락·NaN·음수 값은 생략한다. **데이터 없음은 0이 아니다.** 첫 표본은 누적 counter/timer의 기준점이다.
  여러 GC 원인/풀의 timer를 합치며 새 meter와 counter reset은 다음 표본부터 차분을 계산한다.

| 지표 | 단위·의미 |
| --- | --- |
| `JvmHeapUsed`, `JvmHeapMax`, `JvmNonHeapUsed` | Bytes, JVM 전체 heap와 non-heap; undefined max는 생략 |
| `ProcessCpuUsage` | Percent, 프로세스 CPU 이용률 |
| `JvmThreadsLive` | Count, JVM 전체 살아 있는 thread 수; 요청 처리 여유와 다름 |
| `TomcatThreadsBusy`, `TomcatThreadsMax` | Count, 사용 중 / 설정 최대 요청 thread |
| `DbConnectionsActive`, `DbConnectionsIdle`, `DbConnectionsPending`, `DbConnectionsMax` | Count, Hikari pool 상태; 여러 pool이면 합계 |
| `DbConnectionAcquireMeanMs` | Milliseconds, 표본 간 신규 acquire의 평균 대기 시간; acquire 없는 구간 생략 |
| `DbConnectionAcquireMaxMs` | Milliseconds, Micrometer 최근 rolling window 최대; 정확한 이번 1분 최대가 아님 |
| `DbConnectionTimeouts` | Count, 이전 표본 이후 acquire timeout 증가분 |
| `GcPauseCount`, `GcPauseTimeMs` | Count / Milliseconds, 표본 간 GC 횟수·pause 합계 |
| `GcPauseMaxMs` | Milliseconds, Micrometer 최근 rolling window 최대 |
| `GcPauseRatio` | Percent, pause 증가분 / 실제 monotonic 수집 간격; CPU 사용률과 다름 |

Agent는 backend 호스트의 `mem_available`, `swap_used_percent`도 60초마다 `CWAgent` namespace로 보낸다.
`InstanceId`와 plugin의 `Environment`, `Service=backend`로 환경별 호스트를 구분한다.
현재 환경별 backend 1대 기준이다. 여러 인스턴스로 늘리면 앱의 Environment만으로는 인스턴스 포화가 섞이므로
차원/대시보드 비용과 집계 방식을 다시 결정한다. 1분의 순간 gauge는 짧은 포화를 놓칠 수 있으므로 부하 도구의
응답 시간, 오류, 분당 API 로그와 함께 해석한다. 수집 스레드·파일 기록·Agent 비용까지 포함해 부하를 측정한다.

### DB 서버 수집 (애플리케이션 배포와 별도)

DB는 EC2의 Docker `yesulin-mysql`이므로 앱 JAR 배포만으로 MySQL 내부 지표가 생기지 않는다.
DB 서버에 저장소의 아래 파일을 전달한 뒤 해당 환경에서 실행한다. 컨테이너의 기존 애플리케이션 계정으로
`SHOW GLOBAL STATUS`/`SHOW GLOBAL VARIABLES`만 실행하며 계정 생성, 권한 변경, 설정 변경은 하지 않는다.
먼저 조회가 성공하는지 확인하고, 실패하면 설치를 중단한다. 암호와 쿼리 결과 원문은 오류 로그에 출력하지 않는다.

```bash
# DB 서버, 저장소 루트에서 각각 dev 또는 prod 선택
sudo python3 ops/monitor/cloudwatch/database_metrics.py dev --once
sudo sh ops/monitor/cloudwatch/install_database.sh dev
systemctl status yesulin-database-metrics.timer
journalctl -u yesulin-database-metrics.service -n 20 --no-pager
```

systemd oneshot+timer가 완료 후 60초마다 SQL 2개와 Linux counter를 읽고 20초 안에 종료한다.
`/var/log/yesulin-monitoring/database.jsonl`를 `/yesulin/{환경}/database`로 전송한다. 로컬 파일은
현재/직전 각 5MB, CloudWatch DB 그룹은 14일이다. 기준점은 `/var/lib/yesulin-monitoring/database-state.json`에
저장하며 재부팅/MySQL uptime 감소/개별 counter reset을 감지하면 잘못된 차분을 내보내지 않는다.
실패한 수집은 timer service 실패로 표시되며, 마지막 값이나 임의의 0으로 성공을 가장하지 않는다.

Namespace `Yesulin/Database`, dimension `Environment`를 사용한다.

| 지표 | 의미 |
| --- | --- |
| `BufferPoolUsedBytes`, `BufferPoolCapacityBytes`, `BufferPoolDirtyPct` | 캐시된 데이터 페이지 bytes / 설정 용량 / dirty page 비율; MySQL 전체 RSS와 다름 |
| `BufferPoolCacheHitPct` | `100 × (1 - Δphysical_reads / Δread_requests)`; 읽기가 없으면 생략 |
| `MysqlConnections`, `MysqlMaxConnections`, `MysqlThreadsRunning` | 연결 수 / 최대 연결 / 실행 중 thread; 수집기 자신의 연결·조회도 포함 |
| `QueriesPerSecond`, `SlowQueries` | 실제 간격당 Questions 증가율 / slow query 증가분; `long_query_time` 기준 |
| `RowLockCurrentWaits`, `RowLockWaits`, `RowLockTimeMs` | 현재 행 잠금 대기 / 대기 증가분 / 누적 대기 시간 증가분; 메타데이터 락과 다름 |
| `HostMemoryAvailable`, `HostSwapUsed` | `/proc/meminfo`의 가용 메모리 / 사용 swap bytes |
| `HostSwapInBytes`, `HostSwapOutBytes` | 실제 swap I/O 증가분; swap 사용량만으로 현재 swapping을 판단하지 않음 |
| `DataDiskReadBytes`, `DataDiskWriteBytes`, `DataDiskIoTimeMs` | `/data/mysql`의 정확한 block device에서 읽은 I/O 증가분; I/O 활성 시간은 쿼리 지연과 다름 |

DB 최초 표본에는 차분 지표가 없으며 최소 2번 수집해야 적중률/I/O가 나온다. SQL 문장별 지연/실행 계획과
slow query 원문 수집은 포함하지 않는다. 느린 API를 특정한 다음 해당 쿼리의 실행 계획을 별도로 분석한다.
DB collector 설치는 DB AMI/user-data 등 DB 서버 배포에도 포함해야 새 DB 인스턴스에 유지된다.

### 대시보드와 오류 검색

`ops/monitor/cloudwatch/update_dashboards.py`는 기존 기본 대시보드의 EC2·ALB·알람을 보존하고,
이번 API 분석 위젯만 Log 대시보드로 이동한다. 원본 JSON을 작업 디렉터리에 백업한다.
앱/DB 설치와 독립적으로 실행하므로 아직 수집되지 않은 지표는 빈 그래프다.

```bash
# AWS 조회·수정 권한과 boto3가 있는 운영 터미널에서 실행
python3 ops/monitor/cloudwatch/update_dashboards.py --plan
python3 ops/monitor/cloudwatch/update_dashboards.py
# AWS 변경 없이 검증
python3 -m unittest discover -s ops/monitor/cloudwatch/tests -v
```

- `DASHBOARD-yesulin`: 기존 인프라 대시보드
- `DASHBOARD-yesulin-log`: DEV/PROD API 요청 수, `/api/v1/{target}` 첫 경로별 집계, method+endpoint 패턴별
  p50/p95/p99, GET/공개 예매 POST 비율, 4xx/5xx·오류 코드, 느린 요청/서비스, 예외 상세
- `DASHBOARD-yesulin-metric`: JVM·Tomcat·Hikari·GC, backend 메모리/swap, DB 주요 지표
- 추가 지표는 Metrics → All metrics → `Yesulin/Application`, `Yesulin/Database`, `CWAgent`에서 확인한다.

Logs Insights의 저장 쿼리 `yesulin/{환경}/error-details`에서 오류를 찾아 `requestId`를 복사하고,
`request-trace`의 `REPLACE_WITH_REQUEST_ID`를 바꿔 실행한다. 요청 완료와 예외 이벤트를 같은 ID로 추적한다.
본문/stack_trace 열 또는 전체 `@message`를 펼쳐 원인을 확인한다. 4xx는 `api-error-codes`로 별도 확인하며
정상적인 매진·인증 실패를 서버 장애와 섞지 않는다. 500ms 이상 비HTTP 서비스 실패는 현재 AOP 정책상
`SLOW_SERVICE`에 outcome만 있으므로 해당 예외의 stack trace가 항상 존재하는 것은 아니다.

로그 수집 시작 이후의 원문만 검색할 수 있으며, Logs Insights는 로그 그룹 생성 시각보다 이른 event timestamp를
검색하지 못한다. 요청 수는 고유 사용자 수가 아니고, elapsedMs는 ALB 대기·클라이언트 네트워크 시간을 제외한다.
로그 위젯을 열거나 새로고침하면 Insights 조회가 실행되므로 기본 대시보드와 분리하고 필요한 기간만 선택한다.

### 권한·비용·배포 확인

- 앱 EMF는 기존 `logs:PutLogEvents` 경로에서 변환되어 앱에 AWS 자격 증명/PutMetricData 호출을 추가하지 않는다.
- EC2 role은 Agent의 로그 그룹/stream 생성·조회·전송 권한이 필요하다. DB 보관 기간 설정에는
  `logs:PutRetentionPolicy`, backend 호스트 지표에는 `cloudwatch:PutMetricData`가 필요하다.
  기존 role이 허용하는지 확인한다. 이 변경은 IAM 권한을 자동으로 추가하지 않는다.
- 대시보드 스크립트는 별도 운영 권한 `cloudwatch:GetDashboard/PutDashboard`,
  `logs:DescribeQueryDefinitions/PutQueryDefinition`이 필요하다.
- 앱은 최대 18개 × 2환경, DB는 최대 19개 × 2환경, backend 호스트는 2개 × 2인스턴스다.
  매번 timestamp/requestId별 metric을 만들지 않는다. Agent가 이미 다른 지표를 수집하면 그 비용은 별도다.
  서울 리전 custom metric 최초 10,000개 단가 $0.30/metric-month 기준으로, 앱/호스트만 최대 40개는
  월 $12.00, DB까지 최대 78개는 월 $23.40다. 무료 10개를 모두 적용할 수 있으면 각각 $9.00/$20.40다.
  모든 지표가 한 달 내내 송신되는 상한 추정이며 실제 활성 시간, 무료 사용량, 로그·검색·API와 세금은 별도다.
  DB 수집은 앱 배포와 독립적으로 설치하므로 앱 PR만 머지해 DB 지표까지 활성화되지는 않는다.
- 기본 Metric 대시보드는 직접 참조 46개와 현재 backend 2대의 호스트 4개로 최대 50개를 표시한다.
  AWS 무료 조건은 계정 내 dashboard 수·각 dashboard 참조 metric 수·계정 조건을 함께 확인해야 한다.
  custom metric, 로그 수집·보관·Insights, API 호출 비용은 dashboard 비용과 별개다.
  수집 간격 1분은 호출/로그 양을 줄이며 **metric 개수에 따른 요금을 없애지 않는다.**

배포 후에는 dev부터 아래를 확인하고 main을 통해 prod에 배포한다. 애플리케이션을 먼저 빌드/배포하며
현재 실행 중인 JAR의 YAML이나 복호화된 env를 즉석 수정하지 않는다.

1. `/actuator/health/readiness` 200, `/actuator/metrics` 비노출 확인.
2. `systemctl is-active amazon-cloudwatch-agent`, Agent 로그의 AccessDenied/configuration 오류 확인.
3. 30~90초 뒤 앱 파일에 `RUNTIME_METRICS` JSON과 `_aws` 객체 확인. 2~5분 뒤 CloudWatch 실제 metric 확인.
   Tomcat/Hikari가 빠져 있으면 0으로 취급하지 말고 meter 등록/설정을 점검한다.
4. GET 한 건을 보내 응답의 `X-Request-Id`로 CloudWatch `HTTP_REQUEST`를 찾는다.
   오류 검색은 실제 오류 로그가 생긴 경우 확인하며 검증 때문에 운영 500 오류를 일부러 만들지 않는다.
5. DB collector는 dev DB에 먼저 설치하고 파일·그룹·metric을 확인한 후 prod DB에 설치한다.
6. 필요하면 collector를 중지한다: 앱 `YESULIN_MONITORING_ENABLED=false` 후 재배포,
   DB `systemctl disable --now yesulin-database-metrics.timer`, Agent `systemctl disable --now amazon-cloudwatch-agent`.
   전체 Agent 중지는 다른 수집도 멈추므로 설정을 검토한다. 이미 보관된 로그는 삭제하지 않는다.

참고: [EMF](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html),
[Agent 지표](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html),
[MySQL status](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html),
[AWS CloudWatch 요금](https://aws.amazon.com/cloudwatch/pricing/),
[서울 리전 가격표](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonCloudWatch/current/ap-northeast-2/index.json).

## OTR 공고 경유 링크 집계

클릭 카운터는 DB에 저장하지 않는다. 기존 JSON 파일 로그에서 `event=HTTP_REQUEST`, `method=GET`,
`endpoint=/api/v1/otr`, `status=302`인 이벤트만 집계한다.
HEAD와 실패 요청은 제외하며, 공고별 집계는 검증된 번호가 담긴 `otrId` 필드를 사용한다.
쿼리 문자열 전체는 기록하지 않는다. 공유 링크 `/otr?vid={번호}`는 프론트가 백엔드로 rewrite한다.
별도 클릭 로그를 남기지 않아 동일 요청의 HTTP 로그와 중복 집계하지 않는다.
값은 고유 방문자 수가 아닌 경유 요청 횟수이며 반복 클릭과 봇 GET 요청이 포함될 수 있다.
로컬 파일은 기본 14일·1GB 보관 제한이 있다.

### 관리자 화면 (기본 확인 경로)

CloudWatch 조회와 독립적으로 각 환경의 `/admin` 개요에서도 확인한다.
DEV에서 보내는 실제 알림은 PROD 링크를 사용하므로 PROD `/admin`에서 집계한다.
DEV `/otr?vid={번호}`를 직접 테스트한 요청은 DEV `/admin`에만 집계한다.
환경 배지, 오늘·최근 7일·최근 14일 선택, 전체 이동 수, 공고별 이동 수와 마지막 이동 시각을 제공한다.
관리자의 원문 보기 버튼은 OTR에 직접 연결하여 확인 때문에 경유 집계를 늘리지 않는다.

`GET /api/v1/admin/otr-redirects?days=14`는 `ADMIN` 전용이다. 최근 줄 조회가 아니라 현재 파일과 기간 안의
압축 보관 파일(오늘의 크기별 rolling 파일 포함)을 함께 읽는다. 최대 200개 파일·해제된 64 × 1024 × 1024문자
상한과 읽기 오류는 `truncated=true`로 표시한다. 파일을 읽을 수 없으면 0건으로 오인하지 않게
`available=false`를 표시한다. 기본 로그 파일 경로는 EC2에서 `/var/log/yesulin/yesulin.log`다.
기존 텍스트·삭제된 보관 파일은 복원하지 않아 보관 중인 로그 기반 통계이지 영구 누적 통계는 아니다.
요청 시 읽고 수동 새로고침하며 별도 DB 카운터는 만들지 않는다.

### CloudWatch Logs Insights (선택 사항)

아래 예시는 배포 Agent가 `/yesulin/{환경}/backend`로 JSON 파일 로그를 전송한 뒤 사용할 수 있다.
서버 콘솔의 텍스트 로그가 아니라 JSON 파일 로그를 수집해야 아래 필드와 조건을 그대로 사용할 수 있다.

```text
filter event = "HTTP_REQUEST"
  and method = "GET"
  and endpoint = "/api/v1/otr"
  and status = 302
| stats count(*) as redirects by bin(1h)
```

공고별 집계는 마지막 줄을 `| stats count(*) as redirects by otrId`로 바꾼다.
조회 기간은 CloudWatch 콘솔에서 선택하며 보관 중인 과거 로그도 조회할 수 있다.

### CloudWatch Metrics

EC2 기본 지표에는 경로별 클릭 수가 없다. 로그 그룹(Standard class)에 아래 Metric Filter를 추가하면
수집 로그를 커스텀 지표로 변환할 수 있다. 이 문서는 설정 방법만 안내하며 AWS 리소스를 생성하지 않는다.

```text
{ ($.event = "HTTP_REQUEST") && ($.method = "GET") && ($.endpoint = "/api/v1/otr") && ($.status = 302) }
```

- Namespace: DEV `Yesulin/Notice/Dev`, PROD `Yesulin/Notice/Prod`, Metric name: `OtrRedirectCount`
- Metric value: `1`, Unit: `Count`, Default value: `0`
- Dimensions: 없음. DEV·PROD는 서로 다른 로그 그룹과 namespace로 구분한다.
- 그래프의 Statistic은 `Sum`으로 선택한다. 선택한 기간마다 매칭된 요청 수를 보여준다.

Metric Filter는 생성 이후 수집된 로그만 집계하고 과거 로그를 소급하지 않는다.
Default 0도 로그 수집 자체가 없는 시간에는 지표를 생성하지 않으므로 데이터 없음과 요청 0은 다를 수 있다.
공고 번호를 dimension으로 만들면 공고마다 지표가 생기므로 공고별 분석은 Logs Insights를 사용한다.
로그 수집·보관·Insights 쿼리 및 커스텀 지표는 계정 사용량/무료 범위에 따라 요금이 발생할 수 있다.
필터는 드물게 중복 전달될 수 있어 정확한 과금·고유 사용자 집계 용도로 사용하지 않는다.

참고: [AWS Metric Filter](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html),
[AWS CloudWatch 요금](https://aws.amazon.com/cloudwatch/pricing/).
