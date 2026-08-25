# QueryDSL 관리 조회 경계

## 계기

공연 관리 화면이 공연마다 공고, 배역, 일정, 심사 현황을 순차 호출해 요청 수가 데이터 개수에 따라 늘었다.

## 결정

- `AuditionRepository`가 관리 조회 fragment를 상속하고 QueryDSL 구현으로 일괄 조회한다.
- 조회 계약·결과와 구현은 Spring Data fragment 탐색 규칙에 맞춰 Domain query 패키지에 함께 둔다.
- Presentation은 내부 DB 식별자를 제거한 응답 모델로 외부 계약을 만든다.
- Entity 필드는 타입 안전한 Q 경로로 참조하고 문자열 경로로 변경 영향을 숨기지 않는다.

## 이유

화면별 복합 조회는 Aggregate를 순회하는 것보다 읽기 전용 모델이 단순하며, 요청·쿼리 수를 데이터 개수와
무관하게 제한할 수 있다. Application Service는 QueryDSL을 모르고 소유권 오류만 해석한다.

## 영향

Entity 필드가 바뀌면 custom 조회 구현이 컴파일 단계에서 실패한다. 해당 Q 경로와 row 조립만
수정하고 API 결과 계약은 유지한다. 단순 CRUD는 Spring Data Repository를 계속 사용한다.
