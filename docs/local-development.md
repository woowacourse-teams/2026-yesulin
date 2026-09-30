# 로컬 통합 실행

Docker Compose는 MySQL, LocalStack S3, Spring Boot와 Next.js를 하나의 네트워크에서 실행한다.
실행 전에 `config/server/local.env`를 만든다. Compose는 이 파일을 백엔드 컨테이너에 읽기 전용으로 연결하고,
Spring이 SMTP·OAuth 등 애플리케이션 설정을 직접 읽는다. 기존 루트 `.env`는 Compose의 MySQL 접속 정보와
프론트엔드 설정에 계속 사용한다. Docker 실행 시 DB 이름·계정·비밀번호는 루트 `.env`의 값이 백엔드에도 전달되므로,
`config/server/local.env`의 DB 값과 다르게 설정하지 않는다.

```bash
docker compose up --build -d --wait
```

- 프론트엔드: `http://localhost:3000`
- 백엔드 health: `http://localhost:8080/api/v1/health`
- 프론트 경유 health: `http://localhost:3000/api/v1/health`
- MySQL: `localhost:3307`
- LocalStack S3: `localhost:4566`

운영 대시보드(`/admin`)를 로컬에서 확인하려면 `config/server/local.env`에 `YESULIN_ADMIN_ACCOUNTS`를 설정한다. 값이 없으면
운영자 계정이 만들어지지 않아 로그인할 수 없다.

```bash
YESULIN_ADMIN_ACCOUNTS=admin@yesulin.art:local-admin-passphrase
```

기본 Compose는 실제 Backend API를 사용한다. 목 시나리오가 필요할 때만 루트 `.env`에
`NEXT_PUBLIC_API_MOCKING=enabled`를 설정하고 프론트 이미지를 다시 빌드한다. OAuth에는
`config/server/local.env`의 provider credential과 `SOCIAL_LOGIN_ENABLED=true`가 필요하다.

```bash
docker compose ps
curl --fail http://localhost:8080/api/v1/health
docker compose down
```

MySQL data와 로그 volume까지 제거하는 `docker compose down --volumes`는 로컬 데이터를 지워도 되는 경우에만 사용한다.

## 오디션 안내 문자 (솔라피 기본, 알리고 전환 지원)

기본값은 `SMS_ENABLED=false`다. 실발송 없이 초안과 미리보기를 확인할 수 있다.
아래 값은 백엔드 `config/server/local.env` 또는 배포 서버 설정에만 넣는다. 브라우저 환경변수로 전달하지 않는다.

```dotenv
SMS_ENABLED=false
SMS_PROVIDER=solapi
SOLAPI_API_KEY=
SOLAPI_API_SECRET=
SMS_SENDER=
# 부가세 포함 실계정 단가. 임의 광고 단가를 넣지 않는다.
SMS_PRICE_INCLUDING_VAT=0
LMS_PRICE_INCLUDING_VAT=0
# 예산과 선택한 공급자의 계정 조건에 맞춰 설정한다. 0이면 발송 차단.
SMS_REQUEST_LIMIT=0
SMS_DAILY_LIMIT=0
```

- 요청 상한은 최대 500명이다. 일일 한도는 한국 날짜별 예술IN 전체 계정 접수 건수이며 실패 환급 후에도 자동 복구하지 않는다.
- 선택한 공급자에 발신번호를 등록하고 API 키, 계정별 한도·잔액, 실제 단가를 확인한 뒤에만
  `SMS_ENABLED=true`로 실발송을 활성화한다. 솔라피는 API Secret도 필요하고, 알리고는 서버 발신 IP를 등록한다.
- 서버 설정 변경은 백엔드 재기동이 필요하다. 프론트에 키를 주입하지 않는다.
- 테스트는 Fake 또는 루프백 HTTP stub만 사용한다. 실제 공급자의 API는 테스트에서 호출하지 않는다.
- 합격자를 선택한 후 ‘선택한 합격자에게 문자 보내기’를 연다. 날짜·시·분과 추가 안내사항을 입력하면
  제작사·공고 정보를 포함한 본문이 즉시 표시되고 유형·요금은 서버에서 자동 확인한다. 초안 저장 UI는 없다.
- ‘발송 내역 확인’에서 이름·성공·실패 인원을 확인한다. 오류 후 재전송 전에 반드시 발송 내역을 확인한다.

### 공급자 전환

알리고로 전환할 때는 코드를 수정하지 않고 다음 설정과 해당 계정의 단가·한도만 변경한 뒤 백엔드를 재기동한다.

```dotenv
SMS_PROVIDER=aligo
ALIGO_USER_ID=
ALIGO_API_KEY=
SMS_SENDER=
```

`SMS_SENDER`는 선택한 공급자에 등록된 발신번호다. 기존 `ALIGO_SENDER`는 `SMS_SENDER`가 없을 때만 호환용으로
읽는다. 다시 솔라피를 사용하려면 `SMS_PROVIDER=solapi`와 솔라피 자격 증명을 설정한다.
기본 공급자는 솔라피이므로 기존 알리고 사용 환경은 업그레이드 시 `SMS_PROVIDER=aligo`를 명시해야 한다.
발송 활성화 상태에서 선택한 공급자의 자격 증명이 없거나 공급자명이 잘못되면 서버 기동이 실패한다.

전환 전 신규 접수를 멈추고 기존 QUEUED/SENDING 건의 처리가 끝났는지 확인한다. 대기 건은 실행 시점의 공급자로
전송되므로 이전 단가로 접수된 건이 남은 상태에서 변경하지 않는다. 운영 인스턴스는 같은 공급자·단가 설정을 사용한다.
ACCEPTED/UNKNOWN 결과 조회가 남아 있으면 이전 공급자의 키도 유지한다. 새 발송 ID는 `solapi:메시지ID` 또는
`aligo:메시지ID`로 저장하며, 조회는 현재 설정과 무관하게 원래 공급자로 보낸다. 기존 숫자 ID는 알리고로 조회한다.
이전 공급자의 키가 없으면 해당 결과는 UNKNOWN으로 유지한다. 조회 시 관리자 콘솔에는 접두사를 제외한 메시지 ID를 사용한다.
전환을 위한 DB 초기화나 기존 발송 기록 수정은 필요 없다. 실패 시 다른 공급자로 자동 재발송하지 않는다.

### 장애·보관 운영

수신자별 호출로 업체 ID를 개별 보관한다. 솔라피는 `/messages/v4/send-many/detail`에 1건씩 요청하고,
알리고는 `/send/`를 사용한다. 서로 다른 문구·유형과 같은 전화번호도 대상별로 구분한다.
DB 접수와 외부 HTTP 호출은 별도 트랜잭션이며 다중 인스턴스는 DB 잠금으로 발송 대상을 선점한다.
발송 직전 권한·지원서 존재·합격 상태·미래 일시를 재확인한다. 검증 후 외부 호출을 시작한 요청은 이후 지원서 삭제나 결과 변경으로 취소할 수 없다.

worker는 기본 10초 간격으로 최대 10건 전송을 시작한다. HTTP 시간 제한은 15초이며 자동 HTTP 재시도는 하지 않는다.
2분 이상 SENDING은 UNKNOWN으로 복구한다. 업체 ID가 있으면 최초 6회는 10초 이상 간격으로,
이후는 15분 간격으로 최대 100회 결과 조회한다. 실제 주기는 워커 처리량과 업체 응답 시간에 따라 늘어날 수 있다.
솔라피 LMS는 본문 앞부분의 자동 제목 생성을 피하려고 공백 subject를 명시하고 SMS에는 subject를 보내지 않는다.
통신사·수신 앱에서 붙이는 Web발신 등의 표시는 별도이며 실기기 수신 화면을 확인해야 한다.
솔라피의 2000/3000은 ACCEPTED, 4000은 DELIVERED로 매핑한다. 1xxx/2xxx/3xxx 오류는 FAILED로 처리하되
서버 오류 1024/2024와 불명확한 상태 3014/3048은 UNKNOWN으로 둔다. 조회 결과의 메시지 ID와 수신번호가
모두 일치해야 상태를 갱신한다. 알리고는 `발송완료`와 `가입자없음`만 전달 완료/확정 실패로 매핑한다.
HTTP 오류·타임아웃·불완전한 응답은 UNKNOWN으로 남겨 중복 발송을 방지한다.
번호별 결과는 늦게 도착할 수 있다. 업체 ID 없는 UNKNOWN 또는 조회 상한을 넘긴 기록은 해당 공급자 관리자 화면에서
전송 시각·수신번호·메시지 ID를 대조해 운영자가 확인한다. 확인 없이 새 키로 재발송하지 않는다.

수신자 개인정보는 접수 후 30일, 초안은 마지막 저장 후 30일에 worker가 삭제한다.
worker를 중지하면 파기도 중지되므로 운영에서 방치하지 않는다. DB 백업과 업체 보관 내역은 이 작업으로 삭제되지 않는다.
새 마이그레이션만 적용한다. 기존 Flyway 기록과 DB를 초기화할 필요가 없다.

공식 규격: [솔라피 발송](https://solapi.com/developers/api/messages),
[솔라피 결과 조회](https://solapi.com/developers/api/msg-getList),
[솔라피 상태 코드](https://solapi.com/developers/api/msgstatus),
[알리고 API](https://smartsms.aligo.in/admin/api/spec.html).
실계정 전달·과금·환급 및 미확인 업체 상태 매핑은 승인된 실발송 검증 후 확인해야 한다.
