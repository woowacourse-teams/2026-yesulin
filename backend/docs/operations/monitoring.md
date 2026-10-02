# Staging 모니터링

`ops/monitor/app.sh`와 `ops/monitor/database.sh`는 상태를 읽기만 하고, 모두 통과하면 0, 실패하면 1을 반환한다.

- App: Spring readiness, CodeDeploy, SSM, root disk
- DB: data EBS mount, disk, Docker, MySQL health와 애플리케이션 계정 query

스크립트는 password와 secret 원문을 출력하지 않는다. 현재 자동 재시작과 주기 실행은 설정하지 않는다.

## OTR 공고 경유 링크 집계

클릭 카운터는 DB에 저장하지 않는다. 기존 JSON 파일 로그에서 `event=HTTP_REQUEST`, `method=GET`,
`endpoint=/api/v1/otr`, `status=302`인 이벤트만 집계한다.
HEAD와 실패 요청은 제외하며, 공고별 집계는 검증된 번호가 담긴 `otrId` 필드를 사용한다.
쿼리 문자열 전체는 기록하지 않는다. 공유 링크 `/otr?vid={번호}`는 프론트가 백엔드로 rewrite한다.
별도 클릭 로그를 남기지 않아 동일 요청의 HTTP 로그와 중복 집계하지 않는다.
값은 고유 방문자 수가 아닌 경유 요청 횟수이며 반복 클릭과 봇 GET 요청이 포함될 수 있다.
로컬 파일은 기본 14일·1GB 보관 제한이 있다.

### 관리자 화면 (기본 확인 경로)

CloudWatch Agent나 로그 그룹 없이 각 환경의 `/admin` 개요에서 확인한다.
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

아래 예시는 **JSON 파일 로그를 CloudWatch Logs에 수집하는 설정이 이미 있는 경우**에 사용할 수 있다.
저장소에는 CloudWatch Agent/로그 그룹 수집 설정이 없으므로 배포 서버의 실제 수집 여부는 별도로 확인해야 한다.
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
