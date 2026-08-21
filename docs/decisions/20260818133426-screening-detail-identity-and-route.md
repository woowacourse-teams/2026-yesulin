---
status: accepted
date: 2026-08-18
ai-context: on-demand
---

# 심사 상세 식별과 화면 경로

## 계기

지원서 하나가 여러 배역에 지원할 수 있고 심사 결과는 `(지원서, 배역, 차수)`에 속한다. 기존 목표 상세 API의 `submissionId+round`만으로는 어느 배역의 심사인지 특정할 수 없었고, 목록 위 모달은 새로고침·뒤로 가기·상세 링크 공유에도 불리했다.

## 결정

지원자를 클릭하면 `/producers/roles/{roleId}/submissions/{submissionId}?round={round}` 심사 상세 페이지로
이동한다. 목표 상세 조회 API는
`GET /api/v1/audition-roles/{roleId}/screening-rounds/{round}/submissions/{submissionId}`로 식별한다.
`submissionId`는 UUID를 사용하고 목록으로 돌아갈 때도 `round`를 유지한다.

## 이유

`audition-roles`와 차수를 경로에 명시하면 복수 배역 지원서의 심사 기록을 혼동하지 않고 회원 역할과도
구분된다. UUID는 순차 PK 노출로 지원자 수를 추측하는 일을 막는다. 독립 페이지는 브라우저 탐색과 링크 공유도
지원한다.

## 영향

프론트 프로토타입은 기존 보드 목 응답에서 해당 지원자를 찾는다. 실제 백엔드 연동 시 상세 조회를 위 목표 계약으로 구현해야 한다.
