# 배포 실패 트러블슈팅 기록 (2026-10-28 ~ 10-29)

이틀 동안 연달아 난 배포 실패 두 건의 원인과 조치를 남긴다. 둘 다 코드 오류가 아니라 **운영 환경에서만 드러나는 조건**
(MySQL 한 행 크기 한도, 서버 디스크 용량)이 원인이었다. 운영 규칙의 정본은 [배포 문서](../backend/docs/operations/deployment.md)다.
인스턴스 ID·계정 번호는 적지 않고 역할로 부른다.

| | 1. DEV: MySQL 한 행 크기 초과 | 2. PROD: 앱 서버 디스크 부족 |
| --- | --- | --- |
| 기간 | 10/28 17:05 ~ 21:23 (약 4시간 20분) | 10/29 10:52 ~ 12:02 (약 1시간 10분) |
| 사용자 영향 | 없음. DEV는 자동 롤백으로 #401 버전 유지 | 없음. 한 대가 빠진 채 나머지 한 대가 서비스 |
| 직접 원인 | `VARCHAR(2000)` 추가로 `events` 한 행이 65,535바이트 초과 (`Error 1118`) | 루트 디스크 6.8GB 중 99% 사용 (`No space left on device`) |
| 막힌 이유 | 실패 기록이 남은 Flyway가 이후 모든 배포의 시작을 거부 | 디스크가 찬 서버는 접속·롤백도 안 돼 배포 그룹이 잠김 |
| 해결 | 마이그레이션 수정(#412) + DEV DB의 반쯤 적용된 상태 정리 | ASG로 서버 교체 + 멈춘 롤백 중지 후 재배포 |

## 1. DEV: MySQL 한 행 크기 초과로 마이그레이션 실패 (10/28)

### 증상

- #403 머지(17:05) 이후 DEV 파이프라인이 #403·#405·#407·#409·#411에서 연달아 실패했다. 매번 CodeDeploy가 #401 버전으로
  자동 롤백해 DEV 서버는 동작했지만, #403 이후 기능은 반영되지 않았다.
- CodeDeploy 오류는 `ValidateService` 단계의 `scripts/validate_service.sh failed with exit code 1`뿐이었다. 앱이 시작하지 못한 것까지만
  보이고, 콘솔에 남는 로그 끝부분에는 원인이 잘려 있었다.

### 원인 찾기

1. 앱 시작 실패는 CloudWatch 앱 로그(`/yesulin/dev/backend`)에 남지 않는다. Spring이 로그 파일 설정 전에 종료되어 systemd 저널에만 있다.
   DEV 앱 서버에 Session Manager로 접속해 `journalctl -u yesulin`에서 찾았다.

   ```text
   Validate failed: Migrations have failed validation
   Detected failed migration to version 20261028140000 (add event registration confirmation).
   ```

2. 같은 저널에서 처음 실패한 배포(#403)의 원래 오류를 찾았다.

   ```text
   Migrating schema `yesulin_staging` to version "20261028140000 - add event registration confirmation"
   SQL State : 42000 / Error Code : 1118
   Message : Row size too large. The maximum row size for the used table type, not counting BLOBs, is 65535.
   ```

3. DEV DB에서 읽기 전용으로 확인했다. 장부 87번이 `success=0`이었고, 마이그레이션의 첫 문장(`registration_confirmation_enabled`
   추가)만 적용되고 두 번째 문장(`registration_confirmation_message VARCHAR(2000)` 추가)에서 멈춘 상태였다.

### 왜 이렇게 됐나

- **MySQL 한 행 한도:** InnoDB 한 행은 VARCHAR 열의 최대 크기 합이 65,535바이트를 넘을 수 없다. utf8mb4는 한 글자를 최대
  4바이트로 계산한다. `events`에는 이미 `body`·`detail_body` 5,000자 두 개(각 20,000바이트), 신청 안내 2,000자, 저장소 키
  500자 네 개 등으로 약 58KB가 잡혀 있었고, 2,000자(8,000바이트)를 더하자 한도를 넘었다. TEXT는 본문을 행 밖에 두어 거의
  차지하지 않는다.
- **테스트가 못 잡은 이유:** 테스트는 H2에서 Flyway를 돌린다. H2에는 이 한도가 없어 모든 테스트가 통과했다.
- **반만 적용된 이유:** MySQL의 DDL은 문장마다 바로 확정된다. 한 파일 안에서 뒤 문장이 실패해도 앞 문장은 되돌아가지 않는다.
- **계속 실패한 이유:** Flyway는 실패 기록이 있으면 사람이 정리하기 전까지 시작을 거부한다. 이후 PR들은 코드가 정상이어도 막혔다.
  옛 버전(#401)은 그 마이그레이션을 모르는 미래 버전으로 보고 무시해서 롤백은 성공했다.

### 조치

- **#412**
  - `V20261028140000`의 안내 문구 열을 `TEXT`로 바꿨다. 이 마이그레이션은 어느 환경에서도 성공한 적이 없고 main에도 없어 파일을 직접 고쳤다.
  - 새 마이그레이션 `V20261028190000`으로 `body`·`detail_body`를 2,000자로 줄였다. 기존 데이터는 최대 22자였다.
  - 관리자 폼·프론트 검증·MSW·API 문서도 2,000자로 맞췄다.
- **검증:** 로컬 MySQL 8.4 빈 DB에 마이그레이션 91개 전체를 적용해 통과를 확인했다. 백엔드 테스트 1,264개도 통과했다.
- **DEV DB 정리:** 반쯤 생긴 열을 지우고 실패 기록 한 줄을 지웠다. 지운 열은 실패한 배포에서 생긴 빈 열이라 데이터 손실은 없었다.

  ```sql
  ALTER TABLE events DROP COLUMN registration_confirmation_enabled;
  DELETE FROM flyway_schema_history WHERE installed_rank = 87 AND version = '20261028140000' AND success = 0;
  ```

- **한 번 더 꼬인 일:** 첫 정리 직후, 대기열에 있던 #411 배포가 고치기 전 마이그레이션을 다시 실행해 실패 기록이 다시 생겼다.
  #412 배포가 끝난 뒤 같은 정리를 한 번 더 하고 재배포했고, 21:19 시작한 배포가 성공했다. 마이그레이션 140000~190000이 적용됐다.

### 배운 점

- 실패한 마이그레이션을 정리할 때는 **고친 코드가 dev에 머지되고, 대기 중인 배포가 없을 때** DB를 정리한다. 고치기 전 버전의
  배포가 남아 있으면 같은 실패를 다시 기록한다.
- 긴 글은 `VARCHAR(수천)` 대신 `TEXT`로 둔다. 한 테이블의 VARCHAR 최대 바이트 합(글자 수 × 4)이 65,535에 가까운지 본다.
- H2 테스트로는 MySQL 고유 제한을 확인할 수 없다. PR CI에서 실제 MySQL로 마이그레이션을 실행하는 검사가 필요하다(남은 일).

## 2. PROD: 앱 서버 디스크 부족으로 배포 실패 (10/29)

### 증상

- #384(config 버전 갱신) 배포가 10:52에 실패했다. 오류는 `HEALTH_CONSTRAINTS`였다.
- 앱 서버 2대 중 첫 서버(이하 서버 A)의 `DownloadBundle` 단계에서 `No space left on device (os error 28)`가 났다.
- 한 대씩 배포하는 방식이라 두 번째 서버(이하 서버 B)는 건너뛰었고, 자동 롤백이 시작됐다.
- 이 동안 공개 API는 정상(200)이었지만 모든 응답이 서버 B 한 대에서만 왔다. 서버 A는 대상 그룹에서 빠져 있었다.

### 원인

- 두 서버 모두 루트 디스크 6.8GB 중 99%를 쓰고 있었다(여유 115MB). 서버 B에서 확인한 내역은 아래와 같다.

  | 위치 | 크기 | 내용 |
  | --- | --- | --- |
  | `/opt/codedeploy-agent/deployment-root` | 1.7GB | CodeDeploy가 남긴 지난 배포본. 한 배포 그룹 폴더에 5개가 쌓여 있었음 |
  | `/opt/yesulin/releases` | 548MB | 지난 앱 릴리스 5개 |
  | `/var/log` | 138MB | 로그. `journalctl --vacuum`으로 줄어든 것 없음 |

- 나머지 약 4.2GB는 운영체제와 기본 패키지다.
- 에이전트 설정 `:max_revisions: 2`가 있는데도 배포본 5개가 남은 이유는 확인하지 못했다(남은 일).

### 조치

1. **서버 B:** Session Manager로 들어가 배포 그룹 폴더마다 최근 배포본 2개만 남겼다. 여유가 115MB에서 728MB로 늘었다.

   ```bash
   for d in /opt/codedeploy-agent/deployment-root/*-*-*-*-*/; do sudo ls -1t "$d" | tail -n +3 | sed "s|^|$d|" | xargs -r sudo rm -rf; done
   ```

2. **서버 A:** 디스크가 꽉 차 Session Manager 접속 자체가 실패했다(`Plugin with name Standard Stream not found`). 계정 정책상
   EC2를 직접 종료할 수 없어 ASG로 교체했다.
   1. 서버 B에 축소 보호를 걸었다.
   2. ASG 원하는 용량·최대를 3으로 올렸다. 새 서버(서버 C)가 떠 CodeDeploy 자동 설치(마지막 성공 리비전)가 성공했다(11:06~11:10).
   3. 서버 C에도 축소 보호를 걸고 용량을 2로 되돌렸다. ASG가 보호가 없는 서버 A만 골라 종료했다(드레이닝 후 종료).
   4. 두 서버의 축소 보호를 해제했다. ASG는 원래 설정(2-2)으로 돌아왔고, 응답이 두 서버에 반씩 나뉘는 것을 확인했다.
3. **재배포가 또 실패한 이유:** 10:53의 자동 롤백이 서버 A의 `BeforeBlockTraffic`에서 응답을 기다리며 "진행 중"으로 남아 있었다.
   그래서 파이프라인 재시도가 `Another deployment to the AWS CodeDeploy deployment group yesulin-backend-prod is already in progress.`로
   실패했다. 서버 A가 종료된 뒤에도 롤백은 스스로 끝나지 않았다.
4. 멈춘 롤백을 콘솔에서 "배포 중지(지금 중단)"했다(11:56). 롤백 대상이 이미 없는 서버라 영향은 없었다.

**재배포 결과:** 파이프라인 재시도로 #384 배포가 11:56에 시작해 12:02에 두 서버 모두 성공했다. 이후 `/api/v1/health`는
200이고 응답이 두 서버에 반씩 나뉘었다.

### 배운 점

- 디스크가 꽉 찬 서버는 Session Manager도 붙지 않는다. 그 서버를 고치려 하기보다 ASG로 교체하는 편이 빠르다.
  교체할 때는 남길 서버에 축소 보호를 걸어 두어야 ASG가 엉뚱한 서버를 지우지 않는다.
- 실패 배포의 자동 롤백이 응답 없는 서버에 걸려 있으면, 서버를 교체해도 배포 그룹이 잠긴 채로 남는다. 재시도 전에 진행 중인
  배포가 없는지 확인한다.
- 루트 디스크 6.8GB는 배포본·릴리스가 조금만 쌓여도 찬다. 디스크 사용률 경보가 없어 배포가 실패하고서야 알았다.

## 남은 일

- PR CI에서 실제 MySQL로 마이그레이션 전체를 실행하는 검사 추가
- `:max_revisions: 2`인데도 배포본이 쌓인 원인 확인. 배포 스크립트에서 오래된 배포본·릴리스 정리(릴리스 보관 5개 → 2~3개 검토)
- Launch Template 루트 디스크 확대(8GiB → 16GiB 등) 검토와 디스크 사용률 CloudWatch 경보 추가
- `events`의 남은 긴 VARCHAR 열(신청 안내 2,000자 등)을 TEXT로 옮길지 검토
