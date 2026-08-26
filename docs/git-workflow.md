# Git 작업 방식

## 이슈와 보드

- 작업 전에 `.github/ISSUE_TEMPLATE/`의 버그 또는 기능/작업 템플릿으로 이슈를 만든다.
- 제목은 `{type}: {summary}` 형식이고 `type:*`, 필요한 `scope:*`, `priority:p1|p2|p3` 라벨을 붙인다.
- 작업을 시작하면 담당자를 배정하고 프로젝트 #131의 상태를 `In Progress`로 옮긴다.
- PR 본문에 `Closes #123`을 넣어 병합 시 이슈를 닫는다.

## 브랜치와 커밋

- 브랜치: `{type}/{kebab-case-description}`
- 타입: `feat`, `fix`, `hotfix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
- 커밋: `{type}: {summary}`, 제목 50자 이내, 하나의 논리적 변경만 포함
- 커밋·PR·주석에 AI 도구 이름이나 공동 작성자 표기를 넣지 않는다.

## 검증과 push

- 최초 1회 루트에서 `npm install`해 Husky hook을 설치한다.
- hook을 `--no-verify` 또는 `HUSKY=0`으로 우회하지 않는다.
- 수동 Checkstyle: 루트에서 `npm run checkstyle`
- push 전에 `git fetch origin main`, `git rebase origin/main`을 수행하고 검증 결과를 확인한다.
- PR에는 변경 목적, 주요 내용, 검증 결과와 미검증 항목을 적는다.

