# dev 변경의 운영 릴리즈 준비

작업 ID: `2026-11-18-dev-main-release` / 평가일: 2026-11-18 (Asia/Seoul) / 공통 릴리즈·프론트 / 평가표 v1.
최초 기록 PR: [#603](https://github.com/woowacourse-teams/2026-yesulin/pull/603) / 작업 이슈: #602.

## 대상과 범위

- 기준 main: `471aedaff49950a6de6f25d45c2987a003d19a37`.
- 원본 dev: `550d0e63d0eb635aed2c0fa1cf65fe80fbca1a21`.
- 릴리즈 브랜치: `chore/release-2026-11-18`. main에서 분기한 별도 worktree에 dev를 병합했다.
- #587 인증 메일 진단·재전송, #594 PDF 업로드·심사 표시, #595 공고 본문 편집,
  #596 홈 배너, #597 부하 관측 설정, #599 공연사 대시보드·사이드바, #600 커뮤니티 입력·로그인·목록,
  #601 CSP 관찰 헤더를 운영에 반영할 PR을 준비한다. #592의 초기화 API는 local/dev 프로필로 제한된다.
- main의 홈 5분 ISR, 공개 공고 카드 자동 prefetch 비활성화, Proxy의 기존 홈 목록 주소 이동,
  운영 readiness 대기, config 고정과 기존 평가 이력을 보존한다.
- 기능 구현·외부 인프라·환경 변수 값은 새로 수정하지 않는다. 충돌한 구조 문서만 현재 병합 코드에 맞춘다.
- 앞선 config·main 확인/동기화 작업의 PR 미게시 평가 기록 3개를 이번 PR에 함께 보존한다.

## 평가표 v1

공통 문서 라우터·작업 평가·Git 절차와 프론트 `docs/README.md` → `docs/AGENTS.md` → 구조 정본을
명시적으로 읽었다. 수정 전에 릴리즈 범위·정상/실패·중복·권한·수동 수정 보호 평가표를 준비했다.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 방법·근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| R01 | 대상·중복: 잘못된 head/base 또는 중복 릴리즈 | 최신 dev를 포함한 main 대상 릴리즈 | 원격 두 브랜치 fetch, 열린 dev→main PR 없음. main 기반 릴리즈에 정확한 dev SHA 병합 준비 | 예 | PASS |
| R02 | 병합·검증: 충돌이나 CI 미확인을 통과로 보고 | 충돌 해소와 원본 CI 상태 구분 | 유일한 충돌 `frontend/docs/architecture.md` 해결·stage, unmerged 경로 없음. dev SHA의 Frontend·Backend CI 성공. 릴리즈 PR CI는 생성 후 별도 확인 | 예 | PASS |
| R03 | 운영 보존·설정: 운영 수정 유실·마이그레이션 누락 | main 전용 수정과 고정 유지 | main과 config/gitlink·version·DB migrations·readiness·홈 ISR/Proxy/prefetch 파일 diff 0. dev와 배너·CSP·대시보드 구현 diff 0 | 예 | PASS |
| R04 | 로컬 작업: 미커밋 파일 포함·덮어쓰기 | 기존 작업 전체 보존 | 원본 폴더의 branch·HEAD·index·status·config와 기존 파일 내용/권한/경로 지문 전후 일치. 비밀 env 3개 포함, 값 미출력 | 예 | PASS |
| R05 | 정리·평가·게시: 미사용 산출물·평가 누락 | 독립 평가 1회와 고정 집계를 갖춘 PR | 독립 평가·본문 검토 완료, 추가 문제 0건. PR #603 재조회에서 main 대상·릴리즈 head·평가 본문·이슈 연결·MERGEABLE 확인 | 예 | PASS |
| R06 | 운영 배포·실기기: 미실행을 성공 처리 | PR 생성 범위와 배포 후 검증 구분 | 운영 병합·배포·실계정 메일·브라우저 E2E는 이번 PR 생성에서 실행하지 않음 | 아니오 | N/A |

## 실행 근거와 경계

- 원본 [dev CI](https://github.com/woowacourse-teams/2026-yesulin/actions/runs/44075128489)의 Frontend·Backend 모두 성공.
  Frontend는 lint·build, Backend는 Gradle build·Checkstyle·tests와 배포 스크립트를 수행했다.
- 병합 결과의 프론트 lint 성공. 홈·Proxy·배너·대시보드·사이드바·커뮤니티·Next 설정 표적 Vitest 11파일 91개 성공.
- 병합 결과의 프론트 운영 빌드 성공. 출력에서 홈 `/` 재검증 주기 `5m` 확인.
  첫 sandbox 실행은 진행 정지해 중단했고, 필요한 프로세스 권한으로 재실행한 결과만 성공 근거로 사용했다.
- merge 커밋 `4085a010`의 pre-commit에서 Java 25 Checkstyle Main/Test 성공(캐시 재사용), commit-msg 통과.
  로컬 백엔드 전체 테스트는 다시 실행하지 않았으며 원본 CI 근거와 구분한다.
- config SHA는 양쪽 모두 `bab5abe1c1fa7128e89dea16f2422567b1983510`, 신규 DB migration 없음.
- `AuditResetController`는 `@Profile({"local", "dev"})`이고 기본 reset-enabled=false다. prod에 초기화 API를 노출하지 않는다.
- 관측 주기는 기본 PT60S이며 PT1S는 환경 변수로 명시할 때만 적용된다. 신규 필수 비밀 변수 없음.
- PR을 만드는 작업이며 main/dev를 직접 push하거나 병합하지 않는다. 릴리즈 PR의 병합 방식은
  dev 원본 이력을 연결하는 Create a merge commit을 권장한다.
- 중단·재시도는 격리 worktree와 브랜치를 유지하는 범위이며 강제 중단 재현은 하지 않았다.
  원격 조회/이슈 생성 권한은 성공으로 확인했고, push·PR 생성 결과는 실제 실행 후 기록한다.
- 보존 스냅샷: `/private/tmp/yesulin-release-before-20261118.json` (실제 env 값 없이 지문·Git 메타데이터만 기록).

## 문제와 상태 사건 이력

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정(+09:00) / 최초 PR | 해결 시각(+09:00) | 근거·조치·상태 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-18-dev-main-release-F01 | P2·DOC·EXISTING | PRECHECK | 2026-11-18T12:32:24+09:00 / #603 | 2026-11-18T12:33:34+09:00 | main/dev의 구조 문서 배너 문단 충돌. main의 ISR·실패 시 브라우저 재조회와 dev의 새 배너 구성을 함께 보존. stage 후 unmerged 없음·diff 검사 통과, FIXED |

| 사건 ID | 문제 ID | 종류 | 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-18-dev-main-release-F01 | CONFIRMED | 2026-11-18T12:32:24+09:00 | merge-tree와 실제 merge의 구조 문서 충돌, PENDING |
| E02 | 2026-11-18-dev-main-release-F01 | FIXED | 2026-11-18T12:33:34+09:00 | 구조 문서 통합·stage·unmerged 없음·표적 테스트 91개 성공, PENDING |

## 독립 평가와 집계

Claude 실행 파일이 없어 별도 에이전트의 읽기 전용 독립 평가 1회를 수행했다.
평가자는 운영 수정·원본 dev 변경 보존, 충돌 문서, local/dev 전용 초기화 경계, 기존 파일 3,667개와 개인 설정 보호,
삭제 자산·옛 내비게이션 참조, 신규 의존성 소비자, 문서 링크와 PR 초안의 집계를 확인했다. 추가 확정 문제는 없다.
평가자의 재귀 평가는 수행하지 않았다. 범위는 릴리즈 통합·충돌 해결·운영 보존이며, 원본 기능 전체를 재평가한 것으로 주장하지 않는다.

필수 PASS 5 / FAIL 0 / UNVERIFIED 0 / N/A 0. 선택 N/A 1. 필수 검증률 5/5.
신규 확정 발견 1 / 해결 1 / 미해결 0 / P0 0 / P1 0 / P2 1 / P3 0 / 오탐 0.
발견 경로 PRECHECK 1 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0.
미확인 항목 0. 배포·브라우저 E2E와 새 PR CI 완료는 이 PR 생성 평가의 필수 통과 범위가 아니다.

## 게시 후 확인

2026-11-18T12:40:58+09:00에 PR #603을 재조회했다. main 대상의 일반 PR이며 병합 충돌은 없다.
원본 dev 이력은 merge 커밋 `4085a010`의 두 번째 부모로 보존했고, main은 첫 번째 부모다.
Frontend·Backend PR CI는 진행 중이며 Vercel 상태는 성공이었다. CI 완료·운영 배포 성공으로 확대 해석하지 않는다.
문제 F01의 최초 기록 PR은 #603이며 위 E01·E02의 PENDING은 게시 전 사건 이력으로 그대로 보존한다.

push 전에 원격 main/dev를 다시 fetch했다. 일반 rebase가 dev 병합 이력을 펼치며 같은 구조 문서에서
충돌해 즉시 abort했고, 검증한 `ed496e30`의 tree와 merge 이력으로 복구했다.
원격에 올라간 branch도 같은 SHA임을 확인했다. 이미 최신 main을 부모로 포함하는 릴리즈이므로
통합 이력을 재작성하는 rebase를 반복하지 않고 양쪽 원본 이력을 유지했다. 원본 사용자 작업 폴더는 변경하지 않았다.
