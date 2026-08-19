---
name: 예술in
slug: yesulin
category: performing-arts-audition-platform
last_updated: "2026-08-12"
status: active
language: ko
implementation_reference:
  - frontend/src/app/globals.css
  - frontend/src/app/interactions.css
  - frontend/src/components/ui/controls.tsx
  - frontend/src/components/auditions/modal-shell.tsx
  - frontend/src/components/auditions/status-badge.tsx
  - frontend/src/components
---

# 예술in 디자인 시스템

2026년 8월 현재 프론트엔드에 반복해서 구현된 시각 언어를 정리한 최소 규칙집이다. UI를 만들거나 수정할 때는 이 문서와 `frontend/src/app/globals.css`의 토큰, 공통 control을 먼저 사용한다. 문서와 구현이 달라지면 한쪽을 임의로 따르지 말고 의도한 기준을 확인한 뒤 문서와 구현을 함께 맞춘다.

## 1. 핵심 원칙

- 명료한 업무 흐름이 장식보다 우선한다. 화면의 현재 위치, 상태, 다음 행동이 바로 보여야 한다.
- 한 영역의 핵심 행동만 `brand`로 강조한다. 보조 행동은 흰 표면, 테두리, 텍스트 버튼으로 낮춘다.
- 배우 화면은 안내와 단계 진행을, 기획사/제작사 화면은 비교·검색·빠른 검토를 우선한다.
- 상태는 색상만으로 표현하지 않는다. 상태명과 배지 형태, 필요하면 점·아이콘·설명을 함께 쓴다.
- 기본 작업 화면은 밝은 캔버스와 흰 표면을 사용한다. 짙은 표면은 기획사/제작사 사이드바, 인증·마케팅 히어로, 영상처럼 집중이 필요한 영역에 제한한다.
- 글래스 표면은 sticky header, 모바일 고정 내비게이션·액션 바, 모달 header/footer처럼 실제로 떠 있는 영역에만 쓴다.
- 기존 기능과 정보 위계를 시각 변경 때문에 제거하지 않는다.
- 정렬과 간격은 눈대중으로 보정하지 않는다. 같은 역할의 요소는 같은 spacing, 정렬 축, 크기 규칙을 공유하고 부모 layout에서 일관되게 제어한다.

## 2. 색상

색은 하드코딩하지 않고 `globals.css`의 시맨틱 Tailwind 유틸리티(`bg-brand`, `text-muted`, `border-border` 등)를 사용한다. 아래 값은 현재 구현의 대표값이다.

### 2.1 핵심 토큰

| Token / Utility | Value | Usage |
|---|---|---|
| `brand` | `#246BFE` | 주요 CTA, 핵심 선택, 링크, focus |
| `brand-strong` | `#1D5CE5` | Primary hover |
| `brand-pressed` | `#194FC4` | Primary active, upcoming 전경 |
| `brand-soft` | `#EEF5FF` | 선택·안내 배경, 브랜드 hover |
| `brand-soft-strong` | `#DCEAFF` | 선택 강조, pressed 배경 |
| `brand-line` | `#B8D5FF` | 브랜드 계열 border |
| `surface` | `#F7F9FC` | 기본 페이지 캔버스, 보조 영역 |
| `background`, `card` | `#FFFFFF` | 흰 페이지와 카드·입력 표면 |
| `foreground` | `#111722` | 제목, 본문, 강한 선택 배경 |
| `muted-strong` | `#475569` | 보조 본문, 설명 |
| `muted` | `#64748B` | 메타데이터, 비활성 텍스트 |
| `muted-soft` | `#94A3B8` | placeholder, 가장 약한 정보 |
| `border` | `#E2E8F0` | 기본 1px border와 disabled 배경 |
| `border-soft` | `#F1F5F9` | 약한 divider, skeleton, 중립 배경 |

`background`와 `card`는 같은 흰색이다. 기본 `body` 배경은 `surface`다. 별도 흰 토큰을 늘리지 않는다.

### 2.2 상태 토큰

| State | Foreground | Background | Usage |
|---|---|---|---|
| Success / Pass | `#16A34A` | `#F0FDF4` | 성공, 합격 |
| Error / Fail | `#DC2626` | `#FEF2F2` | 오류, 불합격, 파괴적 행동 |
| Open | `#246BFE` | `#246BFE` | 진행 중 공고 |
| Warning | `#D97706` | `#FFF7ED` | 주의, 조건 경고 |
| Recruit closed | `#475569` | `#F1F5F9` | 접수 마감 공고 |
| Pending / Absent | `#475569` | `#F1F5F9` | 검토 대기, 불참, 중립 상태 |
| Etc | `#5B50A6` | `#F0EFFC` | 기타 심사 결과 |
| Upcoming | `#194FC4` | `#EEF5FF` | 시작 전 공고 |

`pending`과 `absent`, `upcoming`과 일부 brand 값은 역할이 달라도 현재 같은 대표색을 공유한다. 같은 값의 토큰을 새 팔레트로 중복 확장하지 않는다.

### 2.3 어두운 표면과 외부 브랜드

| Token | Value | Usage |
|---|---|---|
| `sidebar` | `#0B1018` | 기획사/제작사 sidebar, dark hero |
| `sidebar-surface` | `#111722` | 어두운 보조 표면 |
| `sidebar-hover` | `#1B2432` | 어두운 표면 hover |
| `sidebar-text` | `#E2E8F0` | 어두운 표면 기본 텍스트 |
| `sidebar-muted` | `#94A3B8` | 어두운 표면 보조 텍스트 |
| `sidebar-line` | `rgba(255, 255, 255, 0.12)` | 어두운 표면 divider |
| `kakao` / ink | `#FEE500` / `#191919` | 카카오 로그인에만 사용 |
| `naver` | `#03A94D` | 네이버 로그인에만 사용 |
| Google neutral | 흰 배경 + `border` + `foreground` | Google 로그인 버튼 표면과 텍스트 |

외부 브랜드색은 해당 로그인 버튼 밖에서 사용하지 않는다.

### 2.4 색상 적용 규칙

- Primary: `brand → brand-strong → brand-pressed` 순서로 default, hover, active를 표현한다.
- 선택 상태는 목적에 따라 `brand + white`(주요 선택) 또는 `foreground + white`(필터·세그먼트)를 사용한다.
- Disabled는 보통 `border` 배경과 `muted` 텍스트를 쓰고 그림자와 transform을 제거한다.
- Error는 `fail` border/text와 `fail-bg` 안내 배경을 함께 사용한다.
- 공고 상태는 진행 중만 brand 단색으로 강조하고, 진행 예정은 brand 윤곽, 접수 마감은 중립 slate, 전형 종료는 foreground로 구분한다.
- 상태 배지는 상태명과 색 점을 함께 표시한다. 사진 위에서는 흰 반투명 배경을 사용해 대비를 확보한다.
- 짙은 배경에서는 `white`, `sidebar-text`, `sidebar-muted`, `brand-line`만 위계에 맞게 사용한다.

## 3. Typography

### 3.1 서체

기본 서체는 Pretendard Variable이다. 로드 실패 시 `Pretendard`, Apple·Noto Sans KR·Segoe UI·sans-serif 순으로 대체한다. 전역 본문은 `16px / 1.6 / -0.005em`이다.

### 3.2 실제 사용 스케일

| Role | Size / Line height | Weight | Typical utility / Usage |
|---|---|---|---|
| Caption | `12 / 16px` | 500–600 | `text-xs`, 배지·메타데이터 |
| Dense label | `13 / 20px` | 500–600 | `text-dense`, 관리자 표·필터·사이드바에만 제한 |
| Label / Small body | `14 / 20px` | 400–600 | `text-sm`, 입력 label·설명·버튼 |
| Body | `16 / 24px` | 400–600 | `text-base`, 일반 본문과 모바일 안내 |
| Title small | `18 / 28px` | 600–700 | `text-lg`, 카드 제목 |
| Heading 3 | `20 / 28px` | 700 | `text-xl`, 섹션·모달 제목 |
| Heading 2 | `24 / 32px` | 700 | `text-2xl`, 화면 내 주요 제목 |
| Heading 1 | `28–30 / 36px` | 700 | `text-[28px]`, `text-3xl`, 페이지 제목 |
| Marketing display | `28–68px` fluid | 700 | `clamp(...)`, 랜딩 hero에만 사용 |

- 기본 위계는 14, 16, 20, 24, 28/30px로 잡는다. 10.5–13.5px의 미세 크기는 고밀도 관리자 UI에서만 사용한다.
- 제목은 `font-bold`, control과 label은 `font-semibold`, 본문은 regular 또는 medium을 기본으로 한다.
- 큰 제목은 `-0.02em`에서 `-0.04em` 사이의 tracking을 사용한다. 본문 tracking을 임의로 바꾸지 않는다.
- 비교하는 숫자·날짜·통계에는 `.num`을 사용한다.
- 한 화면의 제목 위계는 세 단계 이내로 유지한다.

## 4. Spacing

Tailwind의 4px 간격 체계를 기본으로 한다.

| Step | Value | Typical usage |
|---|---:|---|
| `1` | 4px | 아이콘 내부, 매우 가까운 요소 |
| `2` | 8px | 버튼 그룹, label과 보조 정보 |
| `3` | 12px | control 내부, 작은 그룹 |
| `4` | 16px | 모바일 관리자 여백, 작은 카드 |
| `5` | 20px | 일반 모바일 좌우 여백, 카드 |
| `6` | 24px | 데스크톱 관리자 여백, 카드·모달 |
| `8` | 32px | 데스크톱 페이지 여백, 폼 그룹 |
| `10–12` | 40–48px | 큰 섹션과 폼 구획 |
| `16–28` | 64–112px | 랜딩 섹션에만 사용 |

- 일반 화면 좌우 여백은 모바일 20px, `md` 이상 32px이 기본이다.
- 기획사/제작사 업무 화면은 모바일 16px, `md` 24px, 넓은 화면 32px을 사용한다.
- 카드 내부 여백은 16–24px, 모달 header/footer는 20px에서 24px을 사용한다.
- 2px half-step과 임의 5·7·9·11px 값은 조밀한 표, 아이콘 정렬, 기존 컨트롤의 광학 보정에만 허용한다.
- 새 레이아웃에는 표준 step을 먼저 사용하고 비슷한 임의 값을 추가하지 않는다.
- 같은 의미의 형제 요소 사이 간격은 개별 `margin`보다 부모의 `gap`으로 제어한다.
- 좌우가 대칭인 영역은 특별한 이유가 없으면 같은 horizontal padding을 사용한다.
- 반복되는 카드·행·폼 그룹은 동일한 padding과 gap을 유지한다. 특정 항목 하나만 임의 간격으로 보정하지 않는다.
- `negative margin`, 임의 `translate`, `absolute` 위치 보정은 정상 flow로 해결할 수 없는 광학 보정에만 제한한다. 일반적인 정렬 문제 해결 수단으로 사용하지 않는다.

## 5. Radius, Border, Shadow

### 5.1 Radius

| Token | Value | Usage |
|---|---:|---|
| `rounded-control` | 12px | 버튼, 입력, 작은 선택 영역 |
| `rounded-card` | 16px | 카드, toast, 패널 |
| `rounded-modal` | 24px | dialog, 큰 강조 영역 |
| `rounded-full` | 999px | badge, chip, avatar |

고밀도 표·작은 이미지·tooltip에는 6–8px을 쓸 수 있다. 랜딩의 28–36px 장식 radius는 마케팅 영역의 예외이며 일반 카드 토큰으로 확장하지 않는다.

### 5.2 Border

- 기본 카드·control: `1px solid border` (`#E2E8F0`).
- 약한 내부 구분선: `border-soft` (`#F1F5F9`).
- 브랜드 선택·hover: `brand-line` (`#B8D5FF`).
- 현재 tab: 2px underline. Focus: 2px outline과 2px offset.
- 오류·상태 border에는 의미 색을 쓰되 낮은 alpha를 허용한다.
- 카드 구분은 shadow보다 배경, 여백, border를 우선한다.

### 5.3 Shadow

| Token | Value | Usage |
|---|---|---|
| `shadow-1` | `0 2px 8px rgba(15, 23, 42, 0.06)` | 선택·작은 floating 요소 |
| `shadow-2` | `0 8px 24px rgba(15, 23, 42, 0.08)` | glass header, dropdown |
| `shadow-3` | `0 16px 40px rgba(15, 23, 42, 0.12)` | toast, 강한 floating panel |
| `shadow-modal` | `0 24px 64px rgba(8, 11, 18, 0.20)` | dialog, drawer |
| `shadow-selection` | `0 0 0 2px #B8D5FF` | 선택 카드 ring |
| `shadow-tooltip` | `0 10px 30px rgba(0, 0, 0, 0.16)` | tooltip |
| `shadow-video` | `0 24px 60px rgba(0, 0, 0, 0.40)` | 영상 dialog |
| `shadow-video-control` | `0 6px 24px rgba(0, 0, 0, 0.40)` | 영상 재생 control |
| `shadow-cta` | `0 12px 32px rgba(36, 107, 254, 0.28)` | dark hero의 Primary CTA |

일반 카드는 shadow 없이 border를 사용한다. 영상 플레이어·tooltip·마케팅 CTA의 강한 그림자는 해당 목적의 이름 있는 토큰만 사용한다.

## 6. 공통 Layout

| Context | Container / Structure |
|---|---|
| Landing | `max-width: 1280px`, 모바일 20px → `sm` 32px → `lg` 40px |
| Applicant shell | `max-width: 1180px`, 상단 navigation + 모바일 하단 navigation |
| Public posting | `max-width: 1120px`, `lg`에서 본문 + 320px 요약 패널 |
| Form / application | `max-width: 880px`, 단일 column 중심 |
| Producer workspace | 최대 너비 제한 없음, `lg`부터 268px 고정 sidebar + 작업 영역 |
| Auth | 모바일 단일 form, `lg`부터 dark brand panel + form 2열 |

- 기본 캔버스는 `surface`, 콘텐츠 표면은 `card`다. 랜딩은 흰 배경 섹션과 `brand-soft`, dark hero를 교차 사용한다.
- 상단 header, 모바일 navigation·action bar는 sticky/fixed glass surface를 사용하고 safe-area padding을 보존한다.
- 관리자 목록은 카드와 표 보기를 모두 지원한다. 좁은 화면에서 표를 단순 축소하지 않는다.
- 상세 dialog는 데스크톱에서 목록과 프로필을 2열로, 좁은 화면에서는 세로 흐름으로 바꾼다.
- 넓은 화면에서도 본문을 무제한 늘리지 않는다. 다만 기획사/제작사 workspace는 비교 가능한 열을 위해 가용 폭을 사용한다.
- 중앙 정렬은 viewport가 아니라 **해당 콘텐츠가 속한 실제 container**를 기준으로 한다. sidebar가 있는 화면의 본문은 전체 화면이 아닌 workspace 영역 안에서 정렬한다.
- header, 본문, footer/action 영역이 같은 화면 위계를 공유하면 가능한 한 같은 content edge와 horizontal padding을 맞춘다.
- 반복되는 목록·카드·폼의 시작선과 끝선은 인접 섹션과 시각적으로 이어지도록 맞춘다.

## 7. 핵심 컴포넌트

### Button

- 공통 높이 44px(`min-h-11`), 큰 CTA와 소셜 버튼은 48–52px이다. radius는 12px, label은 14px semibold가 기본이다.
- Primary: brand 배경 + 흰 텍스트 + `shadow-1`; hover는 brand-strong와 `shadow-2`; active는 brand-pressed와 미세한 이동/축소.
- Secondary: 흰 배경 + 기본 border; hover는 brand-line + brand-soft.
- Text: 투명 배경 + muted-strong; hover는 surface + foreground.
- Destructive: 흰 배경 + fail 텍스트/border; hover·active는 fail-bg.
- Disabled: 클릭과 transform을 막고 border 또는 surface 배경 + muted 텍스트 + shadow 없음.
- 아이콘 전용 버튼은 44×44px hit area와 접근 가능한 이름을 제공한다.

### Input, Select, Textarea

- 기본 높이 48px, radius 12px, 흰 배경, 1px border, 좌우 12px, 14px(`md` 이상) 또는 16px(좁은 화면) 텍스트를 사용한다.
- Label은 control 위 8px 간격의 14px semibold다. placeholder는 muted-soft다.
- Hover는 muted-soft border, focus는 brand border + 2px brand-soft ring이다.
- Error는 fail border + fail-bg ring과 구체적인 오류 문구를 함께 표시한다.
- Disabled는 border-soft 배경 + muted 텍스트를 사용한다. placeholder만으로 label을 대신하지 않는다.

### Card와 Panel

- 기본 card는 흰 배경 + 1px border + 16px radius + 16–24px padding이다.
- 선택 card는 brand border/soft background 또는 brand 배경을 사용한다. hover와 선택 상태가 구분되어야 한다.
- 보조 묶음은 surface 배경을 사용해 중첩 card의 border 수를 줄인다.
- 데이터 card와 table row에는 기본 shadow를 넣지 않는다.

### Chip, Segment, Badge

- Chip은 36px 이상, full radius, 13–16px semibold다. 미선택은 흰 배경 + border, 선택은 foreground + white가 기본이다.
- Segment는 한 border 안에서 선택 항목만 foreground + white로 채운다.
- Badge는 24px 또는 28px 높이, 12–13px semibold, full radius다. 의미색 배경·텍스트와 상태명을 같이 쓴다.

### Modal, Drawer, Toast

- Dialog는 24px radius + modal shadow + 어두운 scrim을 사용한다. 모바일의 확인 dialog는 bottom sheet, 메뉴는 좌측 drawer로 바뀔 수 있다.
- Modal header/footer는 glass surface와 divider로 본문에서 분리한다.
- Escape, scrim click, focus trap, 닫은 뒤 trigger focus 복원을 유지한다.
- Toast는 16px radius, 흰 배경, 상태색 border/icon, `shadow-3`를 사용한다. 오류는 더 오래 유지하고 직접 닫을 수 있게 한다.

### Navigation과 업무 목록

- 활성 navigation은 배경·텍스트·`aria-current`를 함께 사용한다.
- 기획사/제작사 sidebar는 dark token만 사용하고, 활성 항목은 brand 배경 + 흰 텍스트로 표시한다.
- Table과 고밀도 목록은 12–14px 텍스트, 얇은 divider, 명시적인 hover·selected 상태를 사용한다.
- 숫자 열과 통계에는 `.num`을 적용한다. 긴 값은 말줄임하되 전체 값을 확인할 수단을 둔다.

### Glass surface

- 기본 glass: `rgba(255,255,255,0.82)`, blur 18px, `shadow-2`.
- Strong glass: `rgba(255,255,255,0.92)`, blur 22px, `shadow-3`.
- Dark glass: `rgba(8,11,18,0.82)`, blur 20px, `shadow-3`.
- glass를 카드 안에 중첩하지 않는다. blur 미지원 또는 reduced transparency 환경에서는 불투명 표면으로 대체한다.

## 8. Interaction과 상태

- Hover는 색·border 변화가 중심이다. 공통 control은 주로 150ms를 사용하고, 전역 motion 기준은 fast 120ms와 base 200ms다.
- Active는 `translateY(1px)` 또는 `scale(0.97–0.99)`를 작게 사용한다. 콘텐츠가 크게 흔들리게 하지 않는다.
- Focus-visible은 모든 button, link, input, select, textarea에 2px brand outline과 2px offset을 제공한다.
- Loading은 기존 레이아웃을 유지하는 `animate-pulse` skeleton 또는 버튼 문구 변경을 사용하고 중복 입력을 막는다.
- Empty state는 현재 상태와 가능한 다음 행동을 함께 보여준다.
- Error는 문제와 복구 행동을 설명한다. 필드 오류는 해당 control과 연결하고 `role="alert"`를 사용한다.
- Reduced motion에서는 transition과 animation을 사실상 제거한다.

## 9. 반응형 기준

Tailwind 기본 breakpoint를 그대로 사용한다.

| Breakpoint | Width | 주요 변화 |
|---|---:|---|
| Base | `< 640px` | 단일 column, 20px 여백, 모바일 navigation·action |
| `sm` | `≥ 640px` | 작은 2열 form/card, 보조 navigation 노출 |
| `md` | `≥ 768px` | 32px 여백, 데스크톱형 form·dialog, 하단 navigation 해제 |
| `lg` | `≥ 1024px` | 기획사/제작사 268px sidebar, 업무용 table·분할 layout, auth 2열 |
| `xl` | `≥ 1280px` | 관리자 작업 여백 확대, 랜딩 wide layout |
| `2xl` | `≥ 1536px` | 필요한 경우에만 추가 폭 활용 |

- 1023px 이하에서 checkbox·radio·file을 제외한 control은 최소 높이 44px을 유지한다.
- 모바일에서는 hover에만 기능을 숨기지 않는다.
- 고밀도 관리자 정보는 `lg`부터 축소된 글자와 control을 허용하되, touch 환경의 44px 기준은 유지한다.
- fixed 하단 영역은 `env(safe-area-inset-bottom)`을 반영한다.

## 10. UI 정렬·간격·시각 검수

AI로 UI를 구현하거나 수정한 뒤에는 코드 작성만으로 완료했다고 판단하지 않는다. **가능하면 실제 화면을 렌더링한 상태에서** 정렬, 간격, 크기, 반응형을 검수한다.

### 10.1 정렬 기준

- 수평·수직 정렬의 기준이 되는 부모 container를 먼저 확인한다. 자식마다 개별 offset을 주어 맞추지 않는다.
- inline 아이콘 + 텍스트, button content, badge는 기본적으로 `flex` + `items-center`와 명시적인 `gap`으로 정렬한다.
- 제목, 본문, input, card가 같은 column에 속하면 의도적인 예외가 없는 한 같은 왼쪽 edge를 공유한다.
- 중앙 배치 요소는 **수학적인 중앙뿐 아니라 시각적인 중앙**도 확인한다. 아이콘의 viewBox 여백이나 비대칭 형태 때문에 어색하면 1–2px 수준의 local optical correction만 허용한다.
- 아이콘 때문에 텍스트가 한쪽으로 밀려 보이는 symmetry-critical control은 전체 content group의 균형을 확인한다. 단순히 `left`, `translateX`, 음수 margin으로 맞추지 않는다.
- text baseline, icon size, line-height가 달라 생기는 수직 어긋남을 margin으로 숨기지 말고 font/line-height/icon box를 먼저 확인한다.

### 10.2 간격과 크기 기준

- 같은 계층의 반복 요소는 동일한 gap, padding, 높이, radius를 사용한다.
- `12px → 16px → 14px`처럼 이유 없이 간격이 흔들리지 않게 한다. 의미가 같으면 같은 spacing token을 쓴다.
- section 간격과 section 내부 간격을 구분한다. 상위 구획 간 간격이 내부 요소 간 간격보다 작아지지 않게 한다.
- button/input/select 등 같은 control 계열은 특별한 variant가 아니면 높이를 맞춘다.
- grid/list의 반복 item은 content 차이 때문에 불필요하게 들쭉날쭉해지지 않는지 확인한다.
- 텍스트 줄바꿈으로 높이가 달라질 수 있는 영역에 고정 height를 남용하지 않는다. 필요한 경우 `min-height`와 자연스러운 flow를 우선한다.

### 10.3 완료 전 Visual QA Gate

UI 변경 작업은 최소한 변경한 화면의 **모바일 1개 + 데스크톱 1개 viewport**에서 다음을 확인한 뒤 완료한다. 가능한 환경이라면 screenshot을 직접 확인하고 CSS/JSX만 보고 추정하지 않는다.

1. **Container** — 화면의 실제 콘텐츠 영역이 올바른 width와 padding을 사용하는가.
2. **Alignment** — 제목, card, form, button, icon의 기준선과 중앙 정렬이 어긋나지 않는가.
3. **Spacing** — 같은 의미의 간격이 반복해서 같은 값을 쓰며, 특정 요소만 뜨거나 붙어 있지 않은가.
4. **Sizing** — 반복 control과 card의 높이·폭·radius가 이유 없이 달라지지 않는가.
5. **Wrapping / Overflow** — 긴 텍스트, 작은 viewport에서 줄바꿈·잘림·가로 overflow가 발생하지 않는가.
6. **Sticky / Fixed** — header, navigation, bottom action이 콘텐츠를 가리거나 서로 겹치지 않는가.
7. **Interaction** — hover, focus, error, loading 상태 전환 시 크기나 위치가 튀지 않는가.
8. **Optical balance** — 코드상 중앙이어도 사람이 봤을 때 한쪽으로 치우쳐 보이는 요소가 없는가.

문제를 발견하면 새로운 임의 값부터 추가하지 않는다. 먼저 **잘못된 부모 layout → 기존 token 미사용 → 잘못된 width/line-height → component variant 불일치** 순서로 원인을 찾는다.

### 10.4 AI 구현 시 금지되는 보정

다음 방식은 명확한 이유 없이 사용하지 않는다.

- 정렬을 맞추기 위한 반복적인 `margin-left/right/top`, 음수 margin
- 정상 layout으로 가능한 요소에 대한 `position: absolute`
- 중앙 정렬을 위한 임의 `calc(...)` 또는 magic number
- 같은 역할의 요소에 서로 다른 임의 width/height
- 한 화면만 맞추기 위한 새로운 spacing 값
- overflow를 숨기기 위한 무조건적인 `overflow-hidden`
- 텍스트가 들어가는 영역의 불필요한 고정 height

예외가 필요하면 먼저 기존 layout/token으로 해결 가능한지 확인하고, 예외는 해당 컴포넌트 내부에 국소적으로 둔다.

## 11. 반드시 지킬 Do / Don't

### Do

- 기존 token과 공통 control을 먼저 재사용한다.
- Primary action, 현재 위치, 선택·진행·오류 상태를 분명히 구분한다.
- 상태를 텍스트와 형태로도 전달한다.
- 밝은 작업 캔버스, solid card, 제한적인 glass surface의 위계를 유지한다.
- 로딩, 빈 상태, 오류, disabled, focus-visible을 함께 설계한다.
- 모바일과 데스크톱을 각 사용 목적에 맞게 재배치한다.
- 새 시각 값이 여러 영역에서 반복될 때만 토큰 추가를 검토한다.
- UI 수정 후 가능한 경우 실제 렌더링 화면에서 모바일·데스크톱 정렬과 간격을 확인한다.
- 같은 화면의 관련 영역은 content edge, padding, control height가 일관적인지 함께 검토한다.

### Don't

- 비슷한 파랑·회색을 화면마다 새 HEX로 만들지 않는다.
- 모든 card에 shadow나 glass를 적용하지 않는다.
- 같은 화면에 Primary 버튼을 경쟁적으로 반복하지 않는다.
- 데스크톱 table을 모바일에서 그대로 축소하지 않는다.
- 상태, 선택, 오류를 색상 하나로만 표현하지 않는다.
- 10–13px 텍스트와 임의 spacing을 일반 사용자 화면에 확산하지 않는다.
- 인쇄 화면에 별도 색상 팔레트를 만들지 않는다. 앱의 시맨틱 CSS 변수를 전달해 사용한다.
- 시각 개선을 이유로 기존 기능, 접근 가능한 이름, keyboard interaction을 제거하지 않는다.
- 중앙 정렬이나 간격 문제를 magic number, 음수 margin, 불필요한 absolute positioning으로 덮지 않는다.
- 코드상 값이 맞는다는 이유만으로 시각 검수를 생략하지 않는다.
