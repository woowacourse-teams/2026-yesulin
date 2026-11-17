# 공연사 대시보드 구현 평가

- 작업 ID `2026-11-17-producer-dashboard-implementation`
- 평가일 2026-11-17, Asia/Seoul
- 기준은 [공연사 흐름](../user-flows/producer.mmd), [프론트 구조](../architecture.md), [디자인 시스템](../design-system.md), 기존 대시보드 HTML 시안이다.
- 독립 평가 1회. 실행 가능한 상대 CLI가 없어 별도 동종 에이전트가 읽기 전용으로 검토하고, 작성자가 발견 사항의 수정과 표적 검증을 수행했다.
- 환경은 로컬 Next.js와 계약에 맞춘 HTTP 검증 데이터다. 운영 서버와 실기기 검증은 범위 밖이다.

| ID | 흐름과 실패 조건 | 기대 결과 | 검증 방법과 근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| H01 | 로그인·가입·인증·계정 경계에서 잘못된 화면 또는 데이터가 노출됨 | 로그인과 가입 후 `/producers`를 연다. 비로그인과 인증 대기에는 현황을 조회하지 않는다. 기존 주소는 직접 열 수 있다. | `producer-entry.test.tsx`, `notebook-site-layout.test.tsx`, Chrome에서 비로그인 차단, 로그인 후 진입, 코드를 입력하기 전 목록 요청 0건, 인증 후 조회와 기존 주소 이동. 계정별 키와 지연된 PDF 오류 경계 대조 | 예 | PASS |
| H02 | 현황 집계, 최근 작업·일정 정렬과 날짜 경계가 실제 응답과 어긋남 | 모집 중 공개 공고, PDF 심사함과 공개 무료 공연을 집계한다. 최근 30일 작업과 한국 시간 기준 지원 마감 및 공연 회차를 각각 두 건까지 표시한다. | `activity.test.ts` 네 가지 규칙과 경계, Chrome에서 네 소유 목록 응답의 수치·제목·링크 대조 및 회차 시작 이후 재조회 | 예 | PASS |
| H03 | 조회 중·부분 실패가 빈 상태로 보이거나 한 실패가 전체를 가림 | 최근 작업과 일정의 각각·동시 빈 상태, 최초 시작, 부분 실패와 재시도를 구분한다. 성공한 영역은 계속 보인다. | Chrome에서 초기 빈 목록, 최근 작업 없음, 일정 없음, 두 목록 모두 없음, 공연 조회 오류와 부분 복구 | 예 | PASS |
| H04 | 왼쪽 메뉴, 모바일 가이드, 키보드와 기존 심사 이탈 보호에 회귀가 생김 | PC와 모바일의 기존 사이드바 항목 및 순서를 사용한다. 상단바에서 대시보드를 다시 열고, 가이드와 관리 링크를 키보드로 사용할 수 있다. | Chrome 1440×1000·390×844, 가이드 포커스, 메뉴 열기·Esc, 동작 감소. 기존 `useReviewExitGuard` 캡처 단계의 링크 처리 대조 및 원본 심사 테스트 실행 | 예 | PASS |
| H05 | 불필요한 상세 조회·분석 이벤트·쓰이지 않는 코드가 추가되거나 빌드가 실패함 | 목록 요청만으로 대시보드를 렌더링하고 기존 이벤트 발생 기준과 운영·개발 분리를 보존한다. | `analytics.md`와 `scripts/posthog/dashboards.mjs` 대조, 기존 성공 지점 유지. 추가 파일·컴포넌트·스타일 참조와 의존성 검사. `npm run lint`, `npm test` 1,111건, `npm run build -- --webpack`, `git diff --check` 통과 | 예 | PASS |

신규 쓰기·중복 처리·스키마 변경은 N/A다. PDF 판정·저장의 로직은 변경하지 않았고, Chrome으로 실제 PDF 파일의 미저장 상태 이탈까지 재현하지 않았다.

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정 / 최초 PR | 해결 시각 | 근거와 조치 및 상태 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17-producer-dashboard-implementation-F01 | P2·TEST·EXISTING | PRECHECK | 2026-11-17T13:23:07+09:00 / PENDING | 2026-11-17T13:29:55+09:00 | 기존 원본 심사 테스트가 스코프 밖의 `guarded`를 참조해 TypeScript가 실패했다. 하네스에 해당 테스트의 `navigate` 스파이만 전달했다. 전체 테스트와 빌드 통과. FIXED |
| 2026-11-17-producer-dashboard-implementation-F02 | P2·FLOW·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-17T13:27:21+09:00 / PENDING | 2026-11-17T13:29:55+09:00 | 목록이 공연마다 다음 회차 한 개를 반환한다. 이전 회차의 시작 경계를 넘으면 공연 목록을 다시 조회하게 바꾸고, 두 번째 회차가 표시되는 것을 Chrome에서 확인했다. FIXED |
| 2026-11-17-producer-dashboard-implementation-F03 | P2·FLOW·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-17T13:27:21+09:00 / PENDING | 2026-11-17T13:29:55+09:00 | 대시보드 PDF 전역 401 이벤트는 이전 계정의 지연 응답이 새 계정을 지울 수 있었다. 기존 목록 조회 함수와 지역 오류 표시를 사용한다. 전역 이벤트 호출 제거 및 요청 해제 시 뒤늦은 결과 폐기 확인. FIXED |
| 2026-11-17-producer-dashboard-implementation-F04 | P3·DOC·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-17T13:27:21+09:00 / PENDING | 2026-11-17T13:29:55+09:00 | 공개 헤더 경로 설명이 예전 공고 목록을 가리켰다. 실제 대시보드 링크와 헤더 테스트에 맞춰 갱신했다. FIXED |

| 사건 ID | 문제 ID | 사건 종류 | 발생 시각 | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-17-producer-dashboard-implementation-F01 | CONFIRMED | 2026-11-17T13:23:07+09:00 | 타입 검사와 HEAD 비교, PENDING |
| E02 | 2026-11-17-producer-dashboard-implementation-F02 | CONFIRMED | 2026-11-17T13:27:21+09:00 | 공연 요약과 시간 갱신 책임 대조, PENDING |
| E03 | 2026-11-17-producer-dashboard-implementation-F03 | CONFIRMED | 2026-11-17T13:27:21+09:00 | 계정 키 전환과 비동기 이벤트 대조, PENDING |
| E04 | 2026-11-17-producer-dashboard-implementation-F04 | CONFIRMED | 2026-11-17T13:27:21+09:00 | 문서와 공개 헤더 대조, PENDING |
| E05 | 2026-11-17-producer-dashboard-implementation-F01 | FIXED | 2026-11-17T13:29:55+09:00 | 테스트·빌드 성공, PENDING |
| E06 | 2026-11-17-producer-dashboard-implementation-F02 | FIXED | 2026-11-17T13:29:55+09:00 | 시간 경계에서 다음 회차 확인, PENDING |
| E07 | 2026-11-17-producer-dashboard-implementation-F03 | FIXED | 2026-11-17T13:29:55+09:00 | 전역 이벤트 호출 제거 확인, PENDING |
| E08 | 2026-11-17-producer-dashboard-implementation-F04 | FIXED | 2026-11-17T13:29:55+09:00 | 갱신한 문구와 헤더 테스트 확인, PENDING |

필수 PASS 5 / FAIL 0 / UNVERIFIED 0 / N/A 0. 발견 4 / 해결 4 / 미해결 0. P0 0 / P1 0 / P2 3 / P3 1. 미확인 0. 오탐 0. 발견 경로 PRECHECK 1 / INDEPENDENT_REVIEW 3 / POST_FIX_CHECK 0 / EXTERNAL 0.

## 실제 계정 확인용 로컬 서버

- 작업 ID `2026-11-17-producer-dashboard-local-live-api`
- 평가일 2026-11-17, Asia/Seoul. 독립 평가 1회와 작성자 실행 검증.
- 로컬 프론트엔드에서 공연사 사용자가 직접 로그인하는 범위다. 운영 API와 모킹·로컬 분석 비활성은 실행 프로세스의 환경으로 지정했다.

| ID | 흐름과 실패 조건 | 기대 결과 | 검증 방법과 근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| R01 | 프론트엔드를 외부 인터페이스에 열거나 다른 작업의 로컬 DB에 연결함 | 이 컴퓨터의 루프백 포트 3000에서 운영 API를 사용한다. | 실행 인자와 `lsof -nP -iTCP:3000 -sTCP:LISTEN` 확인. 설정의 로컬 8080은 연결 거절, 별도 작업 트리 8098은 로컬 DB 연결 확인 | 예 | PASS |
| R02 | 로그인 페이지 또는 익명 세션·운영 API 연결이 실패함 | `/login`과 API health를 열 수 있고 공연사 폼을 표시한다. 비로그인 대시보드 접근은 차단한다. | Chrome 폼과 Secure CSRF 쿠키 수용 확인. `/login` 200, 로컬 경유 `/api/v1/health` 200, 현재 세션 401, 비로그인 `/producers` 307 | 예 | PASS |
| R03 | 시작 작업이 기존 설정·코드·계정 정보에 영향을 줌 | 기존 파일을 건드리지 않고 프로세스 단위로 환경을 지정한다. 계정 정보는 사용자가 브라우저에 직접 입력한다. | 실행 명령과 차이 범위, 익명 조회 경계 확인 | 예 | PASS |

운영 계정의 로그인과 개인 정보 조회는 사용자의 직접 확인 범위다.

필수 PASS 3 / FAIL 0 / UNVERIFIED 0 / N/A 0. 발견 0 / 해결 0 / 미해결 0. P0 0 / P1 0 / P2 0 / P3 0. 미확인 0. 오탐 0. 발견 경로 PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0.

## 로컬 로그인 오류 표시

- 작업 ID `2026-11-17-producer-login-invalid-credentials-overlay`
- 평가일 2026-11-17, Asia/Seoul. 독립 평가 1회와 작성자 검증.
- 기준은 [인증 API](../../../backend/docs/api.md)의 `AUTH_INVALID_CREDENTIALS` 응답과 `origin/main`의 로그인 폼 및 세션 요청이다.

| ID | 흐름과 실패 조건 | 기대 결과 | 검증 방법과 근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| V01 | 자격 증명 오류가 Next.js 개발 오류로 표시됨 | 로그인 안내를 표시하고 같은 화면에서 재시도할 수 있다. | 사용자 탭의 `SessionApiError`와 기존 콘솔 호출 확인. `producer-entry.test.tsx`에서 해당 401의 안내, 콘솔 로그 없음, 무세션·무이동 및 버튼 복구 확인 | 예 | PASS |
| V02 | 로그인 성공이나 다른 장애 처리까지 바뀜 | 성공은 대시보드로 이동하며 다른 서버·네트워크 오류의 로그와 안내는 기존 처리 경로를 거친다. | 성공 테스트와 `catch` 조건 대조. 자격 증명 코드만 콘솔 로그에서 제외 | 예 | PASS |
| V03 | 수정이 인증 요청이나 민감 정보에 영향을 줌 | 폼과 요청은 유지하고 민감값을 기록하지 않는다. | `git diff origin/main`과 프론트·서버 오류 계약 대조. 임시 자산·의존성·설정 추가 없음 | 예 | PASS |

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정 / 최초 PR | 해결 시각 | 근거와 조치 및 상태 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17-producer-login-invalid-credentials-overlay-F01 | P3·CODE·EXISTING | EXTERNAL | 2026-11-17T13:45:26+09:00 / PENDING | 2026-11-17T13:45:26+09:00 | 인증 거절을 `console.error`로 기록해 로컬 개발 배지가 표시됐다. 해당 계약 코드의 콘솔 로그를 생략하고 테스트에서 안내와 재시도 상태를 확인했다. FIXED |

| 사건 ID | 문제 ID | 사건 종류 | 발생 시각 | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-17-producer-login-invalid-credentials-overlay-F01 | CONFIRMED | 2026-11-17T13:45:26+09:00 | 사용자 증상과 브라우저 콘솔 대조, PENDING |
| E02 | 2026-11-17-producer-login-invalid-credentials-overlay-F01 | FIXED | 2026-11-17T13:45:26+09:00 | 계약 코드별 로깅과 회귀 테스트, PENDING |

필수 PASS 3 / FAIL 0 / UNVERIFIED 0 / N/A 0. 발견 1 / 해결 1 / 미해결 0. P0 0 / P1 0 / P2 0 / P3 1. 미확인 0. 오탐 0. 발견 경로 PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 1.

## 운영 로그인 화면과의 정합성

- 작업 ID `2026-11-17-producer-login-main-parity`
- 평가일 2026-11-17, Asia/Seoul. 독립 평가 1회와 작성자 실행 검증.
- 기준은 최신 원격 `main` `471aeda`, 운영 `/login`과 `/producer-service/login`, [공연사 흐름](../user-flows/producer.mmd)이다.

| ID | 흐름과 실패 조건 | 기대 결과 | 검증 방법과 근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| L01 | 로컬 로그인에 예전 계정 선택이 표시됨 | `/login`은 소셜 로그인과 이메일 로그인 링크를 제공한다. 공연사 이메일 폼은 `/producer-service/login`에 표시한다. | 최신 원격 소스 및 운영 브라우저와 대조. 같은 브라우저에서 로컬 일반 화면, 링크 선택, 전용 화면 확인 | 예 | PASS |
| L02 | 이메일 로그인·가입·복구가 옛 폼을 참조함 | 공연사 진입·복구 링크가 전용 폼을 열고 성공하면 `/producers`로 이동한다. | 로그인 성공·실패, 가입 후 인증 대기, PDF 복구 링크 테스트. 로컬 HTTP 검증 API로 일반 로그인→전용 폼→대시보드를 실행하고 인증 대기에서 활성화까지 확인 | 예 | PASS |
| L03 | 지원서 복귀나 로그인 통계에 회귀가 생기거나 예전 UI 참조가 남음 | 지원서 소셜 로그인과 복귀를 유지한다. 두 로그인 화면에서 로그인 복귀 이벤트를 소비하지 않는다. | 일반·지원서 역할 분기 테스트, 최신 main의 분석 이벤트 분기 대조, 소스·문서 참조 검색, 전체 테스트 1,118건과 신규 라우트 빌드 및 수정 뒤 관련 테스트·린트·타입 검사 | 예 | PASS |

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정 / 최초 PR | 해결 시각 | 근거와 조치 및 상태 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17-producer-login-main-parity-F01 | P2·FLOW·EXISTING | EXTERNAL | 2026-11-17T13:49:52+09:00 / PENDING | 2026-11-17T13:59:09+09:00 | 작업 트리에는 운영의 로그인 분리가 들어 있지 않았다. 두 경로와 폼을 맞추고 운영·로컬 브라우저에서 확인했다. FIXED |
| 2026-11-17-producer-login-main-parity-F02 | P2·FLOW·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-17T13:59:09+09:00 / PENDING | 2026-11-17T13:59:09+09:00 | PDF 인증 복구 링크가 소셜 로그인 또는 비인증 404 경로로 이어졌다. 전용 이메일 폼을 새 탭으로 열도록 연결하고 관련 테스트를 확인했다. FIXED |
| 2026-11-17-producer-login-main-parity-F03 | P3·DOC·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-17T13:59:09+09:00 / PENDING | 2026-11-17T13:59:09+09:00 | 아키텍처와 MSW 안내에 예전 계정 선택 경로가 남았다. 전용 폼 주소를 안내하고 소스까지 참조를 대조했다. FIXED |

| 사건 ID | 문제 ID | 사건 종류 | 발생 시각 | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-17-producer-login-main-parity-F01 | CONFIRMED | 2026-11-17T13:49:52+09:00 | 운영·로컬·원격 소스 비교, PENDING |
| E02 | 2026-11-17-producer-login-main-parity-F02 | CONFIRMED | 2026-11-17T13:59:09+09:00 | PDF 복구 링크와 라우트 보호 대조, PENDING |
| E03 | 2026-11-17-producer-login-main-parity-F03 | CONFIRMED | 2026-11-17T13:59:09+09:00 | 기존 안내 주소 검색, PENDING |
| E04 | 2026-11-17-producer-login-main-parity-F01 | FIXED | 2026-11-17T13:59:09+09:00 | 로컬의 두 로그인 화면과 로그인 성공 경로 확인, PENDING |
| E05 | 2026-11-17-producer-login-main-parity-F02 | FIXED | 2026-11-17T13:59:09+09:00 | 이메일 폼 연결 및 PDF 회귀 테스트, PENDING |
| E06 | 2026-11-17-producer-login-main-parity-F03 | FIXED | 2026-11-17T13:59:09+09:00 | 옛 선택 문구·주소 참조 검색, PENDING |

필수 PASS 3 / FAIL 0 / UNVERIFIED 0 / N/A 0. 발견 3 / 해결 3 / 미해결 0. P0 0 / P1 0 / P2 2 / P3 1. 미확인 0. 오탐 0. 발견 경로 PRECHECK 0 / INDEPENDENT_REVIEW 2 / POST_FIX_CHECK 0 / EXTERNAL 1.

## 로컬 백엔드와 테스트 공연사 데이터

- 작업 ID `2026-11-17-producer-dashboard-local-data`
- 평가일 2026-11-17, Asia/Seoul. [공연사 흐름](../user-flows/producer.mmd)과 [로컬 실행 문서](../../../docs/local-development.md)를 기준으로 작성자 실행 검증과 독립 평가 1회를 수행했다.

| ID | 흐름과 실패 조건 | 기대 결과 | 검증 방법과 근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| D01 | 로컬 화면에서 운영 API나 기존 테스트 DB에 쓰기가 발생함 | 모든 실데이터 요청은 루프백 Spring 백엔드와 전용 MySQL 및 로컬 S3에서 처리한다. 외부 발송 설정을 끈다. | Next의 API rewrite, Spring `local` 기동 로그와 실제 DB 주소, 네 서비스의 루프백 바인딩 및 발송을 끈 기동 옵션을 확인했다. | 예 | PASS |
| D02 | 공연사 로그인 후 대시보드에 진입하지 못하거나 인증 없이 관리 데이터가 노출됨 | 활성 공연사 로그인으로 `/producers`가 열리고 비인증 세션 및 관리 목록 API는 401을 반환한다. | 세션 응답 `PRODUCER/ACTIVE`, 전용 로그인 화면에서 실제 탭의 이동, 프론트 경유 비인증 세션·공고·심사함·공연 API 4개 응답을 검증했다. | 예 | PASS |
| D03 | API에 등록한 데이터와 카드·목록이 일치하지 않음 | 현황 카드마다 1건, 최근 작업에 공고와 PDF 심사함, 다가오는 일정에 공개 공연과 회차 시각이 뜬다. | 실제 API의 게시 중 공고·심사함·예매가 열린 공연, 로컬 포스터 GET 응답, 브라우저의 카드·작업 행·11월 21일 19:30 회차를 대조했다. | 예 | PASS |
| D04 | 이번 작업에 사용하지 않는 코드·설정·문서·의존성이 추가됨 | 저장소 변경은 평가 기록으로 제한한다. | 테스트 데이터 등록 스크립트·DB·서버 로그는 임시 로컬 폴더에 두고 이번 작업의 저장소 변경을 확인했다. | 예 | PASS |

PDF 지원서 업로드·추출은 이번 요청의 검증 범위에서 제외했다. 테스트 심사함에는 지원서 항목이 0건이다.

필수 PASS 4 / FAIL 0 / UNVERIFIED 0 / N/A 0. 발견 0 / 해결 0 / 미해결 0. P0 0 / P1 0 / P2 0 / P3 0. 미확인 0. 오탐 0. 발견 경로 PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0.

## dev PR 이관 검증

- 작업 ID `2026-11-17-producer-dashboard-dev-pr`
- 평가일 2026-11-17, Asia/Seoul. 최신 `origin/dev` 기반 별도 작업 트리와 독립 평가 1회.

| ID | 흐름과 실패 조건 | 기대 결과 | 검증 방법과 근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| R01 | 기존 작업 브랜치나 다른 로컬 변경이 PR에 섞임 | 최신 dev에서 공연사 대시보드, 사이드바, 관련 진입부와 검증만 이관한다. | 모바일 아이콘 PR #575가 병합된 상태와 새 브랜치 파일 목록을 확인했다. | 예 | PASS |
| R02 | 이관 중 기존 로그인 분리, 홈 이동 또는 접근 경계가 되돌아감 | 기존 공개·공연사 로그인 경로와 홈 이동을 유지하고 공연사 로그인 후 대시보드를 연다. | dev 기존 경로와 테스트 비교, PC 홈 버튼과 모바일 메뉴 로고 주소, 인증 대기·운영자 경로·기존 이탈 보호를 검토했다. | 예 | PASS |
| R03 | 기존 테스트나 빌드가 깨지거나 교체한 메뉴의 잔여 참조가 남음 | 전체 테스트, lint, 프로덕션 빌드 통과 및 교체된 메뉴 참조 없음. | `npm test` 217개 파일·1,183건, `npm run lint`, `npm run build -- --webpack`, `git diff --check` 통과. | 예 | PASS |

로그인 화면 분리는 dev의 #581을 이어받았다. 운영과 로컬의 정합성 확인 및 로컬 서버 실행 기록은 선행 검증 내역으로 보존하며 이 PR의 신규 문제 집계에 더하지 않는다.

필수 PASS 3 / FAIL 0 / UNVERIFIED 0 / N/A 0. 발견 0 / 해결 0 / 미해결 0. P0 0 / P1 0 / P2 0 / P3 0. 미확인 0. 오탐 0. 발견 경로 PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0.
