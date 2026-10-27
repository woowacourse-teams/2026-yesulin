package art.yesulin.actor.domain.page;

import art.yesulin.actor.domain.photolibrary.PhotoLibrary;
import art.yesulin.actor.domain.photolibrary.PhotoLibraryItem;
import art.yesulin.actor.domain.profile.ApplicantProfile;
import art.yesulin.actor.domain.profile.ProfileAdditionalInformation;
import art.yesulin.actor.domain.profile.ProfileBasicInformation;
import art.yesulin.actor.domain.profile.ProfileCareer;
import art.yesulin.actor.domain.profile.ProfileEducationLevel;
import art.yesulin.actor.domain.profile.ProfileGender;
import art.yesulin.actor.domain.videolibrary.VideoLibrary;
import art.yesulin.actor.domain.videolibrary.VideoLibraryItem;
import java.util.List;

public record ActorPagePublicContent(
        String name,
        ProfileGender gender,
        Integer birthYear,
        Integer height,
        Integer weight,
        ProfileEducationLevel educationLevel,
        String school,
        String major,
        List<ProfileCareer> careers,
        String coverLetter,
        String specialty,
        String hobbies,
        String nationality,
        List<String> links,
        List<Long> photoIds,
        List<Long> videoIds
) {

    public ActorPagePublicContent {
        careers = List.copyOf(careers);
        links = List.copyOf(links);
        photoIds = List.copyOf(photoIds);
        videoIds = List.copyOf(videoIds);
    }

    public static ActorPagePublicContent from(
            ActorPage page, ApplicantProfile profile, PhotoLibrary photos, VideoLibrary videos
    ) {
        ProfileBasicInformation basic = profile == null ? null : profile.getBasicInformation();
        if (basic == null) {
            basic = ProfileBasicInformation.empty();
        }
        ProfileAdditionalInformation additional = profile == null ? null : profile.getAdditionalInformation();
        if (additional == null) {
            additional = ProfileAdditionalInformation.empty();
        }
        boolean education = page.visibilityOf(ActorPageField.EDUCATION) == ActorPageVisibility.PUBLIC;
        return new ActorPagePublicContent(
                basic.name(), basic.gender(), basic.birthDate() == null ? null : basic.birthDate().getYear(),
                basic.height(), basic.weight(),
                education ? additional.educationLevel() : null,
                education ? additional.school() : null,
                education ? additional.major() : null,
                visible(page, ActorPageField.CAREERS) ? additional.careers() : List.of(),
                visible(page, ActorPageField.COVER_LETTER) ? additional.coverLetter() : null,
                visible(page, ActorPageField.SPECIALTY) ? additional.specialty() : null,
                visible(page, ActorPageField.HOBBIES) ? additional.hobbies() : null,
                visible(page, ActorPageField.NATIONALITY) ? additional.nationality() : null,
                visible(page, ActorPageField.LINKS) ? additional.links() : List.of(),
                photos == null ? List.of() : photos.getPhotos().stream()
                        .filter(photo -> photo.getVisibility() == ActorPagePhotoVisibility.PUBLIC)
                        .map(PhotoLibraryItem::getId).toList(),
                videos == null ? List.of() : videos.getVideos().stream()
                        .filter(video -> video.getVisibility() == ActorPageVideoVisibility.PUBLIC)
                        .map(VideoLibraryItem::getId).toList()
        );
    }

    private static boolean visible(ActorPage page, ActorPageField field) {
        return page.visibilityOf(field) == ActorPageVisibility.PUBLIC;
    }
}
