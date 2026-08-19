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
7. `ValidateService`가 systemd의 active 상태를 확인합니다.

## EC2 사전 조건

- Java 25와 CodeDeploy Agent가 설치되어 있어야 합니다.
- 첫 배포 전에 `/etc/yesulin/yesulin.env`를 root 전용 파일로 준비해야 합니다. 배포 스크립트가 `yesulin` 사용자를 만든 뒤 소유권을 `root:yesulin`, 권한을 `0640`으로 맞춥니다.
- MySQL과 네트워크 연결이 준비되어야 Spring이 시작됩니다.
- 실제 비밀번호나 서명 키는 저장소와 CodeBuild 로그에 넣지 않습니다.

초기 환경 파일은 `yesulin.env.example`을 참고하되 실제 값은 EC2 외부에서 주입합니다. 현재 검증은 프로세스 확인만 하므로 Production 자동 배포 전에 Nginx를 거친 HTTP smoke check를 추가합니다.
