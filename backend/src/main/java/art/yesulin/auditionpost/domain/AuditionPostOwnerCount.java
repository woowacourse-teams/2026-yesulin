package art.yesulin.auditionpost.domain;

import java.time.Instant;

/** 기획사 한 곳의 공개 상태별 공고 수. 운영자 업체별 보기에 쓰는 읽기 모델이다. */
public record AuditionPostOwnerCount(long ownerId, AuditionPostStatus status, long count, Instant latestCreatedAt) {
}
