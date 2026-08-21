# Staging 경량 상태 점검

이 스크립트는 리소스를 변경하지 않고 App 또는 DB EC2의 핵심 상태를 확인합니다. 모든 검사가 통과하면 종료 코드 `0`, 하나라도 실패하면 `1`을 반환하므로 사람이 직접 실행하거나 이후 Timer·SNS wrapper에 연결할 수 있습니다.

```sh
# App EC2
sudo sh ops/monitor/app.sh

# DB EC2
sudo sh ops/monitor/database.sh
```

`app.sh`는 Spring, Nginx, CodeDeploy, SSM, 루트 디스크, Origin Secret 차단과 proxy 응답을 확인합니다. `database.sh`는 데이터 EBS mount, 디스크, Docker, MySQL health와 애플리케이션 계정 쿼리를 확인합니다. 비밀번호와 Origin Secret 원문은 출력하지 않습니다.

현재 단계에서는 자동 재시작이나 주기 실행을 설정하지 않습니다. CloudWatch EC2 상태 경보가 울리거나 서비스 이상이 의심될 때 `ops/diagnose/`보다 먼저 빠르게 성공·실패를 판정하는 용도입니다.
