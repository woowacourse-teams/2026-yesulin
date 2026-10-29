# 방문 분석과 이벤트

## PostHog 제품 지표

PostHog는 GA와 별도 수집 경로다. `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`,
`NEXT_PUBLIC_POSTHOG_ENV`와 서버의 `POSTHOG_COLLECTION_ENABLED=true`가 모두 준비된 환경에서만 동작한다.
기본값은 비활성이다. 개발은 `dev.yesulin.art`·localhost, 운영은 `yesulin.art`·`www.yesulin.art`만 허용한다.
무료 프로젝트 하나를 공유하고 환경 표시와 차트 필터로 운영/개발을 분리한다. 각 환경에는 다른 `POSTHOG_IDENTITY_SECRET`을 쓴다. 계정·프로젝트 준비와 적용 순서는
[PostHog 운영 안내](./posthog-setup.md)를 따른다.

### 공통 집계 계약

- 활성 사용자와 핵심 지표는 **한국 시간 월~일 동안 공고 상세를 정상 조회한 고유 사용자 수(WAU)**다.
  목록 방문과 공개 화면의 추정 조회수는 쓰지 않으며 체류 시간 조건도 없다.
- W1/W4는 기준 주 전체 활성 사용자 중 정확히 1주/4주 뒤의 해당 주에 다시 공고를 조회한 비율이다.
  최초 방문자 전용 코호트가 아니다. 돌아올 주가 끝나기 전에는 관측 중이며 0으로 채우지 않는다.
- 사람 수와 클릭 횟수를 구분한다. 지원 양식 전환은 같은 사용자·같은 공고의 최초 관측 조회부터 7일 이내
  클릭이며, 7일을 충분히 관측한 대상만 분모에 넣는다. 파일 저장 완료·지원 완료로 해석하지 않는다.
- `POSTHOG_FORM_ATTACHMENTS` JSON에 실제 지원 양식인 첨부 순번을 등록한다. 파일명·확장자로 추측하지 않는다.
  미분류 첨부는 `unknown`으로 기록하고 전환 분모에서 제외한다. 첨부 교체·정렬 변경 시 매핑도 갱신해야 한다.
- 오픈채팅은 기존 공유 주소의 `src=kakao_openchat` 또는 `utm_source=kakao_openchat`만 인정한다.
  알림 유입 후 같은 탭에서 30분 이내 다른 공고를 열면 탐색으로 기록한다. 다른 공고마다 30분 유효시간을 갱신한다.
  메시지 열람 수를 알 수 없으므로 방 인원 대비 유입을 메시지 클릭률로 부르지 않는다.
- 모든 성과 쿼리는 `environment`, `internal=false`, `test_object=false`를 포함한다. 점검 대시보드만 예외다.
  `ADMIN`과 서버 설정의 팀원 계정은 내부 사용자다. 기획사 권한만으로 제외하지 않는다.
  비로그인 팀원은 `/analytics/internal`에서 브라우저 표시를 켠다. 새로운 기기·시크릿 모드에서 다시 켜야 한다.
  표시 전의 익명 테스트를 자동으로 복구하거나 제거하지는 않는다.
- 비로그인은 브라우저 식별자, 로그인은 환경별 서버 HMAC으로 변환한 계정 식별자로 연결한다. 서버 세션 확인이
  실패하면 익명으로 대신 수집하지 않는다. 원문 회원 ID·이메일·이름을 PostHog에 전송하지 않는다.
  회사별 계정이 여러 개면 회사 수와 로그인 계정 수가 다를 수 있다.

### PostHog 수집 경계

자동 클릭·페이지·폼·오류 수집, 화면 녹화, 설문, 광고 추적을 끈다. 기존 분석 끄기 선택을 그대로 존중하며
거부 상태에서는 SDK를 초기화하지 않는다. 철회 시 수집을 중단하고 방문 식별자를 초기화한다.
현재 주소·쿼리·referrer·페이지 제목·자동 사용자 속성은 전송 직전에 제거한다.

아래 기존 GTM 계약과 달리 PostHog에는 공고/공연/심사/작업을 연결하는 제한된 식별자와 서버 HMAC 계정 식별자를
사용한다. 이 변경은 GA dataLayer에 적용하지 않는다. 이름·이메일·전화번호·PDF 원문·사진·파일명·파일 URL·
지원서 답변·심사 메모·판정 내용은 보내지 않는다. HMAC과 작업 식별자는 익명 정보라고 주장하지 않는다.
PostHog 수집 항목·미국 리전·거부 방법은 `/privacy/analytics`의 별도 안내로 공개한다.
2026-10-29 운영 결정에 따라 기본 수집하고 사용자가 끄는 방식을 유지한다. 기존 거부 기록은 버전과 관계없이 보존한다.

### 이벤트와 발생 지점

| 이벤트 | 기준 |
| --- | --- |
| `audition_post_viewed` | 공개 공고 상세가 실제 렌더링됨. 같은 컴포넌트의 effect 재실행은 중복 제거 |
| `openchat_landed` | 표시된 알림 링크로 공고 상세 조회 |
| `another_post_viewed` | 같은 알림 방문에서 최초 공고와 다른 공고 조회 |
| `attachment_download_clicked` | 첨부 링크 클릭. `application_form`·`reference`·`unknown` 구분 |
| `show_viewed`, `booking_started` | 공연 상세 표시·예매 입력 시트 열기. 전환 분모는 내부 예매 가능 공연 |
| `booking_succeeded`, `booking_failed` | 예매 API 성공/실패. 개인정보·예매번호 제외 |
| `external_booking_clicked` | 외부 예매 링크 이동. 예술in 내 예매 완료와 분리 |
| `producer_post_published`, `producer_show_published` | 공고 게시·공연 공개 API 성공 |
| `show_inventory_observed`, `booking_inventory_observed` | 공연사가 관리 API를 조회한 시점의 좌석/취소 집계. 최신 관측 스냅샷, 실시간 전체 DB 동기화 아님 |
| `pdf_step_completed`, `pdf_step_failed` | 배우/공연사 PDF 업로드·추출 결과 관측, 배우 결과 적용·후속 프로필 저장 |
| `review_item_viewed` | 지원자 개별 검토 화면 표시 |
| `review_saved` | 심사 API 저장 성공. `eligible`로 미검토 상태 복귀와 구분, 판정 내용·메모 미전송 |
| `review_active_time` | 지원자별 누적 검토 시간 조각. 다른 탭·포커스 이탈·2분 무조작 제외 |
| `review_progress` | PDF 심사 상세의 전체 대상·미검토 이외 판정 수, 마지막 관측 시각과 함께 표시 |

PDF 추출은 브라우저에서 결과를 관측한 작업에 한정된다. 전체 백그라운드 작업의 성공률이 아니다.
같은 작업의 추출 결과 재조회는 탭 내에서 중복 제거하고 차트는 작업 ID로 다시 고유 집계한다.
`duration_ms`는 업로드/생성부터 **결과를 확인하기까지**의 시간이며 서버 순수 처리 시간으로 쓰지 않는다.
`PARTIAL`은 부분 완료로 별도 표시한다. 배우 PDF에서 적용한 뒤 저장에 성공해야 `save` 단계를 기록한다.
화면을 떠나 저장하지 않은 적용 기록을 다음 편집의 저장에 연결하지 않는다.

심사 시간은 포커스와 상호작용 기반 근사치이며 주의 집중을 보장하지 않는다. 여러 날·재열람은 합산하고,
여러 심사위원이면 인시 합계다. 화면을 켜 둔 채 읽기·영상 시청을 하는 경우 2분 뒤부터 과소 집계될 수 있다.
200명 환산은 관측 지원자당 평균 × 200이며 준비·휴식·최종 비교를 제외한 추정이다. 심사 완료율과 함께 읽는다.

### 변경 시 검증

흐름이나 API를 바꾸면 성공 이벤트 위치, 이벤트 의미, 분모, 동일 공고/작업 연결, 재시도·재조회 중복,
내부·테스트 제외와 거부 설정을 함께 확인한다. `posthog-contract.ts`와 `scripts/posthog/dashboards.mjs`를
같이 갱신한다. 의미가 달라지는 변경은 이벤트/스키마 버전을 올리고 대시보드 설명에 시행 시점을 남긴다.

## 기존 Google Analytics

Google Tag Manager 컨테이너는 `NEXT_PUBLIC_GTM_ID`가 설정된 환경에서만 사용할 수 있다. 방문 분석은 기본으로
켜져 있고(opt-out), 이용자가 분석 설정에서 끈 상태에서는 컨테이너 자체를 불러오지 않으며 이벤트를
`dataLayer`에 쌓지 않는다. 첫 방문 동의 배너는 없다.

## 수집 경계

- 선택은 `yesulin:analytics-consent:v1` 로컬 스토리지에 `granted`(켜기) 또는 `denied`(끄기)로 저장한다. 값이 없으면 켜진 것으로 본다.
- `denied` 상태에서는 GTM 네트워크 요청과 분석 이벤트 전송이 없어야 한다.
- 저장소를 읽을 수 없으면 고른 적 없는 상태(`null`)로 보고 기본값대로 수집한다. 끄기를 저장하지 못하면 새로고침하지 않고, 현재 페이지에서 이벤트 전송을 막은 뒤 `analytics_storage`를 `denied`로 갱신한다.
- 끄면 `_ga`, `_gid`, `_gat` 계열 쿠키를 삭제하고 페이지를 다시 불러온다.
- 이전 동의 배너에서 남은 `denied`도 지우지 않는다. 사용자가 직접 분석을 다시 켜기 전까지 거부를 유지한다.
- 분석 설정 버튼은 화면 머리말이 아니라 하단 정책 링크(`PolicyLinks`)와 기획사 사이드바 계정 영역(`ProducerAccountPanel`)에 둔다. 랜딩 푸터가 없는 공연 예매·배우·공고 지원 상세·지원서 작성·검토 화면은 `SiteFooter`로 같은 링크를 보여 준다. 처리방침이 이 버튼을 거부 방법으로 안내한다. GTM 미설정 환경에서도 자체 링크 방문 집계를 켜고 끌 수 있다.
- GTM을 불러오기 전에 모든 consent 기본값을 `denied`로 선언한 다음 `analytics_storage`만 `granted`로 갱신한다. 광고 관련 consent 값은 항상 `denied`로 둔다.
- 배우 화면 이벤트는 동의 명령과 `gtm.js`를 큐에 넣은 뒤부터 보낸다. 초기화 전에는 준비 신호를 기다리고, 초기화 후 화면에 진입하면 바로 보낸다.
- 분석 동의는 지원서의 개인정보 수집·이용 및 제3자 제공 동의와 별개다.
- 광고, 맞춤 추천, Google Signals와 User-ID는 사용하지 않는다.

## 자체 링크 방문 집계

오픈채팅방 공유용 링크는 `src=kakao_openchat`을 사용한다. 브라우저는 분석이 켜져 있을 때만 자체 API에 방문 증가 POST를
보내며, `yesulin:openchat-counted:v1:{공고 키}` 로컬 스토리지에 공고별 `1` 표시만 둔다. 방문자 식별값은 만들지 않는다.
같은 OTR 공고의 경유 링크와 상세 링크는 원문 번호로 같은 표시를 공유한다. 저장소를 쓸 수 없으면 생략하고, POST 실패 시
표시를 지워 다음 방문에서 재시도한다. 이 집계는 GTM 설정과 무관하며 공고별 누적 숫자만 자체 서버에 저장한다.
관리자 로그인 방문은 서버에서 제외한다. 서버가 응답하지 않아도 최대 1.5초 뒤 주소 정리·원문 이동을 계속한다.
브라우저 저장값 삭제·기기 변경·동시 탭·응답 유실에 따라 중복될 수 있다. 이 기록을 GA 이벤트나 `dataLayer`에 보내지 않는다.

## 이벤트 계약

이벤트 값에는 이름, 이메일, 전화번호, 지원서 답변, 파일명·URL, 사용자·공고·배역·지원서 ID와 공연·회차 ID,
예매번호를 넣지 않는다.
오류 메시지 원문 대신 허용된 `error_code`만 사용한다.

| 이벤트 | 발생 기준 | 주요 파라미터 |
| --- | --- | --- |
| `actor_screen_view` | 배우 목록·공개 배우 페이지를 성공적으로 읽어 렌더링. 화면 방문마다 한 번, 분석을 껐다가 켜면 그때 한 번 | `screen_name`(`actor_list`, `actor_page`), 고정 화면 제목·주소, 빈 유입 주소 |
| `view_posting` | 공개 공고 화면 렌더링 | `posting_status`, `role_count` |
| `login_prompt_view` | 로그인 유도 UI 노출 | `login_reason`, `has_draft` |
| `login_prompt_action` | 유도 UI에서 로그인·비회원 계속·닫기 선택 | `login_reason`, `action`, `has_draft` |
| `login_entry_click` | 로그인 화면으로 이동하는 링크 선택 | `entry_point`, `login_reason`, `actor_type`, `return_target` |
| `login_page_view` | 로그인 화면 렌더링 | 로그인 진입 공통 파라미터 |
| `login_attempt` | 유효한 입력 또는 소셜 provider 선택 후 인증 시도 | 공통 파라미터, `provider` |
| `login_success` | 세션 생성 또는 OAuth 복귀 성공 | 공통 파라미터, `provider` |
| `login_return_success` | 로그인 뒤 목적 화면으로 복귀 | 공통 파라미터, `provider` |
| `application_start` | 지원서 작성 화면 이동 결정 | `start_mode`, `selected_role_count`, `has_draft` |
| `application_step_complete` | 단계 검증을 통과하고 다음 단계로 이동 | `step_name`, `step_number`, `step_count` |
| `application_review_view` | 최종 검토 화면 렌더링 | `is_authenticated`, `issue_count` |
| `application_submit_success` | 제출 API 성공 응답 | `selected_role_count`, `save_to_profile`, `profile_saved` |
| `application_submit_error` | 제출 실패 또는 인증 만료 | 제한된 `error_code` |
| `kakao_openchat_click` | 메인 공고 알림 배너의 오픈채팅 참여 버튼 선택 | `entry_point`(`home_alert_banner`) |
| `view_show` | 무료 공연 상세 화면 렌더링. 좌석 갱신으로 다시 읽어도 같은 공연이면 한 번. 꺼진 상태로 화면을 연 뒤 다시 켜면 그 시점에 한 번 | `session_count` |
| `reservation_start` | 회차를 고른 뒤 예매 정보 입력 시트 열기 | 없음 |
| `reservation_submit_success` | 예매 API 성공 응답 | `ticket_count` |
| `reservation_submit_error` | 예매 API 실패 | 제한된 `error_code` |

예매 `error_code`는 `not_enough_seats`, `booking_closed`, `show_not_open`, `duplicate`, `session_changed`,
`invalid_input`, `server_error`, `network_error`, `unknown`만 사용한다. 입력 검증에 막혀 요청을 보내지 않은 경우는
보내지 않는다. GTM 데이터 영역 변수는 이전 값을 기억하므로 예매 이벤트는 `session_count`, `ticket_count`,
`error_code`를 비운 뒤 이번 값만 채워 보낸다. 공연별 정확한 예매 수는 운영 대시보드가 기준이고, 분석을 끈 이용자와 차단기 사용자가 빠지는
GA4는 단계별 이탈을 보는 용도다.

`login_reason`은 `account_access`, `application_start`, `photo_library`, `application_submit`,
`manage_production`만 사용한다. `entry_point`와 `return_target`도 코드에 선언된 값만 사용하고 실제 URL은 보내지
않는다.

## GTM 설정

배우 화면의 `actor_screen_view`는 `screen_name`으로 목록(`actor_list`)과 공개 상세(`actor_page`)를 구분한다.
목록 페이지 번호·검색어, 배우 이름·아이디·publicId는 보내지 않는다. 본인 미리보기·운영자 화면과 조회 실패는 이 이벤트에 포함하지 않는다.
`page_title`은 `배우 목록`·`배우 페이지`, `page_location`은 현재 origin 아래 `/actors`·`/actors/profile`로 고정하고
`page_referrer`는 빈 문자열로 보낸다. `/actors/profile`은 분석용 이름이며 실제 배우 주소가 아니다.

GTM의 해당 GA4 이벤트 태그에는 이 세 페이지 매개변수도 Data Layer Variable로 명시적으로 연결한다.
커스텀 이벤트만 정제하거나 자동 `page_view`만 끄는 것으로는 아래 자동 수집 경로를 막을 수 없다.
현재 게시된 GTM·GA4 설정은 이 저장소에서 확인하지 못했으며, 다음 항목은 배우 분석을 운영에 반영하기 전 필수 검증 조건이다.

- **모든 이벤트의 페이지 정보:** Google 태그가 처음 초기화되기 전부터 배우 경로(`/actors`로 시작하는 주소)의 `page_location`, `page_title`,
  `page_referrer`를 위 고정값으로 설정한다. 커스텀 이벤트 태그뿐 아니라 Google 태그의 공통 설정에 적용해 `first_visit`,
  `session_start`, `user_engagement`, 자동 `page_view`와 향상된 측정에도 실제 아이디·이름이 붙지 않게 한다.
  이를 보장할 수 없으면 배우 경로에서는 Google 태그 초기화·수집을 차단한다. 이미 다른 화면에서 태그를 불러온 뒤 배우 화면으로
  이동하는 경우에도 같은 보호가 필요하다. 브라우저 기록 변경 자동 측정과 배우 상세에서 다른 화면으로 이동한 뒤의 `page_referrer`도 확인한다.
- **배우가 입력한 외부 링크:** GA4 향상된 측정의 외부 클릭(`click`)은 실제 주소를 `link_url`로 보낼 수 있다.
  파일 링크는 `file_download`의 `link_url`, `link_text`, `file_name`으로도 수집될 수 있다. 이 자동 측정을 끄고 GTM의 별도
  링크 클릭·다운로드 태그에서도 배우가 입력한 링크를 제외한다. `actor_screen_view`에 페이지 고정값을 넣는 것으로 이 링크 값이 정제되지는 않는다.
  링크 이용 분석이 필요하면 이름·아이디·원본 URL을 담지 않는 별도 이벤트 계약을 먼저 정한다.

게시 전 Preview와 실제 GA4 요청에서 다음 흐름을 확인한다. 문서 수정이나 코드 배포만으로 설정 적용·검증이 완료되지는 않는다.

| 확인 흐름 | 완료 기준 |
| --- | --- |
| 새 방문자의 `/actors/@아이디` 직접 진입 | `first_visit`, `session_start`를 포함한 모든 이벤트에 실제 아이디·이름·URL이 없음. 페이지 정보는 고정값이거나 수집되지 않음 |
| 배우 간 이동, 다른 화면에서 배우 화면 진입·이탈 | 자동 페이지 변경·참여 이벤트와 다음 화면의 유입 주소에도 배우 주소가 남지 않음 |
| 배우의 일반 외부 링크·파일 링크 선택 | 자동 `click`·`file_download`와 별도 GTM 태그가 배우의 링크·표시 문구·파일명을 전송하지 않음 |
| 분석 끄기·다시 켜기 | 꺼진 동안 수집하지 않고, 다시 켜면 초기화 명령 뒤에 화면 이벤트를 한 번 보냄 |

공식 동작은 [GA4 자동 수집 이벤트](https://support.google.com/analytics/answer/9234069?hl=en),
[향상된 측정](https://support.google.com/analytics/answer/9216061?hl=en),
[페이지 조회 설정](https://developers.google.com/analytics/devguides/collection/ga4/views)을 따른다.

GTM의 Google 태그는 GA4 측정 ID `G-JSQZT648EC`에 연결한다. Google 태그의 구성 매개변수에는
`allow_google_signals=false`, `allow_ad_personalization_signals=false`를 지정한다. 커스텀 이벤트를 GA4로
전달하려면 위 이벤트명을 받는 Custom Event 트리거와 Google Analytics 이벤트 태그를 추가하고, 필요한
파라미터를 같은 이름의 Data Layer Variable로 연결한다. GTM 작업공간 변경은 Preview에서 켜기·끄기 양쪽을
확인한 뒤 게시한다.

GA4 향상된 측정의 양식 상호작용은 사용하지 않는다. 페이지 URL의 쿼리에는 `returnTo`, `roleId` 같은 내부
경로 정보가 있으므로 GA4 설정에서 쿼리 파라미터를 수집하지 않도록 구성한다.
