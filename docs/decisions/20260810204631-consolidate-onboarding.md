---
status: accepted
date: 2026-08-10
agent-required: true
---

# 온보딩 문서 통합

## 계기

README와 제품·개발·API 온보딩 문서가 현재 상태, 실행 방법과 흐름을 반복해 토큰과 동기화 비용이 늘었다.

## 결정

사람용 온보딩은 루트 `README.md`로 통합한다. API 목표와 이관 상태는 `docs/convention/api-convention.md`에서 관리한다.

## 이유

정보의 정본을 줄여 탐색과 갱신을 단순화한다.

## 영향

제품 범위·실행·코드 지도는 [README](../../README.md), API 차이는 [API 컨벤션](../convention/api-convention.md)을 갱신한다. 별도 온보딩 문서는 만들지 않는다.
