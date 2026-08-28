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

## Visual QA

UI 변경은 가능하면 모바일 390×844와 데스크톱 1440×1000에서 확인한다.

1. 콘텐츠 container와 padding
2. 제목·카드·폼·아이콘 정렬
3. 반복 간격과 control 크기
4. 가로 overflow와 sticky/fixed 영역 겹침
5. 키보드 포커스, 로딩·빈 상태·오류 상태

