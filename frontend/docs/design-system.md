# 디자인 시스템

구현의 최종 기준은 `src/app/globals.css`, `src/app/interactions.css`와 `src/components/ui/`다.

## 원칙

- 한 영역의 핵심 행동만 `brand`로 강조한다.
- 상태는 색만으로 표현하지 않고 텍스트·배지·아이콘을 함께 사용한다.
- 배우 화면은 안내와 단계 진행, 기획사/제작사 화면은 비교·검색·빠른 검토를 우선한다.
- 같은 책임의 요소는 같은 spacing, 높이, radius와 정렬 축을 사용한다.
- 시각 변경으로 기존 기능이나 정보 위계를 제거하지 않는다.

## 핵심 토큰

| 역할 | 값·token |
| --- | --- |
| Primary | `brand #246BFE`, hover `brand-strong`, active `brand-pressed` |
| Canvas | `surface #F7F9FC` |
| Card | `background/card #FFFFFF` |
| Text | `foreground #111722`, `muted-strong`, `muted` |
| Border | `border #E2E8F0`, `border-soft #F1F5F9` |
| Pass | green / `pass-bg` |
| Fail | red / `fail-bg` |
| Etc | violet / `etc-bg` |
| Pending | neutral slate |
| Producer sidebar | `sidebar #0B1018` 계열 |

현재 심사 상태에 `ABSENT`는 없다. 새 UI도 `PENDING`, `PASS`, `FAIL`, `ETC`만 표현한다.

## 기본 크기

- spacing은 4px 체계를 우선한다.
- 모바일 일반 좌우 여백 20px, 관리자 16px, 데스크톱 24~32px
- control 최소 높이 44px, 일반 input 48px
- `rounded-control` 12px, `rounded-card` 16px, `rounded-modal` 24px
- 일반 카드는 shadow보다 배경·여백·1px border로 구분한다.
- 숫자·날짜·통계에는 `.num`을 사용한다.

## 접근성과 반응형

- 아이콘 버튼은 접근 가능한 이름과 44×44px hit area를 제공한다.
- 활성 navigation은 `aria-current`, 토글은 `aria-pressed`를 사용한다.
- 필드 오류는 control과 연결하고 구체적인 복구 문구를 표시한다.
- 잘못된 항목이 여럿이면 한 번에 모두 표시하고, 입력을 마칠 때 해당 항목만 다시 검사한다.
- 모바일에서 hover에만 기능을 숨기지 않는다.
- fixed 하단 영역은 safe area를 반영한다.
- reduced motion에서는 transition과 animation을 제거한다.

## 공개 서비스 화면

- 홈·오디션 목록/상세·무료 공연·소개·인증·정책 문서는 `.public-notebook`의 푸른 계열 토큰과
  `NotebookHeader`·`NotebookFooter`를 공유한다. 운영자 화면의 기본 토큰에는 적용하지 않는다.
- 본문 상한은 1080px, PC 좌우 여백은 최소 64px, 760px 이하에서는 20px이다.
  공고 본문은 읽기 위해 800px, 인증 폼은 480px 상한을 별도로 둔다.
- 760px 이하 헤더는 로고와 메뉴 버튼 한 줄이다. 메뉴는 버튼·Escape·바깥 클릭·링크 선택으로 닫히며,
  열림 상태를 `aria-expanded`로 알린다. 상단은 오디션·무료 공연·이벤트이며, 소개·FAQ 링크는 푸터에 둔다.
- 섹션 제목은 `오디션 공고`, `무료 공연`, `자주 묻는 질문`처럼 내용을 직접 적는다.
  장식용 섹션 번호와 링크 끝의 화살표는 사용하지 않는다. 배너를 넘기는 탐색 표시는 이미지 안쪽 양옆에 두고, 선택 표시는 이미지 하단 가운데에서 짙은 배경과 밝은 표시로 구분한다. 새 창 안내는 접근 가능한 이름으로 제공한다.
- 공개 화면의 공통 아이콘은 React Icons의 Phosphor의 선 아이콘을 `components/ui/site-icon.tsx`로 제공한다.
  아이콘 자체는 보조기술에서 숨기고 버튼에는 별도의 이름을 붙인다. 소셜 서비스 로고는 각 브랜드 표시를 유지한다.
- 캐릭터·노트 표현은 배너에 집중하고, 목록과 폼에는 담백한 배경·선·간격을 사용한다.

## Visual QA

UI 변경은 가능하면 모바일 390×844와 데스크톱 1440×1000에서 확인한다.

1. 콘텐츠 container와 padding
2. 제목·카드·폼·아이콘 정렬
3. 반복 간격과 control 크기
4. 가로 overflow와 sticky/fixed 영역 겹침
5. 키보드 포커스, 로딩·빈 상태·오류 상태

