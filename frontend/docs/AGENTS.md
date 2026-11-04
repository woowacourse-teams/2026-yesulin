# 프론트엔드 평가 규칙

최상위 [작업 규칙](../../AGENTS.md)과 [공통 평가 절차](../../docs/agent-review.md)를 적용한다.
기능 흐름은 [architecture.md](architecture.md), UI 경계는 [design-system.md](design-system.md),
분석 의미와 분모는 [analytics.md](analytics.md)를 기준으로 평가표를 만든다.

- 서버와 브라우저가 함께 사용하는 값은 클라이언트 전용 모듈에서 가져오지 않는다.
- 홈·목록 변경은 정상·빈 상태·실패/재시도·기존 주소 이동·키보드·동작 감소를 확인한다.
- 실행하지 않은 화면·실기기 검증은 UNVERIFIED로 기록한다.
- 이번 변경의 미사용 코드·자산·설정·의존성·옛 문서를 확인하고 평가표를 `reviews/`에 남긴다.
