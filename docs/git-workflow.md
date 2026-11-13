# Git 작업 방식

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
- 매 작업의 독립 평가 결과와 문제 ID·발견/해결/미해결·심각도·미확인 건수를 반드시 남긴다.
  [공통 평가 규칙](agent-review.md)과 [PR 양식](../.github/pull_request_template.md)을 따른다.

