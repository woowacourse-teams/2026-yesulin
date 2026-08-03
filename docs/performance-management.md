# 공연 관리 MVP

## 목적

공연은 공연사가 여러 차수의 모집 공고를 만들 때 공통으로 사용하는 상위 정보다. 공연이 있어야 공고를 생성할 수 있으므로 공연 등록을 가장 먼저 개발한다.

공연 관리 화면은 공연사 관리자가 자신의 공연을 등록·수정하고 전시 상태를 관리하는 공간이다. 공연별 공고와 지원자 통계는 목록에서 빠르게 확인할 수 있지만, 전체 공연 대시보드 고도화는 공고와 지원 기능 이후에 진행한다.

## MVP 범위

### 우선 구현

- 공연 등록
- 공연 수정
- 공연 전시
- 공연 미전시
- 공연 목록 조회
- 제목 검색
- 카테고리 필터
- 모집 중인 공고가 있는 공연 필터

### 후순위

- 공연 전체 현황 대시보드 고도화
- 추천 조건을 이용한 지원자 추천
- 공연 삭제 및 보관
- 공연 복제
- 공연별 상세 통계

## 공연 정보

| 항목 | 필수 | 설명 |
| --- | --- | --- |
| 썸네일 | 필수 | 목록과 공개 공고 콘텐츠에 사용할 대표 이미지 |
| 카테고리 | 필수 | 연극 또는 뮤지컬 |
| 공연 제목 | 필수 | 공연을 식별하는 제목 |
| 공연 소개 | 필수 | 작품의 줄거리, 분위기와 특징 |
| 모집 배역 | 필수 | 한 개 이상의 배역 |

## 모집 배역 정보

| 항목 | 필수 | 설명 |
| --- | --- | --- |
| 배역명 | 필수 | 공고와 지원서에 표시할 이름 |
| 배역 설명 | 필수 | 인물의 성격, 관계와 극 중 역할 |
| 성별 | 필수 | 남성, 여성, 무관 |
| 별도 지원 자격 | 선택 | 자유 형식의 지원 자격 |
| 출생연도 범위 | 선택 | 추후 추천 조건으로 활용 가능 |
| 키 범위 | 선택 | 추후 추천 조건으로 활용 가능 |
| 몸무게 범위 | 선택 | 추후 추천 조건으로 활용 가능 |
| MBTI | 선택 | 추후 추천 조건으로 활용 가능 |

선택 정보는 지원 가능 여부를 자동으로 제한하지 않는다. 추천 기능을 개발하기 전까지는 공연사가 참고할 수 있는 배역 속성으로만 저장한다.

## 목록 조회 정보

목록 조회 응답은 공연별 내용과 공연사가 보유한 전체 공연 수를 함께 제공한다.

| 응답 필드 | 타입 | 설명 |
| --- | --- | --- |
| `performances` | `PerformanceSummary[]` | 검색·카테고리·모집 중 필터가 적용된 공연별 요약 목록 |
| `totalCount` | `number` | 필터 적용 여부와 관계없이 인증된 공연사가 보유한 전체 공연 수 |

각 공연별 내용은 다음 정보를 제공한다.

- 공연 썸네일, 카테고리, 제목, 소개
- 전시 상태
- 모집 배역 수
- 전체 공고 수
- 현재 모집 중인 공고 수
- 누적 지원자 수
- 최근 공고 한 건의 제목과 마감일

필터가 적용된 결과 수는 `performances.length`로 계산한다. 따라서 화면에서는 필요할 때 `조회 결과 N개 · 전체 공연 M개` 형태로 두 값을 함께 보여준다.

목록 응답은 배역 상세 배열을 반환하지 않고 `roleCount`만 제공한다. 배역명·설명·지원 조건을 포함한 전체 `roles` 배열은 `GET /api/performance/{performanceId}` 단건 조회에서 반환한다.

## 화면 경로

| 화면 | 경로 |
| --- | --- |
| 공연사 관리자 진입 | `/producers` |
| 공연 목록 | `/producers/performances` |
| 공연 등록 | `/producers/performances/new` |
| 공연 수정 | `/producers/performances/{performanceId}/edit` |

공연사 관리자 화면은 검색 엔진에 노출하지 않는다. 현재 `/producers` 하위 레이아웃에는 `noindex`, `nofollow` 메타데이터를 적용한다.

## API 계약

| 기능 | 메서드 | 경로 |
| --- | --- | --- |
| 공연 목록 조회 | `GET` | `/api/performance` |
| 공연 단건 조회 | `GET` | `/api/performance/{performanceId}` |
| 공연 등록 | `POST` | `/api/performance` |
| 공연 수정 | `PUT` | `/api/performance/{performanceId}` |
| 전시 상태 변경 | `PATCH` | `/api/performance/{performanceId}/visibility` |
| 썸네일 업로드 | `POST` | `/api/performance/thumbnail` |

목록 조회 쿼리는 다음을 지원한다.

- `query`: 공연 제목 검색어
- `category`: `PLAY` 또는 `MUSICAL`
- `recruiting`: `true`이면 모집 중인 공고가 있는 공연만 조회

`GET /api/performance` 응답 예시는 다음과 같다.

```json
{
  "performances": [
    {
      "id": "performance-high-life",
      "producerId": "producer-ninejin",
      "title": "연극 HIGH LIFE",
      "description": "Lee MacDougall의 희곡을 정구진 연출로 선보이는 2026년 10월 공연입니다.",
      "category": "PLAY",
      "thumbnailUrl": "/images/performances/high-life-audition-2026.jpg",
      "visibility": "DISPLAYED",
      "roleCount": 2,
      "statistics": {
        "totalRecruitmentCount": 1,
        "openRecruitmentCount": 1,
        "totalApplicantCount": 1
      },
      "latestRecruitment": {
        "id": "show-high-life-2026",
        "title": "2026년 10월 공연 배우 오디션",
        "status": "OPEN",
        "closesAt": "2026-08-09T13:00:00.000Z"
      },
      "updatedAt": "2026-07-28T02:00:19.000Z"
    }
  ],
  "totalCount": 2
}
```

## 권한 원칙

- 클라이언트가 공연사 ID를 등록 요청에 넣지 않는다.
- 서버는 인증 정보에서 공연사 ID를 확인해 공연에 연결한다.
- 목록과 단건 조회는 인증된 공연사에 속한 공연만 반환한다.
- 수정과 전시 상태 변경도 동일한 소유권 검사를 수행한다.
- 현재 MSW는 고정된 공연사 인증 정보를 사용해 이 동작을 모사한다.
- 기본 목 공연사는 기존 프로토타입의 `나인진엔터테인먼트`이며 식별자는 `producer-ninejin`이다.

## MSW 운영 방식

- 관리자 화면의 모든 공연 기능은 `/api/performance/**` 요청을 사용한다.
- MSW 핸들러는 조회, 등록, 수정, 전시 상태 변경과 썸네일 업로드 응답을 제공한다.
- 목록 조회 MSW 응답의 `performances`에는 필터링된 공연별 내용을, `totalCount`에는 필터와 무관한 해당 공연사의 전체 공연 수를 담는다.
- 목록의 각 공연은 `roleCount`만 반환하고, 공연 단건 조회는 전체 `roles` 배열을 반환한다.
- 초기 공연 데이터는 기존 프로토타입의 `연극 HIGH LIFE`, `연극 행오버` 정보와 포스터를 사용한다.
- 목 데이터는 브라우저 메모리에 있으므로 새로고침하면 초기 데이터로 돌아간다.
- 기본값은 MSW 사용이며, 실제 백엔드 연결 시 `NEXT_PUBLIC_API_MOCKING=disabled`로 비활성화한다.
- 실제 파일 저장소를 연결하기 전까지 썸네일 업로드는 이미지 Data URL을 반환한다.

## SEO 방향

공연사 관리자 화면이 아니라 추후 개발할 공개 공고 콘텐츠를 검색 엔진에 노출한다.

- 공개 공연·공고 상세 페이지는 Server Component로 렌더링한다.
- 공연 제목, 소개, 카테고리와 공고 정보를 초기 HTML에 포함한다.
- `generateMetadata`로 공고별 제목, 설명과 Open Graph 이미지를 만든다.
- 공개 URL을 sitemap에 포함하고 관리자 URL은 제외한다.
- 구조화 데이터는 공개 공고 모델이 확정된 후 추가한다.

MSW는 `/producers` 관리자 영역에서만 시작한다. 따라서 공개 콘텐츠를 구현할 때 서버 렌더링과 SEO 경로에 목 초기화 코드가 포함되지 않는다.

## 작업 후 문서화

공연 관리 기능을 구현하거나 변경한 뒤에는 팀 공유가 필요한 내용이 있는지 확인하고, 필요한 경우 이 문서의 요구사항·API 계약·MSW 운영 방식을 실제 구현과 함께 갱신한다. 공통 기준은 [문서 운영 원칙](./README.md)을 따른다.
