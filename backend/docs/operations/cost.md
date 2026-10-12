# 운영 비용 현황

2026-10-09 점검 기준이다. 금액은 Cost Explorer에서 비용 할당 태그 **`ProjectTeam = yesulin`** 으로 거른 비혼합 비용이다.
일 비용은 2026-10-01~10-07 7일 평균(화면에 `*`로 표시된 추정치)이고, 월 비용은 일 비용 × 30.4일로 환산했다.
인스턴스 단가는 서울 리전(ap-northeast-2) Linux 온디맨드 기준이다.
이 문서는 현재 상태만 기록하며 절감 방안은 다루지 않는다. 금액을 다시 확인하면 기준일과 표를 함께 갱신한다.

> 2026-10-10에 DEV 앱을 t4g.small에서 t4g.micro로 바꿨다. 아래 비용 표는 바꾸기 전 값이다.
> t4g.micro가 지금처럼 RI로 0원이면 월 약 13.8이 줄어 약 59.2가 된다. 2026-10-17쯤 Cost Explorer로 확인해 표를 갱신한다.

## 예산

- 우테코 교육 계정의 월 한도는 **USD 70**이다. 계정 규칙상 지정된 VPC·LB·WAF·S3를 사용해야 한다.
- 운영진은 한도를 `ProjectTeam` 태그로 거른 Cost Explorer 기준으로 잰다.
- 계정은 여러 팀이 함께 쓰는 공유 계정이다. 필터 없이 Cost Explorer를 열면 계정 전체 비용(2026-09 약 USD 4,817)이 보인다.
  우리 비용을 볼 때는 반드시 `ProjectTeam = yesulin` 필터를 건다.
- 현재 일 비용 **약 USD 2.40**, 월 환산 **약 USD 73**으로 한도를 약 USD 3 넘는다.
- 월 합계는 2026-08 USD 11.58, 2026-09 USD 41.17이다.
- t4g 무료 체험은 지금도 계정 전체에 거의 적용되지 않는다([EC2 인스턴스 비용 계산](#ec2-인스턴스-비용-계산)).
  2027-01에 무료 체험이 끝나도 늘어나는 비용은 거의 없을 것으로 본다.
  대신 다른 계정 소유의 예약 인스턴스 할인이 바뀌면 월 최대 약 USD 11.7이 늘 수 있다.

## 서비스별 비용 (2026-10-01~10-07 평균)

| 서비스 | 일 (USD) | 월 환산 (USD) | 원인 | 성격 |
| --- | --- | --- | --- | --- |
| EC2-인스턴스 | 1.36 | 41.4 | t4g.small 3대. t4g.micro 1대는 0원 | 고정 |
| Elastic Load Balancing | 0.54 | 16.4 | ALB 1개 시간 요금 | 고정 |
| EC2-기타 | 0.25 | 7.6 | EBS gp3 80GiB 0.24, 스냅샷 0.01~0.02 (NAT 요금 없음) | 고정 |
| CloudWatch | 0.10 | 3.0 | 모니터링 대시보드 1개 | 고정 |
| CodePipeline | 0.07 | 2.2 | V2 실행 시간 요금. 2026-10-08 삭제한 staging Pipeline 포함 | 병합 횟수에 비례 |
| CodeBuild | 0.07 | 2.0 | `general1.small` 빌드 시간 | 병합 횟수에 비례 |
| CloudFront | 0.01 | 0.4 | 공개 파일 전달 | 트래픽에 비례 |
| SNS·VPC·Certificate Manager | 0.00 | 0.0 | | |
| **합계** | **2.40** | **약 73.0** | | |

- CodePipeline·CodeBuild는 병합이 없는 날 0이고 많은 날 0.2까지 오른다. 2026-10-05의 0.18·0.14는 많은 날의 값이다.
- S3는 화면에 나타나지 않는다.

고정 성격인 EC2 인스턴스·ALB·EBS·대시보드가 월 약 USD 68.4로 전체의 약 94%다. 이 비용은 요청 수와 관계없이
서버가 켜져 있는 시간만큼 나간다.

### 사용 유형 (2026-09-26~10-08 13일 합계)

| 사용 유형 | 13일 합계 (USD) | 비고 |
| --- | --- | --- |
| `APN2-BoxUsage:t4g.small` | 16.82 | 일 1.23~1.50 |
| `APN2-LoadBalancerUsage` | 6.95 | LCU는 0.01 |
| `APN2-EBS:VolumeUsage.gp3` | 3.13 | |
| `APN2-actionExecutionMinute` | 1.25 | CodePipeline V2 |
| `APN2-Build-Min:Linux:g1.small` | 1.19 | CodeBuild x86 |
| `DashboardsUsageHour-Basic` | 0.75 | CloudWatch 대시보드 |
| `APN2-EBS:SnapshotUsage` | 0.24 | |
| `APN2-BoxUsage:t4g.micro` | 0.00 | 매일 0원 |

`CPUCredits` 사용 유형은 없다. T4g Unlimited 초과 요금은 나오지 않았다.

## 리소스 목록

인스턴스 ID·IP·ARN은 저장소에 기록하지 않는다. 콘솔에서 이름으로 찾는다. EC2·EBS·스냅샷에는 모두 `ProjectTeam = yesulin` 태그가 있다.

| 구분 | 역할 | 리소스 | 사양 | 비고 |
| --- | --- | --- | --- | --- |
| DEV | 앱 | `yesulin-backend-dev2` (`yesulin-backend-asg` 소속) | t4g.micro · 루트 8GiB · swap 512MiB | 2026-10-09 ASG로 교체(Launch Template 버전 4). 옛 small은 2026-10-10 종료 |
| DEV | DB | `yesulin-db-dev` | t4g.micro · 루트 12GiB · 데이터 20GiB | 분리 전 staging 데이터의 유일한 사본. ASG 소속 아님 |
| PROD | 앱 | `yesulin-backend-prod` (`yesulin-backend-prod-asg` 소속) | t4g.small · 루트 8GiB | |
| PROD | DB | `yesulin-db-prod` | t4g.small · 루트 12GiB · 데이터 20GiB | t4g.micro에서 증설 |
| 공유 | API 입구 | `yesulin-backend-alb` | | Host 규칙으로 DEV/PROD 분기 |
| 공유 | 파일 전달 | CloudFront 배포 1개 | | `/dev`, `/prod` 경로로 분기 |
| 공유 | 파일 저장 | S3 `techcourse-project-2026` | | prefix로 분기 |
| CI/CD | Pipeline | `yesulin-backend-dev-pipeline`, `-prod-pipeline` | V2 · QUEUED | 옛 staging Pipeline은 2026-10-08 삭제 |
| CI/CD | Build | `yesulin-backend-dev-build`, `-prod-build` | `general1.small` · 캐시 없음 | |

- EBS 볼륨 6개는 모두 gp3이고 모두 인스턴스에 연결되어 있다. 연결되지 않은 볼륨은 없다.
- 4대 모두 상세 모니터링이 꺼져 있다.

## EC2 인스턴스 비용 계산

| 유형 | 시간당 (USD) | 월 730시간 (USD) |
| --- | --- | --- |
| t4g.small | 0.0208 | 약 15.2 |
| t4g.micro | 0.0104 | 약 7.6 |

- 정가로는 small 3대와 micro 1대에 월 약 USD 53.1이 나와야 한다. 실제는 small 3대가 월 약 USD 41.4, micro가 0원이다.
- 차이는 예약 인스턴스(RI) 할인 때문이다. 2026-10 청구서의 EC2 항목 설명(계정 전체)에 `t4g.nano reserved instance applied`가
  t4g.micro 사용량 약 6,150시간, t4g.small 사용량 약 1,030시간에 적용되어 있다(10-01~10-09).
- 이 계정의 EC2 예약 인스턴스 화면에는 RI가 없다. 같은 조직의 다른 계정이 산 RI가 공유되어 적용되는 것으로 보인다.
  만료일과 규모는 우리가 볼 수 없다.
- 크기 유연성이 있는 리전 RI는 같은 계열 안에서 작은 크기부터 적용된다. 그래서 t4g.micro는 전부 덮이고, 남은 RI가 t4g.small 일부를 덮는다.
  small 3대를 하루 종일 켜면 정가로 일 1.50인데, 실제로는 일 1.23~1.50이 나온다.
- 같은 청구서에서 t4g 무료 체험(월 750시간)이 적용된 시간은 계정 전체 20.75시간이었다. 이전 문서의 "small 1대분이 무료 체험으로
  빠진다"는 추정은 맞지 않았다.
- RI 할인이 모두 사라지면 small 3대가 정가 월 45.5, micro가 7.6이 되어 EC2가 월 약 11.7 늘어난다.

## 확인된 현재 상태

### 고정비

- ALB 일 비용 USD 0.54는 시간 요금 USD 0.0225 × 24시간과 같다. 트래픽 요금(LCU)은 거의 없다.
  ALB는 계정 규칙상 지정 LB를 써야 하며 DEV와 PROD가 이미 한 개를 공유한다.
- PROD DB는 t4g.micro(1GiB)에서 MySQL이 메모리 부족(OOM)으로 종료되어 t4g.small로 증설했다.
  MySQL 컨테이너 메모리 제한은 700MiB이고 swap은 없다. 증설 후 16분 관찰 기록만 있고 장시간·부하 상황은 확인하지 않았다.
- 앱 서버의 systemd `ExecStart`에는 `-Xmx`가 없다. DEV는 환경 파일의 `JAVA_TOOL_OPTIONS=-Xmx384m`으로 힙 상한을 두고(2026-10-09),
  PROD는 기본값인 물리 메모리의 1/4(약 460MiB)을 쓴다. DEV micro는 메모리가 작아 기본 GC가 SerialGC다(PROD는 G1).
- 스냅샷은 9개다. Launch Template AMI용 `yesulin-backend-base-20260913-sops-v2` 1개와 DEV DB 주간 스냅샷
  `yesulin-db-staging-weekly` 8개(2026-08 말~2026-10-04)다. 주간 스냅샷 1개의 크기는 645~704MiB다.
- 주간 EBS 스냅샷의 `RetentionDays=90` 태그는 자동 삭제가 아니다([백업](backup.md)). 삭제 정책이 없으면 스냅샷이 계속 쌓인다.

### CI/CD

- 두 Pipeline은 V2, 실행 모드 QUEUED이고 서비스 역할은 공유 역할 `codepipeline-project`다.
- 소스 액션은 GitHub(OAuth 앱) `Source`·`ConfigSource` 두 개이며, 각각 GitHub 웹훅으로 실행이 시작된다.
  V2 트리거 필터(브랜치·파일 경로)는 CodeConnections 소스에서만 쓸 수 있다.
- DEV 성공 실행 1회는 6분 18초~7분 50초다. `ConfigSource` 웹훅으로 시작한 실행은 config 버전 검증에서 약 40초 만에 실패한다.
- CodeBuild는 `bootJar`만 실행하고 테스트는 GitHub Actions가 담당한다. DEV 빌드 1회는 약 3분 20초다.
- 두 CodeBuild 프로젝트는 `aws/codebuild/amazonlinux-x86_64-standard:6.0`, 3GB·vCPU 2(`general1.small`), 제한 시간 15분이다.
- 두 프로젝트 모두 **캐시 유형이 "캐시 없음"** 이다. `buildspec.yml`의 Gradle 캐시 경로는 지금 동작하지 않는다.
- 빌드 로그는 여러 팀이 함께 쓰는 CloudWatch 로그 그룹 `/aws/codebuild/project-2026`에 쌓인다.
- 옛 `yesulin-backend-staging-pipeline`은 Deploy 전환만 막힌 채 main 변경마다 실행되고 있었다. 최근 5회는 중지 3회,
  실패 2회였다. 2026-10-08에 삭제했다. 지금 백엔드 Pipeline은 DEV와 PROD 두 개다.

### 서버 가동과 관련된 사실

| 항목 | `yesulin-backend-asg` (DEV) | `yesulin-backend-prod-asg` (PROD) |
| --- | --- | --- |
| 원하는 용량 / 최소-최대 | 1 / 1-1 (2026-10-10부터) | 1 / 0-1 |
| Launch Template | `yesulin-backend-lt` 버전 4 (t4g.micro, 사용자 데이터에 swap 512MiB·CodeDeploy 배포본 2개 설정) | `yesulin-backend-prod-lt` 버전 1 |
| AMI | 2026-09-13 sops 기반 AMI | DEV와 같은 AMI |
| 상태 확인 유형 | EC2, EBS, ELB (유예 300초) | EC2 (유예 300초) |
| 일시 중지된 프로세스 | 없음 | 없음 |
| 수명 주기 후크 | CodeDeploy가 만든 시작 후크 (기본 결과 ABANDON, 600초) | 1개 |

- DEV ASG는 최소 용량 1에 ELB 상태 확인을 쓴다. 인스턴스를 정지하면 ASG가 비정상으로 보고 새 인스턴스로 교체한다.
- 새 인스턴스가 뜨면 CodeDeploy 후크(배포 그룹 `yesulin-backend-staging`)가 마지막 성공 리비전을 자동 배포한다.
  DEV에서는 이 경로가 2026-09-22(ELB 상태 확인 실패로 자동 교체)와 2026-10-09(용량 확장으로 micro 기동, 배포 2분 20초)에 성공했다.
  PROD ASG 경로는 확인하지 않았다.
- 공고 자동 수집·Slack 알림 스케줄러(`AuditionImportScheduler`)는 `prod` 프로필에서만 실행된다.
  DEV는 공고를 자동으로 수집하거나 알리지 않는다.
- 백업 타이머는 DEV DB에서 매일 03:15, 일요일 04:15에 실행되며 `Persistent=true`다. PROD 전용 백업 설정 기록은 없다.

### 모니터링

- 저장소에는 CloudWatch Agent·로그 그룹 설정이 없다([모니터링](monitoring.md)).

## 작업 권한

`mvg01` 사용자로 조회했을 때 아래 작업이 거부됐다. 변경 권한은 실제로 시도하지 않아 아직 모른다.

| 거부된 작업 | 영향 |
| --- | --- |
| `iam:ListPolicies` | 우리에게 붙은 정책을 직접 볼 수 없다 |
| `events:ListRuleNamesByTarget` | Pipeline 트리거 탭을 볼 수 없다. EventBridge 작업 권한도 없을 가능성이 높다 |
| `resource-groups:SearchResources` | Tag Editor로 태그별 리소스 목록을 볼 수 없다 |
| `ec2:StopInstances` (정책 `ec2-restrict-student`의 명시적 거부, 2026-10-09) | 인스턴스를 정지할 수 없어 유형 변경·야간 정지를 직접 할 수 없다 |

ASG 설정 변경(일시 중지 프로세스, 시작 템플릿 버전)과 Launch Template 새 버전 생성은 우리 권한으로 할 수 있었다(2026-10-09).

CloudShell은 콘솔에서 열리지 않았다.

## 미확인 항목

| 항목 | 확인 위치 | 알 수 있는 것 |
| --- | --- | --- |
| RI 만료일 | 운영진 문의 (다른 계정 소유) | micro가 0원인 상태가 언제까지 이어지는지 |
| 변경 작업 권한 | 실제 시도 또는 운영진 문의 | `autoscaling:SuspendProcesses`, `ec2:ModifyInstanceAttribute`, `ec2:StopInstances` 등 |
| 로그 그룹 보관 기간 | CloudWatch · 로그 그룹 | 우리 태그 비용에 로그 요금은 없어 우선순위가 낮다 |
| DEV 앱 micro 장기 메모리 | DEV 앱 서버 (`free -m`, swap 사용량, OOM 로그) | 배포·관리자 로그 집계 때도 여유가 있는지 |
