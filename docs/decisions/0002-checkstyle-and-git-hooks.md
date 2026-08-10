---
status: accepted
date: 2026-08-10
agent-required: true
---

# 0002. Checkstyle과 Git hook

## 계기

Java 스타일과 커밋 형식을 문서만으로 관리하면 누락되며, 프론트 커밋마다 Gradle을 실행하면 피드백이 느려진다.

## 결정

루트 Husky의 `commit-msg`에서 Commitlint를 항상 실행한다. `pre-commit`은 staged diff에 백엔드 Java·Checkstyle 설정 변경이 있을 때만 Checkstyle을 실행한다. Checkstyle 13.10.0 실행 파일은 Git에 저장하지 않고 Gradle이 관리한다.

## 이유

필요한 커밋만 검사해 속도와 일관성을 함께 확보한다.

## 영향

클론 후 루트에서 `npm install`이 필수다. 상세: [Git 컨벤션](../convention/git-convention.md), [BE 컨벤션](../convention/be-code-convention.md)
