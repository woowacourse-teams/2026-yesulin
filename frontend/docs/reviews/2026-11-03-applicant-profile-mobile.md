# 배우 프로필 모바일 점검

> 아래는 최초 점검 시점의 기록이다. 후속 수정에서 F01/F02는 FIXED로 확인했다.
> [수정 평가](../../../backend/src/main/java/art/yesulin/actor/docs/reviews/2026-11-03-actor-profile-input-fix.md)에
> 변경 내용·회귀 테스트·모바일 재검증·남은 미확인 범위를 기록했다.

- 작업 ID: `2026-11-03-applicant-profile-mobile`
- 평가일: 2026-11-03, Asia/Seoul
- 도메인 / 평가표: 배우 프로필 / mobile-v1
- 요청 범위: 동작 점검. 제품 코드·설정·의존성 수정 없음.
- 독립 평가: 1회, 읽기 전용. Claude CLI가 없어 별도 Codex 에이전트로 대체.
- 판정: **조건부**. 기존 P2 문제 2건 OPEN, 필수 미확인 항목 5건.
- PR: 생성하지 않음. 최초 기록 PR은 `PENDING`이며 다음 PR 본문에 같은 ID로 옮긴다.

## 기준과 환경

`AGENTS.md` → `frontend/AGENTS.md`, 공통 문서 라우터와 평가 절차,
`frontend/docs/design-system.md`, `frontend/docs/user-flows/applicant.mmd`,
`frontend/docs/msw-scenarios.md`를 읽었다. PDF는 공용 PDF 도메인의
`docs/README.md` → `docs/AGENTS.md` → AI 흐름·프로필 계약을 확인했다.
배우 프로필 도메인에는 별도 docs 진입 파일이 없어 기존 배우 흐름·HTTP 계약·구현을 기준으로 점검했다.
백엔드 DTO 해석에는 `backend/AGENTS.md`, `backend/docs/api.md`의 배우 프로필 절,
`docs/api-conventions.md`를 적용했다.

- Next.js 개발 서버, 명시적 MSW 활성화. 실제 API 전환 플래그와 분석·오류 수집 키는 비활성화.
- 로컬 목 프로필과 저장소의 공개 fixture 사진만 사용했다. 실제 계정·운영 데이터는 변경하지 않았다.
- 브라우저 뷰포트 설정값과 CSS 픽셀값이 달라 DOM의 `innerWidth`를 확인해 보정했다.
  주 점검은 CSS 390×844, 추가 점검은 CSS 너비 360이었다.
- 390px에서 문서 clientWidth/scrollWidth 모두 373, 360px에서 모두 343이었다.
  스크롤바를 제외한 문서 너비에 가로 넘침은 없었다. 360px 항목 메뉴에는 내부 가로 스크롤이 있다.
- 후속 새로고침·분리 세션에서 목 초기화 지연과 스타일 미적용을 관찰했다.
  이 환경의 PDF 모달·320px·미리보기 시각 결과는 제품 결함으로 확정하거나 PASS 처리하지 않았다.

## 평가표 mobile-v1

평가 항목은 점검 시작 시 정의했으며, 제품 구현 변경은 하지 않았다.

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 방법·근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| M01 | 390/360/320px 레이아웃: 페이지 넘침·버튼 겹침 | 모든 크기에서 폼 접근 가능 | 390/360 DOM·스크린샷 정상. 320은 환경 문제로 유효한 시각 근거 없음 | 예 | UNVERIFIED |
| M02 | 기본·추가정보: 탭 이동으로 입력 유실·저장 실패 | 탭을 오가도 값을 유지하고 함께 저장 | 이름과 특기 변경→탭 왕복→저장 완료·버튼 비활성·공개 안내 확인 | 예 | PASS |
| M03 | 숫자·날짜·연락 입력: 빈 숫자 변형·잘못된 날짜 전송 | 빈값 보존, 유효하지 않은 값은 수정 안내 | F01/F02 재현. 잘못된 이메일은 오류 안내와 저장 차단 확인. 연락처 실기기 입력은 M08 | 예 | FAIL |
| M04 | 사진 등록·대표·순서: 등록 누락·오동작 | 추가 사진 표시 및 대표·순서 변경 반영 | 목 사진 대표 변경·앞으로 이동·fixture 삭제 후 같은 테스트 이미지 추가, 3/3 및 파일명 확인 | 예 | PASS |
| M05 | 영상: 잘못된 주소·중복 등록 | 오류·중복 차단, 새 YouTube 링크 추가 | example.com 거절, 기존 ID 중복 거절, 다른 ID 추가 후 2/3 확인 | 예 | PASS |
| M06 | PDF 모달: 결과 적용·닫기·모바일 레이아웃 | 고른 값만 입력, 별도 저장, 모달 조작 가능 | 결과 seed의 중복 비활성·선택 경력 적용→추가정보 4건·미저장 안내 확인. 모바일 시각/키보드 근거 부족 | 예 | UNVERIFIED |
| M07 | 배우 페이지 설정·미리보기 | 설정 반영 및 미리보기 정상 | 목 아이디 저장·자기소개 토글 반영. 미리보기는 유효한 완료 화면 미확보 | 예 | UNVERIFIED |
| M08 | 실제 모바일 Safari: 키보드·파일 선택 | 포커스·화면 확대·파일 입력 정상 | 실제 iOS/Android 기기 실행하지 않음. 입력 글꼴 13px 관찰만으로 자동 확대를 확정하지 않음 | 예 | UNVERIFIED |
| M09 | 실제 API·S3: 인증·저장·새로고침 유지·업로드 실패/재시도 | 실제 저장과 복구 확인 | legacy MSW 경로만 실행. 실제 인증·API·S3 요청·재시도·중단 복구 미실행 | 예 | UNVERIFIED |
| M10 | 미사용 파일·코드·설정·의존성·옛 문서 | 이번 작업이 불필요한 제품 자산을 남기지 않음 | 제품 diff 없음, 새 산출물은 이 평가 기록과 아래 근거 캡처뿐. 기존 미추적 파일은 범위 밖 | 예 | PASS |

실제 공개 동의·페이지 게시·타인 권한 변경은 점검 대상에서 제외했다. 목 설정까지 점검했으며 공개는 하지 않았다.
실제 API의 중복·권한·복구는 M09에서 미확인으로 유지했다.

## 확정 문제

### 2026-11-03-applicant-profile-mobile-F01

- 심각도 / 유형 / 유입 / 발견 경로: `P2 / CODE / EXISTING / PRECHECK`
- 최초 확정: `2026-11-03T11:33:11+09:00` (재현 캡처 생성 시각)
- 최초 기록 PR / 상태 / 해결 시각: `PENDING / OPEN / —`
- 근거: `src/components/applicants/profile-editor-sections.tsx:49`는 숫자 입력에서
  `Number(event.target.value)`를 사용한다. 키 166을 모두 지우면 즉시 0으로 다시 표시됐다.
- 영향: 선택 숫자 항목을 빈칸으로 유지할 수 없다. 실제 계약의
  `src/features/applicants/profile-contract.ts:200`은 0을 null로 변환하므로 실제 저장은 삭제로 해석한다.
  `profile-editor.tsx:50-58`의 기준값은 저장 응답으로 바뀌지만 편집 값은 0을 유지해,
  저장 후에도 변경 표시가 남을 수 있다. 후자는 코드 경로로 확인했으며 실제 서버로 재현하지 않았다.
- 구분: 목은 0을 그대로 받아 저장 성공했다. 실제 서버가 0 때문에 저장을 거절한다고 판정하지 않았다.
- 조치: 수정 없이 보고. 빈 문자열과 숫자를 구분하고 저장 응답과 편집 상태를 일치시키는 방향이 필요하다.
- 수정 후 검증: 수정하지 않아 N/A.

### 2026-11-03-applicant-profile-mobile-F02

- 심각도 / 유형 / 유입 / 발견 경로: `P2 / CODE / EXISTING / PRECHECK`
- 최초 확정: `2026-11-03T11:33:27+09:00` (재현 캡처 생성 시각)
- 최초 기록 PR / 상태 / 해결 시각: `PENDING / OPEN / —`
- 근거: `src/components/applicants/profile-editor-sections.tsx:46`은 생일 필드에 `invalid={false}`를
  고정하며, `profile-editor.tsx:62-85`의 저장 검사에 날짜 검증이 없다.
  19990231 입력·포커스 이동 후 aria-invalid는 없고, 저장 클릭 시 요청이 시작됐다.
- 영향: 존재하지 않는 날짜·미완성 날짜·미래 날짜를 해당 입력란에서 안내하지 않고 전송한다.
  실제 서버는 `UpdateProfileBasicInformationRequest`의 `LocalDate` 파싱과 `@PastOrPresent`로 거절한다.
  잘못된 날짜가 실제 서버에 저장된다는 판정은 아니다.
- 조치: 수정 없이 보고. 기존 `isValidBirthDate` 및 미래 날짜 확인을 저장 검사·필드 오류에 연결하는 방향이 필요하다.
- 수정 후 검증: 수정하지 않아 N/A.

## 독립 평가와 검증

별도 읽기 전용 평가가 위 두 문제를 확인했다. F01의 서버 영향은 실제 변환 함수를 대조해
**0 전송 실패가 아닌 null 삭제 및 편집 상태 불일치**로 정정한 뒤 기록했다.
평가자는 탭 상태 공유, 사진·영상 코드 경로, PDF 모달의 포커스·Escape·원래 초점 복귀 코드도 검토했다.
정적 경로 확인을 실기기 실행 PASS로 바꾸지 않았다.

실행 명령 (`frontend/`):

```sh
npm test -- src/components/applicants/profile-editor-sections.test.tsx src/components/applicants/profile-import.test.tsx src/features/applicants/profile-contract.test.ts src/features/applicants/profile-import.test.ts src/features/applicants/profile-careers.test.ts src/mocks/applicants/store.test.ts
```

결과: **6개 파일, 51개 테스트 PASS**. 제품 코드를 수정하지 않아 별도 lint/build는 실행하지 않았다.
테스트 통과는 발견 문제의 해결이나 실제 모바일/API 검증을 의미하지 않는다.

스크린샷은 저장소 루트 `output/profile-mobile-audit-2026-11-03/`에 있다.
`01-save-prompt-390.jpg`는 저장 완료 뒤 공개 안내,
`02-height-cleared-to-zero-390.jpg`는 숫자 삭제 재현 시점,
`03-invalid-birth-submit-390.jpg`는 잘못된 날짜 저장 요청 시점,
`04-email-error-390.jpg`는 이메일 오류,
`05-photo-added-360.jpg`, `06-video-added-360.jpg`는 보관함 점검 시점이다.
캡처만으로 화면 밖 값·실제 서버 응답을 증명하지 않으며 위 DOM 관찰·코드 근거와 함께 사용한다.

## 집계와 추가 전용 사건 이력

| 작업 ID | 평가표 | 독립 평가 | 필수 PASS | FAIL | UNVERIFIED | N/A | 검증률 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 2026-11-03-applicant-profile-mobile | mobile-v1 | 1회 | 4 | 1 | 5 | 0 | 40% |

| 신규 발견 | 해결 | 미해결 | P0 | P1 | P2 | P3 | PRECHECK | INDEPENDENT_REVIEW | POST_FIX_CHECK | EXTERNAL | 오탐 | 미확인 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 0 | 2 | 0 | 0 | 2 | 0 | 2 | 0 | 0 | 0 | 0 | 5 |

| 사건 ID | 문제 ID | 사건 | 발생 시각 | 근거 | 관련 PR |
| --- | --- | --- | --- | --- | --- |
| E01 | 2026-11-03-applicant-profile-mobile-F01 | CONFIRMED | 2026-11-03T11:33:11+09:00 | 숫자 삭제 DOM 관찰 및 변환 코드 | PENDING |
| E02 | 2026-11-03-applicant-profile-mobile-F02 | CONFIRMED | 2026-11-03T11:33:27+09:00 | 날짜 입력·요청 시작 관찰 및 저장 검사 코드 | PENDING |
| E03 | 2026-11-03-applicant-profile-mobile-F01 | FIXED | 2026-11-03T11:50:14+09:00 | 후속 수정 평가 I01·I05·I06·I07: 숫자 삭제 계약·상태·모바일 회귀 PASS | PENDING |
| E04 | 2026-11-03-applicant-profile-mobile-F02 | FIXED | 2026-11-03T11:50:14+09:00 | 후속 수정 평가 I02·I03·I04·I06·I07: 날짜 차단·복구·모바일 회귀 PASS | PENDING |
