# 제공 mock seed 매핑

> 원본: `yesulin-mock-seed.json`  
> SHA-256: `4D362943A1983C104BD744792CA1E23F0A574E4AFB4D1253238396C89D21527D`  
> 용도: 로컬 개발 전용. 이메일·전화번호·생년월일이 포함되어 운영 데이터와 분리한다.

## 검증 요약

- UTF-8 JSON, 237,696 bytes
- 공연사 1, 공연 5, 공고 5, 배역 16, 지원서 73
- 경력 155, 사진 203, 심사 146
- 원본 ID 중복 및 부모 참조 누락 없음
- 비밀번호·토큰·secret 없음
- 지원서 이메일과 전화번호는 각 73개로 중복 없음
- 동일 이름은 존재하지만 이름·이메일·전화번호가 모두 같은 확정 중복은 없음

## 매핑표

| 원본 필드 | 대상 도메인 | 대상 DB 필드 | 변환 규칙 | 필수 | 비고 |
| --- | --- | --- | --- | --- | --- |
| `producers.companyName` | Company | `companies.name` | 그대로 | 예 | 공연사 1건 |
| `producers.*` 연락·검증 | Company/CompanyMember | 해당 명시 컬럼 | 문자열·시각 파싱 | 부분 | 로그인 비밀번호는 별도 입력 필요 |
| `performances.id` | Performance | `performances.source_id` | 문자열 원본 ID 보존 | 예 | 내부 ID는 BIGINT |
| `performances.producer` | Company | `company_id` | 회사명 일치 확인 | 예 | 이름 불일치 시 전체 import 거부 |
| `postings.id` | Posting | `postings.source_id` | 문자열 원본 ID 보존 | 예 | 내부 ID는 BIGINT |
| `postings.status` | Posting | `status` | `UPCOMING/OPEN/CLOSED` 열거형 파싱 | 예 | 문서 상태와 일치 |
| 모집 시작·종료 | Posting | UTC `DATETIME(6)` | 시작일 서울 00:00 포함, 종료 다음 날 서울 00:00 제외 | 예 | [0011 결정](./decisions/0011-active-company-and-seed-boundaries.md) |
| `roles.id` | Role | `roles.source_id` | 문자열 원본 ID 보존 | 예 | 내부 ID는 BIGINT |
| 배역 조건 | Role | 성별·나이·정원 컬럼 | nullable 숫자/문자 파싱 | 부분 | 불일치는 차단이 아닌 참고 정보 |
| `applicationFields` | Posting form | 필드/설정 테이블 | config는 JSON 보존 | 예 | 기본 필수 8개 정책과 비교 검증 |
| `applications.id` | Application | 미이관 | 73건 전체 제외 | 아니오 | 필수 거주지·동의·Applicant가 없음 |
| `applications.roleId` | ApplicationRole | `role_id` | 공고 소속 검증 후 연결 | 예 | 원본은 지원서당 단일 배역 |
| `careers` | ApplicationAnswer | 답변 JSON | 순서대로 배열 구성 | 아니오 | 프로필 자동 저장 금지 |
| `photos.url` | Snapshot photo | URL 값 | 다운로드 없이 URL 보존 | 아니오 | 최대 4장, 목표 최대 10장 이내 |
| `reviews`, `roundClosures` | Screening | 미이관 | 이번 세로 슬라이스 범위 밖 | 아니오 | 심사 도메인을 임의 추가하지 않음 |
| `applicantSide.profile` | ApplicantProfile | 미이관 | 인증 계정 없는 단일 UI 상태 제외 | 아니오 | 임의 계정 귀속 금지 |
| `applicantSide.myApplications` | Application | 미이관 | 최신 정책과 충돌 | 아니오 | lookupCode·editable 계약을 부활시키지 않음 |

## 데이터 매핑 불일치

### 제출 지원서 73건

- 문제 필드: 필수 `거주지`, 제출 동의 스냅샷, 인증 Applicant 참조가 없음
- 문서 기준: 기본 정보 8개와 필수 수집·이용/제3자 제공 동의가 있어야 제출할 수 있음
- 결정: [0011](./decisions/0011-active-company-and-seed-boundaries.md)에 따라 73건과 종속 경력·사진·심사·차수 마감을 모두 제외
- 이유: 거주지·동의·계정을 만들어 넣으면 실제 제출 사실을 조작함

### 식별자

- 문제 필드: 공연·공고·배역은 `po1`, `po1_r1` 같은 문자열 ID지만 목표 API는 `Long`
- 매핑: 내부 BIGINT를 새로 발급하고 원본 값을 `source_id`로 보존
- 이유: 외부 참조를 잃지 않으면서 API 계약을 유지함

### 날짜만 있는 모집 경계 — 결정됨

- 문제 필드: 일부 모집 시작·종료는 날짜만 있어 정확한 시각이 없음
- 매핑: 시작일 Asia/Seoul 00:00 포함, 종료일 다음 날 Asia/Seoul 00:00 제외
- 저장: 각 경계를 UTC `DATETIME(6)`로 변환

## 실제 이관 검증

- 2026-08-12 로컬 MySQL 8.4에서 원본 파일을 두 번 실행했다.
- 두 실행 모두 공연사 1, 공연 5, 공고 5, 배역 16, 지원 양식 56건을 유지해 중복이 생기지 않았다.
- 이미지 파일을 다운로드하지 않았고 공연 poster의 원격 URL만 저장했다.
