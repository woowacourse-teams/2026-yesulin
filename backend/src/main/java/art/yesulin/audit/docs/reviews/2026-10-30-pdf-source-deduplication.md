# 같은 심사의 PDF 원본 중복 접수 방지

작업 ID: `2026-10-30-pdf-source-deduplication`. 구현 전 평가표 v1.
내용 SHA-256을 기준으로 같은 심사 안에서 기존 작업·항목을 재사용한다. 다른 심사는 별도다.
기존 중복 항목의 판정·메모는 삭제/병합하지 않는다. 배우 프로필 가져오기와 독립 진단 접수는 이번 범위 밖이다.

| ID | 필수 | 실패 조건 / 기대 결과 | 검증 |
| --- | --- | --- | --- |
| S01 | 예 | 이름 변경·재선택·같은 묶음의 같은 바이트는 항목/작업 1건 | 해시·훅·DB 테스트 |
| S02 | 예 | 동시 접수도 한 심사·원본당 1건, 타인 심사 접근 거부 | DB 경쟁 테스트·기존 권한 테스트 |
| S03 | 예 | 내용이 다른 동명 PDF·다른 심사는 새 접수 | DB 테스트 |
| S04 | 예 | 중복은 S3/AI 새 실행·업로드 성공 분석을 만들지 않음 | 훅·콜백 테스트, 체크섬 서명 확인 |
| S05 | 예 | 대기/만료/응답 유실은 기존 작업으로 재시도 | 서비스·훅 테스트 |
| S06 | 예 | 기존 완료 결과의 SHA 채우기, 기존 중복 메모/판정 보존 | Java migration·DB 테스트 |
| S07 | 예 | API·타입·실제 API passthrough·문서·표시/집계 일치 | 관련 테스트·빌드·실제 요청 가능 범위 |
| S08 | 예 | 독립 평가 1회·미사용 점검 | diff/참조 검색·별도 평가 |

선행 AI 실행 변경과 기존 미커밋 Audit 이벤트 핸들러는 보존한다. 실제 운영 배포·S3 CORS/체크섬은 로컬 검증과 구분한다.

## 구현과 평가 결과

평가일 2026-10-30(KST). 아래는 로컬 구현·테스트 및 명시한 읽기 전용 콘솔 조회 범위다.

| 기준 | 결과·근거 |
| --- | --- |
| S01 | PASS — API 해시 테스트(파일명 변경/동명 다른 바이트), 훅의 기존 중복·같은 묶음 미확인 중복, DB 원본 재사용 |
| S02 | PASS — 동일 심사 두 접수 경쟁에서 작업·항목 1건; 다른 owner 접근 거부. 심사 잠금+SHA 유일 인덱스 |
| S03 | PASS — 다른 SHA와 다른 심사에 별도 작업 생성 |
| S04 | PASS — 훅의 1 PUT/1 completion/1 성공 분석, 이미 완료된 중복은 모두 0; 실제 S3 어댑터 체크섬 검증 |
| S05 | PASS — 만료 갱신의 같은 jobId 유지, 실제 DB에서 기간 갱신과 완료 행 잠금 경쟁 검증 |
| S06 | PASS — 기존 중복 2건을 삭제하지 않고 해시 대표 1건만 채움; 메모·HOLD 보존 |
| S07 | PASS — 아래 API HTTP 계약·프론트 604개·타입 빌드·MSW passthrough·분석 기준 확인 |
| S08 | PASS — 독립 읽기 전용 평가 1회, 발견 수정 후 표적 재확인, 아래 기록·미사용 점검 |

필수 PASS 8 / FAIL 0 / UNVERIFIED 0 / N/A 0(위 로컬 범위). 실제 운영 배포·기존 운영 DB 데이터·실측 부하는 별도다.

### 경계

- 중복 기준은 바이트 SHA이며 시각적으로 같은 PDF라도 메타데이터 등 바이트가 달라지면 별도 원본이다.
- 공연사 심사 접수에만 적용한다. 배우 가져오기·독립 진단은 새 정책으로 바꾸지 않았다.
- 새 접수는 업로드 전에 SHA를 확보한다. 배포 전의 미완료·해시 없는 작업은 결과가 오기 전에는 동일성을 알 수 없다.
- 기존 완료 payload의 유효한 64자리 sourceSha256으로 과거 원본을 연결한다. 이미 생긴 중복 항목은 자동 삭제하지 않는다.
- 기존 SHA 없는 두 콜백이 같은 해시를 동시에 연결하면 유일 제약의 패배 트랜잭션은 재시도 대상이다.
- 전용 SHA 필드는 원본 식별용이며 추출 payload digest를 바꾸지 않는다. SHA는 분석/로그의 제품 이벤트에 보내지 않는다.
- 준비 응답이 사라졌거나 URL이 만료돼도 기존 jobId/key를 재사용한다. 800건 제한도 중복 후 새 항목에만 적용한다.
- API의 새 sha256 필드는 필수다. 프론트·서버 배포를 맞추고 이전 탭은 새 버전으로 갱신해야 한다.

## 실행 근거

- backend 격리 검증본: `/var/folders/r_/w5y2qkqd4m1f878ywb838jkm0000gn/T/yesulin-pdf-ai-dispatch-vsqyir47/backend`.
  기존 미커밋 Audit 이벤트 핸들러 한 파일만 HEAD로 대체했고 이번 Java/SQL/YAML 변경은 원본과 동일하게 복사했다.
  원본 핸들러 SHA-256은 이전 작업과 동일한 `0e6abde46a95fb19be669cf25069311ec25f183d1cd17017b37a6203bd70535e`다.
  원본 작업 트리 자체의 선행 컴파일 오류를 수정하거나 통과로 주장하지 않는다.
- `./gradlew --offline test --tests 'art.yesulin.audit.application.*' --tests 'art.yesulin.pdfextraction.*' checkstyleMain checkstyleTest` 최종 통과.
  `renewalHoldsJobLockSoCompletionCannotBeOverwritten` 등 DB 경쟁 검증 포함.
- 격리본 `./gradlew --offline build` 통과(2026-10-30 10:58:16 KST, 2분 21초).
  Java 1,370개 / 230 suites; 실패·오류·skip 0. JAR와 전체 Checkstyle 포함.
- frontend `npm test`: 최초 600개 통과, 기존 localhost HTTP 테스트 4개는 sandbox listen EPERM으로 미실행.
  포트 권한으로 같은 전체 명령을 재실행해 **604/604, 121 files** 통과(10:58:32 시작, 4.92초).
- frontend `npm run lint`, `npm run build -- --webpack` 통과. 기존 다중 lockfile 루트 추론 경고는 새 코드 결함이 아니다.
- 실제 컴파일된 `S3PrivateObjects.createOnce`로 LocalStack에 합성 파일과 가짜 키만 사용해 검증:
  일치 체크섬 PUT 200, 같은 길이의 변조 바이트 PUT 400. `x-amz-checksum-sha256` 헤더 포함 확인.
  임시 전용 버킷·객체는 검증 프로그램의 finally에서 삭제했다. 실제 AWS 업로드/설정 변경은 없다.
- 임시 메모리 DB/고정 인증 주체/서비스 stub의 로컬 Spring HTTP 서버에서 **실제 AuditController·DTO**를 호출했다.
  새 접수 201, 기존 접수 200(duplicate=true/upload=null), SHA 누락 400, 잘못된 SHA 400.
  이는 HTTP 계약 검사이며 실제 인증·S3·AI까지 한 요청으로 통과한 운영 E2E 검증은 아니다.
- AWS 콘솔 읽기: `techcourse-project-2026`의 `https://yesulin.art`/`https://dev.yesulin.art` 규칙이
  PUT을 허용하고 AllowedHeaders=`*`임을 확인했다. 새 체크섬 헤더를 막지 않는다. 버킷 설정은 수정하지 않았다.
- React 스킬 기준으로 비싼 해시는 제한된 업로드 워커의 이벤트 경로 안에서 계산하고, 전송 병합은 run 로컬 Map에만 둔다.
  functional state 갱신·기존 이름 있는 버튼/상태 텍스트를 유지했고 동기 렌더 중 파일을 읽지 않는다.
  실제 브라우저 모바일/데스크톱 화면 검증은 이번 근거에 포함하지 않는다.

SDK/계약 근거: [S3 체크섬 검증](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity-upload.html).

## 독립 평가·발견·해결

독립 읽기 전용 평가 1회는 같은 종류의 별도 에이전트로 수행했다(현재 제공된 독립 평가 수단).
평가자는 다시 평가자를 만들지 않았다. F03/F04와 잔여 문서 F05 발견 뒤 같은 평가자가 수정 부분만 표적 확인했다.
원본·새 클래스·마이그레이션·프론트 API의 실제 소비 경로와 옛 문서/미사용 파일을 점검했다.
운영 코드에 미사용 신규 경로·추가 의존성은 없고 이전 날짜의 평가 기록은 당시 상태로 보존한다.

문제 ID 접두사는 `2026-10-30-pdf-source-deduplication`이다. 최초 PR은 모두 PENDING이며 PR은 생성하지 않았다.
최초 발견 순간의 정확한 시각을 별도로 보존하지 못했으므로 최초 시각 기반 기간 집계는 보류한다.
아래 시각은 **보고서 확정 시각**이며 과거 최초 발견/수정 시각을 꾸며 대체하지 않는다.

| ID | 심각도/유형/유입 | 발견 경로 | 상태 | 근거·해결 |
| --- | --- | --- | --- | --- |
| F01 | P3/TEST/INTRODUCED | POST_FIX_CHECK | FIXED | 새 훅 테스트가 act 안에서 busy state 커밋을 기다려 타임아웃. 기존 방식처럼 완료 callback을 기다린 뒤 상태 검사; 전체 604개 통과 |
| F02 | P3/CODE/INTRODUCED | POST_FIX_CHECK | FIXED | 새 prepareReview 호출·테스트 stub 두 줄이 120자 초과. 줄바꿈 후 전체 Checkstyle 통과 |
| F03 | P1/CODE/INTRODUCED | INDEPENDENT_REVIEW | FIXED | 기존 원본을 일반 조회 후 갱신해 완료 상태 덮어쓰기 가능. 비관적 잠금 조회+renewal/complete 경쟁 테스트로 해결 |
| F04 | P2/FLOW/INTRODUCED | INDEPENDENT_REVIEW | FIXED | 같은 묶음의 미확인 중복이 PUT/완료 표시를 두 번 실행. jobId별 Promise 공유+대기 행 중복 제외, 1 PUT/완료/성공 분석 테스트 |
| F05 | P3/DOC/INTRODUCED | INDEPENDENT_REVIEW | FIXED | 도메인 AGENTS/audit-management의 미구현 문구 잔존. 새 정책에 맞춰 갱신·관련 문서 검색 |

신규 발견 5 / 해결 5 / 미해결 0. P0 0 / P1 1 / P2 1 / P3 3. 오탐 0.
PRECHECK 0 / INDEPENDENT_REVIEW 3 / POST_FIX_CHECK 2 / EXTERNAL 0.
선행 `2026-10-30-pdf-reliability-review-F04`(기존 이벤트 타입 컴파일 오류)는 별도 OPEN이며 이번 신규 건수에 넣지 않는다.

### 추가 전용 상태 이력

| 사건 ID | 문제 ID 접미사 | 사건 | 보고서 확정 시각(+09:00) | 근거 / PR |
| --- | --- | --- | --- | --- |
| E01 | F01 | CONFIRMED | 2026-10-30T11:08:48+09:00 | 훅 테스트 타임아웃, 실제 최초 시각 미보존 / PENDING |
| E02 | F01 | FIXED | 2026-10-30T11:08:48+09:00 | act 대기 경계 수정, 604개 통과 / PENDING |
| E03 | F02 | CONFIRMED | 2026-10-30T11:08:48+09:00 | Checkstyle line length, 실제 최초 시각 미보존 / PENDING |
| E04 | F02 | FIXED | 2026-10-30T11:08:48+09:00 | 최종 전체 Checkstyle 통과 / PENDING |
| E05 | F03 | CONFIRMED | 2026-10-30T11:08:48+09:00 | 독립 검토, 실제 최초 시각 미보존 / PENDING |
| E06 | F03 | FIXED | 2026-10-30T11:08:48+09:00 | 행 잠금·DB 경쟁 검증·표적 확인 / PENDING |
| E07 | F04 | CONFIRMED | 2026-10-30T11:08:48+09:00 | 독립 검토, 실제 최초 시각 미보존 / PENDING |
| E08 | F04 | FIXED | 2026-10-30T11:08:48+09:00 | 전송 병합·프론트 테스트·표적 확인 / PENDING |
| E09 | F05 | CONFIRMED | 2026-10-30T11:08:48+09:00 | 미사용/잔여 문서 점검, 실제 최초 시각 미보존 / PENDING |
| E10 | F05 | FIXED | 2026-10-30T11:08:48+09:00 | 문서 갱신·관련 검색·표적 확인 / PENDING |
