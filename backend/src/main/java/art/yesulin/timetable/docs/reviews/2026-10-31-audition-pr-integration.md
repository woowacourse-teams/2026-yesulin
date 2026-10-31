# 오디션 관리 dev PR 통합

작업 ID: 2026-10-31-audition-pr-integration. 평가일 2026-10-31, Audit/Timetable v1.
기존 feat/audition-management 작업을 dev 대상 PR로 게시한다. 제품 기능 확대 없이 회귀 오류와 평가 기록 정합성을 정리한다.

| ID | 기대 결과 / 실패 경계 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| P1 | 심사·연락처·일정 전체 프론트 회귀 및 빌드 | Vitest/lint/build | Y | PASS |
| P2 | 신규 migration과 익명/소유 일정 백엔드 회귀 | Gradle test/build/checkstyle | Y | PASS |
| P3 | 최신 dev 통합·관련 변경만 커밋 | fetch/rebase/diff/secret·미사용 점검 | Y | PASS |
| P4 | 독립 평가1회·기존 문제 상태/이력 보존 | 읽기 전용 평가·후속 정정 기록 | Y | PASS |
| P5 | dev PR·이슈·검증/문제 집계 게시 | 원격 PR 확인 | Y | UNVERIFIED |

기존 2026-10-31-audition-regression-F01(H2 migration) 해결 대상. F02(평가 ID 충돌)는 과거 이력을 추정 복원하지 않고 명시적 정정/별도 식별로 정리한다. 관련 외부 가이드 최종본만 포함하고 tmp 캡처·다른 작업의 output은 제외한다. 운영 배포/실데이터/300건 부하/문자 발송은 실행하지 않는다.

## 실행 결과

- 프론트 `npm test`: 136파일 745테스트 PASS, lint 종료0. `/private/tmp/yesulin-pr-frontend-tests.log`, `/private/tmp/yesulin-pr-frontend-lint.log`.
- 프론트 dev 통합 후 `npm run build`: 종료0, 타입·정적 생성 완료. `/private/tmp/yesulin-pr-frontend-build.log`.
- 백엔드 `./gradlew build`: 233클래스 1404테스트(실패/오류/건너뜀0), Checkstyle 및 패키징 PASS. `/private/tmp/yesulin-pr-backend-build.log`.
- dev 통합: origin/dev `252415ee`. 이미 squash 병합된 명함 사진 수정 두 커밋은 변경 파일 전체를 대조해 dev와 동일함을 확인 후 중복 제외. config는 dev의 기존 핀을 사용하며 이번 PR에서 변경하지 않음.
- 관련74파일만 최초 커밋. 최종21쪽 PDF 포함, tmp 캡처와 무관한 output·개인 설정·실제 지원자 자료 제외. 원본 사용자 PDF와 evidence.md 미수정.
- 독립 평가1회 완료. 상대 도구 미제공으로 기존 별도 평가자에게 읽기 전용 위임. 소유권·부모행 잠금·300명 상한·합격 재확인·일괄 원자성·익명 API 분리·초안 보존·401 개인정보 제거·신규 소비 경로 대조, 신규 결함0. 검토 시 실행 대기였던 전체 검증은 위 실제 결과로 후속 확인.
- 기존 regression-F01 해결은 기존 ID에 FIXED 사건 추가. 기존 regression-F02는 재점검 식별자를 정정했지만 이전 원본 이력은 추정하지 않아 OPEN. UX 알림/저장 맥락 두 문제는 새 발견이 아닌 ID 정정 후 FIXED 기록.
- 신규 발견0 / 해결0 / 미해결0, P0~P3각0, PRECHECK/INDEPENDENT_REVIEW/POST_FIX_CHECK/EXTERNAL각0, 오탐0. 기존 문제 해결1(H2), UX2개는 이전 시각 변경 작업에서 해결된 근거를 현재 재확인한 기록이다.
- 운영 MySQL 적용·실데이터·배포·실제 문자/메일·300건 부하 미검증. 소유 일정은 확정/배우 공개/발송을 연결하지 않음. 로컬 합성 DB는 앞선 미커밋 migration checksum과 달라 다음 재기동 전 별도 로컬 정리가 필요할 수 있고, 실제 DB의 Flyway 이력을 임의로 고치지 않았다.
