# 테스트 기준 정리 (스프린트 4)

작업 ID 2026-11-11-common-test-criteria · 공통 문서 / test-criteria-v1

스프린트 4 「테스트 기준 정리」 제출용으로 `docs/test-criteria.md`를 새로 쓰고 문서 라우터에 한 줄을 더했다. 코드는
바꾸지 않았다. 새 규칙을 만들지 않고 2026-11-11 `dev` 테스트 코드에 드러난 기준과 어긋난 곳을 옮겼다.
웹 프론트엔드는 이번 범위에서 뺐다.

| ID | 흐름 | 실패 경계 | 기대 결과 | 확인 방법 | 필수 |
| --- | --- | --- | --- | --- | --- |
| TC-01 | 요구사항 | 항목 누락 | 지키는 것·안 하는 것, 대상별 수준·의존 처리와 이유, 분야별 차이, 테스트 코드 링크가 모두 있다 | 문서 대조 | 예 |
| TC-02 | 사실 일치 | 숫자·테스트명·설정 과장 | 개수, 테스트·메서드 이름, 테스트 설정, Fake·목, CI·hook 설명이 코드와 같다 | find·grep·ci.yml·.husky | 예 |
| TC-03 | 링크 | 깨진 링크 | 상대 링크와 앵커가 모두 열린다 | 파일·제목 확인 | 예 |
| TC-04 | 정본 일치 | 규칙 충돌·새 규칙 | `backend/AGENTS.md` 검증 절, `backend/docs/architecture.md`와 어긋나지 않고 정본을 가리킨다 | 문서 대조 | 예 |
| TC-05 | 어긋난 곳 | 사실 왜곡 | H2·MySQL 차이, 10.28 1118 사건, Lambda CI 미포함이 근거와 같다 | domain-implementation·트러블슈팅 기록·git log | 예 |
| TC-06 | 정리 | 미사용·중복 문서 | 깨진 링크·중복 문서 없음, 라우터 행이 맞다 | 문서 검색 | 예 |
| TC-07 | 읽기 | 처음 보는 사람이 이해 못 함 | 쉬운 문장과 표 | 읽기 | 아니오 |

## 검증 근거

- 개수: `backend/src/test/java/art/yesulin` 기준. 테스트 파일 253개(도우미 10개 제외), dormant 74개,
  운영 기능 179개(domain 51 · application 79 · presentation 23 · infrastructure 17 · global 8 · 앱 기동 1).
  application 79개 중 `@SpringBootTest` 35개·`@DataJpaTest` 7개, 나머지 37개는 Spring 없음.
  Spring 테스트 80개 중 43개가 `spring.flyway.enabled=false`. dormant 제외 `*MigrationTest` 9개, 동시 요청 21개, 고정 Clock 24개.
- 설정: `backend/src/test/resources/application.properties`, `backend/build.gradle.kts` `tasks.withType<Test>`, `.github/workflows/ci.yml`, `.husky/*`.
- 전체 Gradle 테스트는 실행하지 않았다. 문서만 바꾼 작업이다.

## 독립 평가 1회

같은 종류의 별도 평가 에이전트(읽기 전용)가 diff와 위 평가표로 평가했다. 상대 도구를 이 환경에서 쓸 수 없어 대체했다.

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 결과 및 표적 검증 |
| --- | --- | --- | --- |
| 2026-11-11-common-test-criteria-F01 | P1 DOC INTRODUCED | INDEPENDENT_REVIEW | FIXED. application 테스트를 모두 `@SpringBootTest`+Flyway로, 리포지토리를 모킹하지 않는다고 적었다. 실제로는 37개가 목·Fake 단위 테스트이고 Spring 테스트 43개가 Flyway 없이 `create-drop`이다. 수준·의존 표를 실제대로 고치고 어긋난 곳에 추가했다. 개수를 다시 셌다. |
| 2026-11-11-common-test-criteria-F02 | P2 DOC INTRODUCED | INDEPENDENT_REVIEW | FIXED. presentation·infrastructure 테스트가 모두 규칙 전에 쓰였다고 적었다. 규칙(10.4 #247) 뒤 추가된 3개를 이름과 함께 적었다. |
| 2026-11-11-common-test-criteria-F03 | P2 DOC INTRODUCED | INDEPENDENT_REVIEW | FIXED. 배포가 PROD에서만 일어난다는 틀린 이유. DEV도 CodeDeploy를 쓴다. 실패 분기를 실제 서버에서 만들기 어렵다는 이유로 바꿨다. |
| 2026-11-11-common-test-criteria-F04 | P3 DOC INTRODUCED | INDEPENDENT_REVIEW | FIXED. Flyway 순서·계약 검사가 push에서도 돈다고 적었다. PR에서만 돈다고 고쳤다. |
| 2026-11-11-common-test-criteria-F05 | P3 DOC INTRODUCED | INDEPENDENT_REVIEW | FIXED. 커밋 hook이 Checkstyle만 돈다고 적었다. "hook에서는 테스트를 돌리지 않는다"로 고쳤다. |
| 2026-11-11-common-test-criteria-F06 | P3 DOC INTRODUCED | INDEPENDENT_REVIEW | FIXED. Clock 빈 교체로 일반화했다. 대부분 생성자 주입이라 "고정 Clock을 주입한다"로 고쳤다. |
| 2026-11-11-common-test-criteria-F07 | P3 POLICY INTRODUCED | INDEPENDENT_REVIEW | FIXED. dormant 새 테스트 금지를 규칙처럼 적었다. 정본에 없는 현재 관행이라고 표시했다. |
| 2026-11-11-common-test-criteria-F08 | P3 DOC INTRODUCED | INDEPENDENT_REVIEW | FIXED. 테스트 수가 기능 수로 읽혔다. "기능 테스트"로 고쳤다. |
| 2026-11-11-common-test-criteria-F09 | P3 DOC INTRODUCED | INDEPENDENT_REVIEW | FIXED. #412가 원인처럼 읽혔다. "#412에서 수정"으로 고쳤다. |
| 2026-11-11-common-test-criteria-F10 | P3 DOC INTRODUCED | INDEPENDENT_REVIEW | FIXED. 마이그레이션 테스트 수에 dormant 2개가 섞였다. 9개로 고쳤다. |

| 사건 ID | 문제 ID | 사건 | 발생 시각(KST, 분 단위) | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E01 | F01~F10 | CONFIRMED | 2026-11-11T17:10:00+09:00 | 독립 평가 | #578 |
| E02 | F01~F10 | FIXED | 2026-11-11T17:28:00+09:00 | 문서 수정, 개수 재집계, 링크 재확인 | #578 |

평가자가 UNVERIFIED로 둔 "팀 전원이 백엔드 크루" 문장은 저장소로 확인할 수 없어 지웠다.

## 판정

필수 PASS 6 / FAIL 0 / UNVERIFIED 0 / N/A 0 (수정 후). 발견 10 / 해결 10 / 미해결 0. P0 0 / P1 1 / P2 2 / P3 7.
PRECHECK 0 / INDEPENDENT_REVIEW 10 / POST_FIX_CHECK 0 / EXTERNAL 0 / 오탐 0.
2절 "일부러 하지 않는 이유"의 일부(요청 형식 테스트 수정 비용, E2E 유지 비용)는 규칙 문서에 이유가 없어 작성자가
정리한 근거다. 팀 검토가 필요하다.
