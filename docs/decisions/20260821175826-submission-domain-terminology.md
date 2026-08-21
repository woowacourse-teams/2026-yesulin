---
status: accepted
date: 2026-08-21
ai-context: on-demand
---

# 지원서 도메인 용어

## 계기

`Application`이 제출 지원서와 Java 애플리케이션 계층을 동시에 가리켜 코드와 API 계약의 의미가 모호했다.

## 결정

제출되어 불변 스냅샷이 된 지원서는 `Submission`으로 부른다. 외부 식별자와 API 경로는 각각
`submissionId`, `/submissions`를 사용하고 심사 결과도 `(submissionId, roleId, round)`로 식별한다.

Java의 `application` 계층과 공고가 정의하는 입력 양식 `AuditionForm`·`application-form`은 제출 지원서가
아니므로 이름을 유지한다. 브라우저에만 있는 제출 전 Draft도 이 결정의 이름 변경 대상이 아니다.

## 이유

제출 행위의 결과와 소프트웨어 계층, 제출 전 양식을 구분해 패키지와 계약만 보고도 책임을 알 수 있다.

## 영향

심사 모델·요청 필드·DB 컬럼과 배우/심사 API·프런트 경로를 `submission`으로 맞춘다. 기존 DB는 새
Flyway migration으로 컬럼을 변경하며 이미 적용된 migration은 수정하지 않는다.
