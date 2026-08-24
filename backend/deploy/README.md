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
7. Nginx가 CloudFront 전용 Origin Header를 검사하고 `/api/v1/**`, `/oauth2/**`,
   `/login/oauth2/**`만 Spring으로 전달합니다.
8. `ValidateService`가 Spring·Nginx 상태, Origin Header 차단과 `GET /api/v1/health`의 `200`을 확인합니다. 이 응답은 데이터베이스 연결까지 확인하므로 DB에 닿지 못하면 `503`이 되어 배포가 실패합니다. Spring 시작 중 발생하는 일시적인 `502`·`503`은 최대 30회, 1초 간격으로 재확인합니다.
9. 검증 성공 후 현재 릴리스를 포함한 최근 릴리스 5개만 남기고 오래된 JAR를 삭제합니다.

## EC2 사전 조건

- Java 25와 CodeDeploy Agent가 설치되어 있어야 합니다.
- Ubuntu 패키지의 Nginx가 설치되어 있어야 합니다.
- 첫 배포 전에 `/etc/yesulin/yesulin.env`를 root 전용 파일로 준비해야 합니다. 배포 스크립트가 `yesulin` 사용자를 만든 뒤 소유권을 `root:yesulin`, 권한을 `0640`으로 맞춥니다.
- `YESULIN_CLOUDFRONT_ORIGIN_SECRET`에는 `openssl rand -hex 32`로 만든 64자리 16진수 값을 넣고 CloudFront EC2 원본의 `X-Yesulin-Origin-Secret` 사용자 정의 헤더에도 같은 값을 설정합니다.
- MySQL과 네트워크 연결이 준비되어야 Spring이 시작됩니다.
- 실제 비밀번호나 서명 키는 저장소와 CodeBuild 로그에 넣지 않습니다.

초기 환경 파일은 `yesulin.env.example`을 참고하되 실제 값은 EC2 외부에서 주입합니다. Nginx access log는 query string을 기록하지 않으며 실제 Origin Secret도 로그에 남기지 않습니다.

## 애플리케이션 로그

systemd의 `LogsDirectory=yesulin` 설정이 `/var/log/yesulin`을 애플리케이션 사용자 소유로 만들며,
Spring 로그는 기본적으로 `/var/log/yesulin/yesulin.log`에 저장됩니다. 파일은 10MB마다 압축하고 14일,
전체 1GB까지 보관합니다. `/etc/yesulin/yesulin.env`에서 `LOG_FILE`, `LOG_MAX_FILE_SIZE`,
`LOG_MAX_HISTORY`, `LOG_TOTAL_SIZE_CAP`을 지정하면 기본값을 바꿀 수 있습니다.

콘솔 로그도 유지하므로 `journalctl -u yesulin.service`와 파일 로그를 함께 진단할 수 있습니다.

```sh
tail -f /var/log/yesulin/yesulin.log
```

## CloudFront 원본 HTTPS 전환

배포 설정은 인증서가 없으면 HTTP 부트스트랩 설정을, 인증서가 있으면 HTTPS 설정을 자동 선택합니다. 다음 순서로 전환합니다.

1. EC2 공인 IP가 중지·시작 후에도 유지되도록 Elastic IP 사용 가능 여부를 확인합니다.
2. Cloudflare에 `origin.yesulin.art` A 레코드를 EC2 공인 IP로 추가하고 **DNS 전용**으로 둡니다.
3. 이 변경을 먼저 배포해 HTTP-01 challenge 경로를 엽니다.
4. App EC2에서 `sudo apt-get install -y certbot`을 실행합니다.
5. 아래 명령으로 인증서를 발급하고 renewal dry-run까지 검증합니다.

```sh
sudo /opt/yesulin/deployment/scripts/issue_origin_certificate.sh \
  --email {운영 이메일} --confirm
```

6. CloudFront EC2 원본을 `origin.yesulin.art`, HTTPS only, 포트 443, TLS 1.2로 바꿉니다. `X-Yesulin-Origin-Secret`은 그대로 유지합니다.
7. CloudFront 경유 API와 EC2 직접 요청 차단을 다시 확인합니다.

소셜 로그인을 활성화할 때는 CloudFront에서 `/oauth2/*`와 `/login/oauth2/*`를 EC2 원본으로
전달합니다. 두 동작은 캐시를 비활성화하고 모든 query string과 cookie를 원본에 전달해야 OAuth
`state`, callback `code`와 Spring 세션이 보존됩니다.

인증서 갱신 후에는 Certbot deploy hook이 Nginx 설정을 검증하고 reload합니다. DNS가 Cloudflare 프록시 상태이거나 공인 IP가 바뀌면 HTTP-01 갱신이 실패할 수 있습니다.
