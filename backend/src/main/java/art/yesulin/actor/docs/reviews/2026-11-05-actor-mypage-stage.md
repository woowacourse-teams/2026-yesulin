# 배우 마이페이지 무대형 개편

작업 ID `2026-11-05-actor-mypage-stage`, 평가일 2026-11-05, 배우 프로필 v1.
design-lab 시안 B(프로필 무대)를 실제 `/applicants`에 적용한다. 대표 사진·이름과 배우 페이지 상태를 크게 보이고,
아래에서 보관함과 최근 지원서를 전환한다. 공개 전환은 마이페이지에서 직접 하지 않고 기존 설정 탭의 동의·공개 사본 흐름으로 보낸다.
API 계약·분석 이벤트는 바꾸지 않았다.

| ID | 흐름 단계 / 실패 경계 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| M1 | 잠금·공개(아이디 유무)·자동 비공개·비공개·설정 조회 실패 | 상태 순서와 행동이 맞고 동의 없이 공개하는 경로 없음 | jsdom 테스트 6개, 코드 검토 | Y | PASS |
| M2 | 프로필 실패·지원서 실패·빈 상태 | 프로필 실패는 전체 재시도, 지원서 실패·빈 목록은 안내 | jsdom 테스트, 코드 검토 | Y | PASS |
| M3 | 이전 정보 유지 | 작성률·사진/영상 수·제출 후 수정 안내·지원서 링크·공고 둘러보기 유지 | 평가자 대조, 수정 후 확인 | Y | PASS(수정 후) |
| M4 | CSS 삭제·공유 규칙·모바일 배치 | 삭제 선택자 사용처 0, 공유 규칙 유지, 375px 가로 넘침 없음 | 저장소 검색, 임시 미리보기 PC·375px | Y | PASS |
| M5 | 코드 작성 규칙 | 새 코드 else·삼항 없음 | 코드 검토, eslint | Y | PASS |
| M6 | 미사용 코드·옛 문서 | 삭제 컴포넌트 참조 없음, 흐름 문서 갱신 | 저장소 검색 | Y | PASS(수정 후) |
| M7 | 테스트 | 관련 테스트 통과 | `src/components/applicants` 6파일 46테스트 | Y | PASS |

## 실행 근거

- `npx vitest run src/components/applicants` 6파일 46테스트 통과. 변경 파일 eslint 통과, 변경 파일 tsc 오류 없음.
- 전체 `npm test`의 `actor-pages/actor-screen-view.test.tsx` 6개 실패는 dev에서도 같게 실패하는 기존 문제로 이번 집계에서 제외한다.
- 목 환경에는 배우 로그인이 없어 실제 `/applicants` 경로는 열지 못했다. 같은 컴포넌트를 합성 데이터로 그린 임시 미리보기
  페이지에서 PC·375px를 확인한 뒤 삭제했다. 모바일 첫 화면에 공개 상태와 버튼이 들어오고 가로 넘침이 없었다.
- 자체 확인 중 기본정보 안내의 줄바꿈 깨짐과 모바일 버튼 두 줄 넘김을 고쳤다(구현 중 수정, 문제 건수에 넣지 않음).

## 독립 평가 1회

2026-11-05 읽기 전용 별도 평가 1회. 상대 도구를 쓸 수 없어 같은 종류의 별도 평가자로 대체했다.

| 문제 ID | 심각도 / 유형 / 유입 | 발견 경로 | 상태 | 근거·조치 |
| --- | --- | --- | --- | --- |
| 2026-11-05-actor-mypage-stage-F01 | P2 / POLICY / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 공개 범위를 "공연사"로 좁게 안내. `docs/domain.md` 기준 "누구나"로 수정 |
| 2026-11-05-actor-mypage-stage-F02 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | FIXED | "내 배우 페이지" 상단에 지원서 대표 사진 표시. 첫 공개 사진(페이지 대표) 우선, 없으면 보관함 대표. 테스트 추가 |
| 2026-11-05-actor-mypage-stage-F03 | P3 / FLOW / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 오디션 공고 둘러보기 링크 누락. 보관함·지원서 전환 줄 오른쪽에 복원 |
| 2026-11-05-actor-mypage-stage-F04 | P3 / UNUSED / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 파일 밖에서 쓰지 않는 `actorPageStatus` export 제거 |
| 2026-11-05-actor-mypage-stage-F05 | P3 / TEST / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 자동 비공개·아이디 없는 공개·프로필 실패 재시도 테스트 추가 |

의도한 생략(문제 아님): 인사말·페이지 설명 문구, 작성률 진행 막대(덜 채웠을 때 한 줄 안내로 대체), 사진·영상 분류 설명,
배역이 있을 때 지원서 카드의 공고명, 최근 지원서 2건 → 4건, 지원서가 기본 탭이 아닌 점.

| 사건 ID | 문제 ID | 사건 종류 | 발생 시각 | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E01 | F01~F05 | CONFIRMED | 2026-11-05T17:05:00+09:00 | 평가 보고 | PENDING |
| E02 | F01~F05 | FIXED | 2026-11-05T17:11:34+09:00 | 수정 후 applicants 46테스트·eslint 통과, 375px 확인 | PENDING |

## 판정

필수 PASS7 / FAIL0 / UNVERIFIED0 / N/A0, 검증률 7/7.
신규 발견5 / 해결5 / 미해결0, P0=0 P1=0 P2=1 P3=4. PRECHECK0 / INDEPENDENT_REVIEW5 / POST_FIX_CHECK0 / EXTERNAL0, 오탐0.
미확인: 실제 로그인 상태의 `/applicants` 화면(실제 API·사진 주소), 실제 iOS·Android 기기, `npm run build`.
