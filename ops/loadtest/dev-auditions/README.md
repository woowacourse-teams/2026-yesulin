# DEV 공고 목록 RPS 측정과 보고서

PC에서 `https://dev-api.yesulin.art`의 공개 공고 GET만 호출한다. 현재 확인 범위는 **100 RPS 한 단계**이며 예매·PROD·로컬 API는 호출하지 않는다. 공고 데이터는 총 3,502건이고 실행 전 API에서 공개/진행 중 건수를 fixture로 저장한다.

## 실행 조건

- k6, Python 3.9 이상. Grafana/Prometheus/Loki/Docker는 필요 없다.
- 현재 DEV APP·DB의 Standard 모드, 서버 정상 상태, 스케일 아웃 설정과 CPU credit을 먼저 확인한다. **인스턴스가 교체되면 새 ID의 잔액을 다시 확인한다.**
- 인스턴스당 작업 예산 20 credit / 최소 잔액 30 credit. runner는 시작 잔액 50 이상·15분 이내 표본을 요구한다. 모드와 누적 예산은 실행자가 확인한다.
- EC2 기본 CPU/credit은 5분 표본으로 실시간 중단 장치가 아니다. k6 최대 107초를 2 vCPU 100%로 사용하는 경우 약 3.57 credit이지만 **클라이언트 종료 뒤에도 서버 작업은 남을 수 있으므로 전체 서버 소비 상한이 아니다.** 회복 구간까지 자원·credit을 확인한다.
- 한 번에 한 단계만 실행한다. 서버 회복·크레딧 확인 전 다음 부하를 실행하지 않는다.

```sh
# 잔액과 시각은 이번에 확인한 현재 인스턴스 값으로 대체
python3 ops/loadtest/dev-auditions/run.py --rps 100 \
  --app-credit 288 --db-credit 288 --credit-time 2026-10-14T01:29:00+00:00

# 저장된 결과만 다시 생성. 부하/AWS 조회 없음
python3 ops/loadtest/dev-auditions/report.py
# 최종 보고서: ops/loadtest/dev-auditions/report.html

python3 -m http.server 13001 --bind 127.0.0.1 --directory ops/loadtest/dev-auditions
# http://localhost:13001/report.html
```

13001은 PC의 HTML 열람 포트다. 최종 주소는 `/report.html` 하나로 사용한다. 회의 중 개편본은 `report-next.html`에서 검증했고 완료 후 최종 주소에 반영했다. 이전 HTML은 로컬 `report-before-full100.html`에 보존하며, 과거 실행 원본과 중단/전체 결과는 최종 보고서의 실행 선택에서도 확인할 수 있다. 별도 미리보기는 `report.py --output report-next.html`로 생성한다. HTML에 데이터와 그래프를 포함하므로 파일 자체도 공유할 수 있다. 원본 링크는 로컬 결과 파일이 있을 때만 열린다.

## 부하 모델과 종료

`constant-arrival-rate`에서 iteration 하나는 GET 한 번이다. 목표 RPS에 따라 요청을 예약하며 느린 응답 때문에 새 요청을 늦추지 않는다. 실행 슬롯은 사전에 `min(2500,max(20,RPS×12+20))`개를 확보한다. VU는 요청 발생기의 내부 슬롯이며 사용자 수로 보고하지 않는다.

**1 RPS/30초 예열 → 5초 간격 → 목표 RPS/60초 → 최대 12초 응답 대기.** 요청 timeout은 10초다. 첫 오류에도 계속 측정하고 오류/검증/dropped threshold는 종료 때 판정한다. 이는 무기한 스트레스 테스트가 아니다. 예열은 JVM/JIT·DB 캐시·연결의 초기 효과를 줄이려는 조건이며 30초/1 RPS의 충분성은 검증하지 않았다. 서버가 따뜻한 연속 단계 시험에서는 최초 한 번 예열할 수 있지만, 현재 한 단계의 독립 시험에서는 적용하지 않았다.

요청 혼합은 첫 페이지 70% / 다음 페이지 1~4 20% / 마감 포함 첫 페이지 10%, 페이지 크기 12다. HTTP 200·페이지/건수·반환 request ID를 검증한다. 데이터가 중간에 바뀌면 검증 실패로 기록한다. 로그인·예매·파일 다운로드·깊은 페이지·검색/카테고리 용량은 검증하지 않는다.

과거 5~40 RPS는 지연 기준, 60~100 RPS 초기 실행은 첫 오류 중단을 사용했다. 이 조건과 중단 결과는 [results.md](./results.md)에 보존하며 현재 종료 정책과 혼동하지 않는다.

## 결과와 그래프

`results/{UTC-run-id}/`에 metadata, fixture, console, summary, raw.ndjson, analysis.json을 저장한다. 원본과 생성 HTML은 Git에서 제외한다. metadata의 sourceCommit은 로컬 저장소 SHA이며 서버 배포 SHA가 아니다. 실제 스크립트 SHA256도 저장한다.

- **최종 오류율:** 60초 부하 전달 + 시작 요청 모두 결과 확인 + dropped 0일 때 `오류/완료`로 확정한다. 수동 중단·미완료·미전송이 있으면 최종 값은 미확정이고 관측 오류율만 표시한다.
- **성공 RPS:** 측정 시간 안에 검증 성공한 건수/측정초. 완료 RPS에는 오류와 timeout도 포함되므로 구분한다. 종료 유예 중 완료된 요청은 최종 오류율에는 포함하지만 측정 중 RPS에는 제외한다.
- **조회 종류별 그래프:** first/paged/all 각각 분리한다. 점은 응답 또는 timeout 하나이며 x축은 완료 시각, y축은 PC의 종단 응답시간이다. 빨간 점은 timeout으로 실제 서버 완료 시간이 아니다. 선은 완료 시각 1초 구간의 p95를 선형 보간해 계산한다. 예열은 제외한다.
- **개별 요청:** 새 list_observation에 request_id/page/status/error_code를 기록한다. 이전 자료에 없는 ID나 결과를 만들어내지 않는다. ID 태그는 로컬 k6 JSON에만 사용하며 AWS custom metric으로 보내지 않는다.
- **자원:** resources.json의 실제 시각·분모·간격을 표시한다. JVM used/max, Tomcat busy/max, Hikari active/max, 호스트 `(1-MemAvailable/MemTotal)*100`이다. 메모리 사용률은 메모리 압박과 동일하지 않다. 없는 값은 0%가 아닌 미수집이다.

`host-probe.py --seconds 150 --output /tmp/host.json`은 Linux `/proc`를 1초씩 읽는다. 설치·서비스 등록·AWS metric 쓰기가 없고 180초 이내에 종료된다. APP·DB 원본을 구분해 가져오고 resources.json의 series.host-app / series.host-db에 넣는다. CPU는 guest 중복을 제외한 jiffy 차이에서 idle/iowait/steal을 뺀 값이다.

2026-10-14 시험의 APP 1초 파일은 인스턴스 종료로 회수하지 못했다. APP CPU는 AWS/EC2 **5분 평균**만 표시하고, DB CPU 1초 최대와 동일 해상도로 해석하지 않는다. APP RAM은 사전 `/proc/meminfo`의 실제 총량과 CloudWatch 가용 메모리를 사용한다. JVM·DB 로그는 기존 1분 표본으로 짧은 피크를 놓칠 수 있다. ProcessCpuUsage=0은 당시 신뢰할 수 없어 APP CPU로 쓰지 않는다. GC ratio는 이전 수집 간격의 pause 합계 비율, pause max는 rolling 최대다. swap 사용량은 swap I/O와 다르다.

## CloudWatch와 자동 복구

DEV `/yesulin/dev/backend`와 `/yesulin/dev/database`를 같은 실행 시간으로 조회한다. 각 그래프에 원본 파일·필터·집계식을 표시한다. HTTP request ID는 `lt-{run-id}-measure-{vu}-{iteration}`이며 보고서에 실행별 조회문을 제공한다.

```sql
fields @timestamp, requestId, elapsedMs, status
| filter event = "HTTP_REQUEST" and requestId like /lt-REPLACE_RUN_ID-measure-/
| sort @timestamp asc
```

런타임 event=RUNTIME_METRICS와 DB event=DATABASE_METRICS 원본을 resources.json에 보관한다. 호스트 전체 자원을 개별 요청에 배분한 값으로 해석하지 않는다. 새 CloudWatch custom metric·대시보드는 생성하지 않으며 기존 로그 수집/조회 비용은 남는다.

100 RPS 시험 종료 후 ELB health 실패로 DEV APP이 ASG에서 자동 교체됐다. min=max=desired=1은 스케일 아웃을 막지만 unhealthy 교체를 막지 않는다. recovery.json의 AWS 활동 이력과 HTTP 503/200 회복 확인을 결과에 남긴다. 새 APP이 Unlimited로 생성된 것을 확인해 Standard로 변경했고 DEV ASG 시작 템플릿 version 5에 Standard를 지정했다. PROD 템플릿·서버는 변경하지 않았다. 추가 부하는 실행하지 않았다.

참고: [일정 요청률 실행기](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/), [종료 유예](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/graceful-stop/), [Dropped iterations](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/dropped-iterations/).
