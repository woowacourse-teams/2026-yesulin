package art.yesulin.actor.application.admin;

import art.yesulin.actor.domain.page.ActorPageAutoHiddenReason;
import art.yesulin.actor.domain.page.ActorPageStatus;
import java.time.Instant;
import java.util.UUID;

/**
 * 운영자 목록의 배우 페이지 한 줄.
 *
 * @param name 프로필에 입력한 이름. 입력하지 않았으면 null이다.
 * @param lastPublicActivityAt 공개한 시각과 공개 내용을 마지막으로 바꾼 시각 중 늦은 값. 공개한 적이 없으면 null이다.
 */
public record AdminActorPageSummaryResult(
        UUID publicId,
        String handle,
        String name,
        ActorPageStatus status,
        ActorPageAutoHiddenReason autoHiddenReason,
        boolean locked,
        Instant lastPublicActivityAt,
        Instant updatedAt
) {
}
