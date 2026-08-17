---
status: accepted
date: 2026-08-16
agent-required: true
---

# 파일 업로드 경계

## 계기

파일 application이 `PERFORMANCE_POSTER`나 공연 연결을 알면 새 파일 용도가 생길 때마다 공통 파일 코드가 모든 도메인에 의존하고 멀티 모듈 분리가 어려워진다.

## 결정

공연 포스터의 인증·미디어 타입·용량 계약은 performance presentation에 둔다. 파일 application은 presigned upload 생명주기와 범용 참조만 관리하며 `purpose`, 도메인별 attach 메서드와 `ATTACHED` 상태를 두지 않는다. 다른 도메인은 `fileId`를 참조하고 사건으로 범용 참조를 추가·교체한다. Object Storage는 application port로 추상화하고 infrastructure가 이를 구현한다.

## 이유

도메인 의미와 기술적 파일 관리를 분리하면 application/domain/presentation/infrastructure 단방향을 지키면서 파일 모듈을 독립적으로 분리할 수 있다.

## 영향

실제 S3 adapter는 별도 구현한다. 다중 재사용 관계는 후속 [파일 참조 결정](./20260817063526-file-reference-registry.md)과 [파일 업로드 설계](../backend/file-upload.md)를 따른다.
