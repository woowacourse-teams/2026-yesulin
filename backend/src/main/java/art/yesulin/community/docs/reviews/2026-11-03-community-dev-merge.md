# 커뮤니티 dev 통합 평가

- 작업 ID: `2026-11-03-community-dev-merge`
- 평가표 버전: 1
- 기준 dev: `abc66cc6`
- 목적: 기존 커뮤니티 7개 커밋을 최신 dev에 통합하고 기존 팀원 변경을 보존한다.
- 범위: 익명 글·댓글 CRUD, 신고, 좋아요, 글별 익명 번호, 초안 보호, 공유 메뉴·설정 통합.
- 독립 평가: 진행 중. 외부 평가 CLI는 코드 전송에 대한 자동 승인 검토에서 거부되어 동일 환경의 별도 읽기 전용 에이전트로 대체했다.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| M01 | dev 변경 유실 | 인증·분석 Provider, 배우 메뉴, PDF·이벤트 설정 유지 | origin/dev 대비 공유 파일 diff | 예 | UNVERIFIED |
| M02 | DB 변경 순서 역전·기존 스키마 파괴 | 최신 dev 뒤에 커뮤니티 테이블 추가 | migration order/contract 검사·백엔드 build | 예 | UNVERIFIED |
| M03 | 익명 작성·소유 확인·중복·삭제·좋아요·번호 회귀 | 기존 동작과 거절·재시도 계약 유지 | 전체 backend test/build, frontend test | 예 | UNVERIFIED |
| M04 | 화면 통합·초안 보호 회귀 | 라우트·타입·기존 이동 보호 유지 | frontend lint/build, draft-history 테스트 | 예 | UNVERIFIED |
| M05 | 미사용 추가물·정본 불일치 | 추가 기능 참조와 문서 링크 정상 | 독립 diff·참조 검토 | 예 | UNVERIFIED |
| M06 | 실제 신고 수신·운영 DB | 외부 환경 연결 후 별도 확인 | 사용자가 Slack 연결을 연기했고 이번 작업은 코드 통합 | 아니오 | N/A |
| M07 | 부하·WAU 측정 | 후속 학습·관측에서 검증 | 이번 통합에서 새 성능·분석 기능을 추가하지 않음 | 아니오 | N/A |

## 문제와 상태 이력

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정(+09:00) | 최초 기록 PR | 상태·조치 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-03-community-dev-merge-F01 | P1 / CODE / INTRODUCED | PRECHECK | 2026-11-03T14:29:14+09:00 | PENDING | FIXED: 커뮤니티 migration 20261027120000이 기존 이벤트 migration과 중복되고 두 버전 모두 dev 최신 20261102130000보다 낮아 검사 실패. 미배포 파일 2개의 버전을 dev 뒤로 이동했다. order/contract 검사 통과. |

| 사건 ID | 문제 ID | 종류 | 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-03-community-dev-merge-F01 | CONFIRMED | 2026-11-03T14:29:14+09:00 | migration order 검사 실패; PENDING |
| E02 | 2026-11-03-community-dev-merge-F01 | FIXED | 2026-11-03T14:31:00+09:00 | 버전 20261103140000·20261103140100으로 변경; order/contract 검사 통과; PENDING |

실제 Slack 수신과 운영 MySQL 적용, 부하·활성 사용자 측정은 이번 검증 결과에 포함하지 않는다.

## 검증 진행

- 2026-11-03 Node 24: frontend 테스트 149파일·801개 통과, lint·production build 통과. 호스트 Node 26에서는 기존 배우 분석 테스트 6개가 jsdom localStorage 차이로 실패하여 저장소 지정 버전으로 재검증했다. 제품 코드 변경은 없다.
- backend 전체 test/build는 진행 중이다. 과거 XML 결과를 이번 통합 실행 결과로 재사용하지 않는다.
- migration order·contract 검사 통과. 기존 DB 파일과 config submodule은 변경하지 않았다.
