package art.yesulin.actor.application.page;

import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPagePublicContent;
import art.yesulin.actor.domain.page.ActorPageReadiness;
import art.yesulin.actor.domain.photolibrary.PhotoLibrary;
import art.yesulin.actor.domain.photolibrary.PhotoLibraryItem;
import art.yesulin.actor.domain.profile.ApplicantProfile;
import art.yesulin.actor.domain.profile.ProfileBasicInformation;
import art.yesulin.actor.domain.videolibrary.VideoLibrary;
import java.time.LocalDate;

public record ActorPageContentState(
        ApplicantProfile profile,
        PhotoLibrary photos,
        VideoLibrary videos,
        ActorPage page,
        ActorPagePublicContent before
) {

    public ActorPageReadiness readiness(ActorPage actorPage, LocalDate today) {
        return ActorPageReadiness.assess(
                actorPage.getHandle(),
                profile == null ? ProfileBasicInformation.empty() : profile.getBasicInformation(),
                representativePhotoId() != null, actorPage.isLocked(), today
        );
    }

    public Long representativePhotoId() {
        return photos == null ? null : photos.getPageRepresentativePhoto().map(PhotoLibraryItem::getId).orElse(null);
    }

    public ActorPagePublicContent publicContent() {
        return ActorPagePublicContent.from(page, profile, photos, videos);
    }
}
