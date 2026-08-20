# 백엔드 배포 묶음

CodeBuild는 저장소 루트의 `buildspec.yml`을 실행해 `backend/build/deployment/`을 만듭니다. 이 디렉터리가 CodeDeploy에 전달되는 ZIP의 루트이며, 따라서 `appspec.yml`도 ZIP 최상단에 위치합니다.

로컬에서 묶음만 다시 만들 때는 `backend/`에서 `sh deploy/package_bundle.sh {git-commit-id}`를 실행합니다.

## 배포 흐름

1. Java 25와 Gradle Wrapper로 Checkstyle, test, 실행 JAR 빌드를 수행합니다.
2. 실행 JAR 이름을 `application.jar`로 고정합니다.
3. Git commit ID를 `revision.txt`에, JAR SHA-256을 `application.jar.sha256`에 기록합니다.
4. CodeDeploy가 `/opt/yesulin/deployment`에 묶음을 복사합니다.
5. `AfterInstall`이 체크섬을 검증하고 `/opt/yesulin/releases/{commit-id}`에 JAR를 설치한 뒤 `current` 심볼릭 링크를 교체합니다.
6. systemd가 `yesulin` 비로그인 사용자로 Spring을 `127.0.0.1:8080`에서 실행합니다.
7. Nginx가 CloudFront 전용 Origin Header를 검사하고 `/api/v1/**`만 Spring으로 전달합니다.
8. `ValidateService`가 Spring·Nginx 상태, Origin Header 차단과 reverse proxy 응답을 확인합니다. Spring 시작 중 발생하는 일시적인 `502`는 최대 30회, 1초 간격으로 재확인합니다.

## EC2 사전 조건

- Java 25와 CodeDeploy Agent가 설치되어 있어야 합니다.
- Ubuntu 패키지의 Nginx가 설치되어 있어야 합니다.
- 첫 배포 전에 `/etc/yesulin/yesulin.env`를 root 전용 파일로 준비해야 합니다. 배포 스크립트가 `yesulin` 사용자를 만든 뒤 소유권을 `root:yesulin`, 권한을 `0640`으로 맞춥니다.
- `YESULIN_CLOUDFRONT_ORIGIN_SECRET`에는 `openssl rand -hex 32`로 만든 64자리 16진수 값을 넣고 CloudFront EC2 원본의 `X-Yesulin-Origin-Secret` 사용자 정의 헤더에도 같은 값을 설정합니다.
- MySQL과 네트워크 연결이 준비되어야 Spring이 시작됩니다.
- 실제 비밀번호나 서명 키는 저장소와 CodeBuild 로그에 넣지 않습니다.

초기 환경 파일은 `yesulin.env.example`을 참고하되 실제 값은 EC2 외부에서 주입합니다. Nginx access log는 query string을 기록하지 않으며 실제 Origin Secret도 로그에 남기지 않습니다.
