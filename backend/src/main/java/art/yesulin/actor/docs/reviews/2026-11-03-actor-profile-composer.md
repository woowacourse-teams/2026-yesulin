# 배우 프로필 작성·공유 UX 평가

- 작업 ID: `2026-11-03-actor-profile-composer`
- 평가표 v1 / 2026-11-03 / PR: PENDING
- 범위: 사진 관리 통합, 화면 내 저장본 미리보기, 공개 성공 후 QR·공유, 공개 페이지 위계.
- 공개 동의·14세·잠금·공개 사본 계약은 유지한다. 사진 자르기와 경력 고정은 별도 데이터 설계가 필요해 이번 범위에서 제외한다.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| C01 | 사진 추가·공개·대표·순서 | 한 화면에서 처리, 비공개 사진 자동 공개 없음 | 컴포넌트 테스트·브라우저 | Y | PASS |
| C02 | 사진 저장 실패·중복 | 이전 순서 유지·오류·재시도, 중복 요청 방지 | 테스트 | Y | PASS |
| C03 | 미리보기 전환·중단/복구 | 입력값·아이디·펼침 상태 유지, 저장본임을 명시 | 테스트·브라우저 | Y | PASS |
| C04 | 미리보기 실패 | 재시도, 입력으로 복귀 가능 | 테스트 | Y | PASS |
| C05 | 공개 실패·취소·미동의 | 완료 화면·QR 표시하지 않음 | 기존 공개 API·다이얼로그 테스트 | Y | PASS |
| C06 | 공개 성공·부분 사진 실패 | 성공 응답 뒤 주소·QR, 실패 사진 안내·복구 | 테스트·브라우저 | Y | PASS |
| C07 | 공유 취소·복사 실패·QR 실패 | 성공 오표시 없음·복구 안내, QR과 링크 동일 | 테스트 | Y | PASS |
| C08 | 공개 상세 위계·빈 소개 | 문의 유지·소개/영상 우선, 긴 소개 펼침 | 테스트·브라우저 | Y | PASS |
| C09 | 320/390px·데스크톱 | overflow 없음·44px 조작·키보드 접근 | 브라우저·lint·build | Y | PASS |
| C10 | 미사용 코드·파일·의존성·문서 | 중복 사진 설정 제거·참조 유지 | 독립 평가 | Y | PASS |
| C11 | 실제 기기·실제 API/S3 공개 | 운영 환경 동작 | 별도 환경 필요 | N | UNVERIFIED |

독립 평가: 읽기 전용 1회 완료. 상대 CLI가 없어 같은 종류의 별도 에이전트로 대체했다.
실제 iOS/Android와 운영 API 검증은 로컬 목 검증으로 대체하지 않는다.

## 문제·사건 이력

| 문제 ID | 심각도·유형·유입 | 최초 확정 | 최초 PR | 근거·조치 | 상태 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-03-actor-profile-composer-F01 | P3 / UNUSED / INTRODUCED | 2026-11-03T12:52:16+09:00 | PENDING | 중복 사진 UI 제거 후 `pageRepresentativePhoto`가 테스트에만 남음. 통합 사진 관리에서 재사용 | FIXED / 2026-11-03T12:56:01+09:00 |
| 2026-11-03-actor-profile-composer-F02 | P3 / FLOW / INTRODUCED | 2026-11-03T12:52:16+09:00 | PENDING | 미저장 안내가 저장본 미리보기 허용과 충돌. 공개 전 저장과 저장본 미리보기 문구로 구분 | FIXED / 2026-11-03T12:56:01+09:00 |

| 사건 ID | 문제 ID | 종류 | 시각 | 경로·근거·PR |
| --- | --- | --- | --- | --- |
| C-E01 | 2026-11-03-actor-profile-composer-F01 | CONFIRMED | 2026-11-03T12:52:16+09:00 | INDEPENDENT_REVIEW / 제품 참조 없음 / PENDING |
| C-E02 | 2026-11-03-actor-profile-composer-F02 | CONFIRMED | 2026-11-03T12:52:16+09:00 | INDEPENDENT_REVIEW / 안내·실제 동작 비교 / PENDING |
| C-E03 | 2026-11-03-actor-profile-composer-F01 | FIXED | 2026-11-03T12:56:01+09:00 | 통합 사진 관리 제품 참조·대표/순서 테스트 PASS / PENDING |
| C-E04 | 2026-11-03-actor-profile-composer-F02 | FIXED | 2026-11-03T12:56:01+09:00 | 공개 전 저장·저장본 미리보기 문구 확인, 폼 보존 테스트 PASS / PENDING |

## 검증 근거

- 로컬 MSW, 2026-11-03: 빈 프로필 → 기본 3항목 저장 → 사진 3장 추가(모두 비공개) → 사진 2·3 공개 → 사진 3을 첫 공개 위치로 이동 → 아이디 저장 → 필수 동의 후 공개 → 완료 QR. 첫 비공개 사진은 공개하지 않음.
- 320·390 CSS px: 사진 카드 가로 overflow 없음, 조작 높이 44px(소수점 반올림 오차 제외). 1440 CSS px: 입력/미리보기 각 528px 나란히 표시.
- 미저장 이름 입력 후 미리보기/입력 전환 시 값 유지, 저장본 미입력 이름 표시. 공개 상세 문의가 기본정보 안에 있고 짧은 소개는 펼침 없이 표시됨.
- 스크린샷: `output/profile-composer-2026-11-03/{photos-320,photos-390,edit-preview-desktop,public-profile-desktop}.jpg` (로컬 검증 산출물, 커밋 제외).
- 관련 테스트: `profile-photo-library.test.tsx` 순서/실패/중복/공개 사본 복구, `profile-editor.test.tsx` 입력·펼침 보존과 완료/복귀, `actor-page-inline-preview.test.tsx` 실패·옛 응답 무시, `actor-page-publish-dialog.test.tsx` 동의·중복·실패, `actor-page-published.test.tsx` QR/주소/공유/부분 실패, `actor-page-detail.test.tsx` 소개 펼침·문의 위치.
- 1차 관련 테스트 37파일 226항목 PASS, lint PASS. 평가 후 표적 검증과 production build 결과는 아래에 추가한다.
- GitHub 인증 만료로 이슈·PR 미생성. 새 브랜치 `feat/actor-profile-event-ux`에 이전 프로필 작업과 함께 보존한다.


## 최종 결과

- 독립 평가 1회, 필수 PASS 10 / FAIL 0 / UNVERIFIED 0 / N/A 0, 필수 검증률 10/10(로컬·테스트 범위).
- 비필수 UNVERIFIED 1: 실제 iOS/Android 키보드·실제 API/S3 공개. 미확인 총 1건이며 결함 수에 더하지 않는다.
- 신규 확정 발견 2 / 해결 2 / 미해결 0 / P0 0·P1 0·P2 0·P3 2 / 오탐 0.
- 발견 경로 PRECHECK 0 / INDEPENDENT_REVIEW 2 / POST_FIX_CHECK 0 / EXTERNAL 0.
- 수정 후 관련 테스트 37파일 **227항목 PASS**. 전체 lint PASS. `npm run build -- --webpack` PASS(컴파일·TypeScript·정적 페이지 56개).
- 새 QR 의존성 없음(기존 qrcode 사용). 중복 사진 UI 제거, 대표 계산 helper에 제품 소비자 유지. 기존 별도 미리보기 경로는 직접 접근·이전 링크 호환 용도로 유지한다.
- 사진 자르기·대표 경력 고정, 새로고침 시 미저장 초안 영속화는 이번 범위 밖이다. 실제 운영 공개를 수행하지 않았다.
