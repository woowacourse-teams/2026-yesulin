---
status: proposed
date: 2026-08-21
ai-context: on-demand
---

# 지원 사진 정제 실행 위치

## 계기

Presigned Upload는 업로드 부하를 S3로 분리하지만 실제 형식 검사, 이미지 디코딩과 EXIF 제거는 신뢰할 수
있는 환경이 파일 전체를 읽어야 한다. 현재 Backend는 2GiB `t4g.small` EC2에서 실행한다.

## 결정

사진보관함 첫 구현에서는 이미지 내용 검사·EXIF 제거 Worker를 제외하고 현재 S3 HEAD 기반 완료 처리만
사용한다. 운영 적용 전 실행 위치를 아래 비교로 결정한다.

| 항목 | Lambda | EC2 Spring Worker |
| --- | --- | --- |
| 비용 | 요청 수·GB-초, S3 요청·임시 저장 비용. 월 100만 요청·40만 GB-초 무료 사용량이 있으나 변동 가능 | 기존 여유 안에서는 추가 비용이 없지만 부족하면 EC2 증설 필요 |
| 자원 | Spring API의 CPU·Heap과 분리 | 제한된 전용 Worker Pool이어도 EC2 CPU·Heap 사용 |
| 운영 | S3 이벤트 중복 처리, IAM과 상태 동기화 필요 | 배포는 단순하지만 동시성 제한과 장애 복구 필요 |

같은 Region의 S3와 AWS 서비스 간 전송은 무료다. 비용 기준은 [Lambda 요금](https://aws.amazon.com/lambda/pricing/)과
[S3 요금](https://aws.amazon.com/s3/pricing/)을 결정 시점에 다시 확인한다.

## 이유

업로드량, 이미지 해상도와 정제 시간을 측정한 뒤 운영 복잡도와 EC2 증설 비용을 비교해야 한다.

## 영향

현재 `READY`는 정제 완료를 뜻하지 않는다. 지원서 연결 또는 운영 공개 전에 실행 위치, 최대 픽셀 수,
동시 처리 수, `PROCESSING/FAILED` 복구와 임시 원본 삭제 시점을 함께 확정한다.
