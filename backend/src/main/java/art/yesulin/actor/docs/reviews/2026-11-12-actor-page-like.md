# 배우 페이지 좋아요

- 작업 ID `2026-11-12-actor-page-like` / 평가표 v1 / PR #581
- 로그인한 활성 배우 계정이 다른 배우의 공개 페이지에 좋아요를 누르고 취소한다. 한 계정이 한 페이지에 한 번, 내 페이지에는 불가이며 수만 공개한다. `actor`의 `cheer` 하위 패키지로 묶는다.

| ID | 경계·실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| L01 | 같은 좋아요·취소 반복 | 결과가 같고 수가 맞음 | 서비스 테스트 | Y | PASS |
| L02 | 내 페이지 | 도메인이 거절(`ACTOR_PAGE_SELF_LIKE`) | 도메인·서비스 테스트 | Y | PASS |
| L03 | 비공개·잠금·없는 페이지 | 조회·누르기·취소 모두 같은 404 | 서비스 테스트·코드 | Y | PASS |
| L04 | 비로그인·공연사·대기 계정·배우·주인 | viewer 상태가 api.md와 같음 | 서비스 테스트 | Y | PASS |
| L05 | 권한·CSRF·캐시 | 쓰기는 활성 배우, 조회는 선택 로그인, 응답 no-store | 코드 열람 | Y | PASS |
| L06 | 같은 회원의 동시 요청 | 회원 행 잠금으로 직렬화, 하나만 남음 | 동시성 테스트 2건 | Y | PASS |
| L07 | 개인정보 | 응답·로그에 누른 회원 정보 없음 | 코드 열람 | Y | PASS |
| L08 | 마이그레이션·엔티티 | 컬럼·제약 일치, 버전 충돌 없음 | H2 validate 테스트 | Y | PASS |
| L09 | 프론트 버튼 상태 | 로그인 링크·토글·읽기 전용·실패 시 상태 유지 | 렌더 테스트·브라우저 MSW | Y | PASS |
| L10 | 문서 정합 | domain.md·api.md·정책 문서가 구현과 일치 | 코드 대조 | Y | PASS |
| L11 | 정리·코딩 규칙 | 미사용·규칙 위반 없음 | 독립 평가·Checkstyle | Y | PASS |

## 평가·검증 결과

- 2026-11-12 독립 평가 1회 완료. 같은 종류의 별도 읽기 전용 에이전트로 수행했다.
- 평가 직후 필수 PASS 9 / FAIL 1(L11) / UNVERIFIED 1(L06). 수정 후 표적 검증으로 두 항목이 PASS가 되어 최종 PASS 11 / FAIL 0 / UNVERIFIED 0 / N/A 0.
- 신규 확정 발견 4 / 해결 4 / 미해결 0. P0 0 / P1 0 / P2 1 / P3 3. 오탐 0. 발견 경로는 INDEPENDENT_REVIEW 4.
- `./gradlew test --tests 'art.yesulin.actor.*'` PASS(좋아요 서비스 5건, 도메인 3건, 동시성 2건 포함), `npm run checkstyle` PASS.
- 프론트 `vitest src/components/actor-pages src/mocks/actor-page-like-handlers.test.ts` 34건 PASS, 변경 파일 eslint PASS. `tsc --noEmit`의 `original-screening.test.tsx` 오류 1건은 이번 변경과 무관한 기존 문제다.
- 브라우저 MSW: 비로그인 `/actors/@min.zzun_`에서 로그인 링크, 목 로그인 후 같은 페이지로 복귀, 좋아요(9→10)와 취소(10→9), 375px에서 가로 넘침 없음을 확인했다.
- 로그인 잠금 대기 초과(`PessimisticLockingFailureException`)가 500으로 나가는 경로는 기존 관심 배우와 같은 구조(EXISTING)라 이번 문제로 세지 않는다.
- 실제 백엔드를 띄운 HTTP 확인과 MySQL 실행은 하지 않았다(로컬 DB 미기동). 마이그레이션 문법은 기존 관심 배우 테이블과 같다.

## 문제 목록

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정(+09:00) / 최초 기록 PR | 해결 시각(+09:00) | 문제·근거 | 조치·상태·수정 후 검증 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-12-actor-page-like-F01 | P2·TEST·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-12T17:20:00+09:00 / #581 | 2026-11-12T17:23:00+09:00 | 문서가 동시 요청에도 하나만 남는다고 쓰는데 이를 검증하는 동시성 테스트가 없었다. | 같은 좋아요 반복과 좋아요 뒤 취소를 잠금 상태에서 겹치는 테스트 2건을 추가했다. FIXED, PASS. |
| 2026-11-12-actor-page-like-F02 | P3·POLICY·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-12T17:20:00+09:00 / #581 | 2026-11-12T17:23:00+09:00 | 정책 문서가 아직 없는 응원 글·답글의 엔티티 이름과 작성 주체를 규칙처럼 적었다. | 좋아요 범위만 남기고 지웠다. FIXED, 링크·표현 확인. |
| 2026-11-12-actor-page-like-F03 | P3·CODE·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-12T17:20:00+09:00 / #581 | 2026-11-12T17:23:00+09:00 | `aria-label`이 보이는 좋아요 수를 덮어 스크린리더가 수를 알 수 없었다. | 두 `aria-label`에 수를 넣고 렌더 테스트에 단언을 더했다. FIXED, PASS. |
| 2026-11-12-actor-page-like-F04 | P3·CODE·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-12T17:20:00+09:00 / #581 | 2026-11-12T17:23:00+09:00 | `Viewer.anonymous()`가 접근 제어자 없이 package-private이었다. | `public static`으로 명시했다. FIXED, Checkstyle·테스트 PASS. |

## 상태 사건 이력(추가 전용)

| 사건 ID | 문제 ID | 종류 | 발생 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-12-actor-page-like-F01 | CONFIRMED | 2026-11-12T17:20:00+09:00 | 독립 평가, PR #581 |
| E02 | 2026-11-12-actor-page-like-F02 | CONFIRMED | 2026-11-12T17:20:00+09:00 | 독립 평가, PR #581 |
| E03 | 2026-11-12-actor-page-like-F03 | CONFIRMED | 2026-11-12T17:20:00+09:00 | 독립 평가, PR #581 |
| E04 | 2026-11-12-actor-page-like-F04 | CONFIRMED | 2026-11-12T17:20:00+09:00 | 독립 평가, PR #581 |
| E05 | 2026-11-12-actor-page-like-F01 | FIXED | 2026-11-12T17:23:00+09:00 | 동시성 테스트 2건 PASS |
| E06 | 2026-11-12-actor-page-like-F02 | FIXED | 2026-11-12T17:23:00+09:00 | 정책 문서 정리 |
| E07 | 2026-11-12-actor-page-like-F03 | FIXED | 2026-11-12T17:23:00+09:00 | vitest PASS |
| E08 | 2026-11-12-actor-page-like-F04 | FIXED | 2026-11-12T17:23:00+09:00 | Checkstyle PASS |

## 최초 PR 게시 연결

- 2026-11-12T17:40:00+09:00: 이 작업 기록과 문제 ID·추가 전용 사건 이력을 최초 게시 PR [#581](https://github.com/woowacourse-teams/2026-yesulin/pull/581)에 연결했다. 위 표의 `PR PENDING`은 게시 전 당시 표기이며 최초 확정·해결 시각을 바꾸지 않는다. 이 기록 문제의 최초 기록 PR은 #581이다.
