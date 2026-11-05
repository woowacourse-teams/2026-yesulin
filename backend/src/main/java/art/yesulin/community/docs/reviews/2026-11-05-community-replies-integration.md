# 2026-11-05-community-replies-integration · community · 평가표 v1

| 필수 항목 | 실패 조건과 검증 | 결과 |
| --- | --- | --- |
| M1 통합과 DB | 최신 dev 307cab6e가 조상인지, 신규 외래 키와 nullable 열이 기존 댓글과 호환되는지 확인 | PASS |
| M2 로컬 인증 격리 | 노출 경계 6개 테스트 및 Git 추적 파일 점검. 로컬 DB·비밀번호 파일 제외 | PASS |
| M3 글·대댓글·취소 | 역할·권한, 댓글 수와 재조회, 취소한 대상의 초안, 불필요한 파일 점검 | 최초 FAIL, 수정 후 PASS |

독립 평가 1회. 필수 PASS 3 / FAIL 0 / UNVERIFIED 0 / N/A 0. 발견 2 / 해결 2 / 미해결 0. P0 0 / P1 0 / P2 1 / P3 1. PRECHECK 0 / INDEPENDENT_REVIEW 2 / POST_FIX_CHECK 0 / EXTERNAL 0 / 오탐 0.

| 문제 ID | 심각도·유입·경로 | 최초 확정 → 해결 확인 (KST, 분 단위) | 근거·조치와 검증 |
| --- | --- | --- | --- |
| 2026-11-05-community-replies-integration-F01 | P3 접근성 INTRODUCED INDEPENDENT_REVIEW | 2026-11-05 15:42 → 15:42 | 체크박스의 설명 속성에 lint 경고. 고유 ID의 안내문을 aria-describedby로 연결. 대상 lint 및 상태 테스트 통과. |
| 2026-11-05-community-replies-integration-F02 | P2 FLOW INTRODUCED INDEPENDENT_REVIEW | 2026-11-05 15:43 → 15:43 | 명시적으로 취소한 대댓글 초안이 복원됨. 입력 폐기 확인 후 현재 회원·대상의 초안만 정리. 실제 브라우저에서 거절 시 본문 유지, 확인 후 재선택 시 빈 입력, 재작성·저장·새로고침 확인. |

각 행의 최초 확정과 해결 확인을 CONFIRMED → FIXED 이력으로 기록한다. 최초 기록 PR #530. 백엔드 커뮤니티 테스트 35개·Checkstyle, 프론트 관련 테스트 66개, Flyway 순서 및 호환성 검사 통과. 실제 외부 로그인과 공유 DB 적용은 이 로컬 평가 범위 밖이다.
