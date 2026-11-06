package art.yesulin.community.application;

import art.yesulin.community.domain.CommunityAuthorMode;

public record CommunityParticipation(Long memberId, boolean canWrite, CommunityAuthorMode fixedMode,
                                     CommunityProfile profile) {
}
