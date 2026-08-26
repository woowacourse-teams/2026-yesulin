# 프론트 API와 MSW

실제 HTTP 계약은 [백엔드 API](../../backend/docs/api.md)가 정본이다. 이 문서는 프론트가 그 계약을 어떻게 소비하고
MSW 전용 경로를 어떻게 구분하는지만 설명한다.

## 환경 변수

| 변수 | 역할 |
| --- | --- |
| `API_ORIGIN` | Next.js 서버 조회와 rewrite 대상 백엔드 origin |
| `NEXT_PUBLIC_API_MOCKING` | `enabled`일 때 MSW 시작 |
| `NEXT_PUBLIC_PRODUCER_LOGIN` | MSW 중에도 기획사 가입·세션을 실제 API로 전달 |
| `NEXT_PUBLIC_PRODUCER_API` | MSW 중에도 기획사 공연·공고·심사를 실제 API로 전달 |
| `NEXT_PUBLIC_APPLICANT_PROFILE_API` | MSW 중에도 배우 프로필·보관함을 실제 API로 전달 |
| `NEXT_PUBLIC_SOCIAL_LOGIN` | 배우 OAuth를 실제 백엔드로 전달 |
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` | 카카오 지도 브라우저 키 |

플래그가 없고 MSW도 비활성인 기본 모드는 모든 구현된 경계를 실제 API로 호출한다.

## 실제 API 사용 영역

- `/api/v1/sessions`, `/api/v1/auth/email-verifications`, `/api/v1/producers`, `/api/v1/producers/me`
- `/api/v1/performances`, `/api/v1/performance-posters`
- `/api/v1/auditions`, `/api/v1/public/auditions`
- `/api/v1/applicants/me/profile`, 사진·영상 보관함
- `/api/v1/auditions/{auditionId}/submissions`, 내 지원서 목록·상세
- `/api/v1/audition-roles/{roleId}/screening-rounds/**`
- `/api/v1/audition-roles/{roleId}/screening/completion`

심사 상태는 `PENDING`, `PASS`, `FAIL`, `ETC`만 사용한다. 심사 종료는 차수별이 아니라 공고 배역 전체다.

## MSW 전용 계약

다음 경로는 `seed_*` 화면과 목 시나리오에서만 사용하며 백엔드 API로 간주하지 않는다.

- `/api/public/postings/**`, `/api/public/recommended-postings`
- `/api/public/submissions`, `/api/public/submissions/lookup`
- `/api/me/profile`, `/api/me/profile/prefill`, `/api/me/submissions/**`
- `/api/performances/**`, `/api/postings/**`, `/api/screenings/**`

실제 공고 전용 prefill API는 없다. 프론트가 현재 프로필과 공개 공고 양식의 교집합을 만든다.

## 어댑터 주의사항

- 지원서 생성 백엔드는 `submissionId`만 반환한다. 완료 화면에 필요한 `submittedAt`은 프론트가 요청 성공 시각으로 만든다.
- 공고 수정은 기본 정보와 일정 저장을 나눠 호출한다. 두 저장이 서로를 검증하므로 기본 정보를 먼저 보내고, `AUDITION_INVALID_SCHEDULE`이면 일정을 먼저 저장한 뒤 다시 시도한다.
- 지원서 사진은 보관함에서 고르면 보관함 항목의 `fileId`를 그대로 제출하고, 새로 고른 파일만 업로드한다.
- 공개 공고는 백엔드에서 공연 포스터 URL을 반환한다. MSW의 공고 전용 이미지 필드는 실제 계약이 아니다.
- API 응답 URL은 그대로 사용하며 CloudFront 경로를 프론트에서 조합하지 않는다.
- `401`이면 프론트 인증 상태를 초기화하고 안전한 내부 `returnTo`를 보존한 채 로그인으로 이동한다.
- 기획사/제작사 이메일 인증 링크는 백엔드에서 검증한 뒤 설정된 Frontend 경로로 `302` redirect한다.
