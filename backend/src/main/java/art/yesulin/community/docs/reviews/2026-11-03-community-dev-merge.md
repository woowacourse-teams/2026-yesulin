# 커뮤니티 dev 통합 평가

- 작업 ID: `2026-11-03-community-dev-merge`
- 평가표 버전: 1
- 기준 dev: `abc66cc6`
- 목적: 기존 커뮤니티 7개 커밋을 최신 dev에 통합하고 기존 팀원 변경을 보존한다.
- 범위: 익명 글·댓글 CRUD, 신고, 좋아요, 글별 익명 번호, 초안 보호, 공유 메뉴·설정 통합.
- 독립 평가: 1회 완료, 추가 확정 결함 0건. 외부 평가 CLI는 코드 전송에 대한 자동 승인 검토에서 거부되어 동일 환경의 별도 읽기 전용 에이전트로 대체했다.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| M01 | dev 변경 유실 | 인증·분석 Provider, 배우 메뉴, PDF·이벤트 설정 유지 | origin/dev 대비 공유 파일 diff | 예 | PASS |
| M02 | DB 변경 순서 역전·기존 스키마 파괴 | 최신 dev 뒤에 커뮤니티 테이블 추가 | migration order/contract 검사·백엔드 build | 예 | PASS |
| M03 | 익명 작성·소유 확인·중복·삭제·좋아요·번호 회귀 | 기존 동작과 거절·재시도 계약 유지 | 전체 backend test/build, frontend test | 예 | PASS |
| M04 | 화면 통합·초안 보호 회귀 | 라우트·타입·기존 이동 보호 유지 | frontend lint/build, draft-history 테스트 | 예 | PASS |
| M05 | 미사용 추가물·정본 불일치 | 추가 기능 참조와 문서 링크 정상 | 독립 diff·참조 검토 | 예 | PASS |
| M06 | 실제 신고 수신·운영 DB | 외부 환경 연결 후 별도 확인 | 사용자가 Slack 연결을 연기했고 이번 작업은 코드 통합 | 아니오 | N/A |
| M07 | 부하·WAU 측정 | 후속 학습·관측에서 검증 | 이번 통합에서 새 성능·분석 기능을 추가하지 않음 | 아니오 | N/A |

## 문제와 상태 이력

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정(+09:00) | 최초 기록 PR | 상태·조치 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-03-community-dev-merge-F01 | P1 / CODE / INTRODUCED | PRECHECK | 2026-11-03T14:29:14+09:00 | #495 | FIXED: 커뮤니티 migration 20261027120000이 기존 이벤트 migration과 중복되고 두 버전 모두 dev 최신 20261102130000보다 낮아 검사 실패. 미배포 파일 2개의 버전을 dev 뒤로 이동했다. order/contract 검사 통과. |
| 2026-11-03-community-dev-merge-F02 | P2 / CODE / EXISTING | EXTERNAL | 2026-11-03T14:39:16+09:00 | #495 | OPEN: 익명 작성물 관리 키의 localStorage 보관. CodeQL high 경고를 해제하지 않고 후속 보강 과제로 유지한다. |

| 사건 ID | 문제 ID | 종류 | 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-03-community-dev-merge-F01 | CONFIRMED | 2026-11-03T14:29:14+09:00 | migration order 검사 실패; #495 |
| E02 | 2026-11-03-community-dev-merge-F01 | FIXED | 2026-11-03T14:31:00+09:00 | 버전 20261103140000·20261103140100으로 변경; order/contract 검사 통과; #495 |
| E03 | 2026-11-03-community-dev-merge-F02 | CONFIRMED | 2026-11-03T14:39:16+09:00 | GitHub CodeQL check-run 125747300927; #495 |

실제 Slack 수신과 운영 MySQL 적용, 부하·활성 사용자 측정은 이번 검증 결과에 포함하지 않는다.

## 최종 검증

- 2026-11-03 Node 24: frontend 테스트 149파일·801개 통과, lint·production build 통과. 호스트 Node 26에서는 기존 배우 분석 테스트 6개가 jsdom localStorage 차이로 실패하여 저장소 지정 버전으로 재검증했다. 제품 코드 변경은 없다.
- backend `./gradlew test build`: BUILD SUCCESSFUL (2m 48s). 새 XML 244개에 테스트 1,460개, 실패·오류 0, 기존 제외 2. 커뮤니티 4개 클래스 20개 테스트는 2026-11-03T05:31:31~33Z 실행 결과다.
- migration order·contract 검사 통과. 기존 DB 파일과 config submodule은 변경하지 않았다.

## 독립 평가와 집계

- 평가자: 동일 환경의 별도 읽기 전용 에이전트. 외부 CLI 대체 사유는 위에 기록했다.
- M01: 공유 파일 diff로 인증·분석 Provider, 배우 메뉴, PDF passthrough와 PDF·이벤트 설정 보존 확인.
- M02·M03: 독립 평가 당시 백엔드 실행 중으로 UNVERIFIED였으며, 이후 이번 전체 test/build 종료와 새 XML 확인으로 PASS 갱신. 추가 전체 평가는 시행하지 않았다.
- M04: Node 24 전체 프론트 테스트·lint·빌드와 draft-history 테스트 통과.
- M05: 라우트·컴포넌트·서비스·저장소·알림 DI·설정 참조 및 변경 Markdown의 로컬 링크 검토. 미사용 추가물과 깨진 링크 없음.
- 필수 PASS 5 / FAIL 0 / UNVERIFIED 0 / N/A 0; 비필수 N/A 2. 검증률 5/5는 이 통합 범위의 검증률이다.
- 신규 발견 2 / 해결 1 / 미해결 1; P0 0 / P1 1 / P2 1 / P3 0; PRECHECK 1 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 1; 오탐 0.
- 최초 기록 PR: [#495](https://github.com/woowacourse-teams/2026-yesulin/pull/495). GitHub 필수 CI는 PR에서 별도로 확인한다.

## 외부 분석 표적 검토

- CodeQL은 `frontend/src/features/community/identity.ts:19`의 원문 키 저장에 high 경고를 냈다. 오탐으로 해제하지 않았다.
- 키는 로그인 정보가 아니지만 해당 브라우저의 글·댓글 수정·삭제 권한이다. 같은 출처의 XSS·신뢰하지 못할 스크립트가 탈취하면 다른 브라우저에서도 재사용할 수 있다. 서버의 해시 보관과 난수 길이는 이 위험을 제거하지 않는다.
- 별도 평가자의 표적 검토에서 본문은 일반 텍스트 출력이고 실행 가능한 XSS·직접 노출 경로는 확인되지 않았다. 즉시 차단 결함의 증거는 없어 P2 OPEN으로 분류했다. 이는 위험 제거 또는 사용자의 위험 승인을 뜻하지 않는다.
- 후속 조치는 서버 발급 HttpOnly·Secure·SameSite 쿠키와 기존 CSRF 검증 유지, 기존 작성물 관리 권한 이전이다. 경고를 피하기 위한 변수명 변경·클라이언트 해시 처리는 하지 않았다.
- dev의 필수 검사는 Backend·Frontend이며 CodeQL은 별도 검사다. 필수 게이트를 변경하거나 우회하지 않는다.
