# 운영 비용 절감 작업 기록

[운영 비용 절감 작업 계획](operating-cost-reduction-plan.md)을 실제 AWS에서 실행한 기록이다. 계획·근거는 계획 문서와
[운영 비용 현황](../backend/docs/operations/cost.md)을 따르고, 이 문서에는 **언제 무엇을 보고 무엇을 바꿨는지**만 남긴다.

## 현재 상태 요약 (2026-10-10 기준)

- DEV 앱은 t4g.micro 한 대(`yesulin-backend-dev2`)다. 옛 t4g.small은 2026-10-10 00:06에 ASG가 종료했다.
- ASG는 원래 상태로 돌렸다(일시 중지 프로세스 없음, 축소 보호 없음). 용량은 1/1/1이다.
- 남은 일: 1주 뒤(2026-10-17쯤) Cost Explorer 확인, 2순위(야간 정지) 방식 결정, 문서 커밋·PR.
- 예상 효과: 월 약 73.0 → **약 59.2** (DEV 앱 small 몫 약 13.8 절감, micro가 공유 RI로 0원이 되는 경우).
  micro가 RI로 덮이지 않으면 약 66.8. 1주 뒤 Cost Explorer로 확인한다.
- 상세 진행은 아래 작업 로그 2026-10-09 항목을 본다.

## 기록 규칙

- 인스턴스 ID·IP·ARN·계정 ID는 적지 않는다. 리소스는 콘솔에 보이는 이름으로 적는다.
- 설정을 바꾸기 전에 바꾸기 전 값을 먼저 적고, 바꾼 뒤 값과 확인 결과를 적는다.
- 한 번에 하나만 바꾼다. 확인을 통과해야 다음 조치로 넘어간다.
- 조회는 바로 진행한다. 설정 변경·삭제는 실행 직전에 대상과 되돌리는 방법을 확인받고 진행한다.
- 조치를 마치면 결과를 `cost.md`에 반영하고 계획 문서의 진행 상태를 고친다.

## 작업 환경

- 접근 방식: 팀원의 Chrome에 이미 로그인된 AWS 콘솔 세션(IAM 사용자 `mvg01`, MFA 사용). 이 PC에는 AWS CLI가 없다.
- CloudShell은 이 환경에서 열리지 않았다("Unable to load content"). 콘솔 화면을 읽는 방식으로 진행한다.
- Chrome 창이 가려져 있으면 일부 콘솔(EC2, CloudShell)이 "Unable to load content"로 멈춘다. 창을 앞에 두고 작업한다.
- 리전: 서울(ap-northeast-2).
- **계정은 여러 팀이 함께 쓰는 공유 계정이다.** 필터 없는 Cost Explorer는 계정 전체 비용(2026-09 약 USD 4,817)을
  보여준다. 우리 팀 비용은 비용 할당 태그 **`ProjectTeam = yesulin`** 으로 거른다. `cost.md`의 일 2.48도 이 필터 값과 같다.

## 진행 현황

| 단계 | 내용 | 상태 |
| --- | --- | --- |
순위는 2026-10-09에 다시 정한 계획 문서 기준이다.

| 단계 | 내용 | 상태 |
| --- | --- | --- |
| 0 | 착수 전 확인 (조회만) | 완료 (2026-10-09) |
| 1 | DEV 앱 t4g.micro 전환 | 적용 완료 (2026-10-10). ASG 원래 상태 복귀. 1주 관찰 중 |
| 2 | DEV 앱·DB 야간 정지 | 대기 (1순위 다음) |
| 완료 | 옛 staging Pipeline 삭제 | 완료 (2026-10-08) |
| 보류 | CodeBuild 캐시·ARM 전환 | 팀 결정으로 하지 않음 |
| 보류 | Pipeline V1 전환, PROD DB micro 복귀, 2027 대응 | 보류 |

## 0단계 확인 결과

| 확인 항목 | 확인 위치 | 결과 | 영향 |
| --- | --- | --- | --- |
| 작업 권한 | IAM · 로그인한 사용자의 정책 | 정책 목록 조회 불가. EventBridge·Resource Groups 조회 거부 | 2순위는 경로 B(운영진 요청) 가능성이 높다 |
| Pipeline 유형 (V1/V2) | CodePipeline · 각 Pipeline 세부 정보 | DEV·PROD 모두 V2 | 1-2 진행 여부 → 재검토 |
| V2 전용 기능 사용 | 각 Pipeline 트리거·변수·실행 모드 | 실행 모드 QUEUED. 트리거는 권한이 없어 못 봄. 소스는 GitHub(OAuth 앱) | V1 전환 시 SUPERSEDED로 바뀐다. 경로 필터 대안은 불가 |
| CodeBuild 컴퓨트 유형·캐시 | CodeBuild · 각 프로젝트 환경·아티팩트 | 두 프로젝트 모두 x86 `general1.small`, **캐시 없음** | 절감 폭이 작아 보류 |
| EC2 4대 실제 유형·ASG 소속 | EC2 · 인스턴스 | DEV 앱 small, DEV DB micro, PROD 앱 small, PROD DB small. 4대 모두 상세 모니터링 꺼짐 | 아래 본문 |
| ASG 설정 | EC2 · Auto Scaling 그룹 | DEV: 상태 확인 EC2·EBS·ELB, 일시 중지 프로세스 없음, CodeDeploy 시작 후크 있음 | 2순위 전에 프로세스 중지 필요 |
| EBS 볼륨 유형·미연결 볼륨 | EC2 · 볼륨 | 6개 모두 **gp3**, 모두 연결됨, 합계 80GiB | gp2→gp3 조치는 필요 없다 |
| 스냅샷·AMI | EC2 · 스냅샷, AMI | 주간 DB 스냅샷 8개 + AMI용 1개. 스냅샷 비용 월 약 0.6 | 정리 효과가 작다 |
| CloudWatch 로그 그룹 보관 기간 | CloudWatch · 로그 그룹 | 미확인. CodeBuild 로그는 공유 그룹 `/aws/codebuild/project-2026`에 쌓인다 | 비용 태그에 로그 요금은 없다 |
| 상세 모니터링 | EC2 · 모니터링 | 4대 모두 꺼짐 | 상세 모니터링 비용 없음 |
| 서비스별 최신 비용 | Cost Explorer | 10-01~10-07 평균 일 2.40 → 월 약 72.9 | 기준선 갱신 |
| EC2·CloudWatch·EBS 사용 유형 | Cost Explorer · 그룹 "사용 유형" | t4g.small만 과금, **t4g.micro는 0원**, CPU 크레딧 없음 | 아래 본문 |
| 무료 체험 적용 | Billing · 청구서 | 10월 1~9일 계정 전체에 무료 체험이 적용된 시간은 20.75시간뿐이다 | 2027년 +15.2 가정은 틀렸을 가능성이 높다 |

## 작업 로그

### 2026-10-09

- 계획 문서, `cost.md`, `backend/AGENTS.md`를 확인하고 0단계(조회만)부터 시작했다.
- AWS CLI가 없어 콘솔로 진행한다.

#### 작업 권한 (IAM)

- `mvg01`에 직접 연결된 정책은 0개다. 그룹·정책 목록은 `iam:ListPolicies` 권한이 없어 볼 수 없다.
- Pipeline 트리거 탭에서 `events:ListRuleNamesByTarget`가 거부됐다. EventBridge 조회 권한이 없다는 뜻이라
  EventBridge Scheduler 일정 생성 권한도 없을 가능성이 높다. (생성 권한 자체는 아직 시도하지 않았다.)

#### CodePipeline

| 항목 | DEV (`yesulin-backend-dev-pipeline`) | PROD (`yesulin-backend-prod-pipeline`) |
| --- | --- | --- |
| 파이프라인 유형 | V2 | V2 |
| 실행 모드 | QUEUED | QUEUED |
| 서비스 역할 | `codepipeline-project` (공유 역할) | `codepipeline-project` |
| 소스 액션 | GitHub(OAuth 앱을 통해) · `Source`, `ConfigSource` 두 개 | 같음 |
| 실행 시작 방식 | GitHub 웹훅 (`Source`, `ConfigSource` 각각 웹훅) | 같음 |

- 소스가 **GitHub(OAuth 앱) 액션**이다. V2의 트리거 필터(브랜치·파일 경로)는 CodeConnections 소스 액션에서만
  쓸 수 있으므로, 계획 1-2의 "V2 유지 + 경로 필터" 대안은 소스를 CodeConnections로 바꾸지 않으면 불가능하다.
- DEV 성공 실행 1회는 6분 18초~7분 50초다. `ConfigSource` 웹훅으로 시작한 실행은 config 버전 검증에서 약 40초 만에 실패한다
  (2026-10-04, 10-05에 3건).

#### Cost Explorer (`ProjectTeam = yesulin`, 비혼합 비용, UTC)

서비스별 일 비용. `*`는 추정치이고 10-08은 하루치가 다 반영되지 않았다.

| 날짜 | 합계 | EC2-인스턴스 | ELB | EC2-기타 | CodePipeline | CodeBuild | CloudWatch | CloudFront |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 09-26 | 1.94 | 0.89 | 0.54 | 0.27 | 0.12 | 0.12 | - | 0.00 |
| 09-27 | 2.34 | 1.33 | 0.54 | 0.30 | 0.08 | 0.09 | - | 0.00 |
| 09-28 | 2.35 | 1.33 | 0.54 | 0.30 | 0.09 | 0.09 | - | 0.00 |
| 09-29 | 2.37 | 1.33 | 0.54 | 0.30 | 0.11 | 0.10 | - | 0.00 |
| 09-30 | 2.57 | 1.35 | 0.54 | 0.27 | 0.20 | 0.21 | - | 0.01 |
| 10-01* | 2.38 | 1.33 | 0.54 | 0.25 | 0.09 | 0.09 | 0.08 | 0.00 |
| 10-02* | 2.55 | 1.50 | 0.54 | 0.25 | 0.08 | 0.08 | 0.10 | 0.00 |
| 10-03* | 2.25 | 1.36 | 0.54 | 0.25 | - | - | 0.10 | 0.00 |
| 10-04* | 2.35 | 1.39 | 0.54 | 0.25 | 0.03 | 0.03 | 0.10 | 0.00 |
| 10-05* | 2.48 | 1.27 | 0.54 | 0.25 | 0.18 | 0.14 | 0.10 | 0.01 |
| 10-06* | 2.44 | 1.46 | 0.54 | 0.25 | 0.02 | 0.02 | 0.10 | 0.06 |
| 10-07* | 2.34 | 1.23 | 0.54 | 0.25 | 0.10 | 0.10 | 0.10 | 0.02 |
| 10-08* | 2.14 | 1.06 | 0.47 | 0.19 | 0.14 | 0.14 | 0.09 | 0.04 |
| 13일 합계 | 30.48 | 16.82 | 6.97 | 3.37 | 1.25 | 1.19 | 0.75 | 0.14 |

월별 합계: 2026-08 USD 11.58, 2026-09 USD 41.17.

사용 유형별로 나누면 다음과 같다(같은 기간 13일 합계).

| 사용 유형 | 13일 합계 | 의미 |
| --- | --- | --- |
| `APN2-BoxUsage:t4g.small` | 16.82 | EC2 비용 전부가 t4g.small이다. **t4g.micro 사용 유형이 없다.** |
| `APN2-LoadBalancerUsage` | 6.95 | ALB 시간 요금. LCU는 0.01 |
| `APN2-EBS:VolumeUsage.gp3` | 3.13 | **볼륨은 이미 gp3다.** 일 0.24 ≈ 월 7.3 |
| `APN2-actionExecutionMinute` | 1.25 | CodePipeline V2 실행 시간 요금 (10-08까지 staging Pipeline 포함) |
| `APN2-Build-Min:Linux:g1.small` | 1.19 | CodeBuild `general1.small` (x86) |
| `DashboardsUsageHour-Basic` | 0.75 | CloudWatch 대시보드 |
| `APN2-EBS:SnapshotUsage` | 0.24 | 스냅샷. 일 0.02~0.03 ≈ 월 0.7 |
| 데이터 전송 등 나머지 | 0.15 | |

- `CPUCredits` 사용 유형은 상위 목록에 없다. T4g Unlimited 초과 요금은 사실상 없다.
- t4g.small 일 1.33은 약 64시간분이고, 3대를 하루 종일 켜면 1.50(72시간)이다. 10-02에는 1.50이 나왔다.
  무료 체험이 일정하게 small 1대분을 빼 주는 모양이 아니다. 공유 계정이라 무료 체험 750시간을 여러 팀이 나눠 쓰는 것으로 보인다.
- 2~3페이지까지 보면 `APN2-BoxUsage:t4g.micro`가 있고 **13일 내내 USD 0.00**이다. DEV DB는 태그가 붙어 있는데 요금이 0이다.

#### EC2 인스턴스

이름으로 검색했다. 4대 모두 `ProjectTeam = yesulin` 태그가 있다(DEV DB에서 직접 확인).
DEV DB 이름은 `cost.md`의 `yesulin-db-staging`이 아니라 **`yesulin-db-dev`** 다.

| 이름 | 유형 | 모니터링 | 보안 그룹 | 시작 시각 (KST) |
| --- | --- | --- | --- | --- |
| `yesulin-db-dev` | t4g.micro | 기본(상세 꺼짐) | `project-db` | 2026-08-20 10:19 |
| `yesulin-backend-dev` | t4g.small | 기본 | `project-app` | 2026-09-22 15:50 |
| `yesulin-db-prod` | t4g.small | 기본 | `project-db` | 2026-09-26 22:31 |
| `yesulin-backend-prod` | t4g.small | 기본 | `project-app` | 2026-09-26 21:49 |

#### EBS 볼륨·스냅샷

- 볼륨 6개(태그 필터): 모두 gp3, 모두 "사용 중". DB 루트 12GiB ×2, 앱 루트 8GiB ×2, DB 데이터 20GiB ×2. 합계 80GiB.
  gp3 단가로 월 약 7.3이고 비용표의 일 0.24와 맞는다.
- 스냅샷 9개(태그 필터, 내 소유)
  - `yesulin-backend-base-20260913-sops-v2` 1개: AMI 생성 시 만들어진 스냅샷. Launch Template이 이 AMI를 쓰므로 지우면 안 된다.
  - `yesulin-db-staging-weekly` 8개: 2026-08 말부터 매주 일요일 04시대, 마지막은 2026-10-04. 원본 볼륨 20GiB, 스냅샷 크기 645~704MiB.
  - 스냅샷 비용은 일 0.02 수준이다. 최근 4개만 남겨도 월 0.3 안팎이라 절감 효과가 작다.

#### Auto Scaling 그룹

| 항목 | `yesulin-backend-asg` (DEV) | `yesulin-backend-prod-asg` (PROD) |
| --- | --- | --- |
| 원하는 용량 / 최소-최대 | 1 / 1-2 | 1 / 0-1 |
| Launch Template | `yesulin-backend-lt` 버전 2 (t4g.small, 2026-09-13 sops 기반 AMI) | `yesulin-backend-prod-lt` 버전 1 (같은 AMI) |
| 상태 확인 유형 | **EC2, EBS, ELB** (유예 300초) | EC2 (유예 300초) |
| 일시 중지된 프로세스 | 없음 | 없음 |
| 수명 주기 후크 | CodeDeploy가 만든 시작 후크 1개 (`EC2_INSTANCE_LAUNCHING`, 기본 결과 ABANDON, 600초) | 1개 |

- DEV ASG는 최소 용량이 1이고 ELB 상태 확인을 쓴다. 인스턴스를 그냥 정지하면 ASG가 비정상으로 보고 교체한다.
  야간 정지나 유형 변경 전에 `HealthCheck`·`ReplaceUnhealthy`·`AZRebalance` 일시 중지가 필요하다는 계획 내용이 맞다.
- CodeDeploy 시작 후크가 있으므로 새 인스턴스가 뜨면 CodeDeploy가 자동 배포를 시도하는 구성이다. 실제로 성공하는지는 검증하지 않았다.

#### CodeBuild

| 항목 | `yesulin-backend-dev-build` | `yesulin-backend-prod-build` |
| --- | --- | --- |
| 이미지 | `aws/codebuild/amazonlinux-x86_64-standard:6.0` | 같음 |
| 컴퓨팅 | 3GB 메모리, vCPU 2 (`general1.small`) | 같음 |
| 캐시 | **캐시 없음** | **캐시 없음** |
| 제한 시간 | 15분 | 15분 |
| 로그 | CloudWatch 공유 그룹 `/aws/codebuild/project-2026` | 같음 |

- DEV 빌드 1회는 약 3분 20초다. `buildspec.yml`의 캐시 경로는 프로젝트 캐시가 꺼져 있어 지금은 동작하지 않는다.

#### 청구서 (계정 전체, 2026-10 진행 중)

EC2 요금 항목 설명에서 t4g 할인 구조를 확인했다. 계정 전체 값이며 우리 팀만의 값이 아니다.

| 항목 설명 | 10-01~10-09 사용량 |
| --- | --- |
| t4g.small 무료 체험(월 750시간) 적용분. 항목 설명에는 "ending Dec 31 2025"로 적혀 있다 | **20.75시간** |
| t4g.small 온디맨드 USD 0.0208/시간 | 10,059.9시간 (같은 시간이 Compute Savings Plans 적용분으로도 표시) |
| `t4g.nano` 예약 인스턴스가 t4g.micro 사용량에 적용 | 약 6,150시간 |
| `t4g.nano` 예약 인스턴스가 t4g.small 사용량에 적용 | 약 1,030시간 |
| T4G CPU 크레딧 USD 0.04/vCPU-시간 | 72.5 vCPU-시간 (우리 태그에는 없음) |

- 이 계정의 EC2 "예약 인스턴스" 화면에는 RI가 없다. 같은 조직의 다른 계정이 산 RI·Savings Plans가 공유되어 적용되는 것으로 보인다.
  만료일과 규모는 우리가 볼 수 없고 바꿀 수도 없다.
- 크기 유연성이 있는 리전 RI는 같은 계열 안에서 **작은 크기부터** 적용된다. 그래서 t4g.micro는 전부 RI로 덮이고,
  남는 RI가 t4g.small 일부를 덮는다. 우리 t4g.small이 3대 × 24시간(일 1.50)보다 적게(일 1.23~1.50) 나오는 이유로 보인다.
- 무료 체험은 계정 전체에 거의 적용되지 않고 있다. `cost.md`의 "small 1대분이 무료 체험으로 빠진다"는 추정과
  "2027-01부터 월 15.2 증가"는 근거가 약하다.

## 0단계 결과로 본 계획 재검토

기준: `ProjectTeam = yesulin` 태그, 비혼합 비용, 10-01~10-07 7일 평균 × 30.4일.

| 항목 | 월 (USD) | 비고 |
| --- | --- | --- |
| EC2 t4g.small 3대 | 41.4 | 정가로는 45.5. RI 남는 분이 일부를 덮는다 |
| EC2 t4g.micro 1대 (DEV DB) | 0.0 | 공유 RI로 덮인다 |
| ALB | 16.4 | |
| EBS gp3 80GiB | 7.3 | |
| CloudWatch | 3.0 | |
| CodePipeline | 2.2 | 10-08 삭제한 staging Pipeline 포함 |
| CodeBuild | 2.0 | |
| 스냅샷·CloudFront·기타 | 1.0 | |
| **합계** | **약 73** | 한도 70을 약 3 넘는다 |

조치별 절감액을 다시 계산했다. 계획 문서의 값과 다른 것이 많다.

| 계획 순위 | 조치 | 계획의 절감 | 다시 본 절감 | 이유 |
| --- | --- | --- | --- | --- |
| 1-2 | Pipeline V1 전환 | 3.5~4.5 | **약 0** | V2 비용이 2 Pipeline 기준 월 2 안팎이고, V1도 2개면 월 2다. 공유 계정이라 V1 무료 1개는 기대하기 어렵다 |
| 2 | DEV 앱·DB 야간 정지 | 11.9 | **약 7.9** | DEV DB(micro)는 이미 0원이라 끄는 효과가 없다. DEV 앱(small)만 효과가 있다 |
| 3 | CodeBuild ARM·캐시 | 1.0~2.0 | 약 1.0 | 빌드 비용 자체가 월 2다 |
| 4 | CloudWatch·EBS | 0.5~4.0 | **약 0** | EBS는 이미 gp3이고 미연결 볼륨이 없다. CloudWatch는 절감 대상에서 뺐다 |
| 5 | DEV 앱 t4g.micro 전환 | 3.6 | **6.2~13.8** | micro가 공유 RI로 덮이면 13.8, 안 덮이면 6.2. 2순위와 겹친다 |
| 6-a | PROD DB t4g.micro 복귀 | 7.2~7.6 | 6.2~13.8 | 같은 이유. OOM 이력은 그대로다 |
| 6 | 2027년 대응 | 필요 | **급하지 않음** | 무료 체험이 지금도 거의 적용되지 않는다 |

- RI 할인은 다른 계정 소유라 언제든 바뀔 수 있다. micro가 0원이라는 사실에 크게 기대는 결정은 위험을 같이 적는다.

#### 팀 결정 (2026-10-09)

- 운영진은 월 한도 70을 **`ProjectTeam` 태그로 거른 Cost Explorer** 기준으로 잰다. 위 숫자를 그대로 쓴다.
- **당분간 AWS 리소스는 수정·삭제하지 않는다.** 정리만 한다.
- 다음 작업은 조회 결과를 `cost.md`와 계획 문서에 반영하는 것이다. 이날 AWS 설정 변경은 없었다.

#### 문서 갱신 (2026-10-09)

- `backend/docs/operations/cost.md`
  - 기준을 `ProjectTeam = yesulin` 태그와 10-01~10-07 평균(월 약 73.0)으로 바꿨다.
  - 사용 유형 표, 리소스 실제 이름·사양, RI·무료 체험 구조, ASG·CodeBuild·Pipeline 설정, 거부된 권한을 넣었다.
  - 확인한 미확인 항목은 본문으로 옮기고, 남은 미확인 항목만 다시 정리했다.
- `design/operating-cost-reduction-plan.md`
  - Pipeline V1 전환, PROD DB micro 복귀, 2027년 대응은 보류로 옮겼다.
  - 단계별 월 비용을 "RI 유지"와 "RI 없음" 두 경우로 다시 계산했다.

#### 팀 결정 (2026-10-09, 2차)

- CloudWatch는 절감 대상에서 뺀다. 관련 내용은 문서에서 지웠다.
- CodeBuild 캐시·ARM 전환은 절감 폭(월 약 1.0)이 작아 하지 않는다.
- **DEV 앱 t4g.micro 전환(1순위)과 DEV 앱·DB 야간 정지(2순위)를 진행한다.** 리소스 변경을 다시 시작한다.
  변경은 실행 직전에 대상과 되돌리는 방법을 확인받고 하나씩 한다.
- 이 결정에 맞춰 계획 문서의 순위·단계별 비용·운영진 요청 범위·결정 기록과 `cost.md`의 미확인 항목을 고쳤다.
  - 1순위 후 RI 유지 시 월 59.2, PROD 백업을 더하면 60.2다. RI가 없을 때는 2순위 B안까지 해서 70.2다.

#### 1순위 선행 측정: DEV 앱 메모리 (2026-10-09 21:25 KST, 조회만)

Session Manager로 `yesulin-backend-dev`에 접속해 읽기 전용 명령만 실행했다. 서버 설정은 바꾸지 않았다.
측정 시점은 마지막 배포(2026-10-09 00:17 KST 서비스 시작) 후 약 21시간이다.

| 항목 | 값 |
| --- | --- |
| OS / Java | Ubuntu 24.04.4 LTS, OpenJDK 25 (arm64, `jcmd` 없는 런타임) |
| vCPU / 부하 | 2 / load average 0.00 |
| 메모리 (`free -m`) | 전체 1835, 사용 963, 여유 386, 캐시 662, 가용 871 MiB |
| swap | 없음 |
| Java RSS (현재 = 최대 VmHWM) | 501 MiB, 스레드 44개 |
| `yesulin` 서비스 cgroup 메모리 | 현재 489 MiB, 최대(MemoryPeak) 512 MiB |
| JVM 힙 설정 | `-X` 옵션 없음. 기본값 Max 460 MiB(물리 메모리의 1/4), Initial 30 MiB, G1 GC |
| 다른 프로세스 RSS | CodeDeploy 에이전트 72, systemd-journald 42, snapd 28, SSM 에이전트 25 MiB (+ 세션당 25) |
| 커널 OOM 기록 | 0건 |

- 계획의 기준(Java RSS + CodeDeploy + SSM이 700 MiB를 넘으면 전환하지 않는다)으로는 **501 + 72 + 25 = 598 MiB로 통과**한다.
- 다만 여유가 크지 않다. t4g.micro는 전체 메모리가 약 900 MiB대라 힙을 지금처럼 460 MiB까지 쓰게 두면 빠듯하다.
  계획대로 힙 상한(`-Xmx384m` 안팎)과 1GiB swap을 함께 둔다.
- micro에서 아무 설정 없이 띄우면 기본 최대 힙이 물리 메모리의 1/4(약 230 MiB)로 줄어 힙 부족이 날 수 있다. 힙 상한은 꼭 명시한다.
- 측정은 배포 후 하루 이내 한 번뿐이다. 다음 dev 배포 직후와 관리자 로그 집계 화면 사용 후에 한 번 더 보면 좋다.

#### 1순위 진행 순서와 담당

| 순서 | 작업 | 바뀌는 곳 | 담당 | 되돌리기 |
| --- | --- | --- | --- | --- |
| 1 | DEV 앱 1GiB swap 파일 만들기 | DEV 앱 서버 | Claude (Session Manager, 승인 후) | `swapoff`, 파일·fstab 줄 삭제 |
| 2 | `JAVA_TOOL_OPTIONS=-Xmx384m`을 config `server/dev.env`에, 같은 이름 빈 값을 `prod.env`에 추가 후 배포 | config 저장소, `config-version.txt` | SOPS age 키가 있는 팀원 (이 PC에는 키 없음) | config 되돌린 뒤 재배포 |
| 3 | `yesulin-backend-asg`의 `HealthCheck`·`ReplaceUnhealthy`·`AZRebalance` 일시 중지 | ASG | Claude (승인 후, 권한 없으면 운영진) | 프로세스 재개 |
| 4 | `yesulin-backend-lt`에 t4g.micro 새 버전, ASG가 그 버전 사용 | Launch Template, ASG | Claude (승인 후, 권한 없으면 운영진) | 이전 버전으로 되돌리기 |
| 5 | DEV 앱 정지 → 유형 t4g.micro → 시작, TG Healthy·health UP 확인 | DEV 앱 인스턴스 (몇 분 중단) | Claude (승인 후) | 정지 → small → 시작 |

- 2번을 small인 지금 먼저 배포해 힙 384 MiB로도 잘 도는지 본 뒤 5번을 한다.
- 2번을 기다리지 않으려면 DEV 서버에만 systemd drop-in으로 힙 상한을 임시로 줄 수도 있다.
  다만 config가 정본이라는 배포 원칙과 어긋나고 인스턴스가 교체되면 사라진다.

#### 팀 결정 (2026-10-09, 3차)

- 힙 상한은 **config 경로**로 넣는다. SOPS 키가 있는 팀원이 `sops edit`으로 `dev.env`·`prod.env`에 한 줄씩 추가한다.
  복호화한 내용은 채팅이나 문서로 옮기지 않는다.
- SOPS dotenv 형식은 변수 이름이 평문으로 남는다. 그래서 편집 뒤 변수 이름 비교는 복호화 없이
  `sh scripts/config/compare-env-keys.sh config/server/prod.env config/server/dev.env`로 할 수 있다.
- swap은 힙 상한이 DEV에 배포된 뒤 만든다.
- config main에 push하면 `ConfigSource` 웹훅으로 DEV·PROD Pipeline이 실행되지만, `config-version.txt`가 바뀌기 전이라
  버전 검증에서 약 40초 만에 실패한다. 예상된 실패다.

#### 1순위 2단계: 힙 상한 config 편집 (2026-10-09, 커밋 전)

- 팀원 로컬의 age 개인키는 `~/.config/sops/age/yesulin-moving.keys.txt`에 있다. 기본 이름(`keys.txt`)이 아니라
  `SOPS_AGE_KEY_FILE`로 지정해야 SOPS가 찾는다. 키 내용은 열거나 옮기지 않았다.
- config submodule을 `main`으로 바꾸고 `origin/main`까지 fast-forward했다. HEAD는 고정 버전 `a01e9cc`와 같다.
- `sops set`으로 아래 한 줄씩만 추가했다. 복사본으로 먼저 시험했고, 복호화 확인은 이 변수 줄만 걸러서 봤다.
  - `server/dev.env`: `JAVA_TOOL_OPTIONS=-Xmx384m`
  - `server/prod.env`: `JAVA_TOOL_OPTIONS=` (빈 값)
- 두 파일의 diff는 추가한 줄과 `sops_mac`·`sops_lastmodified`뿐이다.
- 변수 이름 비교: `JAVA_TOOL_OPTIONS`는 양쪽에 다 있다. `dev.env`에만 있는 SMS·SOLAPI 관련 9개는 이번 변경 전부터 있던 차이다.
- 앱 저장소에서 함께 고친 것
  - `backend/deploy/yesulin.env.example`: `JAVA_TOOL_OPTIONS=-Xmx384m`과 설명 한 줄
  - `backend/docs/operations/deployment.md`: 실행 단계 4에 `JAVA_TOOL_OPTIONS` 설명 두 줄
- PR 흐름은 기능 PR → `dev`(DEV 배포), `dev` → `main`(PROD 배포)이다. 이 변경은 `dev`로 보내는 PR로 만든다.
- 팀원 승인 후 커밋·push했다.
  - config: `de5a806 chore: DEV 앱 JVM 힙 상한 추가`를 config main에 push
  - 앱: `origin/dev` 기준 브랜치 `chore/dev-jvm-heap-limit`에 `9c7a31e chore: 개발 서버 JVM 힙 상한 config 반영`을 push
    (config 포인터, `config-version.txt`, 예시 env, `deployment.md`만 포함)
  - commitlint `subject-case` 규칙 때문에 제목을 영문 대문자(`DEV`)로 시작할 수 없어 "개발 서버"로 썼다.
- config push 직후 21:33에 `ConfigSource` 웹훅으로 DEV·PROD Pipeline이 실행돼 둘 다 39초 만에 버전 검증에서 실패했다. 배포는 없었다(예상대로).
- PR 본문은 `design/pr-dev-jvm-heap-limit.md`에 썼다(커밋하지 않는 파일). PR 생성과 `dev` 병합은 팀원이 한다.
- 다음: 병합 후 DEV 배포가 끝나면 서버에서 `Picked up JAVA_TOOL_OPTIONS: -Xmx384m`, Java RSS, health를 확인하고 swap을 만든다.
- 팀원이 PR #281을 `dev`에 병합했다. DEV Pipeline이 2026-10-09 21:39 KST에 시작했다(Source `abaf7b3`, ConfigSource `de5a806`).

#### 1순위 2단계 확인: 힙 상한 DEV 적용 (2026-10-09 21:47 KST, 조회만)

DEV Pipeline 세 단계가 모두 성공했다. Session Manager로 확인했다.

| 항목 | 값 |
| --- | --- |
| 서비스 시작 | 2026-10-09 21:45:48 KST |
| 프로세스 환경 | `JAVA_TOOL_OPTIONS=-Xmx384m` |
| 기동 로그 | `Picked up JAVA_TOOL_OPTIONS: -Xmx384m` |
| readiness | 200 |
| Java RSS (기동 약 2분 뒤) | 449 MiB (이전 힙 기본값일 때 21시간 뒤 501 MiB) |
| 서비스 cgroup 메모리 | 445 MiB |

메모리 구성 (`/proc/meminfo`, small 기준)

| 항목 | 값 |
| --- | --- |
| MemTotal / MemAvailable | 1835 / 902 MiB |
| AnonPages (회수 불가 사용자 메모리) | 599 MiB |
| Slab (회수 가능 / 불가) | 273 MiB (204 / 69) |
| 프로세스 RSS 상위 | java 454, codedeploy-agent 71, systemd-journald 44, snapd 28, SSM 세션 25, SSM 에이전트 24+14, multipathd 23, networkd-dispatcher 13, unattended-upgrades 12 MiB |

- micro(1GiB)로 옮기면 회수 불가 메모리(약 600 MiB + 커널 몫)와 실행 중인 파일 페이지를 합쳐 여유가 100~150 MiB 안팎으로 예상된다.
  가능은 하지만 빠듯하다. 쉬고 있는 프로세스 메모리(snapd, multipathd, unattended-upgrades 등 약 100 MiB)를 swap이 받아 줘야 한다.

#### swap 보류: 루트 디스크 여유 부족 (2026-10-09)

- swap을 만들기 전에 확인하니 루트 디스크가 6.8G 중 5.3G 사용, **여유 1.5G(78%)** 였다. 1GiB swap을 만들면 여유가 약 0.5G(93%)가 된다.
  앱 로그 보관 한도가 1GB라 디스크가 찰 위험이 있어 swap 생성을 멈췄다. 서버에는 아무것도 바꾸지 않았다.
- 디스크 사용 (`du`, 조회만)

  | 경로 | 크기 | 비고 |
  | --- | --- | --- |
  | `/opt/codedeploy-agent/deployment-root` | 1.2G | 배포본 6개, `:max_revisions: 5` |
  | `/opt/yesulin/releases` | 541M | 앱 릴리스 5개 유지 |
  | `/var/lib/snapd` | 382M | SSM 에이전트가 snap으로 설치되어 있어 지우면 안 된다 |
  | `/usr/src` | 331M | 커널 헤더 2벌(7.0.0-1012 실행 중, 7.0.0-1014 설치만 됨) |
  | `/var/log/journal` | 130M | |
  | `/var/cache/apt` | 117M | |
  | `/var/log/yesulin` | 1.3M | |

- CodeDeploy 배포본과 앱 릴리스가 각각 5개씩 겹쳐 쌓이는 것이 가장 크다.
- PROD 앱도 같은 AMI·같은 배포 방식이라 디스크 상황이 비슷할 수 있다. 비용과 별개로 확인이 필요하다.
- 팀 결정: **512MiB swap + CodeDeploy 배포본 2개만 보관.** 디스크 확장이나 파일 직접 삭제는 하지 않는다.

#### 1순위 1단계: DEV 앱 swap·CodeDeploy 보관 수 변경 (2026-10-09 22:13~22:15 KST, 적용)

DEV 앱 서버(`yesulin-backend-dev`)에서 Session Manager로 바꿨다.

| 항목 | 바꾸기 전 | 바꾼 뒤 | 백업·되돌리기 |
| --- | --- | --- | --- |
| swap | 없음 | `/swapfile` 512MiB, 권한 600, `/etc/fstab`에 `/swapfile none swap sw 0 0` 추가 | `/etc/fstab.bak-20261009`. 되돌리기: `sudo swapoff /swapfile`, fstab 줄 삭제, 파일 삭제 |
| CodeDeploy `:max_revisions:` | 5 | 2 (`/etc/codedeploy-agent/conf/codedeployagent.yml`) | `codedeployagent.yml.bak-20261009`. 되돌리기: 값을 5로 바꾸고 에이전트 재시작 |
| `vm.swappiness` | 60 | 그대로 | |

- CodeDeploy 에이전트를 재시작했다. 정지에 약 1분이 걸렸고, 22:14:30 KST에 다시 polling을 시작했다(`active`).
- 오래된 배포본은 다음 배포 때 에이전트가 스스로 2개만 남기고 정리한다. 직접 지운 파일은 없다.
- 확인: readiness 200, swap 511MiB 사용 가능(사용 0), 메모리 가용 973MiB, 디스크 5.8G 사용·여유 1017M(86%).
- swap 파일과 fstab 줄은 이 인스턴스에만 있다. ASG가 인스턴스를 새로 만들면 AMI에는 없으므로 다시 만들어야 한다.
- 다음: ASG 프로세스 일시 중지 → Launch Template micro 버전 → 인스턴스 유형 변경. 승인 후 진행한다.

#### DEV·PROD 사양 차이 검토 (2026-10-09)

- 팀원 질문: DEV(micro)와 PROD(small)가 다른 크기를 써도 되는가.
- 결론: 기능에는 문제가 없다. CPU 계열(arm64)·vCPU 수·AMI·OS·Java·JAR·배포 경로가 같고, 다른 값은 `JAVA_TOOL_OPTIONS`뿐이다.
- 달라지는 것은 메모리 여유, JVM 최대 힙, 기본 GC(micro에서는 SerialGC 가능성), CPU 기준 성능, 기동 시간이다.
  DEV는 기능·배포 확인용으로 쓰고 성능·메모리 판단은 PROD 지표로 한다.
- 상세 표와 대응은 계획 문서 1순위의 "DEV·PROD 사양 차이"에 적었다. 전환 후 실제 GC 종류를 확인해 이 기록에 남긴다.
- 팀원이 1순위 남은 세 단계(ASG 프로세스 일시 중지, Launch Template 새 버전, 유형 변경) 진행을 승인했다.

#### 1순위 3단계: ASG 프로세스 일시 중지 (2026-10-09, 적용)

| 항목 | 바꾸기 전 | 바꾼 뒤 |
| --- | --- | --- |
| `yesulin-backend-asg` 일시 중지된 프로세스 | 없음 | `HealthCheck`, `ReplaceUnhealthy`, `AZRebalance` |

- 콘솔 "고급 구성 → 편집"에서 바꿨다. 다른 항목은 그대로 두었다. **우리 권한으로 가능했다**(운영진 요청 불필요).
- 화면에 "Auto Scaling 그룹을 업데이트함", 상태 "일시 중지된 프로세스 3"이 표시됐다.
- 2순위(야간 정지)에서도 필요하므로 계속 일시 중지 상태로 둔다.
- 되돌리기: 같은 화면에서 세 프로세스를 지우고 업데이트한다.

#### 1순위 4단계: Launch Template 새 버전과 ASG 연결 (2026-10-09, 적용)

| 항목 | 바꾸기 전 | 바꾼 뒤 |
| --- | --- | --- |
| `yesulin-backend-lt` 버전 | 1, 2 (기본 2: `v2-sops-base-ami-20260913`, t4g.small) | 버전 3 추가: `v3-dev-t4g-micro-20261009`, **t4g.micro**. 버전 2를 원본으로 유형만 바꿨다. 기본 버전은 2 그대로 |
| `yesulin-backend-asg` 시작 템플릿 버전 | 2 | **3** |

- AMI·보안 그룹·스토리지(8GiB)는 버전 2와 같다.
- ASG 편집 화면은 시작 템플릿·네트워크·용량 항목만 저장한다. 저장 뒤에도 일시 중지 프로세스 3개가 그대로인 것을 확인했다.
- 시작 템플릿 버전을 바꿔도 실행 중인 인스턴스는 그대로다(인스턴스 새로 고침 없음). 원하는 용량은 1 그대로다.
- 되돌리기: ASG의 시작 템플릿 버전을 2로 바꾼다. 버전 3은 남겨 둬도 비용이 없다.

#### 1순위 5단계: 인스턴스 정지 거부 (2026-10-09)

- `yesulin-backend-dev` 인스턴스 정지를 시도했다. 확인 창의 경고는 두 개였다.
  - ASG 소속이라 정지하면 교체될 수 있다: 프로세스를 일시 중지해 두어 해당 없음.
  - EBS 암호화 KMS 키 상태를 판별할 수 없다: KMS 조회 권한이 없어서 뜨는 경고. 같은 키를 쓰는 PROD DB가 2026-09-26에 정지·유형 변경·시작을 정상으로 마쳤다.
- 결과: **거부됨.** `ec2:StopInstances`가 IAM 정책 `ec2-restrict-student`에서 **명시적으로 거부(explicit deny)** 된다.
- 인스턴스는 계속 t4g.small로 실행 중이다. DEV 중단은 없었다.
- 영향
  - 1순위 유형 변경(정지 → 유형 변경 → 시작)은 우리가 할 수 없다. 운영진 요청이 필요하다.
  - `ec2:StartInstances`, `ec2:ModifyInstanceAttribute`도 같은 정책으로 막혀 있을 가능성이 높다(정지가 안 돼 시험하지 못했다).
  - 2순위 야간 정지의 경로 A(우리가 직접)와 "아침 시작은 당번이 콘솔에서"라는 반자동안도 불가능할 가능성이 높다. 일정은 운영진이 만들어야 한다.
- 지금 남아 있는 변경: ASG 프로세스 3개 일시 중지, ASG 시작 템플릿 버전 3(micro), DEV 앱 swap 512MiB, CodeDeploy 보관 수 2, DEV 힙 상한 384MiB.

#### 팀 결정: ASG로 인스턴스 교체 (2026-10-09)

팀원이 운영진 요청 대신 **ASG로 micro 새 인스턴스를 띄우고 지금 인스턴스를 교체**하는 방법을 골랐다.
검증된 적 없는 경로라, DEV가 끊기지 않도록 "새 인스턴스 먼저 띄우고 확인 → 옛 인스턴스 정리" 순서로 한다.

사전 확인 (조회만)

- CodeDeploy 앱 `yesulin-backend`의 배포 그룹 `yesulin-backend-staging`이 ASG `yesulin-backend-asg`를 대상으로 한다.
  DEV Pipeline이 21:46에 성공 배포한 그룹도 이것이다. 새 인스턴스에는 이 그룹의 최신 성공 리비전(힙 상한 포함)이 배포된다.
- 배포 설정: 현재 위치(in-place), `CodeDeployDefault.AllAtOnce`, 롤백 활성, 종료 후크 비활성.
- Launch Template 사용자 데이터(버전 2·3 동일): `systemctl enable --now codedeploy-agent`, `systemctl enable --now yesulin` 두 줄.
  새 인스턴스에는 swap과 CodeDeploy 보관 수 2 설정이 없다.

순서

| 단계 | 작업 | 실패하면 |
| --- | --- | --- |
| 0 | 지금 인스턴스(`yesulin-backend-dev`)에 축소 보호 설정 | 원하는 용량을 1로 되돌릴 때 새 인스턴스가 대신 종료된다 |
| 1 | Launch Template 버전 4: 버전 3 + 사용자 데이터에 swap 512MiB 생성과 `max_revisions: 2` 추가(실패해도 기존 두 줄은 그대로 실행되도록 맨 뒤에 `|| true`로 둔다). ASG를 버전 4로 | ASG를 버전 3이나 2로 되돌린다 |
| 2 | ASG 원하는 용량 1 → 2. micro 새 인스턴스가 뜨고 CodeDeploy 시작 후크가 배포한다 | 원하는 용량을 1로 되돌린다(보호되지 않은 새 인스턴스가 종료됨) |
| 3 | 새 인스턴스 확인: ASG 활동, CodeDeploy 배포, TG Healthy, health UP, 메모리·swap·GC | 위와 같다 |
| 4 | 옛 인스턴스 보호 해제, 새 인스턴스 보호, 원하는 용량 2 → 1. ASG가 옛 인스턴스를 종료한다 | |

- 4단계는 옛 인스턴스와 루트 디스크(DEV 로그 포함)를 지우는 작업이라 **팀원이 직접 실행**한다.
- 교체 중에는 두 인스턴스가 함께 TG에 붙어 DEV 요청을 나눠 받는다. 세션은 DB에 있어 문제없다. DEV는 스케줄러가 돌지 않아 중복 실행도 없다.

진행 (2026-10-09)

- 0단계 완료: 옛 인스턴스(t4g.small)에 축소 보호를 설정했다("인스턴스 축소 보호를 변경함").
- 1단계 완료: `yesulin-backend-lt` 버전 4 `v4-dev-t4g-micro-swap-20261009`를 만들었다. 원본은 버전 3(t4g.micro)이다.
  사용자 데이터는 아래와 같다. 앞부분 두 블록이 새로 넣은 것이고, 둘 다 `|| true`라 실패해도 기존 두 줄은 실행된다.

  ```bash
  #!/bin/bash
  set -eu

  # t4g.micro memory headroom: 512MiB swap (2026-10-09)
  if [ ! -e /swapfile ]; then
    { fallocate -l 512M /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab; } || true
  fi
  # keep only 2 CodeDeploy revisions on the 8GiB root disk
  sed -i 's/^:max_revisions: 5$/:max_revisions: 2/' /etc/codedeploy-agent/conf/codedeployagent.yml || true

  systemctl enable --now codedeploy-agent
  systemctl enable --now yesulin
  ```

- ASG 시작 템플릿 버전을 3 → **4**로 바꿨다. 저장 뒤 확인: 인스턴스 유형 t4g.micro, 원하는 용량 1, 일시 중지 프로세스 3개, 대상 그룹 `yesulin-backend-tg` 유지.
- Chrome 창이 가려져 화면 캡처가 멈춘 동안에는 페이지 스크립트로 선택·저장을 하고, 저장 뒤 상세 화면 글자로 결과를 확인했다.
- ASG 활동 기록에서 알게 된 것: 2026-09-22 15:50 KST에 ELB 상태 확인 실패로 옛 인스턴스가 교체되면서
  **지금 DEV 인스턴스가 ASG에 의해 AMI로 새로 만들어졌다.** ASG 교체 경로가 한 번은 실제로 동작했다는 뜻이다(`deployment.md`의 "검증 기록 없음"과 다르다).
  2026-09-13에는 인스턴스 새로 고침으로 AMI 원본 인스턴스가 종료됐다.
- ASG 알림: SNS `yesulin-staging-alerts`가 시작·종료·실패 이벤트를 팀 메일로 보낸다. 교체 중 메일이 갈 수 있다.
- 2단계: 2026-10-09 23:36 KST에 원하는 용량을 1 → **2**로 바꿨다. 새 인스턴스가 시작돼 CodeDeploy 시작 후크 배포가 진행됐다.
- 3단계 확인 (조회만)
  - CodeDeploy `d-YLN34PI9L`(시작: Auto Scaling 그룹 작업)이 **성공**했다. 2분 20초, `AfterAllowTraffic`까지 완료.
    리비전은 21:43 DEV 배포(`d-BXGQ7OG9L`)와 같은 빌드 산출물이다.
  - 새 인스턴스 (Session Manager)

    | 항목 | 값 |
    | --- | --- |
    | 유형 / vCPU | t4g.micro / 2 |
    | 메모리 (`free -m`) | 전체 904, 사용 654, 캐시 273, **가용 249 MiB** |
    | swap | `/swapfile` 512MiB (사용자 데이터로 생성됨), 사용 4.6MiB |
    | CodeDeploy `max_revisions` | 2 (사용자 데이터로 적용됨) |
    | 디스크 | 6.8G 중 5.1G 사용, 여유 1.7G (75%) |
    | Java RSS / 최대 | 402 / 404 MiB, 서비스 cgroup 최대 419 MiB |
    | `JAVA_TOOL_OPTIONS` | `-Xmx384m` |
    | GC | **SerialGC** (`UseSerialGC=true` ergonomic, `UseG1GC=false`). 예상대로 PROD(G1)와 다르다 |
    | readiness | 200 |
    | 서비스 시작 | 2026-10-09 23:37:53 KST |

  - 외부 확인: `https://dev.yesulin.art/api/v1/health` 6회 모두 200, `{"status":"UP","database":"UP"}`.
  - ASG: 두 인스턴스 모두 `InService`, `Healthy`. 새 인스턴스는 Launch Template 버전 4, 옛 인스턴스는 버전 2.
- 4단계 준비 (설정만 바꿈, 되돌릴 수 있음)
  - 새 인스턴스에 축소 보호를 설정하고, 옛 인스턴스(t4g.small)의 축소 보호를 해제했다.
  - 이제 원하는 용량을 2 → 1로 낮추면 ASG가 **보호되지 않은 옛 인스턴스만** 종료한다.
  - 원하는 용량 변경(옛 인스턴스와 루트 디스크 삭제)은 팀원이 직접 한다. 옛 인스턴스에 있던 DEV 로그와 swap·CodeDeploy 설정은 함께 사라진다.
- 4단계 이후 남은 일: 새 인스턴스 축소 보호 해제(이전 상태로 복귀), `cost.md` 리소스 표 갱신, 1주 뒤 Cost Explorer에서 t4g.small 감소 확인.

#### 1순위 4단계: 옛 small 인스턴스 종료 (2026-10-10 00:03 KST, 팀원 실행)

- 팀원이 옛 인스턴스 이름을 `yesulin-delete-me`로 바꾼 뒤 ASG 용량을 바꿨다. ASG 활동 기록에는 "min: 1, max: 1, desired: 1"로 남았다(최대 용량도 2 → 1로 바뀜).
- ASG가 보호되지 않은 옛 인스턴스(t4g.small)를 골라 종료했다. 00:03:53 시작, **00:06:56 성공.**
- 종료는 정지가 아니라 삭제다. 인스턴스와 루트 디스크(DEV 로그, swap, CodeDeploy 설정)가 함께 지워졌다. 따로 삭제 요청할 것이 없다.
- 확인: `https://dev.yesulin.art/api/v1/health` 5회 모두 200, `UP`·DB `UP` (00:07 KST).
- 이제 DEV 앱은 `yesulin-backend-dev2`(t4g.micro) 한 대다.

#### 1순위 마무리: ASG 원래 상태로 복귀 (2026-10-10 00:10 KST, 적용)

팀원 승인 후 바꿨다.

| 항목 | 바꾸기 전 | 바꾼 뒤 |
| --- | --- | --- |
| 새 인스턴스 `yesulin-backend-dev2` 축소 보호 | 보호됨 | **해제** ("인스턴스 축소 보호를 변경함") |
| `yesulin-backend-asg` 일시 중지된 프로세스 | `HealthCheck`, `ReplaceUnhealthy`, `AZRebalance` | **없음** (자동 복구 다시 동작) |

- 저장 화면에서 시작 템플릿 버전 4, 원하는/최소/최대 용량 1/1/1, 상태 확인 유예 300초가 그대로인 것을 확인했다.
- 재개 뒤 약 1분 동안 ASG 활동에 교체 기록이 없었고, DEV health는 200이었다(00:12 KST).
- 최대 용량은 팀원이 용량을 바꿀 때 1로 바뀌었다. 다음에 새 인스턴스를 먼저 띄우는 교체를 하려면 최대 용량을 2로 올려야 한다.
- 1순위 적용 끝. 최종 상태: DEV 앱 t4g.micro 1대, Launch Template 버전 4(swap 사용자 데이터 포함), ASG 자동 복구 동작.

#### 힙 상한 config의 PROD 반영 (2026-10-10, 팀원 실행·조회 확인)

- 팀원이 `main`에 PR #282(`chore: prod config 버전 갱신`, `config-version.txt`만 `de5a806`으로 변경)를 병합했다.
- PROD Pipeline: 2026-10-10 00:32 시작, 00:43 성공 (Source `66a989f`, ConfigSource `de5a806`).
- `https://yesulin.art/api/v1/health` 200, `UP`·DB `UP` (09:31 확인).
- PROD에는 `JAVA_TOOL_OPTIONS=` 빈 값이 들어가 힙은 기본값 그대로다. PROD 서버 안의 로그는 직접 보지 않았다.
- 예시 env와 `deployment.md` 설명(PR #281)은 아직 `dev`에만 있고, 다음 `dev → main` 병합 때 `main`에 들어간다.
- PR 본문 파일 `design/pr-dev-jvm-heap-limit.md`를 쉬운 설명과 PROD 반영 결과로 다시 썼다.

#### 문서 갱신 (2026-10-10)

- 작업 브랜치 `chore/operating-cost-review`는 자체 커밋이 없어 `origin/dev`(PR #281 병합 `abaf7b3`)로 fast-forward했다.
  커밋하지 않은 문서 변경은 그대로 남았고, config 포인터 차이도 사라졌다.
- `backend/docs/operations/deployment.md`: "수동으로 설정한 EC2만 검증해서는 ASG 교체가 준비되었다고 볼 수 없다"를
  DEV ASG 교체 경로 확인 결과(2026-09-22 자동 교체, 2026-10-09 micro 기동)와 Launch Template 버전 4 사용자 데이터 설명,
  "인스턴스 유형은 ASG 교체로 바꾼다"로 고쳤다. PROD ASG 경로는 확인하지 않았다고 남겼다.
- `backend/docs/operations/cost.md`: DEV 앱 리소스 행, ASG 표(버전 4, 1/1/1), 힙·GC 설명, 미확인 항목을 고쳤다. 비용 표는 바꾸기 전 값이라는 안내를 맨 위에 넣었다.
- 계획 문서: 1순위를 실제 적용 방식(ASG 교체)과 결과로 바꾸고, 되돌리기를 ASG 방식으로 고쳤다.
  2순위는 정지 권한이 없다는 전제로 경로 A(불가)·B(운영진)·C(ASG, 앱만)를 정리하고, `shutdown` 우회 방식은 쓰지 않는다고 적었다.
  운영진 요청 범위·진행 일정·남은 결정을 현재 상태에 맞췄다.

#### 두 인스턴스 분배 확인 (2026-10-09 23:53 KST, 조회만)

- 대상 그룹 `yesulin-backend-tg`: 두 대상 모두 Healthy. 로드 밸런싱 알고리즘 **라운드 로빈**, 고정 세션 **끔**, 등록 취소 지연 60초.
  새 인스턴스의 Name 태그는 `yesulin-backend-dev2`다.
- 로컬에서 `X-Request-Id: probe-demo-01`~`10`을 붙여 `https://dev.yesulin.art/api/v1/sessions/current`에 10번 요청했다(로그인 없이 401, 읽기만).
  앱은 이 헤더 값을 요청 ID로 쓰고 journal에 `[requestId=...]`로 남긴다.
- 결과: 옛 small(`ip-10-0-20-101`)은 01·03·05·07·09, 새 micro(`ip-10-0-20-22`)는 02·04·06·08·10을 받았다. 정확히 번갈아 나뉘었다.
- `/api/v1/health` 성공 요청은 DEBUG라 journal에 남지 않는다. 확인용 요청은 다른 경로로 보낸다.

#### 팀원 질문 정리 (2026-10-09)

- **옛 앱 인스턴스를 중지만 해 둘 수 있나:** 불가. `mvg01`의 `ec2-restrict-student` 정책이 `ec2:StopInstances`를 명시적으로 거부한다.
  OS 안에서 `shutdown`으로 끄는 방법은 관리자가 막은 정지 권한을 우회하는 것이라 쓰지 않는다.
- **정리 방법:** 중지 없이 ASG 원하는 용량을 2 → 1로 낮추면 ASG가 보호되지 않은 옛 인스턴스를 종료하고 과금이 멈춘다.
  종료는 ASG 서비스 역할이 하므로 우리 권한으로 될 가능성이 높다(1 → 2 확장도 같은 방식으로 됐다).
  "삭제는 관리자에게" 규칙을 따른다면 월요일까지 둔다(옛 small 약 USD 0.5/일). 이때 관리자에게는 EC2 직접 종료가 아니라
  "ASG 원하는 용량을 1로"를 요청한다. 원하는 용량 2인 채로 직접 종료하면 ASG가 새 인스턴스를 또 띄울 수 있다.
- **야간 정지:** EventBridge Scheduler + Stop/StartInstances 방식은 정지 권한이 막혀 운영진이 만들어야 한다.
  앱 서버는 ASG 예약 작업(20:00 원하는 용량 0, 08:30 1)으로 우리 권한 안에서 할 수 있을 가능성이 있다(권한 미시도).
  DB 서버는 ASG 소속이 아니라 이 방법도 쓸 수 없다. 지금은 DEV DB·DEV 앱 모두 micro라 RI로 0원일 가능성이 높아 당장 절감은 거의 없다.
