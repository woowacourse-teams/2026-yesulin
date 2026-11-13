# 일반 회원·기획사 로그인 진입 분리

- 작업 ID `2026-11-12-member-login-entry` / 평가표 v1 / PR #581
- `/login`에서 "이용 목적: 배우 / 기획사·제작사"를 고르던 방식을 없앤다. `/login`은 일반 회원의 소셜 로그인만, 기획사/제작사·운영자는 `/producer-service/login`의 이메일 로그인으로 진입 경로를 나눈다. 프로필·배우 페이지를 등록한 회원이 배우이며 별도 회원 유형은 없다. 같은 PR에서 좋아요 API 이름(`likes/me`, `me`)과 문구를 정리했다.
- `MemberType.APPLICANT` 이름 변경(두 서버 롤링 배포·세션 JSON 때문에 후순위)과 약관·개인정보 처리방침의 "배우 계정" 문구(정책 결정)는 하지 않았고 `docs/pending-decisions.md`에 올렸다.

| ID | 경계·실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| A01 | `/login` | 소셜 버튼만, 계정 유형 선택 없음, 기획사 이메일 로그인 링크 | 렌더 테스트·브라우저 MSW | Y | PASS |
| A02 | `/producer-service/login` | 기존 기획사 폼과 같은 검증·운영자 이동·오류·분석 | 원본 대조·렌더 테스트 | Y | PASS |
| A03 | 기획사 전용 화면의 로그인 링크·안내 문구 | 새 경로를 쓰고 사라진 "선택" 안내가 없음 | 전체 검색·테스트 | Y | PASS |
| A04 | 세션 만료 이동 | 기획사는 기획사 로그인, 그 밖은 `/login`, 로그인 화면에서는 이동 안 함 | 핸들러 테스트 | Y | PASS |
| A05 | 기존 링크·프록시·소셜 실패 리다이렉트 | 깨지지 않고 `/login/oauth2/**`와 충돌 없음 | 코드·설정 열람 | Y | PASS |
| A06 | 계정 구분 | 서버가 회원 유형으로 판정, 이메일 폼 오류가 계정 존재를 드러내지 않음 | 코드 열람 | Y | PASS |
| A07 | 분석 이벤트 | 새 화면에서 로그인 이벤트 경로 판별이 유지됨 | 코드 열람 | Y | UNVERIFIED |
| A08 | 좋아요 `likes/me`·`me` 정리 | 컨트롤러·서비스·프론트·MSW·문서 일치 | 테스트·전체 검색 | Y | PASS |
| A09 | 문서 정합·정책 | 구현과 문서 일치, 미결정은 pending에만, 약관 문구 미변경 | 코드 대조 | Y | PASS |
| A10 | 정리·코딩 규칙 | 삭제한 역할 선택 참조·미사용 코드·불필요한 주석 없음 | 독립 평가·eslint | Y | PASS |

## 평가·검증 결과

- 2026-11-12 독립 평가 1회 완료. 같은 종류의 별도 읽기 전용 에이전트로 수행했다.
- 평가 직후 필수 PASS 8 / FAIL 1(A03) / UNVERIFIED 1(A07). 수정 후 A03이 PASS가 되어 최종 PASS 9 / FAIL 0 / UNVERIFIED 1 / N/A 0.
- 신규 확정 발견 8 / 해결 7 / 미해결 1. P0 0 / P1 0 / P2 1 / P3 7. 오탐 0. 발견 경로는 INDEPENDENT_REVIEW 8.
- 프론트 `vitest` 전체 1129건 PASS, `eslint src` 무경고, `npm run build` PASS. 백엔드 `./gradlew test --tests 'art.yesulin.actor.*'`와 `npm run checkstyle` PASS. `tsc --noEmit`의 `original-screening.test.tsx` 오류 1건은 이번 변경과 무관한 기존 문제다.
- 브라우저 MSW: `/login`에 소셜 3버튼과 기획사 링크, 링크로 `/producer-service/login`의 이메일 폼 이동, 목 기획사 로그인 뒤 `/producers/audition-posts` 이동을 확인했다.
- 평가자가 확인한 것: 기획사 폼의 로직이 옛 `LoginForm`과 동일하다. 서버는 경로가 아니라 이메일로 회원을 찾고 회원 유형으로 응답한다. 소셜 회원·없는 이메일은 같은 오류 메시지다. `/login/oauth2/**` 프록시와 소셜 실패 리다이렉트는 그대로 유효하다.
- UNVERIFIED(A07): 기획사 로그인 화면의 `login_page_view`가 `unknown/account_access`에서 `producer/manage_production`으로 바뀌어 PostHog 분포 비교에 단절이 생길 수 있다. 의도된 변경이며 `frontend/docs/analytics.md`에 적었고 실제 지표 영향은 확인하지 않았다.
- 실제 백엔드를 띄운 로그인 확인은 하지 않았다. `trackLoginReturnIfPending`의 새 경로 제외는 별도 테스트를 추가하지 않았다.

## 문제 목록

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정(+09:00) / 최초 기록 PR | 해결 시각(+09:00) | 문제·근거 | 조치·상태·수정 후 검증 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-12-member-login-entry-F01 | P2·FLOW·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-12T17:50:00+09:00 / #581 | 2026-11-12T17:54:00+09:00 | 계정 유형 선택이 없어졌는데 가입 실패 화면과 PDF 재분석 화면이 "로그인 화면에서 기획사/제작사를 선택"하라고 안내했다. | 안내를 고치고 테스트 단언을 바꿨다. FIXED, 렌더 테스트 PASS. |
| 2026-11-12-member-login-entry-F02 | P3·DOC·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-12T17:50:00+09:00 / #581 | 2026-11-12T17:54:00+09:00 | MSW 시나리오 문서와 좋아요 평가 기록에 옛 표현(배우 계정, viewer)이 남았다. | 표현을 맞췄다. FIXED. |
| 2026-11-12-member-login-entry-F03 | P3·DOC·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-12T17:50:00+09:00 / #581 | 2026-11-12T17:54:00+09:00 | "로그인한 회원"이 실제 규칙(활성 일반 회원, 주인 제외)보다 넓게 쓰였고 MSW 403 메시지가 서버와 달랐다. | 주석을 "활성 일반 회원"으로, MSW 메시지를 맞췄다. FIXED. |
| 2026-11-12-member-login-entry-F04 | P3·FLOW·EXISTING | INDEPENDENT_REVIEW | 2026-11-12T17:50:00+09:00 / #581 | 2026-11-12T17:54:00+09:00 | PDF 재분석 화면의 "운영자 로그인" 링크가 로그인 없이는 404인 `/admin`이었다. | 공연사·운영자 로그인 링크 하나로 합쳤다. FIXED. |
| 2026-11-12-member-login-entry-F05 | P3·TEST·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-12T17:50:00+09:00 / #581 | 2026-11-12T17:55:00+09:00 | 새 분기(세션 만료 이동, `/login` 기획사 링크, 헤더의 기획사 서비스 로그인)에 테스트가 없었다. | 테스트 3개 파일을 추가했다. FIXED, PASS. 분석 이벤트 경로 제외 테스트는 남긴다. |
| 2026-11-12-member-login-entry-F06 | P3·DOC·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-12T17:50:00+09:00 / #581 | 2026-11-12T17:55:00+09:00 | 기획사 로그인 화면의 `login_page_view` 속성이 바뀌어 지표 분포에 단절이 생긴다. | 의도된 변경으로 `analytics.md`에 적었다. FIXED. |
| 2026-11-12-member-login-entry-F07 | P3·CODE·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-12T17:50:00+09:00 / #581 | 2026-11-12T17:55:00+09:00 | 이름으로 뜻이 전달되는 신규 JSDoc 4개. | 지웠다. FIXED. import 순서는 eslint 통과라 그대로 둔다. |
| 2026-11-12-member-login-entry-F08 | P3·FLOW·EXISTING | INDEPENDENT_REVIEW | 2026-11-12T17:50:00+09:00 / #581 | - | 기획사 폼이 서버 응답 역할이 PRODUCER·ADMIN이 아니어도(비밀번호가 있는 로컬 테스트 회원) 그대로 세션에 넣고 기획사 안내를 낸다. 옛 폼과 같은 동작이다. | OPEN, 운영에는 해당 계정이 없고 이번 범위 밖이라 별도 작업으로 둔다. |

## 상태 사건 이력(추가 전용)

| 사건 ID | 문제 ID | 종류 | 발생 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-12-member-login-entry-F01 | CONFIRMED | 2026-11-12T17:50:00+09:00 | 독립 평가, PR #581 |
| E02 | 2026-11-12-member-login-entry-F02 | CONFIRMED | 2026-11-12T17:50:00+09:00 | 독립 평가, PR #581 |
| E03 | 2026-11-12-member-login-entry-F03 | CONFIRMED | 2026-11-12T17:50:00+09:00 | 독립 평가, PR #581 |
| E04 | 2026-11-12-member-login-entry-F04 | CONFIRMED | 2026-11-12T17:50:00+09:00 | 독립 평가, PR #581 |
| E05 | 2026-11-12-member-login-entry-F05 | CONFIRMED | 2026-11-12T17:50:00+09:00 | 독립 평가, PR #581 |
| E06 | 2026-11-12-member-login-entry-F06 | CONFIRMED | 2026-11-12T17:50:00+09:00 | 독립 평가, PR #581 |
| E07 | 2026-11-12-member-login-entry-F07 | CONFIRMED | 2026-11-12T17:50:00+09:00 | 독립 평가, PR #581 |
| E08 | 2026-11-12-member-login-entry-F08 | CONFIRMED | 2026-11-12T17:50:00+09:00 | 독립 평가, PR #581 |
| E09 | 2026-11-12-member-login-entry-F01 | FIXED | 2026-11-12T17:54:00+09:00 | 안내 수정, vitest PASS |
| E10 | 2026-11-12-member-login-entry-F02 | FIXED | 2026-11-12T17:54:00+09:00 | 문서 표현 정리 |
| E11 | 2026-11-12-member-login-entry-F03 | FIXED | 2026-11-12T17:54:00+09:00 | 주석·MSW 메시지 정리 |
| E12 | 2026-11-12-member-login-entry-F04 | FIXED | 2026-11-12T17:54:00+09:00 | 링크 통합 |
| E13 | 2026-11-12-member-login-entry-F05 | FIXED | 2026-11-12T17:55:00+09:00 | 테스트 3개 파일 PASS |
| E14 | 2026-11-12-member-login-entry-F06 | FIXED | 2026-11-12T17:55:00+09:00 | analytics.md 갱신 |
| E15 | 2026-11-12-member-login-entry-F07 | FIXED | 2026-11-12T17:55:00+09:00 | 주석 삭제, eslint PASS |
