# Git 컨벤션

## 브랜치

MVP 기간에는 GitHub Flow를 사용한다. `main`은 항상 배포 가능한 상태로 유지하며, 작업은 별도 브랜치와 PR로 병합한다.

```text
{type}/{kebab-case-description}
```

- 타입: `feat`, `fix`, `hotfix`, `docs`, `refactor`, `perf`, `test`, `chore`
- 소문자와 kebab-case를 사용한다.
- 예: `feat/user-authentication`, `fix/login-button`
- 병합한 브랜치는 삭제한다.

## 커밋

```text
{type}: {summary}
```

- 브랜치와 같은 타입을 사용한다.
- 제목은 50자 이내로 작성하고 마침표를 붙이지 않는다.
- 한 커밋에는 하나의 논리적 변경만 담는다.
- 제목만으로 이유가 드러나지 않을 때 본문에 `무엇을`, `왜` 변경했는지 적는다.
- 관련 이슈는 꼬리말에 `Closes #123` 또는 `Refs #123`으로 연결한다.

```text
feat: 사용자 인증 기능 추가

세션 기반 인증으로 새로고침 후에도 로그인 상태를 유지한다.

Closes #123
```

## Pull Request

- 변경 목적과 주요 내용을 요약한다.
- 검증한 테스트와 미검증 항목을 적는다.
- API·비즈니스 규칙·실행 방법이 바뀌면 관련 문서를 함께 수정한다.
- 리뷰 가능한 크기로 유지하고 무관한 변경을 섞지 않는다.
- 리뷰 반영 후 테스트와 정적 검사를 다시 실행한다.

## Push 전 동기화

현재 통합 브랜치는 `origin/main`이다. push 전 항상 최신 기준으로 rebase한다.

```bash
git fetch origin main
git rebase origin/main
git push
```

- 충돌이 나면 의도를 확인해 해결하고 검사 후 rebase를 계속한다.
- rebase 전후 커밋과 작업 트리를 확인한다.
- 통합 브랜치가 바뀌면 위 기준과 관련 결정 기록을 함께 수정한다.

## 리뷰 기준

1. 요구사항과 비즈니스 규칙 충족
2. 오류·보안·데이터 손실 가능성
3. 테스트와 하위 호환성
4. 성능과 유지보수성
5. 코드 스타일과 문서 일치

## 자동 검사

최초 1회 저장소 루트에서 `npm install`을 실행한다.

- `commit-msg`: 커밋 형식과 허용 타입을 검사한다.
- `pre-commit`: staged diff에 백엔드 Java·Checkstyle 설정 변경이 있을 때만 `checkstyleMain`, `checkstyleTest`를 실행한다.
- 수동 실행: `npm run checkstyle`
