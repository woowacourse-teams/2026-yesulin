---
status: accepted
date: 2026-08-18
agent-required: true
---

# 프론트 이중 검증과 GitHub 보안 기준

## 계기

Vercel Preview와 GitHub Actions의 역할을 구분하고, 저장소에 비밀값이나 알려진 취약점이 유입되는 위험을 병합 전에 줄여야 한다.

## 결정

Frontend는 GitHub Actions의 `lint`·production build와 Vercel Preview를 함께 사용한다. GitHub 저장소에는 Dependency Graph, Dependabot alerts, Secret Scanning, Push Protection, CodeQL Default Setup을 활성화한다. CodeQL은 기본 브랜치에서 감지한 Java/Kotlin과 JavaScript/TypeScript를 검사한다.

Dependabot의 자동 보안 PR·버전 업데이트는 알림과 분리해 추후 팀 합의 후 활성화한다. 배포용 AWS 인증에는 장기 Access Key 대신 GitHub Actions OIDC와 최소 권한 IAM Role을 사용한다.

## 이유

GitHub Actions는 재현 가능한 정적 검증 결과를 제공하고, Vercel Preview는 실제 배포 화면과 런타임 동작을 확인하게 해 서로 대체하지 않는다. 저장소 기본 보안 기능은 실수로 커밋한 지원 비밀값, 취약한 의존성, 코드 취약점을 서로 다른 단계에서 탐지한다.

## 영향

Vercel Git 연동이 확인되면 브랜치 push에서 Preview URL을 생성하고, `main` 병합에서 Production을 배포한다. 첫 CI와 CodeQL 실행이 생성된 뒤 GitHub Ruleset의 필수 검사 이름을 확정한다.
