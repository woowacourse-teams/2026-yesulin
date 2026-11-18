# 로컬 작업을 보존한 main 최신화

작업 ID: `2026-11-18-git-main-sync` / 평가일: 2026-11-18 / Git / 평가표 v1 / 최초 기록 PR: `PENDING`.

사용자 요청에 따라 로컬 `main`만 원격 최신 커밋으로 fast-forward했다. 현재 작업 브랜치는
`fix/mobile-home-screen-icon`, HEAD는 `671076771fa56d4866c941f626f6a9cf7aacca92`로 유지했다.
현재 작업 브랜치에 원격 main을 통합하거나 checkout·stash·reset·rebase하지 않았다.
루트 규칙, 공통 문서 라우터, `docs/agent-review.md`, `docs/git-workflow.md`를 적용했으며,
변경 전에 평가표와 기존 파일·인덱스·설정 보존 기준을 준비했다.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 방법·근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| G01 | 정상 동기화: main이 원격과 다름 | main·origin/main·FETCH_HEAD 일치 | `git fetch origin refs/heads/main:refs/heads/main` 성공. 세 SHA=`471aedaff49950a6de6f25d45c2987a003d19a37`, ahead/behind=`0 0` | 예 | PASS |
| G02 | 기존 이력·실패 보호: 로컬 이력 덮어쓰기 또는 체크아웃 중인 main 수정 | 비체크아웃 main에 fast-forward만 허용 | 사전 worktree 목록에 main 없음, 기존 main=`5325f1a29ebd04ba82d0bf0ce4f955c24d309b53`이 origin/main의 조상임을 확인. 비강제 fetch 및 reflog의 fast-forward 확인 | 예 | PASS |
| G03 | 수동 수정 보호: 현재 브랜치·HEAD·인덱스·파일·개인 설정 변경 | 모든 기존 로컬 작업 보존 | 전후 현재 branch·HEAD·stage entries·porcelain 상태·config HEAD/status 일치. 기존 일반 파일 3,666개의 SHA-256·권한 및 경로·심볼릭 링크·삭제 상태 일치 | 예 | PASS |
| G04 | 정리: 불필요한 구현·설정·의존성·옛 문서 추가 | main ref와 필수 평가 기록 외 변경 없음 | 독립 평가에서 기존 파일·설정·의존성 보존과 본 기록만 추가됨을 확인. 새 문서 링크가 없어 깨진 링크 없음 | 예 | PASS |
| G05 | 중복·중단 복구: 재시도로 이력 유실 | 비강제 fetch와 reflog로 이전 tip 보존 | 성공한 비강제 fetch의 reflog를 확인. 강제 중단·실제 재시도는 재현하지 않음 | 아니오 | N/A |

권한은 승인된 fetch의 성공으로 확인했다. 기존 `main`에서 원격 최신까지 224개 커밋이 반영됐다.
현재 작업 트리 내용은 전환하지 않았으므로 애플리케이션 기능 테스트·기동은 이번 ref 동기화 검증에
해당하지 않는다. 별도 worktree의 브랜치와 파일도 이번 명령의 변경 대상이 아니다.

보존 스냅샷은 `/private/tmp/yesulin-main-sync-before-20261118.json`, 검증 결과는
`/private/tmp/yesulin-main-sync-verification-20261118.json`에 두었다. 스냅샷은 경로·지문·권한·Git 메타데이터만
포함하며 `.env`, `config/server/local.env`, `frontend/.env.development.local`의 실제 값을 기록하거나 출력하지 않았다.
초기 스냅샷에서 `git write-tree`가 sandbox의 index.lock 쓰기 제한으로 실패해, 읽기 전용
`git ls-files --stage -z`로 스테이징 상태를 수집한 뒤 정상 진행했다. 당시 브랜치와 파일 변경은 없었다.

Claude 실행 파일이 없어 별도 에이전트의 읽기 전용 독립 평가 1회를 수행했다.
평가자는 원격·로컬 main 일치, reflog fast-forward와 이전 main의 조상 관계,
현재 브랜치·HEAD·index·config 보존, 기존 일반 파일 3,666개와 개인 env 3개 보존을 직접 확인했다.
상태·경로의 유일한 추가는 본 기록이다. 발견 문제와 수정 사항은 없으며 재귀 평가는 수행하지 않았다.

필수 PASS 4 / FAIL 0 / UNVERIFIED 0 / N/A 0. 선택 N/A 1. 필수 검증률 4/4.
신규 확정 발견 0 / 해결 0 / 미해결 0 / P0 0 / P1 0 / P2 0 / P3 0 / 오탐 0.
발견 경로 PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0.
미확인 항목 0. 확정 문제가 없어 문제 ID·상태 사건 이력은 없다. PR은 생성하지 않았다.
