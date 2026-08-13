---
status: accepted
date: 2026-08-13
agent-required: true
---

# 0013. 이슈와 프로젝트 보드 워크플로

## 계기

이슈·프로젝트 보드 사용 규칙이 없어 작업마다 즉흥적으로 라벨과 제목 형식이 갈렸다.

## 결정

이슈 제목은 커밋과 같은 `{type}: {summary}` 형식을 쓴다. `type:feat`, `type:fix`, `type:hotfix`, `type:docs`, `type:refactor`, `type:perf`, `type:test`, `type:chore` 라벨을 브랜치 타입과 1:1로 새로 만들어 최소 하나 붙이고, `frontend/`·`backend/`에 걸치면 `scope:frontend`/`scope:backend`도 붙인다. GitHub 기본 라벨(`bug`, `enhancement` 등)은 남겨두되 신규 이슈에는 쓰지 않는다.

`.github/ISSUE_TEMPLATE/`에 `버그 신고`, `기능/작업` 템플릿을 추가했다. 우선순위 라벨은 도입하지 않는다.

기존 조직 프로젝트 보드 `woowacourse-teams/2026-yesulin` (#131)을 그대로 쓴다. `Status`는 기본값인 `Todo` → `In Progress` → `Done` 세 단계만 쓰고 세분화하지 않는다. 이슈는 생성과 동시에 `gh issue create --project "2026-yesulin"`으로 보드에 추가한다. PR의 `Closes #123`이 병합 시 이슈를 닫고 보드를 `Done`으로 옮기므로 그 외 상태 이동은 실제 진행 상태가 바뀔 때만 수동으로 한다.

## 이유

브랜치·커밋 타입과 라벨을 동일하게 맞추면 이슈 → 브랜치 → 커밋 → PR 전 구간에서 같은 어휘를 쓰게 되어 새로 배울 것이 없다. 팀 규모가 작아 우선순위 트래킹이나 보드 세분화는 관리 비용만 늘린다. 이미 만들어진 조직 표준 보드를 재사용하면 별도 보드 생성·관리 부담이 없다.

## 영향

세부 규칙은 [git-convention.md](../convention/git-convention.md)에 반영했다. 이후 이슈를 만들 때는 이 규칙을 따른다.
