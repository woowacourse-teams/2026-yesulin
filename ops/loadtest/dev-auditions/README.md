# DEV 공고 목록 RPS 부하 측정

PC에서 `https://dev-api.yesulin.art`의 공개 공고 목록만 조회한다. API 주소는 고정하며 예매 요청·PROD·로컬 서버를 대상으로 하지 않는다. 서버 설정과 쿼리를 변경하거나 재배포할 필요 없다.

## 준비와 실행

- PC: k6, Python 3.9 이상. Grafana/Prometheus/Loki나 Docker가 필요 없다.
- DEV 앱·DB가 **Standard**인지 확인한다. 자동 스케일 아웃이 꺼져 있는지 확인한다.
- CloudWatch에서 두 인스턴스의 `CPUCreditBalance`와 측정 시각을 확인한다. 현재 t4g.micro 2 vCPU 기준 이번 작업 전체에 인스턴스당 20 credit을 예산으로 잡고, 최소 30 credit은 남긴다. 스크립트는 시작 잔액 50 이상·표본 15분 이내를 요구한다. 모드와 예산 누적은 실행자가 별도로 확인해야 한다.
- 기본 CPU/credit 표본은 5분 해상도이며 실시간 중단 장치가 아니다. 1회 최대 약 100초를 CPU 100%로 사용해도 2 vCPU 기준 약 3.34 credit을 사용한다(적립 제외 보수적 상한). 이미 사용한 시험 시간도 예산에 포함한다.
- 기존 테스트 데이터: 공고 총 3,502건, 그중 테스트 공고 3,500건. 실행 전 API에서 현재 open/all 수를 읽고 실행별 fixture에 저장한다. 응답 건수가 중간에 바뀌면 검증 오류로 처리한다.

저장소 루트에서 실행한다. **한 번에 한 단계만 실행하고 결과·크레딧을 확인한 뒤 다음 단계로 간다.**

```sh
# 아래 잔액과 시각은 반드시 이번에 조회한 값으로 대체
python3 ops/loadtest/dev-auditions/run.py --rps 5 \
  --app-credit 288 --db-credit 288 --credit-time 2026-10-13T10:45:00+00:00

# 결과만 다시 생성: 부하를 발생시키지 않음
python3 ops/loadtest/dev-auditions/report.py

# 결과 페이지. 로컬 전용 포트이며 AWS 설정을 변경하지 않는다.
python3 -m http.server 13001 --bind 127.0.0.1 --directory ops/loadtest/dev-auditions
# http://localhost:13001/report.html
```

측정 단계는 5 → 10 → 20 → 40 RPS. 이후 증가는 이전 단계 통과, 크레딧 예산, 서버 상태를 확인한 다음 결정한다. 60초 결과는 단기 처리 능력이며 장기 지속 처리량과 운영 서버 용량을 보장하지 않는다.

## 부하 모델

`constant-arrival-rate`로 일정 요청량을 예약한다. 한 iteration은 HTTP GET 한 번이다. 사용자 생각 시간 `sleep`은 없으며 목표 RPS를 요청 수에 직접 대응시킨다. 응답이 느려져도 요청 예약을 늦추지 않는다. 내부 VU 수는 지연을 견디며 요청을 보내기 위한 실행 슬롯이다. 초기 실행은 필요 시 슬롯을 늘렸지만 40 RPS에서 21건이 dropped됐다. 최종 스크립트는 측정 시작 전 `min(500, max(20, RPS×10+10))`개를 확보하고 측정 중 동적 할당을 하지 않는다. 40 RPS 재확인에서는 410개를 먼저 확보한다. 이는 PC 요청 발생기의 설정 변경이며 서버 성능 개선이 아니다.

매 실행: **1 RPS 30초 예열 → 5초 간격 → 목표 RPS 60초**, 종료 유예 최대 5초. 예열은 측정 p95/p99·오류·처리량에서 제외한다. 예열은 JVM/JIT·DB 캐시·연결의 초기 효과를 줄이지만, 긴 GC나 swap 지연을 없앤다는 보장은 없다. 새 클라이언트 연결의 TLS 비용은 종단 지연에 포함한다.

혼합: 첫 페이지 70%, 페이지 1~4 조회 20%, 마감 포함 첫 페이지 10%. 페이지 크기 12. HTTP 200, 페이지/크기/건수, 요청 ID 반환을 검증한다. 모든 URL은 공개 조회 API이며 목록 파일은 다운로드하지 않는다. 무작위 사용자·로그인·예매·깊은 페이지·검색/카테고리 필터의 용량은 이 시험으로 검증하지 않는다.

자동 중단은 측정 30초 이후 누적 측정 p95 ≥ 1,000ms 또는 검증 오류율 ≥ 1% 또는 dropped 발생 시 적용한다. p95 기준은 이번 시험의 임시 성공 기준이며 제품 SLO로 확정한 값이 아니다. `dropped_iterations`는 k6가 예약한 요청을 시작하지 못한 수다. 서버 지연으로 실행 슬롯이 부족해졌는지, PC 부하/네트워크 문제인지 구분한다. dropped를 제외한 성공 응답만으로 목표 RPS를 견뎠다고 판정하지 않는다.

## 결과 파일과 확인 순서

`results/{UTC-run-id}/`에 다음 파일을 보관한다. 원본과 HTML은 Git에 올리지 않고 로컬에 보존한다. 결과 보고서에는 RPS 실행만 표시한다.

| 파일 | 내용 |
| --- | --- |
| metadata.json | 목표 RPS, 예열·측정 길이, 실행 시각, 기준 commit, k6 버전, 사전 CPU credit, exit code |
| fixture.json | 실행 전 API에서 읽은 open/all 수 |
| console.log | k6 콘솔·threshold 결과 |
| summary.json | k6 전체 통계. 전체 RPS는 예열·대기 시간이 섞이므로 측정 RPS와 다름 |
| raw.ndjson | 시간·phase·조회 종류별 원본 수치 |
| analysis.json | 예열 제외 처리량·p50/p95/p99·오류·dropped·초별 그래프 |
| ../report.html | 실행 비교 및 상세 그래프. report.py로 언제든 재생성 |

1. 목표 RPS가 실제로 전달됐는지 started/completed, dropped를 본다.
2. 오류율을 본다. 200이어도 페이지·건수가 틀리면 실패다.
3. p95/p99와 초별 최대 지연을 본다. 평균만 보면 드문 긴 정지가 가려진다.
4. 같은 시각 서버 elapsedMs와 대조한다. 클라이언트 TTFB는 서버 처리와 네트워크 대기를 포함한다.
5. GC → Hikari active/pending/acquire → CPU/메모리 → MySQL slow query/lock/cache/I/O 순으로 원인을 좁힌다. 스레드 수나 connection 수가 높다는 사실만으로 병목으로 판정하지 않는다.

## CloudWatch와 요청 연결

DEV `/yesulin/dev/backend`의 HTTP 로그에는 `lt-{run-id}-measure-{vu}-{iteration}` requestId가 남는다. 결과 페이지에 실행별 쿼리를 표시한다. 기간을 실행 시각 전후로 제한한다.

```sql
fields @timestamp, requestId, elapsedMs, status
| filter event = "HTTP_REQUEST" and requestId like /lt-REPLACE_RUN_ID-measure-/
| sort @timestamp asc
```

```sql
fields @timestamp, GcPauseCount, GcPauseTimeMs, GcPauseMaxMs, GcPauseRatio,
       JvmHeapUsed, JvmHeapMax, TomcatThreadsBusy, DbConnectionsActive,
       DbConnectionsPending, DbConnectionAcquireMaxMs, DbConnectionTimeouts,
       HostMemoryAvailable, HostSwapUsed
| filter event = "RUNTIME_METRICS"
| sort @timestamp asc
```

DB 그룹 `/yesulin/dev/database`에서 `event = "DATABASE_METRICS"`를 본다. 수집은 1분 주기다. 순간 포화·GC 시각을 정확히 찾으려면 요청 로그와 함께 해석한다. `GcPauseTimeMs`는 이전 수집 이후 합계이고 `GcPauseMaxMs`는 rolling window 최대다. 상세 GC 원인/세대별 로그는 현재 수집 대상이 아니다. `HostSwapUsed`는 사용량이며 실제 swap I/O가 아니다. `ProcessCpuUsage`가 계속 0으로 나오면 이를 CPU 여유의 증거로 사용하지 않고 EC2 CPU 수치와 대조한다.

## 현재 진단과 범위

2026-10-13 19:33:44 KST 부근 사전 시험에서 HTTP 지연 약 9.8초와 GC 정지 9,678ms가 함께 관측됐다. 다음 표본의 GcPauseCount=1, GcPauseTimeMs=9,678, GcPauseMaxMs=9,678이었다. 긴 GC의 근본 원인은 아직 미확정이다. 당시 DB 분 단위 표본에서 SlowQueries/RowLockWaits는 0이었지만 순간 병목 전체를 배제하지 않는다. 예열 이후 시험에서 반복 여부를 별도로 확인한다.

상태를 바꾸지 않고 로컬에 결과를 저장하며 새 CloudWatch custom metric이나 대시보드를 생성하지 않는다. 기존 로그 수집·조회 비용은 남는다. 서버의 상세 GC 로그 추가나 JVM 설정 변경은 이 작업에 포함하지 않는다.

참고: [일정 요청률 실행기](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/), [Dropped iterations](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/dropped-iterations/).
