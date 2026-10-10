## 목적

DEV 앱 서버를 t4g.small(메모리 약 1.8GiB)에서 t4g.micro(약 0.9GiB)로 낮추기 전에 JVM 힙 상한을 정한다.

힙은 Java가 데이터를 올려 두는 작업 공간이다. 따로 정하지 않으면 Java는 서버 메모리의 1/4을 최대 힙으로 잡는다.

| 서버 | 전체 메모리 | 상한을 안 정했을 때 최대 힙 |
| --- | --- | --- |
| 예전 DEV (t4g.small) | 약 1.8GiB | 약 460MiB |
| 새 DEV (t4g.micro) | 약 0.9GiB | 약 230MiB (자동으로 줄어듦) |

micro에서 그대로 두면 두 가지 문제가 생길 수 있다.

- **너무 작아진다.** Java가 알아서 230MiB로 줄인다. 앱은 small에서 이미 Java 전체 약 500MiB를 쓰고 있어
  힙이 모자라 오류가 나거나, 메모리 정리(GC)만 계속하느라 느려질 수 있다.
- **반대로 크게 두면 서버 메모리가 넘친다.** CodeDeploy·SSM 에이전트 같은 다른 프로그램이 이미 약 350MiB를 쓴다.
  Java까지 460MiB를 쓰면 0.9GiB를 넘어 리눅스가 프로세스를 강제로 종료할 수 있다.

그래서 중간값인 **384MiB로 직접 정한다.** 앱이 돌 만큼은 주고 다른 프로그램 자리도 남기는 값이다.

## 주요 내용

### 설정 값: 변수 이름만 같고 값은 다르다

| 파일 | 넣은 줄 | 효과 |
| --- | --- | --- |
| `server/dev.env` | `JAVA_TOOL_OPTIONS=-Xmx384m` | DEV만 최대 힙 384MiB |
| `server/prod.env` | `JAVA_TOOL_OPTIONS=` (빈 값) | PROD는 바뀌지 않는다. 기본값(약 460MiB) 그대로 |

- PROD에 빈 값을 넣은 것은 "두 env 파일의 변수 이름을 같게 둔다"는 규칙 때문이다.
  두 파일을 비교할 때 빠진 것으로 헷갈리지 않고, 나중에 PROD도 힙을 정해야 하면 값만 채우면 된다.

### 왜 env 파일에 넣었나

- 서버 실행 설정(`backend/deploy/systemd/yesulin.service`)은 DEV와 PROD가 같은 파일을 쓴다. 여기에 `-Xmx`를 넣으면 PROD도 바뀐다.
- env 파일은 빌드할 때 `DEPLOY_ENV`에 따라 `dev.env` 또는 `prod.env`가 골라 들어간다. 환경마다 다르게 둘 값은 여기에 둔다.
- `JAVA_TOOL_OPTIONS`는 Java가 시작할 때 자동으로 읽는 표준 환경 변수다. systemd가 `EnvironmentFile`로 env 파일을 읽어 Java에 넘기므로 unit 변경은 없다.

### 바뀐 파일과 반영 순서

env 파일은 비밀값이 있어 config 저장소에 SOPS로 암호화해 둔다. 그래서 두 저장소에 나눠 반영했다.

1. config 저장소: `dev.env`·`prod.env`에 한 줄씩 추가 → `de5a806` (config main)
2. 앱 저장소 PR #281 (`dev`): `config-version.txt`와 config submodule 포인터를 `de5a806`으로 올림.
   `backend/deploy/yesulin.env.example`, `backend/docs/operations/deployment.md`(실행 단계 4)에 설명 추가.
3. 앱 저장소 PR #282 (`main`): `config-version.txt`만 `de5a806`으로 올려 PROD에 반영.
   예시 env와 `deployment.md` 설명은 다음 `dev → main` 병합 때 `main`에 들어간다.

## 검증 결과

- config
  - `sh scripts/config/validate-pin.sh --local` 통과
  - SOPS 복호화와 MAC 검증 통과. 두 파일 diff는 추가한 한 줄과 SOPS 메타데이터뿐이다.
  - `JAVA_TOOL_OPTIONS`는 dev·prod 양쪽에 있다. `dev.env`에만 있는 SMS·SOLAPI 변수 9개는 이번 변경 전부터 있던 차이다.
  - config main push 직후(2026-10-09 21:33) `ConfigSource` 웹훅으로 DEV·PROD Pipeline이 실행됐고, 고정 버전이 바뀌기 전이라
    둘 다 버전 검증에서 39초 만에 실패했다. 배포는 되지 않았다(예상된 실패).
- DEV (PR #281 병합, 2026-10-09 21:45 서비스 시작)
  - 기동 로그에 `Picked up JAVA_TOOL_OPTIONS: -Xmx384m`이 찍혔고, 프로세스 환경에도 같은 값이 있다.
  - readiness 200
  - 힙 상한 전(t4g.small, 기본값 460MiB): Java 메모리 501MiB
  - 힙 상한 후(t4g.small): 기동 직후 Java 메모리 449MiB
- DEV t4g.micro 전환 뒤 (2026-10-09 23:37 기동)
  - Java 메모리 402MiB, 서버 가용 메모리 249MiB, swap 512MiB(사용 약 5MiB)
  - GC는 SerialGC다. 메모리 1792MB 미만이면 Java가 기본으로 고른다. PROD는 G1이다.
  - `https://dev.yesulin.art/api/v1/health` 200(`UP`, DB `UP`)
- PROD (PR #282 병합)
  - PROD Pipeline이 2026-10-10 00:32에 시작해 00:43에 성공했다(Source `66a989f`, ConfigSource `de5a806`).
  - `https://yesulin.art/api/v1/health` 200(`UP`, DB `UP`), 2026-10-10 09:31 확인

## 미검증 항목

- PROD 서버 안의 기동 로그와 프로세스 환경은 직접 보지 않았다. 확인하려면 PROD 앱에 Session Manager로 접속해 아래를 본다.
  빈 값이면 `Picked up JAVA_TOOL_OPTIONS:` 한 줄만 찍히고 힙은 기본값(약 460MiB)이어야 한다.

  ```bash
  sudo journalctl -u yesulin --since today --no-pager | grep 'Picked up JAVA_TOOL_OPTIONS'
  ```

- DEV micro에서 메모리를 많이 쓰는 기능(관리자 로그 집계 등)과 배포 중 메모리 여유는 1주 동안 지켜본다(OOM 로그, swap 사용량).
