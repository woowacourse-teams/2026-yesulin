---
status: accepted
date: 2026-08-19
agent-required: true
---

# 백엔드 JAR와 systemd 배포

## 계기

Spring Boot를 단일 `t4g.small` ARM64 EC2에 처음 배포한다. 교육 계정에는 백엔드 빌드 결과물용 S3와 CodeDeploy 역할이 제공된다.

## 결정

초기 백엔드 배포 결과물은 Gradle이 만든 실행 JAR로 한다. EC2에는 Java 25를 설치하고 Spring Boot는 전용 비로그인 사용자와 systemd service로 실행한다. Nginx만 외부 요청을 받고 Spring은 `localhost:8080`에서 실행한다.

배포 버전은 Git commit ID로 식별하고 이전 JAR를 보관한다. JAR의 SHA-256 체크섬은 파일 무결성 검증에 별도로 사용한다. 초기 staging 배포의 `ValidateService`는 `systemctl is-active --quiet yesulin`으로 프로세스 시작을 검증하고, 실패하면 이전 JAR로 되돌린다. 이는 HTTP Health Check가 아니며, `main` 자동 Production 배포 전에는 실제 요청 경로를 확인하는 Smoke Check를 추가한다. GitHub Actions CI와 CD는 분리하고, CD는 기존 AWS 역할을 사용하는 CodePipeline, CodeBuild, artifacts S3, CodeDeploy로 구성한다.

## 이유

현재 실행 JAR는 약 55MB이고 단일 애플리케이션이라 Docker daemon과 Image 관리 없이도 재현 가능한 배포와 Rollback을 구성할 수 있다. 기존 Artifacts S3와 CodeDeploy 구조에도 직접 맞고 2GiB 메모리와 작은 Root EBS의 여유를 확보한다.

## 영향

애플리케이션 EC2에서 소스 빌드나 GitHub self-hosted runner를 운영하지 않는다. 비밀값은 저장소 밖에서 systemd 환경으로 주입하고 로그 Rotation과 CloudWatch 수집을 구성한다. ECR·다중 App EC2·ECS 도입 또는 OS 환경 차이 문제가 생기면 Docker Image 전환을 다시 검토한다.
