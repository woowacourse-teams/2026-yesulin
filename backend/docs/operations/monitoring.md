# Staging 모니터링

`ops/monitor/app.sh`와 `ops/monitor/database.sh`는 상태를 읽기만 하고, 모두 통과하면 0, 실패하면 1을 반환한다.

- App: Spring, Nginx, CodeDeploy, SSM, root disk, Origin Secret 차단과 proxy 응답
- DB: data EBS mount, disk, Docker, MySQL health와 애플리케이션 계정 query

스크립트는 password와 Origin Secret 원문을 출력하지 않는다. 현재 자동 재시작과 주기 실행은 설정하지 않는다.

