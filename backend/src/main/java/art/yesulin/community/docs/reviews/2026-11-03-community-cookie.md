# 익명 관리 쿠키 이전 평가

- 작업 ID: 2026-11-03-community-cookie
- 평가표 버전: 1
- 기존 문제: 2026-11-03-community-dev-merge-F02 (#495), P2 / CODE / EXISTING / EXTERNAL.
- 목적: HttpOnly 쿠키로 관리 키를 이전하고 기존 소유권 해시·댓글 번호·좋아요를 유지한다.
- 독립 평가: 1회 완료, 추가 확정 결함 0건. 외부 평가 CLI는 이전 작업에서 코드 외부 전송으로 거부되어 동일 환경의 별도 평가자를 사용한다.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| K01 | 신규 방문·쓰기 | 읽기만 하면 발급하지 않고 첫 쓰기 전 서버 난수 쿠키 발급·확인 | domain/frontend 테스트·실제 HTTP | 예 | PASS |
| K02 | 기존 글·댓글·좋아요 이전 | 기존 해시와 익명 번호 유지, 수정·삭제 가능 | application 테스트·기존 서버 데이터로 HTTP 검증 | 예 | PASS |
| K03 | 이전 중 응답 유실·쿠키 차단·키 충돌 | 확인 전 기존 키 유지, 다른 키 덮어쓰기·권한 없는 작성 금지 | frontend/domain 테스트·실제 HTTP | 예 | PASS |
| K04 | 브라우저 권한·CSRF·전송 | HttpOnly·Secure·SameSite, 일반 API는 기존 헤더 거절, 다른 브라우저 권한 거절 | 실제 HTTP·브라우저 확인·CodeQL | 예 | UNVERIFIED |
| K05 | 재시도·동시 초기화 | 이미 발급된 쿠키 재사용, 탭 초기화 직렬화 | frontend/domain 테스트 | 예 | PASS |
| K06 | 기존 기능·정본·미사용 추가물 | 전체 테스트·빌드 유지, 계약·목·문서 동기화 | 전체 검사·독립 평가 | 예 | PASS |
| K07 | Slack·부하·지표 | 기존 후순위 범위 유지 | 변경하지 않음 | 아니오 | N/A |

## 문제와 상태 이력

기존 F02의 최초 확정 시각·최초 PR과 사건 이력은 [최초 기록](2026-11-03-community-dev-merge.md)에 보존한다. 신규 발견으로 중복 집계하지 않는다. 해결 후 FIXED 사건을 이 문서에 추가한다.

## 검증 근거

- Red: 새 domain helper 부재로 백엔드 테스트가 실패하고, frontend prepareIdentity 부재로 새 테스트 9개가 실패하는 것을 확인했다.
- 백엔드: `./gradlew test build` 성공(3m 9s). 1,465개 테스트 실패·오류·제외 0, Checkstyle 통과.
- 프론트 Node 24: 149파일 810개 테스트 통과. Web Locks 비동기 반환 타입을 조정한 후 관련 28개 테스트·lint·production build 재통과.
- 이전 버전 jar의 헤더 API로 H2 파일 DB에 글·댓글·좋아요를 생성하고, 같은 DB를 새 버전으로 열어 실제 HTTP 27개 검사를 통과했다.
  기존 수정·삭제, 익명1·좋아요 유지, 다른 브라우저 거절, CSRF, 헤더 단독 거절, 이전 재시도·충돌·잘못된 키, 쿠키 속성과 no-store를 확인했다.
- 실제 브라우저 localhost:3007에서 신규 글·댓글·좋아요 작성, 새로고침 후 권한과 선택 상태 유지, 수정 저장을 확인했다.
  실제 쿠키 경로의 identity URL도 ready:true로 응답했다. 보호 속성은 HTTP 응답으로 확인했으며 자동화의 제한된 DOM 평가에서는 document.cookie를 직접 관측할 수 없었다.
- 로컬 증거: `/private/tmp/community-cookie-http-result.log`, `/private/tmp/community-cookie-backend-build.log`,
  `/private/tmp/community-cookie-frontend-build.log`, `/private/tmp/community-cookie-frontend-final.log`, `/private/tmp/community-cookie-browser.png`.
  임시 로컬 로그·이미지는 저장소에 포함하지 않는다.

## 독립 평가

- 기존 권한 보존과 실패 시 키 유지, 헤더 제거, 쿠키 정책, CSRF 유지, 추가물 참조와 Markdown 링크를 검토했다.
- 확정 신규 발견 0 / 해결 0 / 미해결 0; P0 0 / P1 0 / P2 0 / P3 0; 모든 발견 경로 0; 오탐 0.
- 평가 시점 필수 PASS 5 / FAIL 0 / UNVERIFIED 1, 비필수 N/A 1. K04의 GitHub CodeQL 결과는 PR에서 최종 확인한다.
- 기존 F02는 코드 수정·로컬 검증을 마쳤으며 CodeQL 재확인 전에는 해결 완료로 기록하지 않는다.
- 기존 키 이름·이전 헤더는 아직 방문하지 않은 사용자의 관리 권한 이전에 필요하다. 기존 사용자 이전 지원 종료가 결정되기 전에는 제거하지 않는다.
- HttpOnly는 키의 JavaScript 읽기를 제한하며 실행 중인 XSS의 요청 대행까지 차단하는 기능은 아니다.
