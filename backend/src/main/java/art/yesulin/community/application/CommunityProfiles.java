package art.yesulin.community.application;

import art.yesulin.actor.application.page.PublicActorPageService;
import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageRepository;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.global.exception.ErrorType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityProfiles {
    private final ActorPageRepository pages;
    private final PublicActorPageService publicPages;
    private final MemberRepository members;

    public CommunityProfile find(long memberId) {
        if (!members.existsById(memberId)) {
            return CommunityProfile.missing();
        }
        return pages.findByOwnerMemberId(memberId).filter(ActorPage::isPublic)
                .map(this::publicProfile).orElseGet(CommunityProfile::hidden);
    }

    private CommunityProfile publicProfile(ActorPage page) {
        try {
            var profile = publicPages.findByHandle(page.getHandle());
            return new CommunityProfile(profile.name(), profile.representativePhotoUrl(),
                "/actors/@" + profile.handle());
        } catch (BusinessException error) {
            if (error.getErrorCode().type() == ErrorType.NOT_FOUND) {
                return CommunityProfile.hidden();
            }
            throw error;
        }
    }
}
