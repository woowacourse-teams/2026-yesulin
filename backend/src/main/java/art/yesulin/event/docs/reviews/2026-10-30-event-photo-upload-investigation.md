# 모바일 무료 명함 사진 업로드 조사

- 작업 ID: `2026-10-30-event-photo-upload-investigation`
- 평가일: 2026-10-30, 평가표 v1, 도메인: event
- 범위: 원인 조사. 제품 코드·API·의존성 수정, 배포, PR 생성 없음.
- 제보: 갤럭시 퀀텀5 추정, 주로 모바일에서 사진 등록 어려움. 실제 사진·브라우저·오류 문구·운영 로그 미확보.
- 독립 평가 1회: 별도 Codex 에이전트가 읽기 전용으로 코드와 진단을 점검. `claude` 실행 파일이 없어 동일 종류로 대체.

## 흐름과 평가표

관련 계약은 `backend/docs/api.md`의 이벤트 참가 신청 절, 구현은 `PhotoField` → `shrinkPhoto` →
`uploadEventRegistrationPhoto` → `safeUpload` → `EventRegistrationService.claimPhoto`다.
아래 항목은 제품 수정 전에 조사 기준으로 사용했다. PASS는 명시된 코드·모킹 검증 범위만 뜻한다.

| ID | 흐름·실패 조건 | 기대 결과·검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| C01 | 원본과 전송 크기 혼동 | 원본 50MiB, JPEG 긴 변 1600px, 출력 허용 8MiB, 서버 5MiB를 코드로 구분 | 예 | PASS |
| C02 | 지원하지 않는 이미지 해독 | 오류 문구와 busy 해제·재선택 가능을 코드 및 오류 주입으로 확인 | 예 | PASS |
| C03 | 준비·전송 Promise 미응답 | 일정 시간 후 사용자가 취소·재선택 가능해야 함. 두 단계에 미응답 주입, 가상 5분 경과 | 예 | FAIL |
| C04 | 전송 오류·재시도·기존 사진 보호 | 공용 업로더의 제한적 재시도, finally 잠금 해제, 성공 후 교체를 코드·기존 테스트로 확인 | 예 | PASS |
| C05 | 테스트를 실제 모바일 성공으로 오인 | 사진 처리·업로드 모킹과 실제 해독 검증의 차이를 테스트 파일로 확인 | 예 | PASS |
| C06 | 제보 환경의 실제 실패 | 원본·브라우저·오류 화면 또는 로그로 원인 확정 | 예 | UNVERIFIED |
| C07 | 조사 산출물 정리 | 제품 diff 없음, 임시 진단 테스트 제거, 문서 링크와 기존 미추적 파일 보존 확인 | 예 | PASS |
| C08 | 변환 결과가 서버 5MiB 초과 | 실제 1600px JPEG 결과로 초과 재현 여부 확인 | 예 | UNVERIFIED |

필수 PASS 5 / FAIL 1 / UNVERIFIED 2 / N/A 0. 검증률 5/8 = 62.5%로, 실제 모바일 성공률이 아니다.
권한 변경·중복 신청·마감 정책 변경은 이번 사진 조사 범위 밖이며 구현을 변경하지 않았다.

## 검증 근거

- `frontend/src/features/companies/photo-image.ts`: 원본을 네이티브 `createImageBitmap` 또는 `Image.decode`로 해독한 뒤 canvas JPEG 변환.
  HEIC/HEIF 확장자 허용과 별도 디코더 지원은 다르며, 별도 변환 디코더는 없다. 원본 해독 전 픽셀 수 제한은 없다.
- `frontend/src/components/events/event-registration-actor.tsx`: 준비·업로드 종료까지 busy 유지. 변환 실패는 화면에만 표시하며
  `reportError` 호출이 없다. 네트워크 업로드 오류 일부는 `safe-upload.ts`에서 수집하므로 전체 오류 미수집으로 표현하지 않는다.
- `event-business-card-editor.tsx`: busy 동안 닫기·완료 차단. PhotoField의 재선택도 차단되고 취소·시간 제한 경로가 없다.
- `frontend/src/features/events/api.ts`: 업로드 완료 콜백은 비어 있고 PUT 성공 후 사진 등록을 표시한다.
  실제 저장 객체 검증은 최종 신청의 `claimPhoto`에서 수행한다.
- `npm test -- src/features/companies/photo-image.test.ts src/components/events/event-registration-form.test.tsx src/features/files/safe-upload.test.ts`
  (frontend, 2026-10-30): 3파일 26개 통과. 실제 모바일 해독·전송 성공의 근거는 아니다.
- 기존 신청 폼 테스트를 복사한 임시 테스트에서 준비 미응답·전송 미응답에 각각 가상 300,000ms를 적용했다.
  두 경우 모두 닫기·재선택 차단이 유지됐다. 해독 오류가 반환되는 경우 오류 표시와 재선택 복구도 확인했다.
  기존 13개 + 진단 3개 = 16개 통과. 이 통과는 결함 조건 재현을 뜻하며 제품 수정 검증이 아니다.
  실행 후 임시 테스트 파일은 제거했다. 실제 기기에서 5분 대기한 실험이 아니다.
- 로컬 HEIC 검사용 fixture 생성은 `sips` 오류로 실패해 실제 브라우저 HEIC 재현을 수행하지 못했다.
- 정리 점검: 제품 파일·설정·의존성의 추가/수정/삭제 없음. 도메인 문서 입구와 이번 평가 기록만 추가.
  기존 미추적 audit 평가 문서·output·tmp는 사용자 작업으로 보존했다.

## 확정 문제

### 2026-10-30-event-photo-upload-investigation-F01

- 심각도: P2 / 유형: FLOW / 유입: EXISTING / 발견 경로: PRECHECK / 상태: OPEN
- 최초 확정: 2026-10-30T18:37:49+09:00 / 최초 기록 PR: PENDING / 해결 시각: 없음
- 문제: 사진 준비 또는 전송이 끝나지 않으면 화면에서 취소·재선택할 수 없다. 닫기·완료·신청도 차단된다.
- 근거: C03의 코드 점검과 가상 시간·미응답 주입 재현. 갤럭시 제보 원인으로 확정하지 않는다.
- 조치: 조사 결과 보고. 수정하지 않았으므로 수정 후 검증은 N/A.
- 후속 방향: 단계별 시간 제한과 취소·재시도, 늦게 도착한 결과 무시, 기존 입력 보존을 함께 설계한다.

| 사건 ID | 문제 ID | 종류 | 발생 시각 | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-10-30-event-photo-upload-investigation-F01 | CONFIRMED | 2026-10-30T18:37:49+09:00 | C03 코드·모킹 재현, PENDING |

## 집계와 미확인 범위

- 발견 1 / 해결 0 / 미해결 1 / P0 0 / P1 0 / P2 1 / P3 0 / 오탐 0
- 발견 경로: PRECHECK 1 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0
- 미확인 항목 2: 실제 모바일 원인(C06), 5MiB 초과 변환 결과(C08).
- HEIC 호환성·고해상도 원본 해독 부담은 원인 후보다. 실제 파일과 브라우저가 없어 확정하지 않는다.
- 8MiB/5MiB 상수 불일치는 확인했지만 실제 인코더 출력 초과를 재현하지 못해 확정 장애로 집계하지 않는다.
- 변환 단계 진단 공백은 확인했으며 별도 사용자 장애로 중복 집계하지 않는다.
- 독립 평가는 위 결론에 동의하고 상수 불일치·HEIC를 실제 장애 원인으로 단정하지 말 것을 확인했다.
- 결과: 조사 수행 완료, 제품 결함은 미해결이며 실제 모바일 원인 판단은 조건부다. PR 게시 없음.

외부 참고: [삼성 카메라 형식 안내](https://www.samsung.com/us/support/answer/ANS10001353/),
[WebKit HEIC 지원 안내](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/).
이 자료는 형식·브라우저 차이가 존재한다는 근거이며 해당 제보 기기의 설정을 증명하지 않는다.

## 후속 해결 기록

위 집계는 최초 조사 시점의 상태다. 사용자의 후속 구현 요청에 따라
[복구·진단 작업](2026-10-30-event-photo-upload-recovery.md)에서 기존 F01을 해결했다.
현재 F01 상태는 FIXED, 해결 시각은 2026-10-30T19:17:00+09:00이다. 최초 확정 시각·발견 경로·최초 PR은 유지한다.

| 사건 ID | 문제 ID | 종류 | 발생 시각 | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| E02 | 2026-10-30-event-photo-upload-investigation-F01 | FIXED | 2026-10-30T19:17:00+09:00 | 단계별 제한·취소·늦은 결과 차단·재선택 테스트 및 독립 평가, PENDING |

현재 누적: 발견 1 / 해결 1 / 미해결 0 / P2 1. 실제 제보 기기에서의 최초 실패 원인은 여전히 미확인이다.
