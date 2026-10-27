package art.yesulin.actor.application.page;

import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageAutoHiddenReason;
import art.yesulin.actor.domain.page.ActorPageReadiness;
import art.yesulin.actor.domain.page.ActorPageStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record ActorPageSettingsResult(
        UUID publicId,
        String handle,
        boolean handleEditable,
        ActorPageStatus status,
        ActorPageAutoHiddenReason autoHiddenReason,
        boolean locked,
        String lockReason,
        Instant unlockedAt,
        Instant firstPublishedAt,
        Instant publishedAt,
        ActorPageFieldVisibilitiesResult fieldVisibilities,
        ActorPageReadiness readiness,
        boolean publishPromptShown,
        String consentVersion,
        Long pageRepresentativePhotoId
) {

    public static ActorPageSettingsResult from(ActorPage page, ActorPageContentState state, LocalDate today) {
        return new ActorPageSettingsResult(
                page.getId() == null ? null : page.getPublicId(), page.getHandle(), page.isHandleEditable(),
                page.getStatus(), page.getAutoHiddenReason(), page.isLocked(),
                page.getLockReason(), page.getUnlockedAt(),
                page.getFirstPublishedAt(), page.getPublishedAt(), ActorPageFieldVisibilitiesResult.from(page),
                state.readiness(page, today), page.getPublishPromptShownAt() != null, ActorPage.CONSENT_VERSION,
                state.representativePhotoId()
        );
    }
}
