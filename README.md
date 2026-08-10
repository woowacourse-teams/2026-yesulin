# 예술IN

공연 공고에서 유입된 지원자의 접수와 심사를 관리하는 서비스입니다.

## 빠른 시작

### 저장소 개발 도구 — 최초 1회 필수

Node.js 22.12 이상이 필요합니다.

```bash
npm install
```

루트 의존성과 Husky Git hook을 설치합니다. 커밋 메시지는 항상 검사하며, 백엔드 Java·Checkstyle 설정을 변경한 커밋에서만 Checkstyle을 실행합니다.

### 프론트엔드 (공연사 관리자 + 지원자 공개 화면)

```bash
cd frontend
npm install
npm run dev
```

브라우저: **http://localhost:3000**

**첫 방문?** → [온보딩 가이드](./docs/온보딩.md)에서 5분 투어와 코드 지도를 따라보세요.

### 백엔드

```bash
cd backend
./gradlew bootRun      # 앱 실행
./gradlew build        # 컴파일
./gradlew test         # 테스트
```

## 프로젝트 구조

```text
2026-yesulin/
├── backend/               # Spring Boot 4.1, Java 25 (빈 스캐폴드)
├── frontend/              # Next.js 16 + React 19
│   ├── src/app/           공연사 관리자 + 지원자 공개 라우트
│   ├── src/features/      도메인 레이어 (types, api, 필터, 라벨)
│   ├── src/components/    UI 컴포넌트
│   └── src/mocks/         MSW 핸들러 & 목 데이터
└── docs/
    ├── convention/        BE·Git 컨벤션
    ├── decisions/         번호 기반 프로젝트 결정 기록
    ├── 온보딩.md          ⭐ 새 팀원 필독
    ├── performance-management.md  살아 있는 스펙 (도메인·API·MSW)
    ├── index.html         원본 프로토타입
    ├── design.md          UI 디자인 원칙
    └── README.md          문서 운영 규칙
```

## 현재 상태

| 영역 | 상태 |
| --- | --- |
| **공연사 관리자** | ✅ 공연 생성, 공고 생성, 지원자 심사(1·2·3차) MSW로 동작 |
| **지원자 공개** | ✅ 공고 상세, 지원서 작성, 목 제출 완료 |
| **백엔드** | 스캐폴드만 준비 |

## 개발 방식 — 계약 우선(Contract-First)

화면 → 타입 정의 → API 계약 → 목 구현 → 문서 → 백엔드 구현

자세한 설명은 [온보딩 가이드의 3번](./docs/온보딩.md#3-우리-개발-방식--왜-프런트가-먼저인가)을 참고합니다.

## 자주 묻는 것

**포트 3000이어야 하나?**  
아니요. 절대 URL이 없고 API는 전부 상대 경로입니다. 3001, 5173 등 아무거나 됩니다.  
→ 상세는 [온보딩: 포트 관련 함정](./docs/온보딩.md#2-실행하기)

**다른 브랜치의 상태는?**  
`git branch -a` 로 확인. 현재 prototype 브랜치가 최신 구현입니다.

**새로고침하면 데이터가 사라져요**  
정상입니다. 목 데이터는 브라우저 메모리에만 있습니다.

## 다음 할 일

- [ ] 백엔드 첫 엔드포인트 (`GET /api/auditions/tree`)
- [ ] 실제 데이터 저장소 연동
- [ ] 자동화된 테스트 (프론트엔드, 백엔드)
- [ ] 지원자용 인증 및 지원서 저장 API

---

더 알고 싶으신 것이 있으면:
- **실행 및 코드 구조** → [온보딩](./docs/온보딩.md)
- **도메인·API·MSW** → [공연 관리 문서](./docs/performance-management.md)
- **UI 디자인** → [design.md](./docs/design.md)
- **AI 에이전트용** → [CLAUDE.md](./CLAUDE.md)
