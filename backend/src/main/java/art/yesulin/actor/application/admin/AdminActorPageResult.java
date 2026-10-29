package art.yesulin.actor.application.admin;

import art.yesulin.actor.application.page.PublicActorPageResult;
import art.yesulin.actor.domain.page.ActorPageAutoHiddenReason;
import art.yesulin.actor.domain.page.ActorPageReadiness;
import art.yesulin.actor.domain.page.ActorPageStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * 운영자가 보는 배우 페이지 상세. 공개 페이지 내용에 '공연사만' 영상과 연락처를 더한다. 연락처 열람은 기록하지 않는다.
 *
 * @param content 배우가 누구나 보도록 설정한 내용. 사진은 공개 사본만 담아 비공개·잠금 페이지는 비어 있다.
 * @param producerOnlyVideos 배우가 '공연사만'으로 둔 영상. 1차에는 운영자만 본다.
 * @param phone 프로필 연락처. 입력하지 않았으면 null이다.
 * @param email 프로필 이메일. 입력하지 않았으면 null이다.
 */
public record AdminActorPageResult(
        UUID publicId,
        String handle,
        long ownerMemberId,
        ActorPageStatus status,
        ActorPageAutoHiddenReason autoHiddenReason,
        boolean locked,
        String lockReason,
        Instant lockedAt,
        Instant unlockedAt,
        Instant firstPublishedAt,
        Instant publishedAt,
        Instant lastPublicActivityAt,
        ActorPageReadiness readiness,
        PublicActorPageResult content,
        List<PublicActorPageResult.Video> producerOnlyVideos,
        String phone,
        String email
) {

    public AdminActorPageResult {
        producerOnlyVideos = List.copyOf(producerOnlyVideos);
    }
}
