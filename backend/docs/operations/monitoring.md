# 모니터링

`ops/monitor/app.sh`와 `ops/monitor/database.sh`는 상태를 읽기만 하고, 모두 통과하면 0, 실패하면 1을 반환한다.

- App: Spring readiness, CodeDeploy, SSM, root disk
- DB: data EBS mount, disk, Docker, MySQL health와 애플리케이션 계정 query

스크립트는 password와 secret 원문을 출력하지 않는다. 현재 자동 재시작과 주기 실행은 설정하지 않는다.


## CloudWatch: 로그 기반 수집과 단일 대시보드

DEV·PROD 공통 배포에서 `install_monitoring.sh`가 Ubuntu ARM64 CloudWatch Agent를 설치/활성화하고
`/var/log/yesulin/yesulin.log`를 `/yesulin/{dev|prod}/backend`로 보낸다. 배포 번들의
`deployment-environment.txt`는 CodeBuild의 `DEPLOY_ENV`로 만들며 복호화된 설정 파일을 출력하거나 source하지 않는다.
기존 Agent JSON의 다른 로그 경로와 지표 설정을 보존하고 같은 파일 경로의 기존 HTTP 전용 필터만 갱신한다.
서로 다른 환경의 로그 그룹을 가리키는 기존 경로는 자동 덮어쓰지 않고 실패한다.
기존 설정은 `.before-yesulin`로 백업한다. 다중 append-config fragment를 별도로 운영하는 서버는 먼저 구성 병합을 확인한다.
Agent 바이너리는 미설치일 때만 AWS 공식 Ubuntu ARM64 패키지로 설치한다. 새 인스턴스 부팅 직후의 자동 업데이트가
패키지 잠금을 쥐고 있을 수 있어 설치는 잠금을 최대 60초 기다린다.
앱 배포의 후속 hook은 Agent 설치를 120초로 제한하고 실패/timeout이 앱 시작을 막지 않게 경고와
`/var/lib/yesulin-monitoring/backend-install-failed` 표식을 남기고 계속 진행한다.
이 경우 API 정상과 수집 정상을 혼동하지 말고 hook 출력/Agent 상태를 점검한다. 다음 성공 설치는 표식을 지운다.

수집 이벤트는 `HTTP_REQUEST`, `UNEXPECTED_ERROR`, `UNEXPECTED_SERVICE_ERROR`, `SLOW_SERVICE`,
`RUNTIME_METRICS`, `RUNTIME_METRICS_FAILURE`다. 요청 본문·Cookie·사용자 식별자를 추가로 기록하지 않는다.
DEV는 message가 `PDF_FLOW ` 또는 `PDF_AI_FAILED `로 시작하는 PDF 처리 로그도 수집한다.
이 로그에는 작업 ID·단계·결과 코드·소요 시간만 기록한다. PROD 수집 필터는 기존 이벤트 목록을 유지한다.
필터는 다음 백엔드 배포의 monitoring hook에서 갱신되며, 과거 수집에서 제외한 로그는 CloudWatch에 소급 반영되지 않는다.
파일의 ISO 시각대 `+09:00`을 해석하기 위해 Agent 서비스에만 `TZ=Asia/Seoul`을 설정하고 Local timestamp를 쓴다.
기존 backend 로그 그룹 보관 설정은 바꾸지 않는다. 현재 DEV 30일, PROD 14일이며 새 그룹은 별도로 보관 기간을 지정한다.

### 런타임 값

기존 Actuator/Micrometer registry에서 최대 18개 앱 값을 읽어 **일반 JSON 로그** 한 줄을 1분마다 남긴다.
`_aws` metadata·Metric Filter·PutMetricData로 custom metric을 만들지 않는다.
Linux `/proc/meminfo`의 MemAvailable과 사용 swap bytes 2개도 같은 로그에 남긴다.
MemAvailable은 reclaim 가능한 cache를 포함한다. 파일이 없거나 읽을 수 없으면 호스트 값만 생략한다.
외부 HTTP endpoint는 기존대로 `health`만 노출한다. `/actuator/metrics` 공개나 새 포트 개방은 필요 없다.
`dev` 또는 `prod` profile에서만 활성화하며 `YESULIN_MONITORING_ENABLED=false`로 끌 수 있다.
별도 암호화 설정 변경 없이 기본 활성화되어 dev 배포 검증 후 main의 prod 배포에도 같은 코드가 적용된다.
Tomcat MBean registry는 `server.tomcat.mbeanregistry.enabled=true`로 켠다.

- 앱 시작 완료 후 30초부터 전용 daemon 스레드 1개로 실행하며, 완료 후 60초를 기다린다.
  Servlet 요청 스레드나 기존 Spring 예약 작업의 실행 스레드를 공유하지 않는다. 종료할 때 스레드를 정리한다.
- 앱은 로컬 파일만 기록하며 네트워크 전송은 Agent가 담당한다. JVM 수집은 DB 쿼리를 실행하지 않는다.
- `Environment=dev|prod`, `sampleTimestamp`와 숫자 필드를 기록한다.
  별도 CloudWatch custom metric을 등록하지 않고 Logs Insights에서 이 숫자를 집계한다.
- 누락·NaN·음수 값은 생략한다. **데이터 없음은 0이 아니다.** 첫 표본은 누적 counter/timer의 기준점이다.
  여러 GC 원인/풀의 timer를 합치며 새 meter와 counter reset은 다음 표본부터 차분을 계산한다.

| 로그 필드 | 단위·의미 |
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
| `CacheHits`, `CacheMisses` | Count, 등록된 Caffeine 캐시의 JVM 기동 이후 누적 합계; 현재는 공고 COUNT 캐시 하나 |
| `CacheSize` | Count, 캐시 항목 수 합계; 비활성화 시 0 |

캐시 지표도 일반 `RUNTIME_METRICS` JSON 로그만 전송하며 별도 CloudWatch custom metric은 만들지 않는다.
같은 JVM의 테스트 전후 누적 차이로 hit/miss를 비교한다. 동시 miss는 하나의 로딩을 기다릴 수 있으므로
miss 수가 실제 COUNT SQL 실행 횟수와 같지는 않다. SQL 횟수는 DB 집계로 따로 확인한다.

`HostMemoryAvailable`, `HostSwapUsed`는 Bytes 단위의 로그 필드로 기록한다.
Agent는 로그만 전송한다. 이전 버전의 이 스크립트가 만든 정확한 backend mem/swap plugin만 제거하며
다른 Agent 지표 설정은 보존한다. 외부에서 이미 켠 custom metric 비용은 이 변경으로 사라지지 않는다.
현재 환경별 backend 1대 기준이다. 여러 인스턴스로 늘리면 앱의 Environment만으로는 인스턴스 포화가 섞이므로
log stream/인스턴스별 집계 쿼리를 다시 결정한다. 1분의 순간 gauge는 짧은 포화를 놓칠 수 있으므로 부하 도구의
응답 시간, 오류, 분당 API 로그와 함께 해석한다. 수집 스레드·파일 기록·Agent 비용까지 포함해 부하를 측정한다.

### DB 서버 수집 (애플리케이션 배포와 별도)

DB는 EC2의 Docker `yesulin-mysql`이므로 앱 JAR 배포만으로 MySQL 내부 지표가 생기지 않는다.
DB 서버도 **Ubuntu ARM64**를 전제로 하며 설치 시작 시 쓰기 전에 확인한다.
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
기준점 파일이 손상되면 경고 후 새 기준점을 만들며 복구 표본의 차분은 생략한다.
실패한 수집은 timer service 실패로 표시되며, 마지막 값이나 임의의 0으로 성공을 가장하지 않는다.

`event=DATABASE_METRICS`, `Environment`와 UTC timestamp 및 숫자 필드를 기록한다.
EMF metadata가 없으며 DB 값도 로그 검색으로 그래프화한다.

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

`ops/monitor/cloudwatch/update_dashboards.py`는 **기존 `DASHBOARD-yesulin` 하나**에 로그 그래프를 추가한다.
EC2·ALB·알람·스냅샷·다른 운영 메모를 보존하고 원본 JSON을 백업한다. 재실행해도 소유 위젯을 중복하지 않는다.
별도 Log/Metric 대시보드를 만들지 않는다. 기본 조회는 최근 3시간이다.
DB 그룹이 아직 없으면 설치 안내만 보여주며 DB 설치 후 재실행하면 그래프가 추가된다.

```bash
# AWS 권한과 boto3가 있는 운영 터미널에서 실행
python3 ops/monitor/cloudwatch/update_dashboards.py --plan
python3 ops/monitor/cloudwatch/update_dashboards.py
python3 -m unittest discover -s ops/monitor/cloudwatch/tests -v
```

대시보드를 열면 저장한 쿼리 집계가 실행되므로 18개 값을 매번 직접 검색할 필요 없다.
DEV/PROD 영역에서 API 요청 수, `/api/v1/{target}` 첫 경로별 집계, method+endpoint 패턴별 p50/p95/p99,
조회/예매 비율, 오류와 앱 메모리·thread·커넥션·GC 및 DB 캐시·메모리·swap·I/O를 확인한다.
관련 값을 단위별 한 그래프에 묶고 Bytes는 메모리 그래프에서 MiB로 표시한다.
전체 숫자는 저장 쿼리 `yesulin/{환경}/runtime-latest`, `database-latest`의 원문을 펼쳐 본다.
이 값들은 **All metrics의 새 custom metric이 아니라 로그에 있는 숫자 필드**다.

저장 쿼리 `error-details`의 requestId를 복사하고 `request-trace`의 `REPLACE_WITH_REQUEST_ID`를 바꿔 실행한다.
stack_trace/@message를 펼쳐 요청 완료·예외를 추적한다. 4xx는 `api-error-codes`로 확인한다.
현재 AOP는 500ms 이상 비HTTP 서비스 실패를 `SLOW_SERVICE`의 outcome으로만 남겨 stack trace가 항상 있지는 않다.

수집 이전 원문은 복원하지 않는다. Logs Insights는 그룹 생성 시각보다 이른 event timestamp를 검색하지 못한다.
요청 수는 사람 수가 아니며 elapsedMs는 ALB 대기·네트워크를 제외한다.
**열기·새로고침마다 검색이 실행되므로 자동 새로고침을 끄고 필요한 시간 범위만 선택한다.**
로그 검색 그래프는 상시 metric alarm과 같은 방식이 아니며 새 런타임 알람은 만들지 않는다.

### 권한·비용·배포 확인

- 이번 앱/호스트/DB 수집은 **새 CloudWatch custom metric 0개**다. 앞서 계산한 18개 × 환경별 metric 비용은 적용되지 않는다.
  로그 수집·보관·Insights 스캔과 기존 dashboard/알람/API 비용은 남는다. 실제 조회량과 청구 내역을 확인한다.
- 값을 버리지 않고 한 줄에 앱 18개+호스트 2개, DB 19개를 묶어 1분마다 기록한다.
  기록량/기간/검색 횟수에 따라 로그 비용이 달라지며 무료 사용량이 남았다고 가정하지 않는다.
- EC2 role에는 로그 그룹/stream 생성·조회·전송, DB 보관 설정에는 `logs:PutRetentionPolicy`가 필요하다.
  이번 수집에는 `cloudwatch:PutMetricData`가 필요 없다. IAM을 자동 변경하지 않는다.
- 대시보드는 `cloudwatch:GetDashboard/PutDashboard`, `logs:DescribeLogGroups`,
  `logs:DescribeQueryDefinitions/PutQueryDefinition`을 사용한다.

1. dev 병합/배포 후 readiness 200, `/actuator/metrics` 비노출을 확인한다.
2. Agent active 여부와 AccessDenied/configuration 오류, `backend-install-failed` 표식이 없는지 확인한다.
3. 30~90초 뒤 파일과 CloudWatch의 `RUNTIME_METRICS` 숫자 필드 및 `_aws` 부재를 확인한다.
4. 대시보드 스크립트를 실행하고 API/앱 그래프를 확인한다. GET 응답 X-Request-Id로 요청 원문도 확인한다.
5. dev DB 수집기를 별도 설치·검증하고 스크립트를 재실행한다. 정상 확인 후 main에 앱을 배포하고 prod DB에도 적용한다.
6. 중지: 앱 `YESULIN_MONITORING_ENABLED=false` 재배포, DB `systemctl disable --now yesulin-database-metrics.timer`.
   Agent 전체 중지는 다른 수집도 멈추므로 설정을 검토한다. 이미 보관된 로그는 삭제하지 않는다.

참고: [로그 쿼리 대시보드](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_ExportQueryResults.html),
[Logs Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html),
[MySQL status](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html),
[AWS CloudWatch 요금](https://aws.amazon.com/cloudwatch/pricing/).

## OTR 공고 경유 링크 집계

경유 링크 이동 카운터는 DB에 저장하지 않는다(오픈채팅방 링크 방문 수는 별도 DB 카운터다). 기존 JSON 파일 로그에서 `event=HTTP_REQUEST`, `method=GET`,
`endpoint=/api/v1/otr`, `status=302`인 이벤트만 집계한다.
HEAD와 실패 요청은 제외하며, 공고별 집계는 검증된 번호가 담긴 `otrId` 필드를 사용한다.
쿼리 문자열 전체는 기록하지 않는다. 공유 링크 `/otr?vid={번호}`는 프론트 페이지가 `/api/v1/otr`로 이동시키고,
이 요청을 프론트가 백엔드로 rewrite한다.
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
이 파일은 인스턴스마다 따로 있으므로 인스턴스가 여러 대면 `/admin`은 그 요청을 받은 인스턴스의 이동만 보여준다.
환경 전체 합계는 아래 CloudWatch Logs Insights 쿼리로 본다.

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

### 집계와 비용

OTR도 위 Logs Insights 쿼리로 집계하며 이 변경은 경로/공고별 custom metric을 만들지 않는다.
고유 사용자·정확한 과금 집계가 아니며 반복 클릭·봇과 드물게 중복 전달된 로그가 포함될 수 있다.
조회 기간·보관 로그 범위에 따른 결과이므로 영구 누적 통계로 사용하지 않는다.
