# 방문 분석과 이벤트

Google Tag Manager 컨테이너는 `NEXT_PUBLIC_GTM_ID`가 설정된 환경에서만 사용할 수 있다. 이용자가 분석에
동의하기 전에는 컨테이너 자체를 불러오지 않는 Basic 방식을 사용하며, 거부 상태에서는 이벤트를
`dataLayer`에 쌓지 않는다.

## 동의 경계

- 선택은 `yesulin:analytics-consent:v1` 로컬 스토리지에 `granted` 또는 `denied`로 저장한다.
- 미선택·거부 상태에서는 GTM 네트워크 요청과 분석 이벤트 전송이 없어야 한다.
- 철회하면 `_ga`, `_gid`, `_gat` 계열 쿠키를 삭제하고 페이지를 다시 불러온다.
- 동의 후 GTM을 불러오기 전에 모든 consent 기본값을 `denied`로 선언한 다음 `analytics_storage`만 `granted`로 갱신한다. 광고 관련 consent 값은 항상 `denied`로 둔다.
- 분석 동의는 지원서의 개인정보 수집·이용 및 제3자 제공 동의와 별개다.
- 광고, 맞춤 추천, Google Signals와 User-ID는 사용하지 않는다.

## 이벤트 계약

이벤트 값에는 이름, 이메일, 전화번호, 지원서 답변, 파일명·URL, 사용자·공고·배역·지원서 ID를 넣지 않는다.
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

`login_reason`은 `account_access`, `application_start`, `photo_library`, `application_submit`,
`manage_production`만 사용한다. `entry_point`와 `return_target`도 코드에 선언된 값만 사용하고 실제 URL은 보내지
않는다.

## GTM 설정

GTM의 Google 태그는 GA4 측정 ID `G-JSQZT648EC`에 연결한다. Google 태그의 구성 매개변수에는
`allow_google_signals=false`, `allow_ad_personalization_signals=false`를 지정한다. 커스텀 이벤트를 GA4로
전달하려면 위 이벤트명을 받는 Custom Event 트리거와 Google Analytics 이벤트 태그를 추가하고, 필요한
파라미터를 같은 이름의 Data Layer Variable로 연결한다. GTM 작업공간 변경은 Preview에서 동의·거부 양쪽을
확인한 뒤 게시한다.

GA4 향상된 측정의 양식 상호작용은 사용하지 않는다. 페이지 URL의 쿼리에는 `returnTo`, `roleId` 같은 내부
경로 정보가 있으므로 GA4 설정에서 쿼리 파라미터를 수집하지 않도록 구성한다.
