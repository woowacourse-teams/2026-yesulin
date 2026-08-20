---
status: accepted
date: 2026-08-20
ai-context: on-demand
---

# Nginx와 CloudFront Origin Header 경계

## 계기

공유 `project-public` 보안 그룹은 80·443 포트를 전체 인터넷에 허용한다. Spring은 localhost에만 바인딩했지만 Nginx를 80에서 시작하면 CloudFront와 WAF를 거치지 않은 직접 요청이 가능하다.

## 결정

Nginx만 외부 요청을 받고 `/api/v1/**`를 `127.0.0.1:8080`의 Spring으로 전달한다. CloudFront는 EC2 원본 요청에 `X-Yesulin-Origin-Secret`을 추가하고 Nginx는 동일한 64자리 16진수 값이 없는 API 요청을 `403`으로 거부한다. 비밀값은 저장소가 아니라 `/etc/yesulin/yesulin.env`에 보관한다. 다른 경로는 `404`로 응답한다.

Nginx 설정은 CodeDeploy 묶음으로 배포하고 시작 전 `nginx -t`를 실행한다. 배포 검증은 Spring·Nginx process, 직접 요청 차단과 header 포함 reverse proxy 응답을 확인한다.

## 이유

공유 보안 그룹을 변경하지 않으면서 직접 EC2 접근을 차단하고 설정 drift를 줄일 수 있다. 파일 본문은 Presigned S3로 전송하므로 API proxy의 본문 상한은 1MB로 둔다.

## 영향

Origin Secret을 교체할 때 EC2 환경 파일과 CloudFront 원본 헤더를 함께 변경해야 한다. 이 방식은 CloudFront-to-origin TLS를 대체하지 않으므로 도메인과 인증서가 준비되면 origin HTTPS를 추가한다.
