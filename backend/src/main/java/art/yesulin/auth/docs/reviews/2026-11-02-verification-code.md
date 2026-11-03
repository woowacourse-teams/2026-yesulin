# 2026-11-02 6자리 인증 전환 평가

- 작업 ID: `2026-11-02-auth-verification-code`
- 평가일: 2026-11-02 (Asia/Seoul), 평가표 v1. 최초 복구 평가 이후 사용자가 승인한 추가 범위다.
- 독립 평가: 이 추가 범위에서 1회 완료. 발견 3건을 판별하고 표적 검증으로 수정했다.
- 필수: PASS 12 / FAIL 0 / UNVERIFIED 1. 선택 C14는 UNVERIFIED다.
- 신규 확정: 발견 6 / 해결 6 / 미해결 0. P0 0 / P1 0 / P2 4 / P3 2.
- 발견 경로: PRECHECK 3 / INDEPENDENT_REVIEW 3 / POST_FIX_CHECK 0 / EXTERNAL 0. 오탐 0.
- 미확인 항목: 2개(C12, C14). 결함 수에 더하지 않는다.

| ID | 단계와 실패 조건 | 기대 결과와 검증 근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| C01 | 발급/메일/원문 | domain/application 단위 테스트: 선행0/6자리/메일 링크 없음/BCrypt 해시 저장 | Y | PASS |
| C02 | 본인 확인 | 실제 두 회원 CookieJar에서 타인의 코드 400, 소유자 코드 200. 미로그인 PATCH 401 | Y | PASS |
| C03 | 만료 경계 | `expiresExactlyAfterFiveMinutes`, `rejectsExpiredCodeAtExactDeadline` 통과 | Y | PASS |
| C04 | 오입력 누적 | 단위 + `persistsWrongCodeAttemptsAcrossTransactions`, 실제 HTTP 5회째409/정답도 차단 | Y | PASS |
| C05 | 재전송 | 60초 경계, DB 이전 코드 교체, 실제 HTTP 조기 재전송409 | Y | PASS |
| C06 | 인증 후 세션 | PATCH ACTIVE 응답을 같은 회원에만 적용. 후속 GET 실패 독립/늦은 응답의 로그아웃 보존 단위 테스트, 브라우저 진입 | Y | PASS |
| C07 | 화면/복구 | 입력/서버 오류/중복 제출 단위 테스트, 브라우저 재전송→입력→관리 화면→새로고침 유지 | Y | PASS |
| C08 | 기존 링크 | 기존 API 테스트와 H2 중복 링크/재전송 경합 통합 테스트. 회원 ID projection 후 잠금 소비 | Y | PASS |
| C09 | HTTP/MSW 계약 | PATCH 요청/CSRF/오류 단위 테스트, ADMIN403 코드와 mock 인증 후 ACTIVE 유지 계약 테스트 | Y | PASS |
| C10 | 코드/재전송 경합 | H2 `serializesCodeVerificationAndResendWithoutUnexpectedFailure` 통과. 두 쓰기는 회원 잠금부터 시작 | Y | PASS |
| C11 | 정리/스타일 | 독립 평가와 참조 검색. 새 Java 메서드 10줄 이내, 삼항/else 없음. 새 TS 로직 작은 함수로 분리. 미사용 URL 설정 제거 | Y | PASS |
| C12 | 운영 수신 | 실제 운영 SMTP 오류 원인과 수신함/스팸 도착 여부 미확인. 로컬 SMTP 수락과 구분 | Y | UNVERIFIED |
| C13 | 인프라 범위 | 새 인프라/SMTP 업체 변경 없음. 기존 인증 테이블에 3개 컬럼만 추가하고 기존 인덱스/회원 잠금 활용 | Y | PASS |
| C14 | 운영 DB 엔진 | MySQL에서 동일 동시 요청을 실행하지 않음. H2 검증을 MySQL 실측으로 주장하지 않음 | N | UNVERIFIED |

## 문제 목록

| 문제 ID | 심각도/유형/유입 | 발견 경로 | 근거와 조치 | 상태 | 최초 확정/해결 | 최초 PR |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-02-auth-verification-code-F01 | P2/FLOW/INTRODUCED | INDEPENDENT_REVIEW | PATCH 성공 뒤 GET 실패가 인증을 오류로 표시. PATCH 응답을 동일 회원 세션에 적용, 별도 GET 의존 제거. 추가 GET/로그아웃 단위 테스트 통과 | FIXED | 2026-11-02 UNKNOWN / 2026-11-02 UNKNOWN | #488 |
| 2026-11-02-auth-verification-code-F02 | P2/CODE/INTRODUCED | INDEPENDENT_REVIEW | legacy 토큰 선조회로 삭제된 관리 엔티티에 재잠금 시500. 평가자가 H2/Hibernate7.4에서 재현. scalar 회원ID→회원잠금→토큰 잠금 소비로 변경, 중복/재전송 통합 테스트 통과 | FIXED | 2026-11-02 UNKNOWN / 2026-11-02 UNKNOWN | #488 |
| 2026-11-02-auth-verification-code-F03 | P3/TEST/INTRODUCED | INDEPENDENT_REVIEW | MSW ADMIN PATCH가 실제와 다른 AUTH_INACTIVE_MEMBER. AUTH_FORBIDDEN으로 분리하고 RED→GREEN 계약 테스트 통과 | FIXED | 2026-11-02 UNKNOWN / 2026-11-02 UNKNOWN | #488 |
| 2026-11-02-auth-verification-code-F04 | P2/CODE/INTRODUCED | PRECHECK | 트랜잭션 밖 ResultStream이 종료된 ResultSet을 읽어 실패. getResultList 후 stream으로 변경, DB 통합 테스트 통과 | FIXED | 2026-11-02 UNKNOWN / 2026-11-02 UNKNOWN | #488 |
| 2026-11-02-auth-verification-code-F05 | P2/TEST/INTRODUCED | PRECHECK | 복수 컬럼 ALTER가 H2 Flyway에서 구문 실패. MySQL/H2 공통 개별 ALTER로 변경, 기존 migration 테스트 통과 | FIXED | 2026-11-02 UNKNOWN / 2026-11-02 UNKNOWN | #488 |
| 2026-11-02-auth-verification-code-F06 | P3/UNUSED/INTRODUCED | PRECHECK | 코드 전환으로 URL 설정 소비자가 사라짐. Settings/Properties/YAML/env example/README에서 제거, 기존 링크는 요청 URI로 호환 | FIXED | 2026-11-02 UNKNOWN / 2026-11-02 UNKNOWN | #488 |

## 검증과 배포 조건

- Java 25, `./gradlew build`로 전체 테스트와 Checkstyle 통과.
- 프론트 전체 테스트와 lint/build 통과. Node26의 기본 Web Storage 충돌을 끄기 위해 테스트는 `NODE_OPTIONS=--no-experimental-webstorage`로 실행했다.
- 변경 후 추가 테스트는 표적 실행으로 확인했다. TDD RED/GREEN은 [구현 목록](../implementation-checklist.md)에 기록했다.
- 실제 HTTP는 H2와 localhost SMTP의 451 실패/수락을 사용했다. 실제 외부 수신함 전달을 검증한 것이 아니다.
- 프론트와 백엔드가 같은 인증 방식을 제공하도록 함께 배포해야 한다. 이전 프론트에는 코드 입력란이 없으므로 순차 배포 간격을 최소화한다.
- 마이그레이션은 컬럼 추가만 하며 config submodule/서버/메일 업체를 변경하지 않는다.

## 시각 기록의 한계

최초 발견과 코드 수정 당시의 정확한 시각을 따로 저장하지 않았다. 최초 확정/해결일은 2026-11-02이며 시각은 `UNKNOWN`으로 남긴다. 아래 사건의 시각은 감사 기록을 추가한 시각(`2026-11-02T13:42:52+09:00`)이며 최초 발견 시각으로 집계하지 않는다. 최초 기록 PR은 생성 후 갱신한다.

## 추가 전용 상태 사건 이력

| 사건 ID | 문제 ID | 사건 | 기록 시각(+09:00) | 근거/PR |
| --- | --- | --- | --- | --- |
| 2026-11-02-auth-verification-code-F01-E01 | 2026-11-02-auth-verification-code-F01 | CONFIRMED | 2026-11-02T13:42:52+09:00 | 위 근거 확인 기록, 최초 확정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-verification-code-F01-E02 | 2026-11-02-auth-verification-code-F01 | FIXED | 2026-11-02T13:42:52+09:00 | 위 수정 후 검증 기록, 실제 수정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-verification-code-F02-E01 | 2026-11-02-auth-verification-code-F02 | CONFIRMED | 2026-11-02T13:42:52+09:00 | 위 근거 확인 기록, 최초 확정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-verification-code-F02-E02 | 2026-11-02-auth-verification-code-F02 | FIXED | 2026-11-02T13:42:52+09:00 | 위 수정 후 검증 기록, 실제 수정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-verification-code-F03-E01 | 2026-11-02-auth-verification-code-F03 | CONFIRMED | 2026-11-02T13:42:52+09:00 | 위 근거 확인 기록, 최초 확정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-verification-code-F03-E02 | 2026-11-02-auth-verification-code-F03 | FIXED | 2026-11-02T13:42:52+09:00 | 위 수정 후 검증 기록, 실제 수정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-verification-code-F04-E01 | 2026-11-02-auth-verification-code-F04 | CONFIRMED | 2026-11-02T13:42:52+09:00 | 위 근거 확인 기록, 최초 확정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-verification-code-F04-E02 | 2026-11-02-auth-verification-code-F04 | FIXED | 2026-11-02T13:42:52+09:00 | 위 수정 후 검증 기록, 실제 수정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-verification-code-F05-E01 | 2026-11-02-auth-verification-code-F05 | CONFIRMED | 2026-11-02T13:42:52+09:00 | 위 근거 확인 기록, 최초 확정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-verification-code-F05-E02 | 2026-11-02-auth-verification-code-F05 | FIXED | 2026-11-02T13:42:52+09:00 | 위 수정 후 검증 기록, 실제 수정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-verification-code-F06-E01 | 2026-11-02-auth-verification-code-F06 | CONFIRMED | 2026-11-02T13:42:52+09:00 | 위 근거 확인 기록, 최초 확정 시각 UNKNOWN / PR PENDING |
| 2026-11-02-auth-verification-code-F06-E02 | 2026-11-02-auth-verification-code-F06 | FIXED | 2026-11-02T13:42:52+09:00 | 위 수정 후 검증 기록, 실제 수정 시각 UNKNOWN / PR PENDING |

## 최초 게시 연결

- 기록 시각: 2026-11-02T13:46:56+09:00
- 최초 기록 PR: [#488](https://github.com/woowacourse-teams/2026-yesulin/pull/488)
- 위 상태 사건의 당시 `PR PENDING` 표시는 보존하며, 문제 목록의 최초 PR을 #488로 연결했다. 상태 변경 사건은 추가하지 않았다.
