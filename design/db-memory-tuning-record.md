# MySQL 메모리 설정 조정 기록 (2026-10-22)

PROD DB가 왜 t4g.small이어야 하는지 확인하다가, 데이터는 4.5MiB인데 MySQL이 627MiB(컨테이너 상한 700MiB의 90%)를 쓰는 것을
발견해 설정을 줄였다. DEV에 먼저 적용하고 PROD에 적용했다. 서버 출력 원문과 측정 CSV는
[`db-memory-evidence/20261022/`](db-memory-evidence/20261022/)에 있다.

## 1. 왜 PROD DB는 small인가

- 2026-09-23~24, PROD DB가 t4g.micro(906MiB, swap 없음)일 때 커널이 메모리 부족으로 MySQL을 이틀 동안 3번 강제 종료했다.
  9/26 PROD 첫 배포가 실패하며 드러났고, 그날 t4g.small(2GiB)로 바꿨다(스프린트 1 장애 기록).
- 10/8 측정: MySQL 549MiB / 상한 700MiB(78%).

## 2. 지금 사용량 (10/13~10/22 CloudWatch, 10/22 서버에서 직접 확인)

| 항목 | 값 | 해석 |
| --- | --- | --- |
| DB 데이터 | 표 85개, 4.5MiB | 아주 작다 |
| 초당 쿼리 | 일 평균 1.3~4.6, 최대 57 | 한가하다 |
| 동시 연결 | 최대 22 (앱 2대 × 10 + 수집기) | 상한 50 안 |
| 느린 쿼리, swap | 0 | |
| 버퍼 풀 실제 사용 | 32MiB (설정 256MiB) | 데이터가 작아 다 쓰지 않는다 |
| 서버 사용 가능 메모리 | 최저 588MiB, 일 평균 730~760MiB (전체 1,835MiB) | |
| **MySQL 실제 메모리** | **627MiB** (컨테이너 상한의 90%) | 10/8 549MiB → 2주 만에 약 +80MiB |
| 나머지 프로세스 | 약 350MiB (dockerd 71, CloudWatch Agent 52, containerd 47, SSM 69, snapd 28 등) | |

MySQL이 쓰던 메모리 내역(조정 전 PROD, `performance_schema.memory_summary_global_by_event_name` 읽기 전용 조회):

| 항목 | 메모리 |
| --- | --- |
| `performance_schema` (성능 측정 기능) | **235.0MiB** |
| InnoDB 버퍼 풀 (설정 256MiB) | 261.8MiB |
| InnoDB 로그 버퍼 등 나머지 InnoDB | 134.1MiB |
| 추적 합계 | 673.5MiB |

**왜 성능 측정 기능이 켜져 있었나:** 설정 파일 `/opt/yesulin-db/compose.yml`(서버에만 있고 저장소에는 없다)에 해당 줄이 없어서
MySQL 8.4 기본값(ON)이 그대로 쓰였다. 의도해서 켠 것이 아니다. 스프린트 2에서 DEV의 느린 쿼리(COUNT)를 찾을 때만 실제로 썼다.

**DEV는 왜 micro로 버텼나:** DEV도 설정이 똑같았다. MySQL이 메모리에 99MiB, **swap에 610MiB**(가동 63일)로 합계 약 710MiB를 쓰고 있었다.
DEV는 swap 1GiB가 있어 디스크로 밀어내며 버텼고, PROD는 swap이 없어 전부 메모리에 있었다.

**당시 결론:** 설정 그대로면 micro에서 MySQL 627MiB + 나머지 350MiB ≈ 980MiB로 906MiB를 넘어 다시 강제 종료된다. small이 필요한
진짜 이유는 데이터나 트래픽이 아니라 MySQL 기본 설정이었다. 또한 small이어도 MySQL이 컨테이너 상한(700MiB)을 넘으면 Docker가
MySQL을 종료하므로, 2주에 80MiB씩 늘던 속도면 2~3주 안에 같은 장애가 날 수 있었다.

## 3. 조치

`/opt/yesulin-db/compose.yml`을 `compose.yml.bak-20261022`로 백업한 뒤 바꾸고 `docker compose up -d`로 MySQL 컨테이너를 다시 만들었다.
데이터 디스크는 그대로다.

| 설정 | 전 | 후 |
| --- | --- | --- |
| `--performance-schema` | (없음, 기본 ON) | **OFF** |
| `--innodb-buffer-pool-size` | 256M | **128M** |
| `mem_limit`, `--max-connections` | 700m, 50 | 그대로 |

## 4. 결과

| | DEV (t4g.micro, swap 1GiB) | PROD (t4g.small, swap 없음) |
| --- | --- | --- |
| 적용 시각 (KST) | 15:43:27 재시작 → 15:43:53 healthy (26초) | 15:47:26 재시작 → 15:47:36 healthy (10초) |
| MySQL 전 | 메모리 99MiB + swap 610MiB | **627MiB**, 상한의 90% |
| MySQL 후 | **231MiB**, swap 0 (서버 swap 사용 694 → 61MiB) | **235MiB**, 상한의 31.7% |
| 서버 사용 가능 메모리 | - | 727 → **1,115MiB** |
| 확인 | DEV health 200, 공고 목록 200 | 설정 반영(버퍼 풀 128, performance_schema 0), DB 연결 22개로 앱 2대 재연결 |

**PROD 재시작 중 서비스 영향** (`ops/loadtest/deploy-availability.py`, 0.2초 간격으로 `/api/v1/health` 호출, `prod-mysql-restart.csv`)

| 항목 | 값 |
| --- | --- |
| 측정 구간 | 15:47:17 ~ 15:49:03 KST |
| 총 요청 | 527 |
| 실패 | **21건 (3.98%)** — 503 7건, 2초 시간 초과 14건 |
| 가장 긴 끊김 | **3.6초** (15:47:27 ~ 15:47:31) |
| 첫·마지막 실패 | 15:47:27, 15:47:32 |
| 이후 | 두 앱 서버 모두 정상 응답 |

health는 DB 연결까지 확인하므로 DB가 다시 켜지는 동안 503이나 시간 초과가 났다. 약 5초 동안 DB를 쓰는 요청이 실패했다.

## 5. 한계와 다음 일

- **방금 재시작한 값이다.** MySQL 메모리는 시간이 지나며 늘어난다. 1~2주 동안 서버 사용 가능 메모리(대시보드 `HostMemoryAvailable`)와
  MySQL 메모리를 지켜보고 안정된 값을 이 문서에 추가한다.
- **느린 쿼리 분석이 필요하면 잠깐 다시 켠다.** `performance_schema`가 꺼져 쿼리별 통계(digest)를 볼 수 없다. 쿼리 성능 요구사항을 할 때
  DEV에서만 다시 켜서 측정한다.
- **PROD DB micro 전환은 아직이다.** 남은 조건은 2주 메모리 측정, swap 추가, 운영진 요청(우리 계정은 인스턴스를 정지할 수 없다),
  점검 시간 공지(정지·시작 동안 수 분 중단)다. 전환하면 복구 연습(사용 가능 메모리 600MiB 이상 필요)을 할 다른 방법도 정해야 한다.
- **설정 파일이 저장소에 없다.** DB의 `compose.yml`은 서버에만 있어 이번처럼 바꾼 내용을 추적하기 어렵다. 저장소로 옮길지 검토한다.

## 되돌리기

```sh
cd /opt/yesulin-db && sudo cp -p compose.yml.bak-20261022 compose.yml && sudo docker compose -f compose.yml up -d
```
