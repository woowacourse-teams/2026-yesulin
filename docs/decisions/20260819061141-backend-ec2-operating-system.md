---
status: accepted
date: 2026-08-19
agent-required: true
---

# 백엔드 EC2 운영체제

## 계기

Spring Boot를 `t4g.small` ARM64 EC2에 JAR와 systemd로 배포한다. CodePipeline, CodeBuild, Artifacts S3, CodeDeploy, SSM을 연결하면서 팀이 직접 운영할 EC2 운영체제를 정해야 한다.

## 결정

백엔드 EC2는 AWS가 게시한 Ubuntu Server 24.04 LTS ARM64 AMI를 사용한다. CodeDeploy Agent는 Ubuntu ARM64를 검증한 2.0 계열을 서울 리전의 `latestv2` 경로에서 명시적으로 설치하고 staging에서 설치, 재부팅, 배포, 실패 Rollback을 검증한다. Agent 버전과 실제 AMI ID는 운영 문서에 기록한다.

## 이유

CodePipeline과 S3는 EC2 운영체제에 종속되지 않고 CodeBuild도 별도 관리형 환경에서 실행된다. Amazon Linux 2023이 기존 CodeDeploy 설치 경로에는 더 단순하지만, 서버 명령과 장애 대응을 맡을 팀원 모두에게 Ubuntu가 익숙하다. Ubuntu 24.04는 26.04보다 운영 이력이 길면서 2029년까지 표준 보안 지원을 받아, 팀 숙련도와 안정성을 함께 확보한다.

## 영향

EC2 초기화는 `apt`, Ubuntu용 Java 25, Nginx, systemd, SSM Agent와 CodeDeploy Agent 2.x를 기준으로 작성한다. 기존 `latest` Agent 1.x 설치 경로를 사용하지 않는다. 서울 리전에서 `latestv2` 제공이 중단되거나 staging 검증에 실패하면 Amazon Linux 2023 ARM64로 전환한다.
