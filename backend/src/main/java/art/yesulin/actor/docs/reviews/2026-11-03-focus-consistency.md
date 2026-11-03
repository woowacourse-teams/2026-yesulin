# 공통 포커스·프로필 디자인 점검

- 작업 ID `2026-11-03-focus-consistency` / 평가표 v1 / PR PENDING
- 사용자 요청: 프로필의 두꺼운 포커스 표시와 디자인 요소를 점검하고 공통 표시를 통일한다.
- 범위: 공개 화면·프로필·지원서와 공통 입력 컨트롤. 기존 브랜드·탭 구성·저장·공개 흐름은 유지한다.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| F01 | 일반 입력·선택·긴 글 입력의 중복 테두리 | 하나의 얇고 분명한 포커스, 크기 변동 없음 | 실제 CSS 계산값·모바일/데스크톱 화면 | Y | PASS |
| F02 | @ 아이디·검색 등 묶음 입력 | 바깥 박스만 강조, 내부 입력에 별도 외곽선 없음 | UI 조작·계산값 | Y | PASS |
| F03 | 버튼·링크·탭·체크박스 키보드 이동 | 2px 표시·기본 2px 간격, 누른 상태와 초점 구분 | Tab/Shift+Tab·클릭 | Y | PASS |
| F04 | 오류·비활성·복구 상태 | 오류 문구·색과 초점 유지, 비활성 상태 보존 | UI 조작·관련 회귀 테스트 | Y | PASS |
| F05 | 좁은 프로필 헤더·글자·모서리 | 설명문 읽기 폭 확보, 모바일16px·44px 조작·공통12px 모서리 | 390/320px·데스크톱 화면 | Y | PASS |
| F06 | 정리·독립 평가 | 중복 규칙 정리, 미사용 변경·기능 회귀 없음 | lint·관련 테스트·독립 평가 | Y | PASS |

키보드 초점을 숨기지 않는다. 미디어 업로드·공개 API·분석 이벤트 의미 변경은 N/A. 실제 iPhone 소프트웨어 키보드 점검 기록은 별도 `2026-11-03-ios-safari.md`에 유지한다.

## 사전 진단

- notebook.css의 비레이어 3px/4px outline이 Tailwind의 outline-none보다 우선해 입력 shadow와 겹친다.
- 아이디·검색은 바깥 focus-within과 내부 input focus-visible이 중복된다.
- 프로필 일반 입력은 CSS 9px, 공통 컨트롤은12px 모서리로 달랐다.
- 좁은 프로필 헤더에서 설명과 PDF 버튼이 같은 행에서 폭을 경쟁한다.

## 구현과 검증

- notebook의 굵은 3px/4px 공통 outline과 계정 메뉴 별도4px 간격을 제거했다. globals의 2px/2px 키보드 초점으로 통일하며 summary·button/tab 역할도 기본 규칙에 포함했다.
- 공통 및 직접 작성된 입력 컨트롤 12곳의 2px 연한 ring을 1px 브랜드 ring으로 맞췄다. 1px 기본 테두리와 합쳐 보이는 두께는2px이며 중복 outline은 없다. 오류 ring도 같은1px fail 색이다.
- 아이디는 바깥 컨테이너만 한 겹, 잘못된 값은 fail 테두리·ring과 기존 설명을 표시한다. 검색도 바깥 border+1px shadow만 표시한다.
- workspace 입력 기본 스킨을 components 레이어로 이동해 공통 컨트롤의 반경·크기·배경 유틸리티가 적용되게 했다. 프로필 일반 입력은12px 모서리, 모바일16px·데스크톱14px이며 @ 입력 내부는 투명해졌다.
- 좁은 프로필 섹션 헤더는 설명 전체 폭 아래에 PDF 버튼을 배치하고 sm 이상에서는 기존 나란한 배치를 유지한다.

### 브라우저 근거

- in-app browser, 실제 CSS390/320/1440px, UI와 read-only DOM 계산값으로 확인. 배율90% 환경이라 선언된2px outline은 device-pixel 반올림으로 계산값약1.67px로 보이지만 source 규칙은2px이다.
- 변경 전 아이디: 내부 outline3px/간격4px + 바깥2px ring, 내부 배경 #fcfeff·반경9px. 변경 후: 내부 outline-style:none·shadow:none·투명배경, 바깥1px ring과12px 반경. `output/focus-consistency-2026-11-03/handle-before.png`, `handle-after-390.png`.
- 일반 이름·성별 select·자기소개 textarea: outline 없음, focus1px brand ring. 프로필 입력 반경12px. 모바일 input16px, desktop14px. `profile-input-after-{390,desktop}.png`.
- Shift+Tab으로 이름→PDF 버튼, 검색→정렬 링크 및 PDF 버튼→선택된 학력 radio 이동. :focus-visible=true, 2px/2px 기본 표시 확인. 라디오 선택값은 그대로 유지했다. `keyboard-button-after-390.png`, `search-keyboard-after-desktop.png`.
- 아이디에 ! 입력: aria-invalid=true·설명 연결, 바깥 fail색1px ring·테두리, 내부 outline 없음. 아이디 저장·미리보기 비활성 유지. 테스트 후 빈값으로 복원하고 저장하지 않았다. `handle-invalid-after-390.png`.
- CSS320/390/1440에서 scrollWidth=clientWidth(각303/373/1423). 320에서 설명 폭222.22px, PDF 버튼 top>=설명 bottom, header flex-direction:column. `profile-header-after-320.png`.
- 현재 소스를 기존 아이폰 점검 서버 복사본에도 반영했다. 새 스타일의 실기기 Safari 재검증은 별도 응답 대기이며 이번 브라우저 결과를 iPhone 실기기 PASS로 확대하지 않는다.

### 실행 검증

- 전체 `npm run lint` PASS.
- 관련 기존 테스트5개 파일·34개 PASS(배우 페이지 설정2, 프로필 섹션2, 지원서 경력6, 프로필 편집·사진24).
- 마지막 아이디 오류색 변경 후 설정 테스트2개 및 해당 파일 eslint 재실행 PASS, `npx tsc --noEmit` PASS.
- `npm run build -- --webpack` 최종 변경본 PASS(56개 정적 페이지). 마지막 클래스 보완 뒤 다시 실행했다.
- `git diff --check` PASS. 새 라이브러리·런타임·테스트용 제품 파일 없음. 색·간격 변경을 복제하는 단위 테스트는 추가하지 않고 실제 CSS 계산값·상호작용으로 검증했다.

## 문제 목록

| 문제 ID | 심각도·유형·유입 | 경로 | 근거·조치 | 상태 |
| --- | --- | --- | --- | --- |
| 2026-11-03-focus-consistency-F01 | P3 / CODE / EXISTING | PRECHECK | 비레이어 공개 outline이 공통 input의 outline-none과 묶음 focus-within을 덮어 중첩. 중복 규칙 제거 후 한 겹·키보드 초점 유지 확인. | FIXED |
| 2026-11-03-focus-consistency-F02 | P3 / CODE / EXISTING | PRECHECK | 비레이어 workspace 스킨이 공통12px·14px·bg-transparent 유틸리티를 덮음. components 레이어로 옮겨 ID 투명·일반 입력12px·desktop14px 확인. | FIXED |
| 2026-11-03-focus-consistency-F03 | P3 / FLOW / EXISTING | PRECHECK | 좁은 프로필 헤더에서 PDF 버튼이 설명 폭을 줄여 긴 줄바꿈 유발. 모바일만 세로 정렬해 설명 전체 폭 확보. | FIXED |

| 사건 ID | 문제 ID | 사건 | 최초 기록 시각 | 최초 PR | 근거 |
| --- | --- | --- | --- | --- | --- |
| C01 | 2026-11-03-focus-consistency-F01 | CONFIRMED | 2026-11-03T18:03:03+09:00 | PENDING | 변경 전 DOM·source 확인, 최초 기록 |
| C02 | 2026-11-03-focus-consistency-F01 | FIXED | 2026-11-03T18:03:03+09:00 | PENDING | ID·일반 입력·검색·키보드 이동 계산값 확인 |
| C03 | 2026-11-03-focus-consistency-F02 | CONFIRMED | 2026-11-03T18:03:03+09:00 | PENDING | 변경 전 ID 내부 배경·반경, workspace cascade 확인 |
| C04 | 2026-11-03-focus-consistency-F02 | FIXED | 2026-11-03T18:03:03+09:00 | PENDING | 계층 변경 후16/14px·12px·투명배경 확인 |
| C05 | 2026-11-03-focus-consistency-F03 | CONFIRMED | 2026-11-03T18:03:03+09:00 | PENDING | 기존 iPhone 헤더 캡처·source 폭 경쟁 확인 |
| C06 | 2026-11-03-focus-consistency-F03 | FIXED | 2026-11-03T18:03:03+09:00 | PENDING | 320px 설명 전체 폭·버튼 다음 행 확인 |

최초 기록 시각을 보존했으며 앞선 재현 시각을 소급 추정하지 않았다. 아래 독립 평가 결과와 최종 집계를 적용한다. PR 생성·게시 없음.

## 독립 평가 및 수정 후 검증

- 독립 읽기 전용 평가1회. 상대 도구가 없어 같은 종류의 별도 평가자로 대체했다. 초점 유지·계층 정리·헤더 개선 및 미사용 코드·파일·설정·의존성 점검 결과는 일치했다.
- P3 누락1건: 정상 focus를1px로 바꾼 일정표 시간 입력에 `aria-invalid:ring-2 aria-invalid:ring-fail-bg`가 남았고 일정표 프로필의 INVALID_CLASS도 같은 규칙을 재정의했다.
- 시간 입력은 focus 오류색만 fail로 정하고 두께는 정상과 같은1px로 바꿨다. 일정표 프로필의 중복 INVALID_CLASS와 참조를 제거해 공통 FieldInput/FieldTextarea 규칙만 사용한다.
- `/timetable/new`에서 잘못된25:00을 가능 시간으로 추가하려 하면 차단·오류 문구가 나오며, 해당 시작 입력의 aria-invalid=true / outline:none / border fail / shadow1px fail 확인. `timetable-invalid-after-desktop.png`. 실제 일정 생성·명단 변경·문자 발송은 하지 않았다.
- 일정표 profile-form·setting-form 기존9개 테스트 및 수정2파일 eslint PASS. 전체 관련7파일·43개 테스트 PASS(재실행 중복은 제외). 최종 webpack build56페이지 PASS, `git diff --check` PASS.
- 기본 keyboard outline2px/2px로 통일하되 표 안쪽의 음수 offset, 큰 이미지 카드의 간격, 선택 카드·그룹 오류의 상태 강조는 목적이 달라 유지했다. 모든 사이트 요소가 완전히 같다는 뜻이 아니다. 신규 스타일의 실제 iPhone Safari 재검증은 아직 미확인이다.
- 원래 아이폰QA 서버(사용자 점검용3001)는 기존 유지 조건을 따른다. 이번 변경도 그 소스 복사본에 반영했다. 이번 브라우저 점검의 임시 탭·viewport는 복구한다.

| 문제 ID | 심각도·유형·유입 | 경로 | 조치 | 상태 |
| --- | --- | --- | --- | --- |
| 2026-11-03-focus-consistency-F04 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | 일정표의 오류ring 잔존2곳 제거·공통 규칙으로 수렴, 실제 오류입력 계산값·관련9개 테스트 확인 | FIXED |

| 사건 ID | 문제 ID | 사건 | 최초 기록 시각 | 최초 PR | 근거 |
| --- | --- | --- | --- | --- | --- |
| C07 | 2026-11-03-focus-consistency-F04 | CONFIRMED | 2026-11-03T18:12:51+09:00 | PENDING | 독립 평가의 잔존 오류ring 확인, 최초 기록 |
| C08 | 2026-11-03-focus-consistency-F04 | FIXED | 2026-11-03T18:12:51+09:00 | PENDING | 두 곳 정리·오류 입력1px fail·관련 테스트9개·최종 빌드 PASS |

최종: 독립 평가1회 / 필수 PASS6·FAIL0·UNVERIFIED0 / 검증률6/6(본 평가표 범위) / 발견4·해결4·미해결0 / P0=0·P1=0·P2=0·P3=4 / PRECHECK=3·INDEPENDENT_REVIEW=1·POST_FIX_CHECK=0 / 오탐0. 미확인 실기기 범위는 별도 Safari 점검 기록에 유지한다. 새 PR을 게시하지 않았으며 이후 관련 PR 본문에 이 기록을 포함한다.

- 마무리: 브라우저 viewport override reset 및 이번 점검용 탭12 종료 완료. 기존 사용자 탭과 기존 개발 서버는 유지했다.

## 최초 PR 게시 연결

- 2026-11-03T18:30:17+09:00: 이 작업 기록과 문제 ID·추가 전용 사건 이력을 최초 게시 PR [#501](https://github.com/woowacourse-teams/2026-yesulin/pull/501)에 연결했다. 이전 `PENDING`·PR 미생성 문구는 당시 이력이며 최초 확정/해결 시각을 바꾸지 않는다. 본 기록에 있는 문제의 최초 기록 PR은 #501이다.
