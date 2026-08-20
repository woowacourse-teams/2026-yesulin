# 예술IN 프론트엔드

기획사/제작사 관리자 화면과 배우 공개 공고·지원서 흐름을 제공하는 Next.js 애플리케이션이다. 전체 제품 범위와 공통 개발 방식은 [프로젝트 README](../README.md)를 기준으로 한다.

## 실행과 검증

Node.js 24 이상이 필요하다. 저장소 루트의 `.nvmrc`는 팀과 CI의 권장 메이저 버전 24를 지정한다. 모든 명령은 이 디렉터리에서 실행한다.

```bash
npm install
npm run dev
npm run lint
npm run build
npm run start
```

- 개발 서버: `http://localhost:3000`
- 기획사/제작사 관리자: `/producers/performances`
- 배우 공개 공고: `/apply/seed_posting_1`
- 전체 항목·커스텀 3문항 검증 공고: `/apply/seed_posting_all_fields`
- 개발용 목 시나리오 허브: `/dev/scenarios`
- MSW 비활성화: `NEXT_PUBLIC_API_MOCKING=disabled`
- 실제 API의 서버 조회 origin: `API_ORIGIN`

별도 테스트 러너는 아직 구성되어 있지 않다. UI 변경은 최소 `npm run lint`, 타입·라우팅·빌드에 영향을 주는 변경은 `npm run build`까지 확인한다.

## 구조

```text
src/
├── app/
│   ├── apply/[postingId]/          배우 공개 공고·지원서 라우트
│   └── producers/                  기획사/제작사 관리자 라우트
├── features/auditions/             JSX 없는 심사 도메인·API 계층
├── features/applications/          공개 공고 읽기 모델·지원서 규칙
├── components/
│   ├── producers/                  관리자 셸과 사이드바
│   ├── auditions/                  심사 UI
│   ├── applications/               배우 공개 공고·지원서 UI
│   └── mocks/                      MSW 초기화 컴포넌트
└── mocks/                          MSW 핸들러와 인메모리 목 데이터
```

라우트는 URL 파라미터를 화면 컴포넌트에 전달하는 얇은 계층으로 유지한다. 비즈니스 규칙은 `features/`, 화면 표현은 `components/`, 목 API 동작은 `mocks/`에 둔다.

## 주요 문서

- [프론트엔드 작업 규칙](./AGENTS.md)
- [디자인 시스템](./docs/design-system.md)
- [도메인 설계](../docs/domain-design.md)
- [배우 흐름](../docs/flowchart/actor.mmd)
- [기획사/제작사 흐름](../docs/flowchart/producer.mmd)
- [목표 API와 이관 상태](../docs/convention/api-convention.md)
- [MSW 시나리오와 UI 검증 기준](./docs/mock-scenarios.md)

현재 공개 지원서는 로그인 전 작성과 최종 검토 UI를 제공하고, 공고별 입력값·선택 배역·진행 단계·사진 Blob을 IndexedDB에 저장한다. 저장 상태는 `저장 중`, `이 기기에 저장됨`, `저장 실패`로 구분하며 실제 저장되지 않은 변경이 있을 때만 이탈을 경고한다. 새로고침, 공고 상세 왕복, 소셜 로그인 화면 왕복 뒤 같은 브라우저의 Draft를 복원하지만 서버 Draft 동기화와 인증 계정 자동 연결은 아직 구현하지 않았다. 최종 제출은 인증을 요구하며 제출 지원서는 계정의 내 지원서에서 읽기 전용 스냅샷으로 확인한다. 목표 정책과 구현 차이는 도메인 설계 문서의 `현재 구현 상태와 차이`를 기준으로 확인한다.

공연 관리의 장소 검색은 카카오 우편번호 서비스를 사용한다. `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`를 설정하면 선택한 도로명주소를 좌표로 변환해 지도와 마커를 표시한다. 키가 없을 때도 기존 주소는 확인할 수 있지만 좌표 검색과 지도 미리보기는 동작하지 않는다. 공연 포스터와 공고 포스터는 현재 Data URL 목 저장이며, 공고는 생성 시점의 공연 포스터를 복사한 독립 스냅샷을 가진다.

`returnTo`가 `/apply/{postingId}`인 로그인 화면은 일반 로그인과 다른 지원서 제출 문맥을 표시한다. 공고 읽기 모델에서 확인한 공연명·공고명과 검증된 배역을 보여 주고 카카오·네이버·Google 배우 소셜 로그인만 제공한다. 인증 성공 시 `prefill=1&resumeDraft=1`로 최종 검토 화면을 다시 열며, 명시적인 인증 취소 링크는 인증 상태를 만들지 않고 `resumeDraft=1`로 로컬 Draft만 복원한다. Draft는 현재 기기의 해당 브라우저 IndexedDB에만 있으며 서버나 다른 기기에 저장됐다고 안내하지 않는다.

## MSW와 실제 API

기본 개발 환경은 MSW를 사용한다. UI 검증을 위해 기본 심사 공고와 모든 표준 항목·커스텀 3문항을 갖춘 공개 지원서 공고를 시드로 제공하며, 추가로 만든 데이터와 심사 상태는 브라우저 메모리에 유지되어 새로고침하면 초기 상태로 돌아간다. 배우 소셜 로그인은 불투명한 프론트 전용 자격값을 React 상태에 저장하고, 기획사/제작사 로그인은 `ACTIVE`, 기획사/제작사 가입은 `PENDING` 세션을 만들어 역할별 화면으로 이동한다. 이 상태는 라우트 이동 동안 재사용되지만 새로고침하면 사라진다. `PENDING` 기획사/제작사는 정보 설정만 가능하고 다른 기획사/제작사 화면에는 카카오톡 문의가 포함된 활성화 안내를 표시한다. 브라우저 API 요청은 같은 origin의 `/api/**` 상대 경로를 사용하고, 공개 공고의 SSR·메타데이터 조회만 `API_ORIGIN`을 사용한다.

API 계약을 바꾸는 작업은 관련 타입, API 호출, MSW 핸들러와 문서를 같은 작업에서 갱신한다.

관리자 `지원자 관리`는 공고에 배역이 하나만 있어도 `/producers/postings/{postingId}`의 배역별 지원 현황을 먼저 표시한다. 배우 공개 지원서는 기존 정책대로 단일 배역 공고에서 지원 배역 선택을 생략한다.
