# 로컬 심사함 합성 데이터

- 작업 ID: `2026-10-31-audit-local-demo-data`, 평가일: 2026-10-31.
- 요청: 현재 로컬 심사함에 가짜 데이터 추가. 대상: `pdf-local@example.test` 계정의 새 `[테스트] 가을 오디션 - 연락처 확인용` 심사함.
- 심사 ID: `f90e1f6f-c847-42ad-875d-e2bb85dd28f7`. 합성 8명: PASS 4, HOLD 1, FAIL 1, PENDING 2. 배역 강하루/윤서진/앙상블과 미기재 1명.
- 기존 인증/심사 생성/업로드 준비/배역/판정 API를 사용했다. 원본 PDF는 서명된 localhost S3 URL로 실제 업로드했다.
- 추출 워커가 없는 로컬 확인을 위해 **이번 합성 작업에만** 추출 payload·이름·완료 상태를 DB 트랜잭션으로 넣었다. 실제 PDF 추출/AI/콜백 성공 검증이 아니다. payload 경고에 `SYNTHETIC_LOCAL_FIXTURE`를 넣었다.
- 서버를 재시작하거나 기존 자료를 삭제하지 않았다. 현재 LocalStack은 백엔드가 관리하는 임시 저장소이므로 재시작 후 원본 파일 지속성을 보장하지 않는다.

## 평가표 v1

| ID | 필수 | 기대 결과 / 실패 조건 | 검증 결과 |
| --- | --- | --- | --- |
| R01 | 예 | 로컬과 대상 테스트 계정으로 한정, 외부 API/실제 개인정보 사용 금지 | PASS — localhost API 고정, 업로드 hostname 검증, 합성 이름과 0000 번호 사용 |
| R02 | 예 | 기존 자료 보존, 신규 fixture의 소유자·심사·작업 범위 제한 | PASS — 스크립트 SQL 조건과 신규 manifest 확인, DELETE 없음. 전체 DB 전후 비교는 미실시 |
| R03 | 예 | 판정 분포와 연락처 정상2/누락1/다중1을 UI에서 확인 | PASS — 상세 API 8명·판정 건수, 실제 브라우저 합격4명/번호확인2명/누락1명/다중1명 |
| R04 | 예 | 원본8개 및 추출8개 조회 가능, 진행률 종료 | PASS — 실제 API와 원본 PDF 헤더8개 확인, complete=true/total8/completed8. 대표 PDF Poppler 렌더링 및 원문 모달 앱 보기 확인 |
| R05 | 예 | 임시 fixture 제품 코드에 미포함, 실제 모델 실행으로 오인하지 않음 | PASS — 스크립트/PDF는 /private/tmp, 신규 제품 의존성·설정 없음, 합성 표시와 위 제한 기록 |

필수 PASS 5 / FAIL 0 / UNVERIFIED 0 / N/A 0. 확인 범위 5/5이며 실제 추출 정확도·운영 처리율을 의미하지 않는다.

## 근거·독립 평가

- 생성/주입: `/private/tmp/yesulin-demo-create.py`, `/private/tmp/yesulin-demo-seed.py`.
- 합성 원본 및 manifest/검증 결과: `/private/tmp/yesulin-synthetic-applicants/`의 `cases.json`, `seed-manifest.json`, `verification.json`.
- 화면: `/private/tmp/yesulin-seeded-contacts.png`. 브라우저에 합격자 연락처를 열어 두었다.
- 독립 읽기 전용 평가 1회: 별도 실행 가능한 타 종류 평가 도구가 없어 동일 종류의 별도 에이전트 사용. 소유 범위/삭제 부재/판정 분포/고유 작업8개/PDF 헤더8개/제품 경로 미포함/합성 표시 확인. 독립 HTTP·브라우저 재실행은 하지 않았으며 작성자의 실행 기록과 구분했다. 재귀 평가 없음.
- 신규 발견 0 / 해결 0 / 미해결 0 / P0 0 / P1 0 / P2 0 / P3 0. PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0. 오탐 0 / 미확인 항목 0.
- 확정 문제 및 상태 사건 없음. PR 없음(PENDING). 기존 변경·미추적 파일은 보존했다.

## 최초 PR 연결

최초 게시 PR: [#479](https://github.com/woowacourse-teams/2026-yesulin/pull/479), 대상 dev, 관련 이슈 #478.
위 PENDING/PR 미생성 표기는 당시 작업 이력이며 이 절로 최초 게시 번호를 연결한다. 기존 문제 ID·확정/해결 시각은 변경하지 않는다.
