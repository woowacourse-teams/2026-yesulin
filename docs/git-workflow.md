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

## 변경 경로로 CI 선택

`main`과 `dev` 대상 PR 및 두 브랜치에 대한 push에서 `Backend`와 `Frontend` 필수 체크를 항상 보고한다.
각 작업은 변경된 파일을 먼저 분류하고 자신에게 해당할 때 기존 린트·빌드·테스트를 실행한다.
PR은 이벤트가 지정한 대상 브랜치 커밋과 GitHub가 실제 검사하는 임시 머지 커밋을 비교한다.
push는 이벤트의 이전 커밋과 이번 커밋을 비교한다. 새 브랜치라서 이전 커밋이 없으면 이번 커밋의 모든 파일을 분류한다.
비교할 커밋을 확인할 수 없거나 미분류 경로가 있으면 체크가 실패한다.
이동은 이전과 새 경로를, 삭제는 이전 경로를 분류한다.

[경로 규칙](../.github/ci-paths.json)의 첫 일치 항목을 적용하고, 여러 파일을 바꾸면 각 파일의 검사 대상을 합친다.

| 변경 | 실행할 검사 |
| --- | --- |
| `frontend/` 전체와 루트의 Node 버전, npm 패키지 파일, `.gitignore` | 프론트엔드 |
| `backend/`, 배포 환경 선택 테스트와 그 스크립트, CloudWatch 테스트와 그 입력 파일 | 백엔드 |
| CI 워크플로·경로 규칙·CI 도구와 루트 `.gitattributes` | 둘 다 |
| 규칙에 명시한 문서·로컬 도구·두 작업이 읽지 않는 배포 입력 | 생략 |

Next.js는 루트의 lockfile을 프로젝트 경계 탐색에 사용한다. Tailwind는 Git 무시 규칙을 적용해 `frontend/`의 문서도 스캔한다.
새 공통 입력을 연결하거나 미분류 경로가 발생하면 규칙과 예시를 같이 갱신한다.
규칙과 Git 비교 테스트는 루트에서 `python3 -B -m unittest discover -s scripts/ci -v`로 실행한다.

## CI 시간 비교

[분리 전 실측 CSV](./reviews/2026-11-18-common-selective-ci-baseline.csv)는 GitHub Actions의 PR 9건과 push 5건의 첫 시도 기록이다.
이후 실행도 동일한 필드로 내려받는다. `gh`에 로그인한 상태에서 GitHub Actions URL의 실행 번호를 사용한다.

```sh
python3 -B scripts/ci/collect_timings.py RUN_ID [OTHER_RUN_ID ...] > ci-timings.csv
```

- `created_to_checks_done_seconds`는 실행 생성부터 양쪽 필수 체크가 끝날 때까지의 시간이다. 실행마다 한 번만 집계한다.
- `check_job_seconds`는 두 작업의 실행 시간 합계다. `job_build_result`로 기존 빌드의 실행·생략 여부를, `job_select_seconds`로 분류에 사용한 시간을 확인한다.
- PR과 push, 프론트만·백엔드만·둘 다·생략 사례를 각각 비교한다. 재시도는 `--attempt`로 따로 받고 실패·취소·일부 재시도는 성공 표본과 분리한다.
- 같은 코드로 전후 차이를 비교하려면 기본 브랜치에 이 워크플로가 반영된 후 GitHub Actions의 `CI`에서 `Run workflow`를 사용한다. 동일한 ref와 `base_sha`로 `full`과 `selective`를 각각 실행하고, CSV에서 `head_sha`와 `benchmark_base_sha`가 각각 일치하는지 확인한다. 실행 요약에는 실제 비교 범위와 경로 분류 결과가 남는다.
  `full`은 새 분류 비용을 포함하고 두 검사를 모두 실행하는 비교 모드다. PR 전용 Flyway 검사는 수동 실행에 포함되지 않는다.
  캐시 차이를 줄이려면 실행 순서를 번갈아 반복해 중앙값을 구한다.

일반 PR 실행의 CSV `head_sha`는 GitHub API가 보고한 PR 브랜치 커밋이다. 임시 머지 커밋은 분리 후 실행의 요약에 기록된다.

