---
status: accepted
date: 2026-08-10
agent-required: true
---

# API 버전과 리소스 경로

## 계기

`/api/me/producer`, `/api/screenings/rounds/close`처럼 주체와 행동이 섞여 경로만으로 대상 리소스를 이해하기 어려웠다.

## 결정

API는 `/api/v1`을 사용하고 복수형 리소스를 중심으로 설계한다. 행동은 HTTP Method로 표현하며, `me`와 `current`는 인증 컨텍스트 리소스에만 사용한다. 차수 마감은 명령형 `/close` 대신 차수 리소스의 상태 변경으로 표현한다.

## 이유

경로가 리소스 계층과 소유 관계를 드러내면 프론트·백엔드·문서가 같은 의미를 공유할 수 있다. URL major 버전은 breaking change의 경계를 명확히 한다.

## 영향

기존 flowchart와 MSW 경로는 백엔드 연동 전에 새 계약으로 변경한다. 상세: [API 경로 명세](../convention/api-convention.md)
