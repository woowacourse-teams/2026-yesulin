# 로컬에만 Flyway out-of-order 허용

## 계기

브랜치를 병렬로 작업하면서 버전이 앞선 마이그레이션이 나중에 병합됐다.
`V20260823120000__create_submissions.sql`은 `V20260823195941` 등보다 버전이 빠른데
main에는 22분 늦게 들어왔다. 먼저 다른 브랜치를 적용한 로컬 DB는
`Detected resolved migration not applied to database`로 앱이 부팅되지 않는다.
실제로 개발 중 두 번 발생해 로컬 DB를 초기화해서 넘겼다.

## 결정

`application-local.yml`에만 `spring.flyway.out-of-order: true`를 둔다.
`application.yml`은 기본값 `false`를 유지하므로 staging과 운영은 순서를 엄격히 지킨다.

## 이유

로컬 DB는 언제든 버릴 수 있는 데이터라 순서가 어긋난 채 적용돼도 잃을 것이 없고,
개발자가 매번 DB를 초기화하는 비용이 더 크다.

배포 환경은 반대다. 순서가 뒤바뀐 채 적용되면 앞선 마이그레이션이 만들 테이블을
뒤늦게 참조하는 식으로 실패할 수 있어 기본값을 유지한다.
배포 전에는 병합 순서와 버전 순서를 맞추는 것으로 해결한다.

## 영향

- 로컬에서 다른 브랜치를 받아도 DB를 지우지 않고 이어서 개발할 수 있다.
- 대부분의 테스트는 `spring.flyway.enabled=false`와 `ddl-auto=create-drop`을 써
  마이그레이션을 타지 않으므로 이 문제를 잡지 못한다. 순서 문제는 CI가 아니라
  로컬 실행과 배포에서 드러난다.
- 배포 대상 브랜치는 병합 직전 마이그레이션 버전이 기존 최신보다 뒤인지 확인해야 한다.
