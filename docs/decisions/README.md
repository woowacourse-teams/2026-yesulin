# 결정 기록

결정 기록은 현재 명세를 대신하지 않고 설계의 이유를 보존한다. 모든 결정은 기본 AI 컨텍스트에서 제외하며, 관련 계약을 변경하거나 배경을 추적할 때만 읽는다.

## 규칙

- 파일명은 `yyyyMMddHHmmss-kebab-case.md`, 길이는 원칙적으로 250단어 이내로 한다.
- `계기`, `결정`, `이유`, `영향`만 남기고 현재 상세 규칙은 정본 문서에 반영한다.
- 새 API 경계, 권한·소유권, 데이터 생명주기처럼 여러 영역에 영향을 주는 결정만 기록한다.
- 단순 UI 문구·간격, 정해진 규칙의 구현, 내부 리팩터링에는 결정 파일을 만들지 않는다.
- 현재 설계에 영향을 주는 기록만 `ai-context: on-demand`로 Git에 둔다.
- 결정이 대체되거나 결과가 정본·코드에 흡수되면 Git에서 제거하고 내부 Notion Archive에서 이력을 관리한다.

## On-demand

### 지원서·인증·Draft

- [지원서·프로필·배역 규칙](./20260812134827-application-profile-and-role-rules.md)
- [로컬 우선 서버 Draft 동기화](./20260812134827-local-first-server-draft.md)
- [인증 주체별 로그인·가입 흐름](./20260818133426-role-specific-auth-flow.md)
- [지원 시작 선택과 제작사 작성 로컬 Draft](./20260820044229-application-start-and-producer-local-drafts.md)

### 공연·공고·심사

- [공연·공고 생성과 수정 경계](./20260818133426-performance-posting-management.md)
- [심사 상세 식별과 화면 경로](./20260818133426-screening-detail-identity-and-route.md)
- [공고 생명주기와 섹션 Aggregate](./20260819073112-audition-section-aggregates.md)
- [공고 배역 참조](./20260819151537-audition-role-references.md)

### 백엔드 운영

- [백엔드 JAR와 systemd 배포](./20260819021010-backend-jar-systemd-deployment.md)
- [백엔드 EC2 운영체제](./20260819061141-backend-ec2-operating-system.md)
- [Nginx와 CloudFront Origin Header 경계](./20260820071900-nginx-cloudfront-origin-guard.md)

## Archive

과거 결정과 논의 과정은 공개 GitHub에 두지 않는다. 접근 제한된 내부 Notion에서 보관하고, 현재 코드에 필요한 결과만 도메인·API·컨벤션 정본에 반영한다.
