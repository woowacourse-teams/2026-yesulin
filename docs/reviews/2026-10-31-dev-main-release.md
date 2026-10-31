# 2026-10-31 dev → main 릴리스와 Prod PDF 인프라 평가

- 작업 ID: `2026-10-31-release-dev-main`
- 평가일: 2026-10-31 (Asia/Seoul)
- 도메인 / 평가표 버전: 공통 릴리스 + 공용 PDF 추출 / v1
- 원본: dev `26878921c8ef9c85b8c9d4936f60e89d68fe8450`
- 운영 기준: main `b0d735e9ced4ccf2061acf8fde01d63c19396952` (현재 main HEAD)
- 통합 브랜치: `chore/release-2026-10-31` (dev에서 main 병합, config 고정 갱신, Lambda 문서·본 기록)

## 범위

dev의 #464(PDF AI 즉시 실행·원본 중복 등록 방지), #466(PDF 처리 상태·dev AI 진단),
#468(지원자 분석 실패 알림·Slack 재분석), #471(명함 사진 업로드 복구)을 운영에 올린다.
각 기능의 평가·문제 ID는 원본 PR과 도메인 평가 기록을 유지하며 이번 신규 발견으로 다시 세지 않는다.

함께 바뀐 운영 선행조건:

- config `bab5abe1c1fa7128e89dea16f2422567b1983510`(config main에 이미 push됨): Prod `prod.env`만 바뀐다.
  PDF 추출·AI 활성화, 모델·동시성·요청 간격, 심사 알림 Slack 웹훅, 재분석 링크 기준 주소.
  웹훅 값은 팀이 전달한 Prod 심사 알림 웹훅과 일치함을 복호화로 확인했고 이 문서에는 기록하지 않는다.
- AWS(콘솔, 2026-10-31 15:00~15:20 KST): Prod 함수 `yesulin-pdf-extractor-prod`, 환경 변수, S3 트리거는
  팀원이 미리 만들어 두었다. 이번 작업은 확인과 공용 버킷 정책 변경만 수행했다.

## 평가표 v1

| 항목 | 흐름·실패 조건 | 기대 결과 | 검증 방법 | 필수 | 판정·근거 |
| --- | --- | --- | --- | --- | --- |
| REL-01 | 통합 시 main 전용 수정 유실 | main 전용 PostHog 수정 보존 | 병합 결과와 main의 파일 diff | 예 | PASS. 자동 병합, 충돌 없음. `dashboards.mjs`·`posthog-setup.md`가 origin/main과 diff 0 |
| REL-02 | 배포·롤백 시 DB 계약 파괴 | 신규 migration은 Expand | 신규 SQL 확인 | 예 | PASS(정적). nullable 컬럼+유니크 인덱스(기존 행 NULL), default 있는 NOT NULL 컬럼 추가, 백필만 하는 Java migration. 삭제·이름 변경 없음. 실제 MySQL 적용 이력은 확인하지 않았다 |
| REL-03 | config 고정이 main에 없는 커밋을 가리킴 | 고정 SHA = config origin/main 커밋 | pre-commit `validate-pin`, config 로그 | 예 | PASS. `bab5abe`는 config origin/main HEAD, hook 통과 |
| REL-04 | 검증되지 않은 원본을 병합 | dev CI 성공 | 원본 SHA의 GitHub check-runs | 예 | PASS. Backend·Frontend·CodeQL 성공([41168884261](https://github.com/woowacourse-teams/2026-yesulin/actions/runs/41168884261)). 릴리스 PR CI는 병합 직전 확인 |
| PDF-01 | S3 업로드가 Prod 함수를 실행하지 않음 | Prod inputs/`source.pdf` ObjectCreated → Prod 함수 | 콘솔 트리거 확인 | 예 | PASS(설정). prefix `yesulin/prod/private/pdf-extractions/inputs/`, suffix `/source.pdf` |
| PDF-02 | Prod 함수가 Dev 서버로 콜백하거나 토큰 불일치 | Prod API·Prod 비밀 | 콘솔 환경 변수, 토큰은 SHA-256 비교만 | 예 | PASS(설정). URL `https://api.yesulin.art/internal/v1/pdf-extractions/completions`, 토큰 해시가 prod config와 일치 |
| PDF-03 | 버킷 정책이 Prod 함수의 원본 읽기·결과 쓰기를 거부 | Dev와 같은 구조의 Prod 허용·제한 | 변경 전 정책 백업(해시 대조), 변경 후 정책을 키 정렬해 의도한 정책과 비교 | 예 | PASS(설정). 아래 변경 내역. 변경 대상 외 14개 문(다른 팀 9, Yesulin Dev 5) 불변 |
| PDF-04 | Prod 함수가 다른 환경·다른 팀 경로를 읽음 | 자기 환경 PDF 경로 밖 GetObject 거부 | 정책 문 확인 | 예 | PASS(정적). `DenyYesulinProdPdfWorkerReadOutsideProdExtraction`(NotResource) |
| PDF-05 | 실제 Prod 업로드→추출→콜백→AI 전체 경로 | 지원서 1건이 결과까지 완료 | 배포 후 실제 업로드 | 예 | UNVERIFIED. 서버 배포 전이라 실행하지 않음. Prod 콜백은 현재 403(추출 비활성 상태 추정, Dev는 401) |
| PDF-06 | Prod 서버 역할에 Bedrock 권한이 없어 AI 실패 | `ec2-project`가 모델 호출 가능 | IAM 조회 또는 실호출 | 예 | UNVERIFIED. 계정 권한으로 IAM 조회 불가. Dev 서버는 다른 역할(`team-bedrock-service-yesulin`) |
| PDF-07 | Prod 함수 코드·실행 설정이 Dev와 다름 | Dev와 같은 ZIP·실행 설정 | 콘솔 코드 SHA-256, 런타임·일반 구성·트리거 권한 비교 | 예 | PASS. 코드 해시 동일(`wFAVEj1c…`), Python 3.12·arm64·`s3_handler.handler`, 1024MB·임시 512MB·제한 2분, S3 호출 리소스 정책(소스 계정 지정) 존재. 동시성·비동기 재시도 값은 비교하지 않았다 |

중복·재시도·멱등은 원본 기능 평가(#453, #464)를 참조한다. 권한 경계는 PDF-03·04, 수동 데이터 수정은 없다.

## 버킷 정책 변경 내역

대상: `techcourse-project-2026` 버킷 정책(공용). Dev 함수 세션 `AROA…:yesulin-pdf-benchmark-dev`와 같은 구조로
Prod 함수 세션 `AROA…:yesulin-pdf-extractor-prod`를 추가했다.

- 변경: `DenyPublicReadYesulinPrefix`의 `aws:userid` 예외를 Dev 단일 값에서 Dev·Prod 두 값으로.
- 추가: `DenyYesulinProdPdfWorkerReadOutsideProdExtraction`, `DenyYesulinProdPdfReadOutsideBackendAndWorker`,
  `AllowYesulinPdfWorkerReadProdExtraction`, `AllowYesulinPdfWorkerWriteProdResults`,
  `AllowYesulinPdfWorkerInspectProdResultCache`. 경로는 `yesulin/prod/private/pdf-extractions/` 이하.
- `DenyYesulinProdPdfReadOutsideBackendAndWorker`의 서버 예외는 Dev 문과 같은 `ec2-project`,
  `team-bedrock-service-yesulin`이다. Prod 서버 두 대는 `ec2-project`로 실행 중임을 확인했다.
- 되돌리기: 위 Prod 문 5개를 삭제하고 `DenyPublicReadYesulinPrefix`의 `aws:userid`를 Dev 단일 값으로 되돌린다.
  변경 전 정책은 압축 JSON 7,180 bytes, SHA-256 `720d1abe…`이며 문 수는 15 → 20이다.
- 남는 위험(Dev 구조 복제, 수용): 경로 밖 거부는 GetObject만 막고 PutObject·ListBucket 범위는 `lambda-basic`
  신원 정책에 달려 있다. `ec2-project`는 다른 팀도 쓰는 역할이라 Prod PDF 읽기 예외가 팀 단위가 아니다.

## 실행 근거

- `PYTHONPATH=src python -m unittest discover -s tests/application`: 21개 PASS(Python 3.12.8, Windows).
- `python scripts/build.py`: ZIP 생성 성공, 엔트리 경로 구분자 `/` 확인. 배포에는 사용하지 않았다.
- 미사용 정리 점검: 이번 변경은 병합·config 포인터·문서이며 새 코드·설정 키·의존성이 없다.
  Lambda README의 "Prod Lambda 현재 코드/설정 미확인" 문장은 확인 결과로 대체했다.

## 독립 평가와 집계

- 독립 평가: 1회 완료(읽기 전용). 운영 실경로·Bedrock 권한 미확인 조건부 결과.
- 필수: PASS 9 / FAIL 0 / UNVERIFIED 2 / N/A 0. 검증률 9/11(82%).
- 신규 확정 문제: 발견 6 / 해결 5 / 미해결 1.
- 신규 심각도: P0 0 / P1 0 / P2 0 / P3 6.
- 발견 경로: PRECHECK 0 / INDEPENDENT_REVIEW 6 / POST_FIX_CHECK 0 / EXTERNAL 0.
- 오탐(REJECTED): 0. 평가자가 스스로 기각한 가설(S3 CORS, 콜백 403 원인, 중복 Sid, 인덱스 길이)은 확정 전이라 세지 않는다.
- 기존 문제(신규 발견 수 제외): F05.

| 문제 ID | 신규/기존 | 심각도·유형·유입 | 발견 경로 | 최초 확정(+09:00) / 최초 기록 PR | 해결 시각(+09:00) | 문제·근거 | 조치·상태·수정 후 검증 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-31-release-dev-main-F01 | 신규 | P3·DOC·INTRODUCED | INDEPENDENT_REVIEW | 2026-10-31T15:45:00+09:00 / PENDING | 2026-10-31T15:55:00+09:00 | PDF-03 "다른 팀 문 14개"는 다른 팀 9·Yesulin Dev 5 | 문구 정정, FIXED |
| 2026-10-31-release-dev-main-F02 | 신규 | P3·DOC·INTRODUCED | INDEPENDENT_REVIEW | 2026-10-31T15:45:00+09:00 / PENDING | 2026-10-31T15:55:00+09:00 | Lambda README가 함수·트리거를 이번에 만든 것처럼 쓰고 정책 문 목록 하나 누락 | 팀원 생성·이번 확인 구분, 누락 문 추가, FIXED |
| 2026-10-31-release-dev-main-F03 | 신규 | P3·FLOW·INTRODUCED | INDEPENDENT_REVIEW | 2026-10-31T15:45:00+09:00 / PENDING | 2026-10-31T15:55:00+09:00 | PDF-07이 코드 해시만 비교해 timeout 등 실행 설정 근거 없음 | 콘솔 일반 구성 확인(Dev와 동일) 후 PDF-07 갱신, FIXED |
| 2026-10-31-release-dev-main-F04 | 신규 | P3·DOC·INTRODUCED | INDEPENDENT_REVIEW | 2026-10-31T15:45:00+09:00 / PENDING | 2026-10-31T15:55:00+09:00 | 되돌리기가 세션 임시 백업 파일에만 의존 | 역적용 절차를 기록에 명시, FIXED |
| 2026-10-31-release-dev-main-F05 | 기존 | P3·DOC·EXISTING | INDEPENDENT_REVIEW | 2026-10-31T15:45:00+09:00 / PENDING | - | Lambda README "새 jobId 같은 PDF 중복 방지 별도 과제"가 #464 이후 일부 낡음 | 릴리스 범위 밖, OPEN |
| 2026-10-31-release-dev-main-F06 | 신규 | P3·POLICY·INTRODUCED | INDEPENDENT_REVIEW | 2026-10-31T15:45:00+09:00 / PENDING | - | Prod 정책이 Dev 구조를 복제해 GetObject만 경로 밖 거부, `ec2-project` 공유 역할 예외 | 수용 위험으로 기록, OPEN |
| 2026-10-31-release-dev-main-F07 | 신규 | P3·DOC·INTRODUCED | INDEPENDENT_REVIEW | 2026-10-31T15:45:00+09:00 / PENDING | 2026-10-31T15:55:00+09:00 | REL-02 PASS(정적)에 실제 MySQL 적용 근거 없음 | 정적 판정 범위와 미확인 명시, FIXED |

### 추가 전용 상태 이력

| 사건 | 문제 ID | 종류 | 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | F01~F07 | CONFIRMED | 2026-10-31T15:45:00+09:00 | 독립 평가 보고, PENDING |
| E02 | F01·F02·F03·F04·F07 | FIXED | 2026-10-31T15:55:00+09:00 | 문서 수정·콘솔 재확인, PENDING |

## 미확인 범위와 사후 확인

- PDF-05: 릴리스 배포 후 Prod 콜백이 401(토큰 없음)로 바뀌는지, 실제 PDF 1건이 추출·AI까지 완료되는지 확인한다.
- PDF-06: Prod AI 첫 작업이 Bedrock 권한 오류로 실패하면 Slack 분석 실패 알림이 온다. 이 경우 역할 권한을 팀이 조정한다.
- 원본 #453의 300건 부하 미확인은 유지한다.

## 배포 후 확인 (2026-10-31, #472 병합 이후)

#472 병합(15:29)과 운영 파이프라인 성공 뒤 실제 운영에서 확인했다. 위 평가표와 사건 이력은 그대로 두고 결과를 덧붙인다.

| 항목 | 판정 | 근거 |
| --- | --- | --- |
| PDF-05 | PASS | 15:5x 운영 콜백 응답 403 → 401. 15:58 운영 공연사 계정으로 테스트 심사를 만들고 합성 PDF(`tests/fixtures/applicant-quality.json`의 `01-labelled`, 개인정보 없음) 1건 업로드. Lambda 추출, 운영 경로 저장, 콜백 200까지 성공. 18:09 재분석 뒤 처리 상태 `READY`, AI 완료 1·실패 0 |
| PDF-06 | FAIL → FIXED | 15:58·17:45 `PROVIDER_ERROR · attempts=1`(Slack). 아래 F08 |

AI 결과는 합성 정답과 일치했다: 이름, 만 28세, 180.5cm, 경력 2건. 배역은 심사 배역과 지원 배역이 달라
`NEEDS_CHECK`로 남았고, 이는 정상 동작이다.

### F08 원인과 조치

- 원인: 운영 서버 2대는 시작 템플릿대로 `ec2-project` 역할로 실행 중이었다. Dev 서버는 시작 템플릿(v2·v6)은
  `ec2-project`지만 실행 중에 `team-bedrock-service-yesulin`으로 교체되어 있었다. 같은 코드·모델·리전에서
  Dev만 성공했고, 재시도하지 않는 4xx 계열 실패라 Bedrock 권한 부재로 판단했다. 계정 권한으로 IAM·CloudTrail을
  조회할 수 없어 HTTP 상태는 직접 확인하지 못했다.
- 조치: 새 권한 요청 없이 Dev와 같은 방식으로 실행 중 인스턴스의 IAM 역할을 교체했다.
  서버 A `i-0c7bdfe9b260030ee` 16:33, 서버 B `i-0e9efdc55ff021ec5` 17:49.
  17:45 첫 재분석은 역할을 바꾸지 않은 서버 B가 받아 실패했다(로그 17:45:17 요청, 17:45:18 실행).
  실행 중인 앱은 이전 자격 증명을 캐시하므로 같은 버전(main `a18f161a`, config `bab5abe`)을 재배포했다(실행 `2c68a4e9`, 성공).
- 교체 후 확인: 재배포 13분 동안 2초 간격 공개 API 355건 모두 200, CodeDeploy 배포 성공, 로그 수집 유지,
  새 역할로 서명한 운영 원본 PDF GET 4건 모두 206, 18:09 재분석 성공.
- 미확인: 새 역할의 운영 S3 쓰기(사진 업로드 등)와 SSM 접속.
- 되돌리기: 두 인스턴스의 IAM 역할을 `ec2-project`로 바꾸고 같은 버전을 재배포한다.

### 사후 집계

- 필수: PASS 10 / FAIL 0 / UNVERIFIED 0 / N/A 0 (PDF-06은 FAIL 확인 후 조치·재확인 PASS).
- 신규 확정 문제(누적): 발견 8 / 해결 6 / 미해결 2. P0 0 / P1 1 / P2 1 / P3 6.
- 발견 경로: PRECHECK 0 / INDEPENDENT_REVIEW 6 / POST_FIX_CHECK 2 / EXTERNAL 0. 오탐 0.

| 문제 ID | 신규/기존 | 심각도·유형·유입 | 발견 경로 | 최초 확정(+09:00) / 최초 기록 PR | 해결 시각(+09:00) | 문제·근거 | 조치·상태·수정 후 검증 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-31-release-dev-main-F08 | 신규 | P1·FLOW·EXISTING | POST_FIX_CHECK | 2026-10-31T15:58:00+09:00 / #472 | 2026-10-31T18:09:00+09:00 | 운영 서버 역할에 Bedrock 권한이 없어 AI 분석 `PROVIDER_ERROR` | 실행 중 인스턴스 2대 역할 교체·재배포, FIXED. 재분석 성공 |
| 2026-10-31-release-dev-main-F09 | 신규 | P2·FLOW·INTRODUCED | POST_FIX_CHECK | 2026-10-31T18:09:00+09:00 / PENDING | - | F08 조치가 실행 중 인스턴스에만 적용됨. 운영·Dev 시작 템플릿은 `ec2-project`라 ASG가 새로 띄운 서버에서 AI가 다시 실패 | 시작 템플릿 반영 여부 팀 결정 대기, OPEN |

| 사건 | 문제 ID | 종류 | 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E03 | F08 | CONFIRMED | 2026-10-31T15:58:00+09:00 | 운영 테스트 업로드 Slack 실패 알림, #472 |
| E04 | F08 | FIXED | 2026-10-31T18:09:00+09:00 | 역할 교체·재배포 후 재분석 성공, PENDING |
| E05 | F09 | CONFIRMED | 2026-10-31T18:09:00+09:00 | 시작 템플릿 v6(Dev)·운영 템플릿 역할 확인, PENDING |

남은 확인: 원본 #453의 300건 부하, 새 역할의 운영 S3 쓰기, 운영 테스트 심사 "[테스트] 운영 PDF 확인" 정리.
