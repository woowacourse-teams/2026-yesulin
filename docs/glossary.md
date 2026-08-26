# 용어

| 용어 | 코드·ID | 의미 |
| --- | --- | --- |
| 배우 | `APPLICANT`, `applicantId` | 공고를 확인하고 지원서를 제출하는 회원 |
| 기획사/제작사 | `PRODUCER`, `ownerId` | 공연·공고를 소유하고 심사하는 회원 |
| 공연 | `performanceId: long` | 포스터·장소·공연 배역을 묶는 관리 단위 |
| 공고 | 내부 `auditionId: long`, 공개 `UUID` | 공연을 참조하는 모집 단위. API는 주로 UUID를 사용 |
| 공연 배역 | `performanceRoleId: long` | 공연에 정의된 배역 |
| 공고 배역 | `roleId: long` | 공고에서 모집 조건이 추가된 심사 단위 |
| 전형 | `stageId: long`, `round: int` | 공고 일정에 저장된 심사 차수 |
| 지원서 | `submissionId: UUID` | 배우가 공고에 제출한 불변 스냅샷 |
| 심사 결과 | `(submissionId, roleId, stageId)` | 지원서의 배역·차수별 결과 |
| 심사 종료 | `ScreeningCompletion(roleId)` | 공고 배역의 모든 차수 심사가 끝났음을 나타냄 |
| 공고 상태 | `DRAFT`, `PUBLISHED`, `CLOSED` | DB에 저장되는 상태 |
| 화면 단계 | `UPCOMING`, `OPEN`, `RECRUIT_CLOSED` 등 | 저장 상태와 현재 시각을 조합한 조회 결과 |
| 파일 상태 | `PENDING`, `READY` | presigned 업로드 요청 전후 상태 |

문서와 UI에서는 `공연사`보다 `기획사/제작사`, `지원자`보다 사용자 역할을 강조할 때 `배우`를 사용한다.

