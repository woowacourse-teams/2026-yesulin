# 방문 분석과 이벤트

Google Tag Manager 컨테이너는 `NEXT_PUBLIC_GTM_ID`가 설정된 환경에서만 사용할 수 있다. 방문 분석은 기본으로
켜져 있고(opt-out), 이용자가 분석 설정에서 끈 상태에서는 컨테이너 자체를 불러오지 않으며 이벤트를
`dataLayer`에 쌓지 않는다. 첫 방문 동의 배너는 없다.

## 수집 경계

- 선택은 `yesulin:analytics-consent:v1` 로컬 스토리지에 `granted`(켜기) 또는 `denied`(끄기)로 저장한다. 값이 없으면 켜진 것으로 본다.
- `denied` 상태에서는 GTM 네트워크 요청과 분석 이벤트 전송이 없어야 한다.
- 끄면 `_ga`, `_gid`, `_gat` 계열 쿠키를 삭제하고 페이지를 다시 불러온다.
- 분석 설정 버튼은 화면 머리말이 아니라 하단 정책 링크(`PolicyLinks`)에 둔다. 처리방침이 이 버튼을 거부 방법으로 안내한다.
- GTM을 불러오기 전에 모든 consent 기본값을 `denied`로 선언한 다음 `analytics_storage`만 `granted`로 갱신한다. 광고 관련 consent 값은 항상 `denied`로 둔다.
- 분석 동의는 지원서의 개인정보 수집·이용 및 제3자 제공 동의와 별개다.
- 광고, 맞춤 추천, Google Signals와 User-ID는 사용하지 않는다.

## 이벤트 계약

이벤트 값에는 이름, 이메일, 전화번호, 지원서 답변, 파일명·URL, 사용자·공고·배역·지원서 ID와 공연·회차 ID,
예매번호를 넣지 않는다.
오류 메시지 원문 대신 허용된 `error_code`만 사용한다.

| 이벤트 | 발생 기준 | 주요 파라미터 |
| --- | --- | --- |
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

GTM의 Google 태그는 GA4 측정 ID `G-JSQZT648EC`에 연결한다. Google 태그의 구성 매개변수에는
`allow_google_signals=false`, `allow_ad_personalization_signals=false`를 지정한다. 커스텀 이벤트를 GA4로
전달하려면 위 이벤트명을 받는 Custom Event 트리거와 Google Analytics 이벤트 태그를 추가하고, 필요한
파라미터를 같은 이름의 Data Layer Variable로 연결한다. GTM 작업공간 변경은 Preview에서 켜기·끄기 양쪽을
확인한 뒤 게시한다.

GA4 향상된 측정의 양식 상호작용은 사용하지 않는다. 페이지 URL의 쿼리에는 `returnTo`, `roleId` 같은 내부
경로 정보가 있으므로 GA4 설정에서 쿼리 파라미터를 수집하지 않도록 구성한다.
