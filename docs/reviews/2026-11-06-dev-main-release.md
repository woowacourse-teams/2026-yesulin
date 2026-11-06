# dev → main 운영 릴리스 (2026-11-06, #533 제외)

작업 ID 2026-11-06-dev-main-release · 공통 릴리스 / v1

origin/main에서 `chore/release-2026-11-06`을 만들고 origin/dev(47ba98eb)를 병합한 뒤, 원본 PDF 심사 개편(#533, ded3319d)을 되돌렸다.
#533은 팀 확인 전이라 코드·마이그레이션·의존성(zxing-wasm)을 함께 뺐다.

## 포함 범위

배우 수다방(#495~#548), 의견 보내기와 사진 첨부·받은 의견 화면(#537·#549), 배우 프로필·마이페이지 개편(#501·#532), 공연사 랜딩(#520·#522),
공연 상세 회차(#518), 공고 원문 크게 보기(#529), 홈·포스터 디자인(#504·#510·#514·#516·#540·#545), 처리방침 1.3(#552) 등 dev의 #533 외 변경 전부.
새 마이그레이션 9개(수다방 6, 경력 연월 1, 의견 2). 새 환경 변수 없음. 의견 Slack은 기존 오류 웹훅으로 대체 전송.

## 충돌 해결

- `poster-spark.tsx`·`poster-spark.test.tsx`: main 쪽 유지. #543에서 카드 60% 노출 기준으로 고친 최신본이다(dev는 수정 전).
- `notebook.css`: dev 쪽 유지. 중복된 `a,button` transition 블록을 하나로 두고, 헤더 알림 종(`.notice-*`) 스타일을 넣었다. main의 일부 focus-visible 규칙은 dev #501이 지운 것을 따른다.

## 평가표

| ID | 흐름 | 실패 경계 | 기대 결과 | 확인 방법 | 필수 |
| --- | --- | --- | --- | --- | --- |
| M1 | 범위 | #533 혼입·다른 변경 누락 | dev 대비 차이는 #533 파일·main 전용 기록·poster-spark뿐, #533 마이그레이션·zxing 없음 | `git diff --name-only origin/dev HEAD` | 예 |
| M2 | 충돌 해결 | 수정 퇴행·깨진 CSS | poster-spark main 최신 유지, notebook.css 알림 종 포함 | diff·lint·테스트 | 예 |
| M3 | DB | 순서·호환·제외 후속 위험 | Flyway 검사 통과, #533 제외 위험 기록 | 검사 스크립트 | 예 |
| M4 | 개인정보 | 방침 없는 수집 | 처리방침 1.3 동반 | 파일 확인 | 예 |
| M5 | #533 잔여 의존 | 남은 코드가 #533에 의존 | 컴파일·타입·테스트 통과 | tsc·전체 테스트 | 예 |
| M6 | 검증 | 회귀 | 백엔드 전체·프론트 테스트·lint, 빌드는 CI | 실행 | 예 |

## 검증 근거 (2026-11-06)

- M1: `git diff --name-only origin/dev HEAD`에서 #533 변경 파일을 빼면 main 전용 릴리스 기록 6개와 poster-spark 2개만 남는다. #533 영역(audit·pdfextraction·pdf-extractions·pdf-reviews·package.json)은 origin/main과 같고, 남은 한 줄 차이는 dev #501의 스타일 수정이다.
- M3: `check_flyway_migration_order.sh origin/main`, `check_flyway_contract_changes.sh origin/main` 통과. config·config-version은 main과 차이 없음.
- M5·M6: 백엔드 `./gradlew test` 전체 통과(결과 파일 252개, 실패 0). 프론트 lint 통과, `tsc --noEmit` 오류 0, vitest 1,027 통과·6 실패(`actor-screen-view.test.tsx`, dev에서도 동일 실패, CI는 vitest를 실행하지 않음). 빌드는 PR CI(Frontend)로 확인한다.

## 독립 평가 1회

Codex(읽기 전용)가 평가했다. M3·M4 PASS, M1·M2·M5·M6은 평가 환경에서 실행을 못 해 UNVERIFIED였고, 구현자가 위 실행 근거로 PASS 판정했다.

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 결과 |
| --- | --- | --- | --- |
| 2026-11-06-dev-main-release-F01 | P3 TEST EXISTING | INDEPENDENT_REVIEW | REJECTED. `git diff --check`가 `design/zero-downtime-evidence/20261103/` 원본 로그·CSV의 줄 끝 공백으로 실패한다. dev #494가 롤백 증거를 원본 그대로 보존한 파일이며 CI 검사 대상이 아니다. 원본 보존을 위해 고치지 않는다. |

| 사건 ID | 문제 ID | 사건 | 발생 시각(KST, 분 단위) | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E01 | F01 | CONFIRMED | 2026-11-06T18:30:00+09:00 | 독립 평가 | PENDING |
| E02 | F01 | REJECTED | 2026-11-06T18:35:00+09:00 | 원본 증거 파일(dev #494) | PENDING |

## 판정

필수 PASS 6 / FAIL 0 / UNVERIFIED 0 / N/A 0. 신규 확정 문제 발견 0 / 해결 0 / 미해결 0. P0 0 / P1 0 / P2 0 / P3 0.
PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0 / 오탐 1.

## #533을 나중에 운영에 낼 때

1. main에서 이 릴리스의 되돌림 커밋(`chore: 운영 릴리스에서 PDF 심사 개편(#533)을 뺀다`)을 되돌린다. dev를 다시 병합하는 것만으로는 #533이 돌아오지 않는다.
2. #533 마이그레이션 `V20261105231338`은 이미 적용된 `V20261106120000`보다 버전이 낮다. 그 릴리스에서만 `spring.flyway.out-of-order=true`를 켜고 배포한 뒤 끈다. 순서 검사 스크립트도 이 파일을 예외로 확인한다.
3. 이 마이그레이션은 기존 `pdf_review_entries`를 일괄 UPDATE하므로 #533 코드와 같은 배포로 낸다.
