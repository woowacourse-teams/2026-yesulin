package art.yesulin.actor.application.cheer;

import static art.yesulin.actor.domain.page.ActorPageErrorCode.ACTOR_PAGE_NOT_FOUND;

import art.yesulin.actor.domain.cheer.ActorPageLike;
import art.yesulin.actor.domain.cheer.ActorPageLikeRepository;
import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageRepository;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.domain.member.MemberErrorCode;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 활성 일반 회원이 다른 배우의 페이지에 누르는 좋아요. 배우 목록에 보이는 페이지만 받고, 그 밖은 공개 조회처럼 존재
 * 여부를 알 수 없는 404다. 누른 사람은 누구에게도 보이지 않고 수만 보인다.
 *
 * <p>좋아요를 누르는 회원 행을 먼저 잠가 같은 회원의 요청을 순서대로 처리하므로, 같은 좋아요를 동시에 보내도 하나만 남는다.
 */
@Service
@RequiredArgsConstructor
public class ActorPageLikeService {

    private final ActorPageLikeRepository likeRepository;
    private final ActorPageRepository pageRepository;
    private final MemberRepository members;
    private final Clock clock;

    /** 세션이 없어도 읽을 수 있고, 로그인했으면 내 상태를 함께 담는다. */
    @Transactional(readOnly = true)
    public ActorPageLikesResult findLikes(UUID publicId, MemberPrincipal viewer) {
        return result(findListed(publicId), viewer);
    }

    /** 같은 요청을 반복해도 결과가 같다. 내 페이지에는 누를 수 없다. */
    @Transactional
    public ActorPageLikesResult like(MemberPrincipal member, UUID publicId) {
        lockMember(member.memberId());
        ActorPage page = findListed(publicId);
        if (!likeRepository.existsByActorPageIdAndMemberId(page.getId(), member.memberId())) {
            likeRepository.saveAndFlush(ActorPageLike.of(page, member.memberId(), Instant.now(clock)));
        }
        return result(page, member);
    }

    /** 누르지 않았어도 같은 결과로 답한다. */
    @Transactional
    public ActorPageLikesResult unlike(MemberPrincipal member, UUID publicId) {
        lockMember(member.memberId());
        ActorPage page = findListed(publicId);
        likeRepository.deleteLike(page.getId(), member.memberId());
        return result(page, member);
    }

    private ActorPageLikesResult result(ActorPage page, MemberPrincipal viewer) {
        long count = likeRepository.countByActorPageId(page.getId());
        if (viewer == null) {
            return new ActorPageLikesResult(count, ActorPageLikesResult.Me.anonymous());
        }
        boolean owner = page.getOwnerMemberId() == viewer.memberId();
        boolean canLike = viewer.role() == MemberType.APPLICANT && viewer.status() == MemberStatus.ACTIVE && !owner;
        boolean liked = canLike && likeRepository.existsByActorPageIdAndMemberId(page.getId(), viewer.memberId());
        return new ActorPageLikesResult(count, new ActorPageLikesResult.Me(true, owner, canLike, liked));
    }

    private ActorPage findListed(UUID publicId) {
        return pageRepository.findByPublicId(publicId)
                .filter(page -> page.isPublic() && !page.isLocked())
                .orElseThrow(() -> new BusinessException(ACTOR_PAGE_NOT_FOUND, "배우 페이지를 찾을 수 없습니다."));
    }

    private void lockMember(long memberId) {
        members.findForUpdate(memberId)
                .orElseThrow(() -> new BusinessException(MemberErrorCode.MEMBER_NOT_FOUND, "회원을 찾을 수 없습니다."));
    }
}
