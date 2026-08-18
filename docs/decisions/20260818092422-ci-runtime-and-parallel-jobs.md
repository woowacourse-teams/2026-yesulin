---
status: accepted
date: 2026-08-18
agent-required: true
---

# CI 런타임과 병렬 Job

## 계기

팀원의 로컬 환경과 GitHub Actions 결과가 달라지는 일을 줄이고, Frontend와 Backend 검증 실패를 병합 전에 확인해야 한다.

## 결정

Node.js 24 이상을 프로젝트 요구사항으로 두고 `.nvmrc`와 CI의 권장 메이저 버전은 24로 맞춘다. Java는 Gradle toolchain과 CI 모두 25를 사용한다. `main` 대상 Pull Request와 `main` push에서 Frontend와 Backend Job을 별도 GitHub-hosted runner로 병렬 실행한다.

## 이유

독립된 검증을 병렬화하면 전체 대기 시간이 짧고 양쪽 실패를 한 실행에서 확인할 수 있다. CI runner는 배포용 EC2와 분리되므로 `t4g.small` 성능에 영향을 주지 않는다.

## 영향

Frontend는 의존성 설치, lint, production build를 검사한다. Backend는 Gradle Wrapper의 `build`로 Checkstyle, test, 실행 JAR 생성을 검사한다. 필수 검사와 병합 제한은 첫 CI 실행 후 GitHub Ruleset에 연결한다.
