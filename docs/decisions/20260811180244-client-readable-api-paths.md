---
status: accepted
date: 2026-08-11
agent-required: true
---

# 클라이언트가 읽기 쉬운 API 경로

## 계기

kebab-case를 없애려고 `screening-rounds`를 `rounds`로 줄이면 클라이언트가 차수의 용도를 다시 추론해야 한다.

## 결정

REST 리소스와 HTTP Method를 기본으로 하되 경로의 의미 전달을 우선한다. 복합 명사는 kebab-case를 허용하고 `prefill`처럼 화면 목적이 분명한 경로도 유지한다. 지원자 흐름도 같은 `/api/v1` 계약에 포함한다.

## 이유

API는 클라이언트와 공유하는 인터페이스이므로 짧은 경로보다 일관되고 읽기 쉬운 경로가 협업 비용을 줄인다.

## 영향

경로를 기계적으로 단일 명사로 축약하지 않는다. 상세: [API 경로 명세](../convention/api-convention.md)
