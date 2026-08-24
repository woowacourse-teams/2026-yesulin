---
status: accepted
date: 2026-08-20
ai-context: on-demand
---

# Spring Security 기반 소셜 인증 경계

## 계기

카카오·네이버·구글 로그인만 필요한 MVP에서 OIDC Discovery, Token 교환, JWT 검증과 인증 트랜잭션을 직접 구현해 코드와 운영 책임이 과도해졌다.

## 결정

세 Provider는 OIDC Authorization Code를 사용하고 프로토콜 처리는 Spring Security OAuth2 Client에 맡긴다. 직접 만든 Discovery·Token·JWT·트랜잭션 구현과 전용 DB 테이블은 제거한다. 네이버의 공식 규칙 차이인 nonce 제외와 Token 요청 state만 작은 어댑터로 보정한다.

로그인 기능의 유일한 인수인계 경계는 `SocialLoginSuccessHandler`다. 이 경계에는 검증된 `SocialIdentity(provider, issuer, subject)`만 전달한다. 사용자 정보 API는 호출하지 않고 Provider Token도 저장하지 않는다. 회원 식별 고유 키는 `(issuer, subject)`다.

## 영향

state, PKCE, Callback, Token 교환, ID Token/JWKS 검증은 프레임워크가 담당한다. 로그인 담당자는 Provider별 프로토콜을 알 필요 없이 회원 연결 조회, 배우 최초 계정 자동 생성과 서비스 세션만 구현한다. Provider 추가는 enum, 설정과 호환 규칙이 있을 때 해당 어댑터만 변경한다.
