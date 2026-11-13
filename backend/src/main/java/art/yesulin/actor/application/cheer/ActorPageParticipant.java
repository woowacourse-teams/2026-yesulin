package art.yesulin.actor.application.cheer;

import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;

/**
 * 보는 사람이 한 배우 페이지에서 가지는 자격. 활성 일반 회원이면서 페이지 주인이 아니어야 좋아요와 응원 글에 참여한다.
 */
public record ActorPageParticipant(boolean loggedIn, boolean owner, boolean activeMember) {

    public static ActorPageParticipant of(ActorPage page, MemberPrincipal viewer) {
        if (viewer == null) {
            return new ActorPageParticipant(false, false, false);
        }
        boolean activeMember = viewer.role() == MemberType.APPLICANT && viewer.status() == MemberStatus.ACTIVE;
        return new ActorPageParticipant(true, page.getOwnerMemberId() == viewer.memberId(), activeMember);
    }

    public boolean canParticipate() {
        return activeMember && !owner;
    }
}
