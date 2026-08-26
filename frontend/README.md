# 예술IN 프론트엔드

Next.js 16, React 19, TypeScript와 Tailwind CSS 4로 배우 지원 흐름과 기획사/제작사 관리자 화면을 제공한다.

## 실행과 검증

```bash
npm install
cp -n .env.example .env.development.local
npm run dev
npm run lint
npm run build
```

- 개발 서버: `http://localhost:3000`
- 관리자 진입: `/producers/performances`
- MSW 시나리오: `/dev/scenarios`
- 별도 테스트 러너는 아직 없다.

기본 모드는 실제 백엔드 API를 사용한다. MSW는 `NEXT_PUBLIC_API_MOCKING=enabled`일 때만 시작한다.
SSR과 rewrite의 백엔드 origin은 `API_ORIGIN`으로 설정한다.

## 문서

- [구조](./docs/architecture.md)
- [API와 MSW](./docs/api-integration.md)
- [디자인 시스템](./docs/design-system.md)
- [MSW 시나리오](./docs/msw-scenarios.md)
- [배우 흐름](./docs/user-flows/applicant.mmd)
- [기획사/제작사 흐름](./docs/user-flows/producer.mmd)
- [배포](./docs/deployment.md)
