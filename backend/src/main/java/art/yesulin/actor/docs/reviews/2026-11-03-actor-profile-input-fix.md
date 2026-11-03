# 배우 프로필 입력 오류 수정 평가

- 작업 ID: `2026-11-03-actor-profile-input-fix`
- 평가일: 2026-11-03, Asia/Seoul
- 도메인 / 평가표: actor / profile-input-v1
- 사전 평가표 작성 후 구현. 독립 평가 1회 완료, 신규 확정 결함 없음.
- 판정: 입력 오류 2건 수정·검증 완료. 실제 기기·API/S3는 미확인인 조건부 결과.
- 기존 문제: `2026-11-03-applicant-profile-mobile-F01`, `2026-11-03-applicant-profile-mobile-F02`.
- 기존 점검: 저장소 루트 `frontend/docs/reviews/2026-11-03-applicant-profile-mobile.md`.
- 최초 기록 PR: PENDING. 이번 작업에서 PR 생성 요청은 없음.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| I01 | 키·몸무게 삭제 후 0 재등장 | 빈칸 유지, 저장 시 null/삭제 계약, 저장 완료 표시 | 편집기 회귀 테스트의 HEIGHT/WEIGHT 삭제 왕복·legacy 삭제 목록·저장 비활성 확인, 390px 두 입력 공백 저장 확인 | 예 | PASS |
| I02 | 유효·빈 생일이 저장 차단됨 | 윤년 포함 정상 날짜·빈값 저장 가능 | 날짜 단위 테스트·생일 빈값 저장 테스트, 브라우저 20000229 저장 완료 | 예 | PASS |
| I03 | 미완성·없는 날짜·미래 생일 전송 | 요청 차단·필드 오류·초점 이동, 고치면 복구 | 편집기 19990231/1999023/20990101 요청 0회·수정 후 1회, 브라우저 aria-invalid/설명 연결·초점·복구 확인 | 예 | PASS |
| I04 | 한국 시간 날짜 경계 | 한국 시간 오늘까지 허용 | 2026-11-03T14:59:59Z/15:00:00Z 고정 시각 테스트 | 예 | PASS |
| I05 | 다른 탭·저장 중 수동 수정 유실 | 탭 이동/저장 실패 시 작성 값 유지 | 탭 왕복·늦은 성공 응답·실패 후 재시도 각각 편집기 테스트 | 예 | PASS |
| I06 | 반응형·오류 설명 겹침 | 390/360/320px과 데스크톱에서 필드·오류 접근 가능 | CSS 너비 390/360/320/1440의 clientWidth=scrollWidth, 오류 캡처 확인 | 예 | PASS |
| I07 | 정적 검증·기존 흐름 회귀 | 관련 테스트·lint·build 통과 | 관련 16파일 95테스트·전체 lint·변경 파일 최종 lint·Webpack production build 통과 | 예 | PASS |
| I08 | 새 미사용 파일·코드·문서 | 소비자/링크 존재, 불필요한 의존성 없음 | 독립 평가·이동한 함수의 소비자 검색·새 문서 링크 경로 확인, 의존성 변경 없음 | 예 | PASS |
| I09 | 실제 Safari 키보드·API/S3 | 실기기·실제 저장 정상 | 로컬 목만으로 PASS 처리하지 않음 | 예 | UNVERIFIED |

사진·영상·PDF 로직·공개 동의·권한은 변경하지 않는다. 실제 인증·업로드·재시도는 I09의 미확인 범위이며,
이 수정의 중복 경계는 저장 완료 후 재저장 비활성화와 동일 오류 재검증으로 확인한다.

## 변경과 검증 근거

- `frontend/src/components/applicants/profile-editor-sections.tsx`: 키·몸무게 onChange가 빈 문자열을 숫자 0으로
  바꾸지 않게 했다. 생일 blur 시 오류를 표시하며 오류 설명을 입력란에 연결한다.
- `frontend/src/components/applicants/profile-editor.tsx`: 생일 오류가 있으면 API 호출 전에 저장을 막고
  기본정보 탭의 생일 입력란으로 초점을 옮긴다. 편집 상태 전체를 저장 응답으로 재설정하지 않아
  요청 중 추가로 쓴 내용을 덮어쓰지 않는다.
- `frontend/src/features/applicants/profile-input.ts`: 날짜 검사를 한 곳에 두고 한국 날짜 기준 미래를 검사한다.
  기존 날짜 유효성 함수는 UI 파일에서 이동했고 지원서 작성의 소비자 import도 갱신했다.
- API 요청·응답 형식, 분석 이벤트 의미, 업로드·공개 정책은 변경하지 않았다.
- 배우 도메인 docs 진입 파일이 없어 공통 평가 절차에 따라 README·AGENTS·입력 정책을 최소 추가하고
  공통 문서 라우터에서 연결했다. 정책은 기존 서버 계약과 수정한 UI 동작만 설명한다.

검증 환경: 2026-11-03, 로컬 Next.js Webpack 개발 서버, 명시적 MSW 활성화.
실제 API 전환·분석·오류 수집 키는 비활성화하고 가상 프로필을 사용했다.

`frontend/`에서 실행:

```sh
npm test -- --maxWorkers=2 src/components/applicants src/features/applicants src/features/applications
npm run lint
npm run build -- --webpack
```

- 테스트 16파일·95건 PASS. 이 중 편집기 회귀 테스트는 숫자 삭제 2개, 날짜 오류 3개,
  blur/탭 복귀, 빈 생일, 저장 중 새 입력 보호, 저장 실패/재시도를 포함한다.
- 전체 lint PASS. 이후 추가한 실패 복구 테스트·정리한 import를 포함해 변경 TS/TSX 파일의 최종 lint도 PASS.
- 기본 `npm run build`는 compile 단계에서 약 1분 40초 동안 진전 없이 대기하고 Node CPU가 0%여서 중단했다.
  `npm run build -- --webpack`은 컴파일·TypeScript·56개 정적 페이지 생성·trace 수집을 모두 마치고 종료 코드 0.
- `git diff --check` PASS. 새 문서의 상대 경로와 API 절 링크를 확인했다.

브라우저는 실제 CSS 픽셀값을 읽어 뷰포트를 보정했다. 오류 표시 상태에서 문서 clientWidth/scrollWidth는
390px에서 373/373, 360px에서 343/343, 320px에서 303/303,
1440px에서 1423/1423이었다. 차이는 세로 스크롤바이며 가로 넘침은 없었다.
모바일 숫자 삭제→저장 완료/비활성, 잘못된 생일→오류 표시·생일 초점,
20000229 수정→오류 제거·저장 완료를 확인했다.
추가로 PDF **업로드 안내** 모달은 390/320px에서 가로 넘침 없이 열리고 닫은 뒤 트리거로 초점이 돌아왔다.
PDF 결과 전체와 실제 추출·업로드 및 배우 페이지 미리보기의 앞선 미확인 판정은 이 확인으로 대체하지 않는다.

캡처: 저장소 루트 `output/profile-mobile-fix-2026-11-03/`의
`01-birth-error-390.jpg`, `02-birth-error-360.jpg`, `03-birth-error-320.jpg`,
`04-birth-error-desktop.jpg`, `05-valid-birth-saved-390.jpg`,
`06-pdf-upload-dialog-390.jpg`, `07-pdf-upload-dialog-320.jpg`.

## 독립 평가

독립 평가 1회, 읽기 전용. Claude CLI가 없어 별도 Codex 에이전트로 대체했다.
새 확정 결함은 없으며 기존 F01/F02 수정, 날짜 소비자 이동, 문서 링크·미사용 신규 코드/의존성을 확인했다.
평가자의 저장 실패 복구 근거 보완 의견에 따라 실패 후 입력 유지·재시도 테스트를 추가하고 관련 95건을 실행했다.
브라우저·실제 기기 검증은 평가자의 정적 검토와 분리했다.

## 기존 문제 해결과 집계

문제 ID는 앞선 점검의 ID를 재사용하며 신규 발견으로 세지 않는다.

| 문제 ID | 심각도 / 유형 / 유입 / 최초 발견 경로 | 최초 확정 | 최초 PR | 상태 | 해결 시각 | 수정 후 검증 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-03-applicant-profile-mobile-F01 | P2 / CODE / EXISTING / PRECHECK | 2026-11-03T11:33:11+09:00 | PENDING | FIXED | 2026-11-03T11:50:14+09:00 | I01·I05·I06·I07 PASS |
| 2026-11-03-applicant-profile-mobile-F02 | P2 / CODE / EXISTING / PRECHECK | 2026-11-03T11:33:27+09:00 | PENDING | FIXED | 2026-11-03T11:50:14+09:00 | I02·I03·I04·I06·I07 PASS |

추가 전용 상태 사건 E03/E04는 원본 `frontend/docs/reviews/2026-11-03-applicant-profile-mobile.md`에 남겼다.
기존 E01/E02와 최초 점검 시점 표는 덮어쓰지 않았다. PR 게시 시 두 기록의 ID·사건 이력 링크를 함께 포함한다.

| 필수 PASS | FAIL | UNVERIFIED | N/A | 검증률 | 독립 평가 |
| ---: | ---: | ---: | ---: | ---: | --- |
| 8 | 0 | 1 | 0 | 88.9% | 1회 |

| 구분 | 발견 | 해결 | 미해결 | P0 | P1 | P2 | P3 | PRECHECK | INDEPENDENT_REVIEW | POST_FIX_CHECK | EXTERNAL | 오탐 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 이번 수정의 신규 확정 문제 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 재사용 기존 문제 누적 현황 | 2 | 2 | 0 | 0 | 0 | 2 | 0 | 2 | 0 | 0 | 0 | 0 |

미확인 항목 수는 이번 평가표 1건(I09)이며 기존 점검의 미확인 범위를 전부 해결했다는 뜻은 아니다.
실제 iOS/Android 키보드·파일 선택, 실제 인증·API/S3 저장·복구는 검증하지 않았다.

## 최초 PR 게시 연결

- 2026-11-03T18:30:17+09:00: 이 작업 기록과 문제 ID·추가 전용 사건 이력을 최초 게시 PR [#501](https://github.com/woowacourse-teams/2026-yesulin/pull/501)에 연결했다. 이전 `PENDING`·PR 미생성 문구는 당시 이력이며 최초 확정/해결 시각을 바꾸지 않는다. 본 기록에 있는 문제의 최초 기록 PR은 #501이다.
