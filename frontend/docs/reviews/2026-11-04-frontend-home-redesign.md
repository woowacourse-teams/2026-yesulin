# 홈 개편 병합 전 평가

- 작업 ID: `2026-11-04-frontend-home-redesign`
- 평가일: 2026-11-04, Asia/Seoul
- 대상: PR #510, 기준 `origin/dev` 873fdbbc, 최초 평가 HEAD 803429c1
- 독립 평가: 1회 완료. 최초 구현과 다른 도구의 평가자가 읽기 전용 검토 후 F04를 재현했다.
  내부 도구 선택: 최초 구현 Claude, 평가 Codex. 평가자가 수행한 F04 수정은 표적 검증하며 재귀 평가는 하지 않는다.
- 기준: 최상위 AGENTS → frontend/AGENTS → frontend/docs/README → frontend/docs/AGENTS,
  architecture.md의 홈·배너·목록 흐름, design-system.md의 반응형·접근성, analytics.md와 대시보드 집계.
- 판정: 조건부. 미해결 P0/P1 없음. 화면 전환의 시각 검증과 실제 휴대폰 확인은 미확인으로 유지한다.
- 기존 미추적 실험 파일은 수정·검증 대상에서 제외했다. 추적 파일만 임시 디렉터리에 복사해 검증했다.

## 평가표 home-v1

코드 검토 시작 시 홈의 조회 → 표시 → 이동 → 복구와 배지 저장 경계로 항목을 정했다.

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 방법·근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| H01 | 서버 최초 조회 / 클라이언트 참조가 개수로 전송됨 | size=48, size=12 숫자 요청 | 실제 Next 빌드 서버를 로컬 API와 연결해 수정 전 잘못된 size 재현, 수정 후 같은 요청 표적 확인 | 예 | PASS |
| H02 | 최신·마감·인기 줄과 기존 주소 | 조회 조건·목록 이동 유지, 로딩·오류/재시도·빈 상태 분리 | page.test, audition-post-home.test 및 HomePostRows 상태·순위 코드 확인 | 예 | PASS |
| H03 | 첫 방문·재방문·분야 확인·저장소 차단 | 첫 방문 0, 이후 새 게시만 집계, 분야별 기록 갱신 | category-seen.test, category-shortcuts.test와 목록 effect 확인 | 예 | PASS |
| H04 | 배너 버튼·키보드·드래그·중복 입력·동작 감소 | 올바른 방향 이동, 잘못된 링크 열림 방지, 전환 잠금 복구 | audition-alert-banner.test와 home-banners.test, CSS·reducer 확인 | 예 | PASS |
| H05 | 데스크톱 배너 전환 도중의 시각 연속성 | 가운데 배너와 양옆 그림이 자연스럽게 이어짐 | 계산식·애니메이션 코드만 확인. 실제 움직이는 화면 미확인 | 예 | UNVERIFIED |
| H06 | 1440/375px 레이아웃 | 포스터 줄·화살표·분야 배지 겹침/가로 넘침 없음 | 기존 작성자의 확인 기록은 있으나 이번 평가에서 화면 직접 실행 안 함 | 예 | UNVERIFIED |
| H07 | 실제 휴대폰 자동 재생 | 보이는 동안만 순차 재생, 체감 확인 | 가시성·동작 감소 단위 테스트 통과, 실제 기기 미실행 | 예 | UNVERIFIED |
| H08 | 무료 공연 정상·빈·실패/재시도 | 공연 렌더링, 실패와 빈 상태 구분 | notebook-home-sections.test 및 showFallback 코드 | 예 | PASS |
| H09 | 분석 성공 지점·분모·동의·환경·중복 | 상세/첨부/예매 기존 의미 유지, 거부·내부 제외 유지 | analytics.md·dashboards.mjs, 상세 링크 경로 확인. consent/events/product-analytics/acquisition 테스트 | 예 | PASS |
| H10 | 미사용 파일·코드·설정·의존성·옛 문서 | 새 홈 코드·자산 참조, 기존 자산 소비자 보존 | 신규 홈 컴포넌트·CSS·로고 참조 검색, 아이콘 파일 규약, 의존성 변경 없음. 문서 진입 누락 보완 | 예 | PASS |
| H11 | 계정 권한·수동 편집 보호 | 권한·편집 계약 변경 없음 | 공개 홈 읽기·브라우저별 배지만 변경, 인증/API/DB 계약 변경 없음 | 아니오 | N/A |

필수 PASS 7 / FAIL 0 / UNVERIFIED 3 / N/A 1. 검증률 70%(7/10), 품질 확률이 아니다.

## 확정 문제와 조치

F01~F03은 기존 PR 본문의 기록을 그대로 이관한다. 정확한 최초 시각·해결 시각이 없어 추정하지 않는다.

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정 / 최초 PR | 해결 시각 | 근거·조치·상태 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-04-frontend-home-redesign-F01 | P2·CODE·INTRODUCED | EXTERNAL | 2026-11-04 시각 미기록 / #510 | 시각 미기록, 커밋 803429c1 | 배너 옆 미리보기 끊김. 이동 폭+20px와 fade 적용. 기존 FIXED 기록 유지, 시각 결과는 H05 미확인 |
| 2026-11-04-frontend-home-redesign-F02 | P3·CODE·INTRODUCED | PRECHECK | 2026-11-04 시각 미기록 / #510 | 시각 미기록, 커밋 f4add0e5 | 공연 fallback이 항상 요소여서 목록 미표시. 함수가 정상 상태에 undefined 반환하도록 수정. FIXED, 공연 테스트 통과 |
| 2026-11-04-frontend-home-redesign-F03 | P3·CODE·INTRODUCED | PRECHECK | 2026-11-04 시각 미기록 / #510 | 시각 미기록, 커밋 6db60625 | 모바일 카드 폭 패딩 중복 차감. 계산식 수정. FIXED, 기존 375px 확인 기록, 이번 시각 검증은 H06 미확인 |
| 2026-11-04-frontend-home-redesign-F04 | P2·CODE·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-04T17:04:50+09:00 / #510 | 2026-11-04T17:05:11+09:00 | page.tsx가 use client 모듈의 상수를 가져와 size에 함수 문자열을 전송. 실제 빌드 요청으로 재현. 상수를 features/audition-posts/home-query.ts로 이동. FIXED, 수정 후 빌드·실제 요청·회귀 테스트 확인 |
| 2026-11-04-frontend-home-redesign-F05 | P3·UNUSED·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-04T17:09:56+09:00 / #510 | 2026-11-04T17:09:56+09:00 | 홈 공연이 PosterRow로 바뀐 뒤 notebook-show-grid CSS 소비자가 없음. 추적 소스 전체 검색 후 옛 선택자 제거. FIXED, 참조 0건과 최종 빌드 확인 |
| 2026-11-04-frontend-home-redesign-F06 | P3·DOC·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-04T17:09:56+09:00 / #510 | 2026-11-04T17:09:56+09:00 | design-system.md에 1080px 상세 폭과 옛 홈 분야 탭 설명이 남음. notebook-container의 1200px 및 별도 바로가기·줄별 링크와 일치하도록 수정. FIXED, 컴포넌트·CSS 대조 |


F04 최초 시각은 재현 실행 로그의 생성 시각, 해결 시각은 수정 직후 확인 시각 기준이다. F05/F06은 정리 결과를 확정·기록한 시각이며 최초 관찰의 초 단위 시각은 따로 보존하지 못했다. 수정 후 검증 결과는 아래에 별도로 기록한다.

## 검증 근거

- 최초 HEAD: 관련 11개 파일 61개 테스트 통과.
- 수정 전 실제 빌드: 홈 HTTP 200이지만 공고 API 두 요청의 size가 `function(){throw Error(...)}` 문자열이었다.
  공개 API의 숫자 인자 계약에 맞지 않아 서버 조회가 실패하고 브라우저 재조회에 의존하게 된다.
- 수정 범위: 서버·클라이언트 공용 숫자 상수의 위치만 변경했다. 공개 API·조회수·분모는 변경하지 않았다.
- 수정 후: 아래 후속 검증 기록을 따른다.
- 추가 전용 사건 이력의 과거 시각 누락은 유지하며 이번 기록 생성 시각으로 대체하지 않는다.

## 집계

발견 6 / 해결 6 / 미해결 0, P0 0 / P1 0 / P2 2 / P3 4.
PRECHECK 2 / INDEPENDENT_REVIEW 3 / POST_FIX_CHECK 0 / EXTERNAL 1. 오탐 0, 미확인 3.

## 추가 전용 상태 사건 이력

| 사건 ID | 문제 ID | 사건 | 발생 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-04-frontend-home-redesign-F01 | CONFIRMED | 2026-11-04 시각 미기록 | 기존 #510 본문 이관 |
| E02 | 2026-11-04-frontend-home-redesign-F01 | FIXED | 시각 미기록 | 803429c1, H05 시각 검증 별도, #510 |
| E03 | 2026-11-04-frontend-home-redesign-F02 | CONFIRMED | 2026-11-04 시각 미기록 | 기존 #510 본문 이관 |
| E04 | 2026-11-04-frontend-home-redesign-F02 | FIXED | 시각 미기록 | f4add0e5, 공연 테스트, #510 |
| E05 | 2026-11-04-frontend-home-redesign-F03 | CONFIRMED | 2026-11-04 시각 미기록 | 기존 #510 본문 이관 |
| E06 | 2026-11-04-frontend-home-redesign-F03 | FIXED | 시각 미기록 | 6db60625, 기존 375px 기록, #510 |
| E07 | 2026-11-04-frontend-home-redesign-F04 | CONFIRMED | 2026-11-04T17:04:50+09:00 | 실제 빌드 서버 API 요청 재현, #510 |
| E08 | 2026-11-04-frontend-home-redesign-F04 | FIXED | 2026-11-04T17:05:11+09:00 | 공용 모듈로 상수 이동, #510 |
| E09 | 2026-11-04-frontend-home-redesign-F05 | CONFIRMED | 2026-11-04T17:09:56+09:00 | 옛 공연 그리드 소비자 0건, #510 |
| E10 | 2026-11-04-frontend-home-redesign-F05 | FIXED | 2026-11-04T17:09:56+09:00 | CSS 선택자 제거, #510 |
| E11 | 2026-11-04-frontend-home-redesign-F06 | CONFIRMED | 2026-11-04T17:09:56+09:00 | 문서와 코드 대조, #510 |
| E12 | 2026-11-04-frontend-home-redesign-F06 | FIXED | 2026-11-04T17:09:56+09:00 | design-system.md 갱신, #510 |

## 남은 범위

H05~H07은 출시 전 화면·실기기 후속 확인이 필요하다. 이벤트 배너가 추가된 조합도 실제 화면에서 확인하지 않았다.
많이 본 공고는 최신 48개 안의 공개 조회수 순위다. 전체 검색은 #507 범위다.
오픈채팅 이미지 안의 이전 로고와 개발 데이터의 부하 테스트 공고는 기존 공개 범위로 유지한다.

## 수정 후 최종 검증

- 추적 파일만 분리한 임시 작업 폴더에서 `npm run lint` 통과, 관련 11개 파일 61개 테스트 통과.
- 최종 CSS 정리를 포함한 `npm run build` 통과(Next 16.2.12, 기본 Turbopack, 타입 검사·정적 페이지 생성 완료).
- 최종 빌드 서버 홈 HTTP 200, 실제 API 요청의 `size=48` 및 `size=12&sort=deadline` 확인.
  로컬 API가 숫자 이외의 size는 400으로 거절하도록 두고 기대 경로 두 개와 정확히 비교했다.
- `git diff --check` 통과. 옛 `notebook-show-grid` 추적 참조 0건.
- 임시 검증 첫 시도의 의존성 symlink 경로 제한은 의존성을 복제해 해결했고 최종 빌드 설정은 원본 그대로다.
- 기존 전체 테스트의 배우 페이지 6건 실패는 이번에 전체 실행·기준 브랜치 재현을 하지 않았다. 기존 PR 작성자의 검증 기록으로만 유지한다.
