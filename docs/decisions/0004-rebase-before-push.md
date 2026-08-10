---
status: accepted
date: 2026-08-10
agent-required: true
---

# 0004. Push 전 통합 브랜치 rebase

## 계기

여러 작업이 동시에 main에 반영되면 오래된 기준의 커밋이 최신 정책이나 구현을 덮거나 push 직전에 충돌할 수 있다.

## 결정

push 전 최신 `origin/main`을 fetch하고 현재 브랜치를 그 위로 rebase한다. 충돌은 양쪽 의도를 확인해 해결하고 검증 후 push한다. `origin/main`은 현재 기준이며 통합 브랜치가 변경되면 규칙과 문서를 함께 수정한다.

## 이유

최신 통합 상태에서 충돌과 검증을 끝내 선형 이력을 유지한다.

## 영향

모든 사람과 에이전트가 push 전에 같은 절차를 따른다. 상세: [Git 컨벤션](../convention/git-convention.md)
