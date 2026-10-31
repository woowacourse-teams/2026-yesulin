# 오디션 관리 dev PR 통합

작업 ID: 2026-10-31-audition-pr-integration. 평가일 2026-10-31, Audit/Timetable v1.
기존 feat/audition-management 작업을 dev 대상 PR로 게시한다. 제품 기능 확대 없이 회귀 오류와 평가 기록 정합성을 정리한다.

| ID | 기대 결과 / 실패 경계 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| P1 | 심사·연락처·일정 전체 프론트 회귀 및 빌드 | Vitest/lint/build | Y | UNVERIFIED |
| P2 | 신규 migration과 익명/소유 일정 백엔드 회귀 | Gradle test/build/checkstyle | Y | UNVERIFIED |
| P3 | 최신 dev 통합·관련 변경만 커밋 | fetch/rebase/diff/secret·미사용 점검 | Y | UNVERIFIED |
| P4 | 독립 평가1회·기존 문제 상태/이력 보존 | 읽기 전용 평가·후속 정정 기록 | Y | UNVERIFIED |
| P5 | dev PR·이슈·검증/문제 집계 게시 | 원격 PR 확인 | Y | UNVERIFIED |

기존 2026-10-31-audition-regression-F01(H2 migration) 해결 대상. F02(평가 ID 충돌)는 과거 이력을 추정 복원하지 않고 명시적 정정/별도 식별로 정리한다. 관련 외부 가이드 최종본만 포함하고 tmp 캡처·다른 작업의 output은 제외한다. 운영 배포/실데이터/300건 부하/문자 발송은 실행하지 않는다.
