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
import java.util.Set;

/**
 * 변경 요청 하나가 잠근 배우의 프로필·보관함·페이지와, 변경 전 상태를 비교하는 데 필요한 값.
 *
 * @param before 잠글 때 공개 중이던 페이지의 공개 내용. 비공개였으면 null이다.
 * @param publicCopiesBefore 잠글 때 사진들에 붙어 있던 공개 사본 키. 변경 뒤 사라진 사본을 저장소에서 지우는 데 쓴다.
 */
public record ActorPageContentState(
        ApplicantProfile profile,
        PhotoLibrary photos,
        VideoLibrary videos,
        ActorPage page,
        ActorPagePublicContent before,
        Set<String> publicCopiesBefore
) {

    public ActorPageContentState {
        publicCopiesBefore = publicCopiesBefore == null ? Set.of() : Set.copyOf(publicCopiesBefore);
    }

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
